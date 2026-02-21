import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.RELAY_PAGE_PORT || 5500);
const ROOT = path.dirname(fileURLToPath(import.meta.url));

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function toSafeRelativePath(rawPathname) {
  const pathname = rawPathname === "/" ? "/relay.html" : rawPathname;
  const decoded = decodeURIComponent(pathname);
  const normalized = path.posix.normalize(decoded);
  if (normalized.includes("..")) return null;
  return normalized.replace(/^\/+/, "");
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const relativePath = toSafeRelativePath(requestUrl.pathname);
    if (!relativePath) {
      res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      res.end("Invalid path");
      return;
    }

    const absolutePath = path.join(ROOT, relativePath);
    const content = await fs.readFile(absolutePath);
    const extension = path.extname(absolutePath).toLowerCase();
    const mime = MIME_TYPES[extension] || "application/octet-stream";

    res.writeHead(200, {
      "content-type": mime,
      "cache-control": "no-store",
    });
    res.end(content);
  } catch (error) {
    if (error?.code === "ENOENT") {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("Server error");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[relay-page] http://127.0.0.1:${PORT}`);
});
