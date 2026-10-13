// GSJ シームレス地質図の凡例 API を中継する（Cloudflare Pages Functions。/api/geology で動く）。
// ふだんはブラウザから GSJ に直接取りに行く（CORS は許可されている）。直接届かなかったときだけ script.js がここを使う。
// 手元では local-server.cjs が同じ道で同じことをする。問い合わせの形を変えたら両方を直すこと。
const API = "https://gbank.gsj.jp/seamless/v2/api/1.3/legend.json";
const NUMBER = "-?\\d+(\\.\\d+)?";
const BOX = new RegExp(`^${NUMBER},${NUMBER},${NUMBER},${NUMBER}$`);
const POINT = new RegExp(`^${NUMBER},${NUMBER}$`);

export async function onRequestGet({ request }) {
  const params = new URL(request.url).searchParams;
  const box = params.get("box") || "";
  const point = params.get("point") || "";

  let query;
  if (BOX.test(box)) {
    query = `box=${encodeURIComponent(box)}`;
  } else if (POINT.test(point)) {
    query = `point=${encodeURIComponent(point)}`;
  } else {
    return json({ error: "box must be south,west,north,east or point must be lat,lng" }, 400);
  }

  try {
    const response = await fetch(`${API}?${query}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) {
      return json({ error: `geology API returned ${response.status}` }, 502);
    }
    return new Response(await response.text(), {
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  } catch {
    return json({ error: "failed to fetch geology API" }, 502);
  }
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
