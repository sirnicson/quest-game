import crypto from "node:crypto";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const MAX_ROOMS = 500;
const ROOM_TTL_MS = 6 * 60 * 60 * 1000;
const SEATS = ["student", "guide"];

// Holds every live room. Seat "student" is the host (Player 1); "guide" is the joiner (Player 2).
export function createRoomStore({ now = Date.now } = {}) {
  const rooms = new Map();

  const newCode = () => {
    for (let attempt = 0; attempt < 50; attempt++) {
      let code = "";
      for (let i = 0; i < 4; i++) code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
      if (!rooms.has(code)) return code;
    }
    throw new Error("no-codes");
  };

  const prune = () => {
    const cutoff = now() - ROOM_TTL_MS;
    for (const [code, room] of rooms) {
      const online = SEATS.some(seat => room.seats[seat]?.streams.size);
      if (!online && room.touched < cutoff) rooms.delete(code);
    }
  };

  const snapshot = room => ({
    code: room.code,
    phase: room.phase,
    seed: room.seed ?? null,
    seats: Object.fromEntries(SEATS.map(seat => [seat, {
      joined: Boolean(room.seats[seat]),
      online: Boolean(room.seats[seat]?.streams.size),
      name: room.seats[seat]?.name ?? null,
      avatar: room.seats[seat]?.avatar ?? null,
      ready: Boolean(room.seats[seat]?.ready)
    }]))
  });

  const broadcast = room => {
    const data = JSON.stringify(snapshot(room));
    for (const seat of SEATS) {
      for (const send of room.seats[seat]?.streams ?? []) send("room", data);
    }
  };

  const seatFor = (room, token) => SEATS.find(seat => room.seats[seat]?.token === token) ?? null;
  const get = code => rooms.get(String(code ?? "").toUpperCase());

  return {
    size: () => rooms.size,

    create() {
      prune();
      if (rooms.size >= MAX_ROOMS) return { error: "busy" };
      const code = newCode();
      const token = crypto.randomUUID();
      rooms.set(code, {
        code, phase: "lobby", touched: now(),
        seats: { student: { token, streams: new Set() }, guide: null }
      });
      return { code, token, seat: "student" };
    },

    status(code) {
      const room = get(code);
      return room ? { exists: true, full: Boolean(room.seats.guide), phase: room.phase } : { exists: false };
    },

    join(code) {
      const room = get(code);
      if (!room) return { error: "not-found" };
      if (room.seats.guide) return { error: "full" };
      const token = crypto.randomUUID();
      room.seats.guide = { token, streams: new Set() };
      room.phase = "opening";
      room.touched = now();
      broadcast(room);
      return { code: room.code, token, seat: "guide" };
    },

    // Sets a seat's traveller. Ignored once the game has started or the seat is ready.
    setProfile(code, token, { name, avatar }) {
      const room = get(code);
      const seat = room && seatFor(room, token);
      if (!seat) return { error: "denied" };
      if (room.phase === "playing" || room.seats[seat].ready) return { error: "locked" };
      const other = SEATS.find(s => s !== seat);
      if (typeof avatar === "string" && /^\/assets\/[^<>"]{1,120}$/.test(avatar)) {
        if (room.seats[other]?.avatar === avatar) return { error: "taken" };
        room.seats[seat].avatar = avatar;
      }
      if (typeof name === "string") room.seats[seat].name = name.trim().slice(0, 24) || null;
      room.touched = now();
      broadcast(room);
      return { ok: true };
    },

    // Marks a seat ready; when both are ready the room enters "playing" with a shared seed.
    setReady(code, token, ready = true) {
      const room = get(code);
      const seat = room && seatFor(room, token);
      if (!seat) return { error: "denied" };
      if (room.phase === "playing") return { ok: true };
      if (!room.seats.guide) return { error: "locked" };
      room.seats[seat].ready = Boolean(ready);
      if (SEATS.every(s => room.seats[s]?.ready)) {
        room.phase = "playing";
        room.seed = crypto.randomInt(1, 2 ** 31);
      }
      room.touched = now();
      broadcast(room);
      return { ok: true };
    },

    // Forwards one in-game action to the other seat. Both browsers replay the same actions on the same seed.
    relay(code, token, message) {
      const room = get(code);
      const seat = room && seatFor(room, token);
      if (!seat) return { error: "denied" };
      if (room.phase !== "playing") return { error: "locked" };
      const a = message?.a;
      if (typeof a !== "string" || !GAME_ACTIONS.has(a)) return { error: "bad-request" };
      const other = SEATS.find(s => s !== seat);
      const data = JSON.stringify({ from: seat, a, s: message.s ?? null, v: typeof message.v === "string" ? message.v.slice(0, 4000) : null });
      for (const send of room.seats[other]?.streams ?? []) send("act", data);
      room.touched = now();
      return { ok: true };
    },

    // Registers an event stream for a seat; returns an unsubscribe function, or null for a bad token.
    subscribe(code, token, send) {
      const room = get(code);
      const seat = room && seatFor(room, token);
      if (!seat) return null;
      room.seats[seat].streams.add(send);
      room.touched = now();
      send("room", JSON.stringify(snapshot(room)));
      broadcast(room);
      return () => {
        room.seats[seat].streams.delete(send);
        room.touched = now();
        broadcast(room);
      };
    }
  };
}

const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
};

const ERROR_STATUS = { "not-found": 404, full: 409, busy: 503, denied: 403, locked: 409, taken: 409, "bad-request": 400 };

const GAME_ACTIONS = new Set([
  "start-challenge", "select-answer", "check-reading", "check-listening",
  "quiz-punish", "judge", "writing", "submit-writing"
]);

const readJson = (req, limit = 2048) => new Promise(resolve => {
  let size = 0;
  const chunks = [];
  req.on("data", chunk => {
    size += chunk.length;
    if (size > limit) { req.destroy(); resolve(null); } else chunks.push(chunk);
  });
  req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString() || "{}")); } catch { resolve(null); } });
  req.on("error", () => resolve(null));
});

// Handles /api/rooms routes; returns false when the request is not for the room API.
export function createRoomHandler(store = createRoomStore()) {
  return function handle(req, res, url) {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] !== "api" || parts[1] !== "rooms") return false;
    const code = parts[2];

    if (!code && req.method === "POST") {
      const result = store.create();
      json(res, result.error ? ERROR_STATUS[result.error] : 201, result);
      return true;
    }
    if (code && !/^[A-Za-z0-9]{4}$/.test(code)) { json(res, 404, { error: "not-found" }); return true; }

    if (code && !parts[3] && req.method === "GET") {
      json(res, 200, store.status(code));
      return true;
    }
    if (code && parts[3] === "join" && req.method === "POST") {
      const result = store.join(code);
      json(res, result.error ? ERROR_STATUS[result.error] : 200, result);
      return true;
    }
    if (code && (parts[3] === "profile" || parts[3] === "ready") && req.method === "POST") {
      readJson(req).then(body => {
        if (!body) return json(res, 400, { error: "bad-request" });
        const result = parts[3] === "profile"
          ? store.setProfile(code, body.token, body)
          : store.setReady(code, body.token, body.ready !== false);
        json(res, result.error ? ERROR_STATUS[result.error] : 200, result);
      });
      return true;
    }
    if (code && parts[3] === "act" && req.method === "POST") {
      readJson(req, 8192).then(body => {
        if (!body) return json(res, 400, { error: "bad-request" });
        const result = store.relay(code, body.token, body);
        json(res, result.error ? ERROR_STATUS[result.error] : 200, result);
      });
      return true;
    }
    if (code && parts[3] === "events" && req.method === "GET") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      });
      res.write("retry: 2000\n\n");
      const send = (event, data) => res.write(`event: ${event}\ndata: ${data}\n\n`);
      const unsubscribe = store.subscribe(code, url.searchParams.get("token"), send);
      if (!unsubscribe) { send("denied", "{}"); res.end(); return true; }
      const heartbeat = setInterval(() => res.write(": ping\n\n"), 20000);
      req.on("close", () => { clearInterval(heartbeat); unsubscribe(); });
      return true;
    }
    json(res, 404, { error: "not-found" });
    return true;
  };
}
