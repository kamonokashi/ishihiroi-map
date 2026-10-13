// 「見つけた／探したけど無かった」の記録。本番（functions/api/reports.js、D1）と手元（local-server.cjs、node:sqlite）で共通の中身。
// 表の形は db/schema.sql。
//
// アカウントは使わない。ブラウザが最初に作るランダムな番号（client id）で人を区別する。
// 同じ人・同じ石・同じ区画（緯度経度0.01度、およそ1km四方）の記録は1件にまとめ、押し直せば上書き、もう一度押せば取り消し。
//
// 位置は「調べた地点」で、端末の現在地ではない。それでも行き先がわかるので、
// 返すのは区画ごとの人数だけにして、ほかの人の記録の位置や番号は出さない。
// 保存する座標も0.001度（およそ100m）に丸める。
//
// db は { all(sql, params), run(sql, params) } の形で渡す（どちらも Promise を返す）。

const CLIENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ROCK_ID = /^[a-z0-9-]{1,40}$/;
const LEVELS = new Set(["likely", "maybe", "rare"]);
// 1人が1時間に書ける数。連打や機械的な書き込みを止めるため（ふつうに使えば届かない）
const WRITES_PER_HOUR = 120;

export async function handleReports({ method, url, headers, body, db }) {
  const clientId = (headers.get("x-client-id") || "").toLowerCase();
  if (!CLIENT_ID.test(clientId)) {
    return reply(400, { error: "x-client-id header is required" });
  }

  if (method === "GET") {
    const point = parsePoint(url.searchParams.get("lat"), url.searchParams.get("lng"));
    if (!point) {
      return reply(400, { error: "lat and lng are required" });
    }
    return reply(200, await summary(db, cellOf(point), clientId));
  }

  if (method === "POST" || method === "DELETE") {
    const input = body || {};
    const point = parsePoint(input.lat, input.lng);
    if (!point || !ROCK_ID.test(String(input.rock || ""))) {
      return reply(400, { error: "rock, lat and lng are required" });
    }
    const cell = cellOf(point);

    if (method === "DELETE") {
      await db.run("DELETE FROM reports WHERE client_id = ? AND rock_id = ? AND cell = ?", [clientId, input.rock, cell]);
      return reply(200, await summary(db, cell, clientId));
    }

    if (typeof input.found !== "boolean") {
      return reply(400, { error: "found must be true or false" });
    }
    const now = Date.now();
    const [{ recent }] = await db.all(
      "SELECT COUNT(*) AS recent FROM reports WHERE client_id = ? AND updated_at > ?",
      [clientId, now - 60 * 60 * 1000]
    );
    if (recent >= WRITES_PER_HOUR) {
      return reply(429, { error: "too many reports" });
    }

    await db.run(
      `INSERT INTO reports (client_id, rock_id, cell, lat, lng, found, level, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (client_id, rock_id, cell) DO UPDATE SET
         lat = excluded.lat, lng = excluded.lng, found = excluded.found,
         level = excluded.level, updated_at = excluded.updated_at`,
      [
        clientId, input.rock, cell,
        round(point.lat, 3), round(point.lng, 3),
        input.found ? 1 : 0,
        LEVELS.has(input.level) ? input.level : null,
        now, now
      ]
    );
    return reply(200, await summary(db, cell, clientId));
  }

  return reply(405, { error: "method not allowed" });
}

// その区画の、石ごとの人数と、自分の記録
async function summary(db, cell, clientId) {
  const rows = await db.all(
    `SELECT rock_id,
            SUM(found) AS found,
            SUM(1 - found) AS missing,
            MAX(CASE WHEN client_id = ? THEN found + 1 END) AS mine
       FROM reports WHERE cell = ? GROUP BY rock_id`,
    [clientId, cell]
  );
  const counts = {};
  const mine = {};
  rows.forEach((row) => {
    counts[row.rock_id] = { found: Number(row.found), missing: Number(row.missing) };
    if (row.mine !== null && row.mine !== undefined) {
      mine[row.rock_id] = Number(row.mine) === 2 ? "found" : "missing";
    }
  });
  return { cell, counts, mine };
}

// 日本の範囲だけ受け付ける（ざっくり。沖ノ鳥島〜択捉島、与那国島〜南鳥島）
function parsePoint(lat, lng) {
  const point = { lat: Number(lat), lng: Number(lng) };
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
    return null;
  }
  if (point.lat < 20 || point.lat > 46 || point.lng < 122 || point.lng > 154) {
    return null;
  }
  return point;
}

export function cellOf({ lat, lng }) {
  return `${round(lat, 2).toFixed(2)},${round(lng, 2).toFixed(2)}`;
}

function round(value, digits) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function reply(status, body) {
  return { status, body };
}
