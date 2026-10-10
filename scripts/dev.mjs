import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRoomHandler } from "./rooms.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 5173);
const mime = {
  ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".svg":"image/svg+xml",
  ".png":"image/png",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".webp":"image/webp",
  ".json":"application/json; charset=utf-8",
  ".mp4":"video/mp4",
  ".wav":"audio/wav",
  ".mp3":"audio/mpeg"
};

const handleRooms = createRoomHandler();

const server = http.createServer((req,res)=>{
  try {
    if (handleRooms(req, res, new URL(req.url, `http://${req.headers.host}`))) return;
    const pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
    const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    if (!/^(index\.html|src\/|assets\/)/.test(relative)) {
      res.writeHead(404); return res.end("Not found");
    }
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403); return res.end("Forbidden");
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); return res.end("Not found");
    }
    const type = mime[path.extname(file).toLowerCase()] || "application/octet-stream";
    const cache = pathname.startsWith("/assets/") ? "public, max-age=86400" : "no-store";
    const size = fs.statSync(file).size;
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    if (range && (range[1] || range[2])) {
      const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      if (start > end || start >= size) {
        res.writeHead(416, {"Content-Range": `bytes */${size}`}); return res.end();
      }
      res.writeHead(206, {"Content-Type": type, "Cache-Control": cache, "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": end - start + 1});
      return fs.createReadStream(file, {start, end}).pipe(res);
    }
    res.writeHead(200, {"Content-Type": type, "Cache-Control": cache, "Accept-Ranges": "bytes", "Content-Length": size});
    fs.createReadStream(file).pipe(res);
  } catch {
    res.writeHead(500); res.end("Server error");
  }
});

// Hosts such as Render set PORT and need all interfaces; locally it stays on 127.0.0.1.
const host = process.env.HOST || (process.env.PORT ? "0.0.0.0" : "127.0.0.1");
server.listen(port, host, ()=>{
  console.log(`QUEST dev server: http://localhost:${port}`);
});
