import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRoomStore, createRoomHandler } from '../scripts/rooms.mjs';

test('host creates a room, a guest joins once, and both seats see the update', () => {
  const store = createRoomStore();
  const host = store.create();
  assert.match(host.code, /^[A-HJ-NP-Z2-9]{4}$/);
  assert.equal(host.seat, 'student');
  assert.deepEqual(store.status(host.code), { exists: true, full: false, phase: 'lobby' });

  const seen = [];
  const unsubscribe = store.subscribe(host.code, host.token, (event, data) => seen.push([event, JSON.parse(data)]));
  assert.equal(seen.at(-1)[1].seats.guide.joined, false);

  const guest = store.join(host.code);
  assert.equal(guest.seat, 'guide');
  assert.notEqual(guest.token, host.token);
  assert.equal(seen.at(-1)[1].phase, 'opening');
  assert.equal(seen.at(-1)[1].seats.guide.joined, true);

  assert.deepEqual(store.join(host.code), { error: 'full' });
  assert.deepEqual(store.join('ZZZZ'), { error: 'not-found' });
  unsubscribe();
});

test('a bad token cannot subscribe and snapshots never expose tokens', () => {
  const store = createRoomStore();
  const host = store.create();
  assert.equal(store.subscribe(host.code, 'nope', () => {}), null);
  const seen = [];
  store.subscribe(host.code, host.token, (event, data) => seen.push(data));
  assert.ok(!seen[0].includes(host.token));
});

test('presence follows connections and codes are case-insensitive', () => {
  const store = createRoomStore();
  const host = store.create();
  const seen = [];
  const unsubscribe = store.subscribe(host.code.toLowerCase(), host.token, (e, d) => seen.push(JSON.parse(d)));
  assert.equal(seen.at(-1).seats.student.online, true);
  unsubscribe();
  assert.equal(store.status(host.code).exists, true);
});

test('HTTP API: create, status, join, events and error codes', async () => {
  const handle = createRoomHandler();
  const server = http.createServer((req, res) => {
    if (!handle(req, res, new URL(req.url, 'http://x'))) { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const created = await (await fetch(`${base}/api/rooms`, { method: 'POST' })).json();
    assert.ok(created.code && created.token);
    assert.equal((await (await fetch(`${base}/api/rooms/${created.code}`)).json()).exists, true);
    assert.equal((await fetch(`${base}/api/rooms/NOPE`)).status, 200);
    assert.equal((await fetch(`${base}/api/rooms/ab`)).status, 404);

    const controller = new AbortController();
    const stream = await fetch(`${base}/api/rooms/${created.code}/events?token=${created.token}`, { signal: controller.signal });
    assert.match(stream.headers.get('content-type'), /text\/event-stream/);
    const reader = stream.body.getReader();
    let text = '';
    const readUntil = async needle => {
      while (!text.includes(needle)) text += new TextDecoder().decode((await reader.read()).value);
    };
    await readUntil('"phase":"lobby"');

    const joined = await fetch(`${base}/api/rooms/${created.code}/join`, { method: 'POST' });
    assert.equal(joined.status, 200);
    await readUntil('"phase":"opening"');
    assert.equal((await fetch(`${base}/api/rooms/${created.code}/join`, { method: 'POST' })).status, 409);
    controller.abort();
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
});

test('profiles are unique per seat and both ready flags start the game with a shared seed', () => {
  const store = createRoomStore();
  const host = store.create();
  const guest = store.join(host.code);
  const seen = [];
  store.subscribe(host.code, host.token, (e, d) => seen.push(JSON.parse(d)));

  assert.deepEqual(store.setProfile(host.code, host.token, { name: 'Ana', avatar: '/assets/avatars/a.png' }), { ok: true });
  assert.deepEqual(store.setProfile(host.code, guest.token, { name: 'Bo', avatar: '/assets/avatars/a.png' }), { error: 'taken' });
  assert.deepEqual(store.setProfile(host.code, 'bad', { name: 'X', avatar: '/assets/a.png' }), { error: 'denied' });
  assert.deepEqual(store.setProfile(host.code, guest.token, { name: 'Bo', avatar: '/assets/avatars/b.png' }), { ok: true });

  store.setReady(host.code, host.token, true);
  assert.notEqual(seen.at(-1).phase, 'playing');
  assert.deepEqual(store.setProfile(host.code, host.token, { name: 'Ana2', avatar: '/assets/avatars/a.png' }), { error: 'locked' });
  store.setReady(host.code, guest.token, true);
  assert.equal(seen.at(-1).phase, 'playing');
  assert.ok(Number.isInteger(seen.at(-1).seed));
  assert.equal(seen.at(-1).seats.guide.name, 'Bo');
});
test('relay forwards only allowed game actions to the other seat once playing', () => {
  const store = createRoomStore();
  const host = store.create();
  const guest = store.join(host.code);
  const hostSeen = [], guestSeen = [];
  store.subscribe(host.code, host.token, (e, d) => hostSeen.push([e, JSON.parse(d)]));
  store.subscribe(host.code, guest.token, (e, d) => guestSeen.push([e, JSON.parse(d)]));
  assert.deepEqual(store.relay(host.code, host.token, { a: 'judge', s: 'GOOD' }), { error: 'locked' });
  store.setReady(host.code, host.token, true);
  store.setReady(host.code, guest.token, true);
  assert.deepEqual(store.relay(host.code, guest.token, { a: 'judge', s: 'FAIR' }), { ok: true });
  assert.deepEqual(hostSeen.at(-1), ['act', { from: 'guide', a: 'judge', s: 'FAIR', v: null }]);
  assert.ok(!guestSeen.some(([e]) => e === 'act'));
  assert.deepEqual(store.relay(host.code, guest.token, { a: 'explode' }), { error: 'bad-request' });
  assert.deepEqual(store.relay(host.code, 'nope', { a: 'judge' }), { error: 'denied' });
});