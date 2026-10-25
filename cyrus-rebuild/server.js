// MahiCloud static server for Node 18+ hosting (including Render).
// AI requests go directly to the authenticated Supabase Edge Function.
// Never put AI-provider credentials in this server or in public/ files.
//
// Speed upgrades vs. the previous version:
//   - Brotli/gzip compression, computed once per file and kept in memory (~70-80% smaller JS/CSS/HTML)
//   - ETag + 304 responses: unchanged files cost almost nothing on repeat visits
//   - keep-alive tuned for Render's proxy (the old 5s value caused dropped connections / retries)
const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const SUPABASE_URL = (process.env.SUPABASE_URL || "https://husydmiujigyonlxbuuj.supabase.co").replace(/\/+$/, "");
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_zzAitNIGOutgaS5EGZKfrQ_osRrlu8U";
const PUBLIC_DIR = path.resolve(__dirname, "public");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".json": "application/json; charset=utf-8"
};
const COMPRESSIBLE = /\.(?:html?|js|css|json|svg)$/i;
const REVALIDATE = /\.(?:html?|js|css|json)$/i;
const SECURITY = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(self), geolocation=()"
};

function send(res, status, body, type) {
  res.writeHead(status, { ...SECURITY, "Content-Type": type || "text/plain; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}

// filePath -> { mtimeMs, size, etag, raw, br, gzip }
const cache = new Map();
const MAX_CACHED_BYTES = 2 * 1024 * 1024;

function loadEntry(filePath, stat, done) {
  const hit = cache.get(filePath);
  if (hit && hit.mtimeMs === stat.mtimeMs && hit.size === stat.size) return done(null, hit);
  fs.readFile(filePath, (error, raw) => {
    if (error) return done(error);
    const entry = { mtimeMs: stat.mtimeMs, size: stat.size, raw, etag: '"' + crypto.createHash("sha1").update(raw).digest("hex").slice(0, 20) + '"' };
    if (COMPRESSIBLE.test(filePath) && raw.length > 512) {
      try {
        entry.br = zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: raw.length } });
        entry.gzip = zlib.gzipSync(raw, { level: 6 });
      } catch (_) { /* fall back to uncompressed */ }
    }
    if (raw.length <= MAX_CACHED_BYTES) cache.set(filePath, entry);
    done(null, entry);
  });
}

function readRequestJson(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let total = 0;
    let tooLarge = false;
    const chunks = [];
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        tooLarge = true;
        chunks.length = 0;
      } else if (!tooLarge) chunks.push(chunk);
    });
    req.on("end", () => {
      if (tooLarge) {
        const error = new Error("Request body is too large.");
        error.statusCode = 413;
        return reject(error);
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (_) {
        const error = new Error("Invalid JSON request body.");
        error.statusCode = 400;
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

async function proxyChat(req, res) {
  const authorization = String(req.headers.authorization || "").trim();
  if (authorization.length > 8192 || !/^Bearer\s+\S+$/i.test(authorization)) {
    return send(res, 401, JSON.stringify({ error: "Your Supabase session is missing. Reload the page and try again." }), "application/json; charset=utf-8");
  }
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return send(res, 503, JSON.stringify({ error: "The chat service is not configured." }), "application/json; charset=utf-8");
  }

  let input;
  try {
    input = await readRequestJson(req, 1500000);
  } catch (error) {
    const status = error && error.statusCode === 413 ? 413 : 400;
    return send(res, status, JSON.stringify({ error: error.message || "Invalid request." }), "application/json; charset=utf-8");
  }

  if (!input || !Array.isArray(input.messages) || input.messages.length < 1 || input.messages.length > 36) {
    return send(res, 400, JSON.stringify({ error: "Send a valid conversation with 1 to 36 messages." }), "application/json; charset=utf-8");
  }
  const messages = [];
  let totalChars = 0;
  for (const item of input.messages) {
    if (!item || !["user", "assistant"].includes(item.role) || typeof item.content !== "string" || item.content.length > 30000) {
      return send(res, 400, JSON.stringify({ error: "A message is invalid or too long." }), "application/json; charset=utf-8");
    }
    const content = item.content.trim();
    if (content) {
      totalChars += content.length;
      messages.push({ role: item.role, content });
    }
  }
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return send(res, 400, JSON.stringify({ error: "The latest message must be from the user." }), "application/json; charset=utf-8");
  }
  if (totalChars > 120000) {
    return send(res, 413, JSON.stringify({ error: "Trim your message history and try again." }), "application/json; charset=utf-8");
  }

  const requestBody = {
    conversation_id: null,
    temporary_chat: true,
    custom_instructions: typeof input.custom_instructions === "string" ? input.custom_instructions.slice(0, 3000) : "",
    response_style: ["default", "friendly", "concise", "detailed", "professional"].includes(input.response_style) ? input.response_style : "default",
    messages,
    attachments: []
  };
  const controller = new AbortController();
  const onClientClose = () => { if (!res.writableEnded) controller.abort(); };
  const timeout = setTimeout(() => controller.abort(), 120000);
  res.on("close", onClientClose);

  try {
    // Server-to-server call has no browser Origin header, so the Edge Function's
    // existing CORS allowlist does not need to be weakened or expanded.
    const upstream = await fetch(SUPABASE_URL + "/functions/v1/mahi-ai-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_PUBLISHABLE_KEY,
        "Authorization": authorization
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    const contentType = upstream.headers.get("content-type") || "application/json; charset=utf-8";
    if (!upstream.ok) {
      const body = (await upstream.text()).slice(0, 5000);
      return send(res, upstream.status, body || JSON.stringify({ error: "The AI service rejected the request." }), contentType);
    }
    if (!upstream.body) {
      return send(res, 502, JSON.stringify({ error: "The AI service returned no response stream." }), "application/json; charset=utf-8");
    }
    res.writeHead(upstream.status, {
      ...SECURITY,
      "Content-Type": contentType,
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no"
    });
    for await (const chunk of upstream.body) {
      if (res.destroyed) break;
      if (!res.write(Buffer.from(chunk))) await new Promise((resolve) => res.once("drain", resolve));
    }
    if (!res.destroyed && !res.writableEnded) res.end();
  } catch (error) {
    if (res.destroyed) return;
    if (res.headersSent) {
      res.destroy();
      return;
    }
    const timedOut = controller.signal.aborted;
    console.error("AI proxy request failed:", error && error.name ? error.name : "UnknownError");
    return send(res, timedOut ? 504 : 502, JSON.stringify({
      error: timedOut ? "The AI request timed out or was cancelled." : "Could not reach the AI service. Try again shortly."
    }), "application/json; charset=utf-8");
  } finally {
    clearTimeout(timeout);
    res.off("close", onClientClose);
  }
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch (_) {
    return send(res, 400, "Bad request");
  }
  // Reject path bytes that can make filesystem APIs throw synchronously or that
  // proxies and Node may interpret differently.
  if (pathname.includes("\0") || pathname.includes("\\")) return send(res, 400, "Bad request");
  if (pathname === "/api/chat") {
    if (req.method !== "POST") return send(res, 405, "Method not allowed");
    void proxyChat(req, res);
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method not allowed");
  if (pathname === "/healthz") {
    if (req.method === "HEAD") {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      return res.end();
    }
    return send(res, 200, "ok");
  }
  if (pathname === "/") pathname = "/index.html";
  const filePath = path.resolve(PUBLIC_DIR, "." + pathname);
  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== path.join(PUBLIC_DIR, "index.html")) return send(res, 403, "Forbidden");

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) return send(res, 404, "Not found");
    loadEntry(filePath, stat, (error, entry) => {
      if (error) return send(res, 404, "Not found");
      const ext = path.extname(filePath).toLowerCase();
      const headers = {
        ...SECURITY,
        "Content-Type": MIME[ext] || "application/octet-stream",
        "ETag": entry.etag,
        "Vary": "Accept-Encoding",
        // Code is revalidated (cheap 304 thanks to the ETag); images/fonts are cached for a day.
        "Cache-Control": REVALIDATE.test(pathname) ? "no-cache" : "public, max-age=86400"
      };
      if (req.headers["if-none-match"] === entry.etag) {
        res.writeHead(304, headers);
        return res.end();
      }
      const accept = String(req.headers["accept-encoding"] || "");
      let body = entry.raw;
      if (entry.br && /\bbr\b/.test(accept)) { body = entry.br; headers["Content-Encoding"] = "br"; }
      else if (entry.gzip && /\bgzip\b/.test(accept)) { body = entry.gzip; headers["Content-Encoding"] = "gzip"; }
      headers["Content-Length"] = body.length;
      res.writeHead(200, headers);
      res.end(req.method === "HEAD" ? undefined : body);
    });
  });
});

server.requestTimeout = 15000;
// Must be longer than the proxy's idle timeout, otherwise Render's proxy reuses sockets Node already closed.
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.maxHeadersCount = 100;

server.listen(PORT, "0.0.0.0", () => console.log("Cyrus web server listening on port " + PORT));
