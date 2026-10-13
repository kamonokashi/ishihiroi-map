// 「見つけた／探したけど無かった」の記録（Cloudflare Pages Functions、/api/reports）。中身は lib/reports.js。
// D1 のデータベースを、Pages の設定（Settings → Bindings）で変数名 DB として結びつけておくこと。表は db/schema.sql。
import { handleReports } from "../../lib/reports.js";

export async function onRequest({ request, env }) {
  if (!env.DB) {
    return json(503, { error: "database is not bound" });
  }

  let body = null;
  if (request.method === "POST" || request.method === "DELETE") {
    try {
      body = await request.json();
    } catch {
      return json(400, { error: "invalid json" });
    }
  }

  const db = {
    all: async (sql, params) => (await env.DB.prepare(sql).bind(...params).all()).results,
    run: async (sql, params) => env.DB.prepare(sql).bind(...params).run()
  };

  const { status, body: result } = await handleReports({
    method: request.method,
    url: new URL(request.url),
    headers: request.headers,
    body,
    db
  });
  return json(status, result);
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
