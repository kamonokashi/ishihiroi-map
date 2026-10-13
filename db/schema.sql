-- 「見つけた／探したけど無かった」の記録（lib/reports.js）。
-- 本番は Cloudflare D1 のコンソールでこのまま実行する。手元は local-server.cjs が起動時に流す。
-- 何度流しても壊れないよう、すべて IF NOT EXISTS にしておく。

CREATE TABLE IF NOT EXISTS reports (
  client_id TEXT NOT NULL,     -- ブラウザが作るランダムな番号（アカウントではない）
  rock_id TEXT NOT NULL,       -- data/rocks.json の id
  cell TEXT NOT NULL,          -- 調べた地点を0.01度（約1km）に丸めた "35.68,139.77"。同じ人・同じ石はこの単位で1件
  lat REAL NOT NULL,           -- 調べた地点。0.001度（約100m）に丸めて保存
  lng REAL NOT NULL,
  found INTEGER NOT NULL,      -- 1 = 見つけた、0 = 探したけど無かった
  level TEXT,                  -- そのとき表示していた見つかる度（likely / maybe / rare）。推定の答え合わせ用
  created_at INTEGER NOT NULL, -- ミリ秒
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (client_id, rock_id, cell)
);

CREATE INDEX IF NOT EXISTS reports_cell ON reports (cell);
CREATE INDEX IF NOT EXISTS reports_client_updated ON reports (client_id, updated_at);
