// A tiny static server: workers with type "module" don't load from file://, so the page needs http.
// Run: node serve.mjs   then open http://localhost:5173
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const types = { ".html": "text/html", ".js": "text/javascript", ".wav": "audio/wav", ".mp3": "audio/mpeg" };
const root = import.meta.dirname;

createServer(async (req, res) => {
  const path = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname.replace(/\/$/, "/index.html")));
  try {
    res.writeHead(200, { "Content-Type": types[extname(path)] ?? "application/octet-stream" });
    res.end(await readFile(path));
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(5173, () => console.log("http://localhost:5173"));
