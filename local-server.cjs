const http = require("http");
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const port = Number(process.env.PORT || 8000);
const host = "127.0.0.1";
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

// 本番の functions/api/geology.js と同じ中継。GSJ API に直接届かないときに script.js が使う
const GEOLOGY_API = "https://gbank.gsj.jp/seamless/v2/api/1.3/legend.json";
const NUMBER = "-?\\d+(\\.\\d+)?";
const BOX = new RegExp(`^${NUMBER},${NUMBER},${NUMBER},${NUMBER}$`);
const POINT = new RegExp(`^${NUMBER},${NUMBER}$`);

async function proxyGeology(url, response) {
  const send = (status, body) => {
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    response.end(body);
  };

  const box = url.searchParams.get("box") || "";
  const point = url.searchParams.get("point") || "";
  let query;
  if (BOX.test(box)) {
    query = `box=${encodeURIComponent(box)}`;
  } else if (POINT.test(point)) {
    query = `point=${encodeURIComponent(point)}`;
  } else {
    send(400, JSON.stringify({ error: "box must be south,west,north,east or point must be lat,lng" }));
    return;
  }

  try {
    const upstream = await fetch(`${GEOLOGY_API}?${query}`, { signal: AbortSignal.timeout(12000) });
    if (!upstream.ok) {
      send(502, JSON.stringify({ error: `geology API returned ${upstream.status}` }));
      return;
    }
    send(200, await upstream.text());
  } catch {
    send(502, JSON.stringify({ error: "failed to fetch geology API" }));
  }
}

// 本番の functions/api/reports.js（D1）の代わりに、node:sqlite で同じ表を持つ。中身（lib/reports.js）は本番と共通。
// データは .local/reports.sqlite（git には入れない）
let reportsDb = null;
function openReportsDb() {
  if (!reportsDb) {
    const { DatabaseSync } = require("node:sqlite");
    fs.mkdirSync(path.join(root, ".local"), { recursive: true });
    const sqlite = new DatabaseSync(path.join(root, ".local", "reports.sqlite"));
    sqlite.exec(fs.readFileSync(path.join(root, "db", "schema.sql"), "utf8"));
    reportsDb = {
      all: async (sql, params) => sqlite.prepare(sql).all(...params),
      run: async (sql, params) => sqlite.prepare(sql).run(...params)
    };
  }
  return reportsDb;
}

async function handleReportsRequest(request, url, response) {
  const send = (status, body) => {
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    response.end(JSON.stringify(body));
  };

  let body = null;
  if (request.method === "POST" || request.method === "DELETE") {
    const chunks = [];
    for await (const chunk of request) {
      chunks.push(chunk);
    }
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      send(400, { error: "invalid json" });
      return;
    }
  }

  try {
    const { handleReports } = await import("./lib/reports.js");
    const result = await handleReports({
      method: request.method,
      url,
      headers: new Headers(request.headers),
      body,
      db: openReportsDb()
    });
    send(result.status, result.body);
  } catch (error) {
    console.error(error);
    send(500, { error: "failed to handle reports" });
  }
}

http.createServer((request, response) => {
  const url = new URL(request.url, `http://${host}`);
  if (url.pathname === "/api/geology") {
    proxyGeology(url, response);
    return;
  }
  if (url.pathname === "/api/reports") {
    handleReportsRequest(request, url, response);
    return;
  }

  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") {
    pathname = "/index.html";
  }

  const filePath = path.join(root, pathname);
  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": types[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(data);
  });
}).listen(port, host, () => {
  console.log(`Serving http://${host}:${port}`);
});
