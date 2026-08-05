const API_BASE = "https://gbank.gsj.jp/seamless/v2/api/1.3";
const PROXY_URL = "api/geology.php";
const DEFAULT_CENTER = [35.681236, 139.767125];
const DEFAULT_ZOOM = 11;

// 周辺の地質を見る範囲。緯度0.01度でおよそ1.1km。±1 → 4 → 11 → 28 → 55km。
// 日本の川は50km以上も石を運ぶので、いちばん外側は下流部のための段階。
const NEARBY_STEPS = [0.01, 0.04, 0.1, 0.25, 0.5];

// 候補の強さ。クリック地点そのものの地質を主役に、周辺は控えめに効かせる。
const SCORE_AT_POINT = 1;
const SCORE_VOLCANIC_FALL = 0.55;

// 足もとが岩盤のときは、その岩相が答えそのもの。ただし岩盤の上に立っていても
// 少し歩けば川や別の地層に届くので、周辺3段階までは候補に含める。
const NEARBY_FACTORS = [0.55, 0.42, 0.28];
const BEDROCK_LAST_STEP = NEARBY_FACTORS.length - 1;

// 未固結の堆積地では、その場の地質ではなく運ばれてくる石が主役になる。
// 川の石は何十kmも上流から来るので全段階を重ね、遠いほど確からしさを下げる。
const CARRIED_FACTORS = [0.75, 0.5, 0.34, 0.24, 0.18];
const CARRIED_LAST_STEP = 3;

// いちばん外側(±55km)はAPIの応答に10秒以上かかる。大河川の下流のように
// ここまで広げないと候補が出ない場所でだけ使う。
const WIDEST_STEP = 4;
const WIDEN_WHEN_FEWER_THAN = 6;

const LEVEL_LIKELY = 0.75;
const LEVEL_MAYBE = 0.4;
// これ未満は、遠くにわずかに分布するだけで実際に拾える見込みが薄い。
const ROCK_FLOOR = 0.15;
// その場所の最有力候補に対してこの割合以上なら「見つかるかも」に上げる。
// 最有力が 0.67 を超える場所では絶対値の判定が先に効くので、この規則は
// 岩盤がどこも遠い場所でだけ働く。
const LEVEL_RELATIVE = 0.6;

// 川に運ばれるあいだに残りやすいか。未固結堆積地の推定でだけ効かせる。
const DURABILITY = {
  chert: 1.15,
  hornfels: 1.1,
  granite: 1.05,
  granodiorite: 1.05,
  diorite: 1.05,
  gabbro: 1.05,
  andesite: 1.05,
  basalt: 1.05,
  amphibolite: 1.05,
  "siliceous-schist": 1.05,
  sandstone: 1,
  rhyolite: 1,
  dacite: 1,
  gneiss: 1,
  greenstone: 1,
  peridotite: 0.95,
  trachyte: 0.95,
  mylonite: 0.95,
  serpentinite: 0.9,
  limestone: 0.85,
  "welded-tuff": 0.85,
  schist: 0.85,
  "mafic-schist": 0.85,
  "pelitic-schist": 0.8,
  slate: 0.8,
  marble: 0.8,
  conglomerate: 0.8,
  phyllite: 0.75,
  mudstone: 0.65,
  tuff: 0.55
};

const text = {
  loading: "調べています",
  inspect: "ここを調べる！",
  fetching: "地質情報を取得しています。",
  noRocks: "見つかる石を推定できませんでした。地質を見るタブで取得結果を確認できます。",
  noGeology: "この範囲では地質情報が見つかりませんでした。",
  fetchFailed: "地質情報を取得できませんでした。CORSの場合はPHPプロキシで確認してください。",
  dataFailed: "石のデータを読み込めませんでした。ローカルサーバー経由で開いているか確認してください。",
  selectedTitle: "選択地点",
  pressInspect: "「ここを調べる！」を押すと、この場所で見つかる石を表示します。",
  addressLoading: "住所を確認しています",
  addressUnavailable: "住所を取得できませんでした",
  likely: "よく見つかる",
  maybe: "見つかるかも",
  rare: "珍しい",
  candidate: "候補",
  details: "詳細を見る",
  noDetails: "簡易情報は未登録です。",
  currentFailed: "現在地を取得できませんでした。地図をクリックして場所を選んでください。",
  currentUnsupported: "このブラウザでは現在地を取得できません。",
  searchNotFound: "検索結果が見つかりませんでした。",
  searchFailed: "検索に失敗しました。函館、筑波山、東京駅は固定候補として検索できます。",
  geologyToggle: "地質図表示",
  geologyUnavailable: "地質情報なし",
  lithologyUnavailable: "岩相情報なし",
  ageUnavailable: "時代情報なし",
  atPoint: "この地点の地質",
  nearby: "周辺の地質",
  carried: "運ばれてくる石",
  upstream: "上流から流れてくる石"
};

// 未固結の堆積物ごとの説明。ここでは足もとの地質ではなく、石の来た場所を伝える。
const looseNotes = {
  river: "ここは川沿いの低地です。足もとにあるのは固まった岩石ではなく、上流から運ばれてきた石や砂です。川は遠くの山からも石を運んでくるので、",
  coast: "ここは海岸や砂丘の堆積地です。石は川や海流に乗って遠くからも集まります。そのため、",
  terrace: "ここは段丘、つまり昔の川原が台地として残った場所です。当時の川が上流から運んだ石が埋まっています。そのため、",
  slope: "ここは扇状地や崖錐です。すぐ上の斜面から崩れ落ちた石が積もっていますが、川がさらに上流の石も運び込みます。そのため、",
  volcanic: "ここは火山の噴出物が積もった場所です。火山由来の石に加えて、運ばれてきた石も候補にしています。",
  other: "ここは未固結の堆積物です。足もとの石は他の場所から運ばれてきたものなので、",
  artificial: "ここは盛り土や埋立地です。地面は人の手で運ばれた土砂なので、地質図からは足もとの石を決められません。参考として、"
};

const pointUnknownNote = "クリック地点の地質を特定できませんでした。";

let map;
let marker;
let geologyLayer;
let clickedLatLng = null;
let rockCatalog = new Map();
let lithologyMap = null;
let legendIndex = null;
let minerals = [];
let catalogReady = false;
let inspectInProgress = false;
let selectedAddressRequestId = 0;
let inspectRequestId = 0;

const selectedPoint = document.querySelector("#selectedPoint");
const inspectPopupOverlay = document.querySelector("#inspectPopupOverlay");
const appShell = document.querySelector("#appShell");
const mapCollapseButton = document.querySelector("#mapCollapseButton");
const mapRestoreButton = document.querySelector("#mapRestoreButton");
const rockCards = document.querySelector("#rockCards");
const geologyList = document.querySelector("#geologyList");
const rocksPanel = document.querySelector("#rocksPanel");
const geologyPanel = document.querySelector("#geologyPanel");
const rocksTab = document.querySelector("#rocksTab");
const geologyTab = document.querySelector("#geologyTab");

window.addEventListener("DOMContentLoaded", async () => {
  initMap();
  bindUi();
  await loadData();
});

function initMap() {
  L.Icon.Default.imagePath = "https://unpkg.com/leaflet@1.9.4/dist/images/";

  map = L.map("map", {
    zoomControl: false
  }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

  L.control.zoom({ position: "bottomleft" }).addTo(map);

  L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png", {
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noreferrer">GSI Tiles</a>',
    maxZoom: 18
  }).addTo(map);

  geologyLayer = L.tileLayer(`${API_BASE}/tiles/{z}/{y}/{x}.png?layer=glfs`, {
    attribution: '<a href="https://gbank.gsj.jp/seamless/v2/api/1.3/" target="_blank" rel="noreferrer">GSJ Seamless Geology V2</a>',
    maxNativeZoom: 13,
    maxZoom: 18,
    opacity: 0.78,
    zIndex: 300
  });

  geologyLayer.on("tileerror", (event) => {
    console.warn("GSJ geology tile failed:", event.tile.currentSrc || event.tile.src, event);
  });

  geologyLayer.addTo(map);
  addGeologyControl();

  map.on("click", (event) => selectPoint(event.latlng));
  map.on("move zoom zoomend", updateInspectPopupPosition);
  setTimeout(() => map.invalidateSize(), 0);
}

function addGeologyControl() {
  const GeologyControl = L.Control.extend({
    options: { position: "topright" },
    onAdd() {
      const container = L.DomUtil.create("div", "leaflet-control geology-control");
      container.innerHTML = `
        <label>
          <input id="geologyLayerToggle" type="checkbox" checked>
          <span>${text.geologyToggle}</span>
        </label>
      `;
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);

      const input = container.querySelector("input");
      input.addEventListener("change", (event) => {
        if (event.target.checked) {
          geologyLayer.addTo(map);
          console.info("GSJ geology layer enabled.");
        } else {
          map.removeLayer(geologyLayer);
          console.info("GSJ geology layer disabled.");
        }
      });

      return container;
    }
  });

  map.addControl(new GeologyControl());
}

function bindUi() {
  [".map-selected-place", ".map-tools", ".map-collapse-button", ".map-restore-button"].forEach((selector) => {
    const element = document.querySelector(selector);
    if (element) {
      L.DomEvent.disableClickPropagation(element);
      L.DomEvent.disableScrollPropagation(element);
    }
  });

  document.querySelector("#locateButton").addEventListener("click", locateUser);
  document.querySelector("#searchForm").addEventListener("submit", searchPlace);
  mapCollapseButton.addEventListener("click", () => setMapCollapsed(true));
  mapRestoreButton.addEventListener("click", () => setMapCollapsed(false));
  rocksTab.addEventListener("click", () => activateTab("rocks"));
  geologyTab.addEventListener("click", () => activateTab("geology"));

  // 開いた説明をどの行の下に敷くかは列数で決まるので、パネルの幅が変われば測り直す。
  // 高さは差し込んだ結果として変わるだけなので、幅を見ないと無限に呼び合う。
  if (typeof ResizeObserver === "function") {
    let lastWidth = 0;
    new ResizeObserver((entries) => {
      const width = Math.round(entries[0].contentRect.width);
      if (width !== lastWidth) {
        lastWidth = width;
        layoutRockDetails();
      }
    }).observe(rockCards);
  }
}

function setMapCollapsed(collapsed) {
  appShell.classList.toggle("map-collapsed", collapsed);
  mapCollapseButton.setAttribute("aria-expanded", String(!collapsed));
  mapRestoreButton.hidden = !collapsed;
  setTimeout(() => {
    map.invalidateSize();
    updateInspectPopupPosition();
    // 畳むとカードの並びが grid から flex に変わる。パネルの幅は変わらないことも
    // あるので、幅を見ている ResizeObserver では気づけない
    layoutRockDetails();
  }, 260);
}

// 石のカタログと、岩相 → 石 の対応表を読み込む。
// 対応表は tools/build-lithology-map.mjs が生成する。
async function loadData() {
  try {
    // file:// で開くと fetch が使えないので、data/bundle.js の同じ内容に切り替える。
    const offline = window.ISHIHIROI_DATA || null;
    const load = (path, key, fallback) => fetchJson(path).catch((error) => {
      if (offline && offline[key] !== undefined) {
        console.info(`${path} を読めないので data/bundle.js を使います。`, error);
        return offline[key];
      }
      if (fallback !== undefined) {
        console.info(`${path} を読み込めませんでした。`, error);
        return fallback;
      }
      throw error;
    });

    const [rocks, lithology, colors, mineralList] = await Promise.all([
      load("data/rocks.json", "rocks"),
      load("data/lithology-map.json", "lithology"),
      // 面積比の測定にだけ使うので、読めなくても推定自体は続けられる。
      load("data/legend-index.json", "legendIndex", null),
      load("data/minerals.json", "minerals", [])
    ]);
    rockCatalog = new Map(rocks.map((rock) => [rock.id, rock]));
    lithologyMap = lithology;
    legendIndex = colors;
    minerals = mineralList;
    catalogReady = true;
    console.info(
      `石カタログ ${rockCatalog.size}件 / 岩相対応表 ${Object.keys(lithology).length}件` +
      `${colors ? ` / 色の索引 ${Object.keys(colors).length}件` : ""}` +
      ` / 鉱物 ${minerals.length}件 を読み込みました。`
    );
  } catch (error) {
    console.error("石のデータを読み込めませんでした。", error);
    setPanelMessage(rocksPanel, text.dataFailed);
  }
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${url} fetch failed: ${response.status}`);
  }
  return response.json();
}

async function selectPoint(latlng, initialAddress = "") {
  clickedLatLng = latlng;
  const requestId = ++selectedAddressRequestId;
  const pendingAddress = initialAddress ? formatAddress(initialAddress) : text.addressLoading;
  selectedPoint.textContent = pendingAddress;

  if (!marker) {
    marker = L.marker(latlng).addTo(map);
  } else {
    marker.setLatLng(latlng);
  }

  showInspectPopup(pendingAddress);

  // 場所を選んだ時点でパネルが「まず場所を選んでください」のままだと、
  // 検索しても何も起きていないように見える。次にすることを書き換える。
  if (!inspectInProgress) {
    setPanelMessage(rocksPanel, text.pressInspect);
  }

  const address = initialAddress ? pendingAddress : await fetchAddress(latlng);
  if (requestId !== selectedAddressRequestId) {
    return;
  }

  updateSelectedAddress(address || text.addressUnavailable);
}

// 検索と現在地は「この場所を調べたい」という意思がはっきりしているので、
// ボタンを押さなくてもそのまま調べる。地図クリックは誤操作もあるので手動のまま。
function selectAndInspect(latlng, initialAddress = "") {
  selectPoint(latlng, initialAddress);
  hideInspectPopupButton();
  return inspectGeology(latlng);
}

function showInspectPopup(address) {
  inspectPopupOverlay.innerHTML = "";
  inspectPopupOverlay.append(createInspectPopupContent(address));
  inspectPopupOverlay.hidden = false;
  L.DomEvent.disableClickPropagation(inspectPopupOverlay);
  L.DomEvent.disableScrollPropagation(inspectPopupOverlay);
  requestAnimationFrame(updateInspectPopupPosition);
}

function createInspectPopupContent(address) {
  const content = document.createElement("div");
  content.className = "inspect-popup";

  const title = document.createElement("strong");
  title.textContent = text.selectedTitle;

  const addressText = document.createElement("p");
  addressText.className = "inspect-popup-address";
  addressText.textContent = address;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "inspect-popup-button";
  button.textContent = inspectInProgress ? text.loading : text.inspect;
  button.disabled = inspectInProgress;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (clickedLatLng && !inspectInProgress) {
      hideInspectPopupButton();
      inspectGeology(clickedLatLng);
    }
  });

  content.append(title, addressText, button);
  return content;
}

function updateSelectedAddress(address) {
  selectedPoint.textContent = address;
  inspectPopupOverlay.querySelectorAll(".inspect-popup-address").forEach((element) => {
    element.textContent = address;
  });
  requestAnimationFrame(updateInspectPopupPosition);
}

function hideInspectPopupButton() {
  inspectPopupOverlay.querySelectorAll(".inspect-popup-button").forEach((button) => {
    button.remove();
  });
  updateInspectPopupPosition();
}

function setInspectPopupButtonsState({ disabled, label }) {
  inspectPopupOverlay.querySelectorAll(".inspect-popup-button").forEach((button) => {
    button.disabled = disabled;
    button.textContent = label;
  });
}

const POPUP_GAP = 12;
const POPUP_EDGE = 8;
// 地図の上端には住所表示と検索フォームが重なっている。
// ここにポップアップが乗ると検索が押せなくなるので、収まらなければ下側に出す。
const POPUP_TOP_INSET = 140;

function updateInspectPopupPosition() {
  if (!clickedLatLng || inspectPopupOverlay.hidden || !map) {
    return;
  }

  const mapPaneRect = document.querySelector(".map-pane").getBoundingClientRect();
  const markerRect = marker?._icon?.getBoundingClientRect();
  const fallback = map.latLngToContainerPoint(clickedLatLng);
  const anchor = markerRect
    ? {
        x: markerRect.left - mapPaneRect.left + markerRect.width / 2,
        top: markerRect.top - mapPaneRect.top,
        bottom: markerRect.bottom - mapPaneRect.top
      }
    : { x: fallback.x, top: fallback.y, bottom: fallback.y };

  const width = inspectPopupOverlay.offsetWidth;
  const height = inspectPopupOverlay.offsetHeight;

  const above = anchor.top - height - POPUP_GAP;
  const showBelow = above < POPUP_TOP_INSET;
  inspectPopupOverlay.classList.toggle("is-below", showBelow);

  const top = showBelow ? anchor.bottom + POPUP_GAP : above;
  const maxLeft = Math.max(POPUP_EDGE, mapPaneRect.width - width - POPUP_EDGE);
  const maxTop = Math.max(POPUP_EDGE, mapPaneRect.height - height - POPUP_EDGE);

  inspectPopupOverlay.style.left = `${Math.round(clamp(anchor.x - width / 2, POPUP_EDGE, maxLeft))}px`;
  inspectPopupOverlay.style.top = `${Math.round(clamp(top, POPUP_EDGE, maxTop))}px`;
}

async function inspectGeology(latlng) {
  const requestId = ++inspectRequestId;
  inspectInProgress = true;
  setInspectPopupButtonsState({ disabled: true, label: text.loading });
  rockCards.innerHTML = "";
  geologyList.innerHTML = "";
  setPanelMessage(rocksPanel, text.fetching);
  setPanelMessage(geologyPanel, text.fetching);

  try {
    const { pointLegend, tiers, carriedMode, needsWidest } = await fetchLegends(latlng);
    console.log("クリック地点の地質:", pointLegend);
    tiers.forEach(({ step, legends }) => {
      console.log(`周辺の地質(±${stepRadiusKm(step)}km): ${legends.length}区分`, legends);
    });

    // 面積比はいちばん内側の範囲だけ測る。遠くの地質は「上流にあるか」が問題で、
    // 手もとから見た面積の大小はあまり意味を持たない。
    const area = await sampleNeighbourhood(latlng, NEARBY_STEPS[0], carriedMode);

    // 川原や段丘では、標高から上流域を割り出して運搬元を絞る。
    const catchment = carriedMode ? await sampleCatchment(latlng) : null;

    // 上流域がわかったなら、周辺を四方に広げて見る必要はない。
    // 遠い段階は下流や別の谷まで含んでしまうので、近い2段階だけ残す。
    const usedTiers = catchment ? tiers.filter((tier) => tier.step <= 1) : tiers;
    const stillNeedsWidest = needsWidest && !catchment;

    // keepOpen は候補を足しての描き直しのときだけ。別の地点を調べたときは畳んだ状態から始める
    const draw = (keepOpen = false) => {
      renderGeology(pointLegend, usedTiers, area, catchment);
      renderRocks(
        estimateRocks(pointLegend, usedTiers, carriedMode, area, catchment),
        stillNeedsWidest && !widened,
        keepOpen
      );
    };

    let widened = false;
    draw();
    activateTab("rocks");

    // ±55kmの取得は10秒以上かかる。先に結果を見せてから、あとで足す。
    if (stillNeedsWidest) {
      const extra = await fetchTiers(latlng, WIDEST_STEP, WIDEST_STEP);
      if (requestId !== inspectRequestId) {
        return;
      }
      widened = true;
      if (extra.length > 0) {
        usedTiers.push(...extra);
        draw(true);
      }
    }
  } catch (error) {
    console.error("Geology lookup failed:", error);
    setPanelMessage(rocksPanel, text.fetchFailed);
    setPanelMessage(geologyPanel, text.fetchFailed);
  } finally {
    inspectInProgress = false;
    setInspectPopupButtonsState({ disabled: false, label: text.inspect });
  }
}

// クリック地点そのものの凡例と、周辺の凡例を段階ごとに取る。
// 点で引くと必ず1件に決まるので、矩形だけで見ていたときの取り違えがなくなる。
//
// 川原や段丘の石は何十kmも上流から流れてくる。近くに岩盤があってもそこで
// 打ち切ると、実際に落ちている石のごく一部しか出てこない。そこで運搬モードでは
// 段階をすべて重ね、遠い段階ほど「見つかる度」を下げて並べる。
async function fetchLegends(latlng) {
  const [pointResult, firstNearby] = await Promise.all([
    requestLegend({ point: `${latlng.lat},${latlng.lng}` }).catch((error) => {
      console.info("点の凡例を取得できませんでした。", error);
      return null;
    }),
    requestLegend({ box: boxParam(latlng, NEARBY_STEPS[0]) })
  ]);

  const pointLegend = firstLegend(pointResult);
  const pointEntry = lithologyEntry(pointLegend);
  // 足もとが岩盤なら、その岩相が主役。遠くまで探しにいく必要は薄い。
  const carriedMode = !pointEntry || pointEntry.kind !== "bedrock";
  const lastStep = carriedMode ? CARRIED_LAST_STEP : BEDROCK_LAST_STEP;

  const tiers = [{ step: 0, legends: normalizeLegendResponse(firstNearby) }];
  tiers.push(...(await fetchTiers(latlng, 1, lastStep)));

  // 大河川の下流や広い平野では、ここまで広げても石の元が入ってこない。
  // ただし±55kmの問い合わせは10秒以上かかるので、ここでは待たずに旗だけ立てる。
  const needsWidest = carriedMode && countRocks(tiers) < WIDEN_WHEN_FEWER_THAN;

  return { pointLegend, tiers, carriedMode, needsWidest };
}

async function fetchTiers(latlng, fromStep, toStep) {
  const steps = [];
  for (let step = fromStep; step <= toStep; step += 1) {
    steps.push(step);
  }

  const results = await Promise.all(
    steps.map((step) =>
      requestLegend({ box: boxParam(latlng, NEARBY_STEPS[step]) })
        .then((result) => ({ step, legends: normalizeLegendResponse(result) }))
        .catch((error) => {
          // 一段失敗しても、取れている段階だけで推定を続ける。
          console.info(`±${stepRadiusKm(step)}kmの取得に失敗しました。`, error);
          return null;
        })
    )
  );

  return results.filter(Boolean);
}

// 段階をまたいで、候補になる石が何種類そろっているかを数える。
function countRocks(tiers) {
  const ids = new Set();
  tiers.forEach(({ legends }) => {
    legends.forEach((legend) => {
      const entry = lithologyEntry(legend);
      if (entry && entry.kind === "bedrock") {
        entry.rocks.forEach(({ id }) => ids.add(id));
      }
    });
  });
  return ids.size;
}

// 段階ごとの候補の強さ。内側ほど確からしい。
function tierFactor(step, carriedMode) {
  return (carriedMode ? CARRIED_FACTORS : NEARBY_FACTORS)[step] ?? 0;
}

function boxParam(latlng, delta) {
  return [
    latlng.lat - delta,
    latlng.lng - delta,
    latlng.lat + delta,
    latlng.lng + delta
  ].join(",");
}

function stepRadiusKm(stepIndex) {
  return Math.round(NEARBY_STEPS[stepIndex] * 111);
}

async function requestLegend(params) {
  const query = new URLSearchParams(params).toString();
  try {
    return await requestLegendDirect(query);
  } catch (error) {
    console.info("GSJ APIに直接アクセスできませんでした。PHPプロキシを試します。", error);
    return requestLegendViaProxy(query);
  }
}

// GSJ APIは混み合うと一時的に5xxを返すことがあるので一度だけ待って再試行する。
async function requestLegendDirect(query, retry = true) {
  const response = await fetch(`${API_BASE}/legend.json?${query}`);
  if (response.ok) {
    return parseLegendBody(await response.text());
  }
  if (retry && response.status >= 500) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return requestLegendDirect(query, false);
  }
  throw new Error(`GSJ API error: ${response.status}`);
}

async function requestLegendViaProxy(query) {
  const response = await fetch(`${PROXY_URL}?${query}`);
  if (!response.ok) {
    throw new Error(`Proxy API error: ${response.status}`);
  }
  const body = await response.text();
  // PHPが動いていないサーバーでは、プロキシのソースがそのまま返ってくる。
  if (body.trimStart().startsWith("<?php")) {
    throw new Error("PHPプロキシが動作していません。PHPサーバーで起動してください。");
  }
  return parseLegendBody(body);
}

// 海の上など地質情報がない場所では本文が空で返る。例外にせず「なし」として扱う。
function parseLegendBody(body) {
  if (!body || !body.trim()) {
    return [];
  }
  return JSON.parse(body);
}

// 地質情報がない場所では、全項目がnullの凡例が返ることがある。symbolの有無で判定する。
function normalizeLegendResponse(value) {
  const items = Array.isArray(value) ? value : [value];
  return items.filter((item) => item && item.symbol);
}

function firstLegend(value) {
  return normalizeLegendResponse(value)[0] || null;
}

// ---- 周辺の面積比を測る ----
// 凡例APIは「範囲内にどの地質があるか」しか返さないので、端をかすめただけの
// 岩体も広大な岩体も同格になってしまう。地質図タイルの画素を数えれば、
// どの地質がどれだけの面積を占めるかがわかる。凡例の色は2416件すべて一意なので
// 画素の色から地質を逆引きできる。

const TILE_SIZE = 256;
const GEOLOGY_MAX_ZOOM = 13;
const DEM_MIN_ZOOM = 8;
const DEM_MAX_ZOOM = 14;
// 標本の半径がこれ以下に収まる最大のズームを選ぶ。タイル数を4枚前後に抑える。
const SAMPLE_MAX_RADIUS_PX = 120;
// 運搬モードで、標高がこれだけ高い場所を「石の供給源」として2倍重く数える。
const ELEVATION_SPAN = 300;

async function sampleNeighbourhood(latlng, radiusDeg, weightByElevation) {
  if (!legendIndex) {
    return null;
  }

  try {
    const zoom = chooseSampleZoom(latlng, radiusDeg);
    const center = map.project(latlng, zoom);
    const radiusPx = radiusPixels(latlng, radiusDeg, zoom);
    const grid = tileGrid(center, radiusPx);

    const geology = await drawTiles(grid, zoom, (x, y) => `${API_BASE}/tiles/${zoom}/${y}/${x}.png?layer=glfs`);
    if (!geology) {
      return null;
    }

    const useDem = weightByElevation && zoom >= DEM_MIN_ZOOM && zoom <= DEM_MAX_ZOOM;
    const dem = useDem
      ? await drawTiles(grid, zoom, (x, y) => `https://cyberjapandata.gsi.go.jp/xyz/dem_png/${zoom}/${x}/${y}.png`)
      : null;

    return countShares(geology, dem, grid, center, radiusPx, zoom);
  } catch (error) {
    console.info("面積比を測れませんでした。区分ごとの重みなしで推定します。", error);
    return null;
  }
}

function radiusPixels(latlng, radiusDeg, zoom) {
  const here = map.project(latlng, zoom);
  const there = map.project(L.latLng(latlng.lat + radiusDeg, latlng.lng), zoom);
  return Math.abs(here.y - there.y);
}

function chooseSampleZoom(latlng, radiusDeg) {
  for (let zoom = GEOLOGY_MAX_ZOOM; zoom > 5; zoom -= 1) {
    if (radiusPixels(latlng, radiusDeg, zoom) <= SAMPLE_MAX_RADIUS_PX) {
      return zoom;
    }
  }
  return 6;
}

function tileGrid(center, radiusPx) {
  const minTileX = Math.floor((center.x - radiusPx) / TILE_SIZE);
  const maxTileX = Math.floor((center.x + radiusPx) / TILE_SIZE);
  const minTileY = Math.floor((center.y - radiusPx) / TILE_SIZE);
  const maxTileY = Math.floor((center.y + radiusPx) / TILE_SIZE);
  return {
    minTileX,
    minTileY,
    cols: maxTileX - minTileX + 1,
    rows: maxTileY - minTileY + 1,
    originX: minTileX * TILE_SIZE,
    originY: minTileY * TILE_SIZE
  };
}

async function drawTiles(grid, zoom, urlFor) {
  const canvas = document.createElement("canvas");
  canvas.width = grid.cols * TILE_SIZE;
  canvas.height = grid.rows * TILE_SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  const jobs = [];
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const tileX = grid.minTileX + col;
      const tileY = grid.minTileY + row;
      jobs.push(
        loadImage(urlFor(tileX, tileY, zoom))
          .then((image) => context.drawImage(image, col * TILE_SIZE, row * TILE_SIZE))
          // 海の上など、タイルが存在しない場所は空白のままにする。
          .catch(() => null)
      );
    }
  }
  await Promise.all(jobs);

  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`tile load failed: ${url}`));
    image.src = url;
  });
}

// 地理院の標高タイルはRGBに標高をcm単位で埋め込んでいる。
function decodeElevation(data, index) {
  if (data[index + 3] === 0) {
    return null;
  }
  const raw = data[index] * 65536 + data[index + 1] * 256 + data[index + 2];
  if (raw === 0x800000) {
    return null;
  }
  return (raw < 0x800000 ? raw : raw - 0x1000000) * 0.01;
}

function countShares(geology, dem, grid, center, radiusPx, zoom) {
  const offsetX = grid.originX;
  const offsetY = grid.originY;
  const centerIndex = pixelIndex(geology.width, Math.round(center.x - offsetX), Math.round(center.y - offsetY));
  const baseElevation = dem ? decodeElevation(dem.data, centerIndex) : null;

  const weights = new Map();
  const ages = new Map();
  let total = 0;
  let matched = 0;
  let scanned = 0;

  const left = Math.max(0, Math.floor(center.x - radiusPx - offsetX));
  const right = Math.min(geology.width - 1, Math.ceil(center.x + radiusPx - offsetX));
  const top = Math.max(0, Math.floor(center.y - radiusPx - offsetY));
  const bottom = Math.min(geology.height - 1, Math.ceil(center.y + radiusPx - offsetY));

  for (let y = top; y <= bottom; y += 1) {
    const dy = y + offsetY - center.y;
    for (let x = left; x <= right; x += 1) {
      const dx = x + offsetX - center.x;
      const distance = Math.hypot(dx, dy);
      if (distance > radiusPx) {
        continue;
      }

      scanned += 1;
      const index = pixelIndex(geology.width, x, y);
      if (geology.data[index + 3] === 0) {
        continue;
      }

      const entry = legendIndex[toHex(geology.data, index)];
      if (!entry) {
        // 境界のぼかしや凡例ラベルの文字。どの地質にも属さないので数えない。
        continue;
      }

      // 近いほど重く数える。
      let weight = 1 - 0.4 * (distance / radiusPx);
      if (dem && baseElevation !== null) {
        const elevation = decodeElevation(dem.data, index);
        if (elevation !== null) {
          // 高いところほど石の供給源になりやすい。
          weight *= clamp(1 + (elevation - baseElevation) / ELEVATION_SPAN, 0.4, 2.2);
        }
      }

      const [key, age] = entry;
      weights.set(key, (weights.get(key) || 0) + weight);
      if (!ages.has(key)) {
        ages.set(key, age);
      }
      total += weight;
      matched += 1;
    }
  }

  if (total <= 0) {
    return null;
  }

  const shares = new Map();
  weights.forEach((value, key) => shares.set(key, value / total));

  console.info(
    `面積比を測定: ズーム${zoom} 画素${scanned}中${matched}件を判定 / ${shares.size}区分` +
    `${dem && baseElevation !== null ? ` / 標高${Math.round(baseElevation)}mを基準に上流を重視` : ""}`
  );

  return { shares, ages };
}

// ---- 上流域（集水域）をたどる ----
// 川原の石は上流から流れてくる。正方形の範囲で周りを均等に見ると、
// 下流側や別の谷の地質まで混ざってしまう。標高タイルから
// 「地点から標高が下がらない経路でたどり着ける範囲」を塗りつぶすと、
// 尾根を越えるには一度下る必要があるため、そこで自然に止まる。
// これを上流域とみなし、その内側の地質だけを重く数える。

const CATCHMENT_RADIUS_DEG = 0.5;
// 谷筋を捉えるには解像度が要る。粗いと長瀞のような狭い谷を拾えない。
const CATCHMENT_TARGET_PX = 420;
// 一歩あたりこれだけの下りは許す。標高タイルのノイズと平坦地のため。
const CATCHMENT_STEP_TOLERANCE = 2;
// 出発点よりこれ以上低い場所は下流なので上流域に入れない。
const CATCHMENT_DROP_LIMIT = 6;
// 塗りつぶした面積がこれ未満なら、谷を捉えられていないので使わない。
const CATCHMENT_MIN_CELLS = 200;
// 遠い上流ほど石は途中で細かくなる。この距離で寄与が半分になる。
const CATCHMENT_HALF_DISTANCE_KM = 25;

async function sampleCatchment(latlng) {
  if (!legendIndex) {
    return null;
  }

  try {
    const zoom = chooseCatchmentZoom(latlng);
    if (zoom < DEM_MIN_ZOOM) {
      return null;
    }

    const center = map.project(latlng, zoom);
    const radiusPx = radiusPixels(latlng, CATCHMENT_RADIUS_DEG, zoom);
    const grid = tileGrid(center, radiusPx);

    const [geology, dem] = await Promise.all([
      drawTiles(grid, zoom, (x, y) => `${API_BASE}/tiles/${zoom}/${y}/${x}.png?layer=glfs`),
      drawTiles(grid, zoom, (x, y) => `https://cyberjapandata.gsi.go.jp/xyz/dem_png/${zoom}/${x}/${y}.png`)
    ]);
    if (!geology || !dem) {
      return null;
    }

    return traceCatchment(geology, dem, grid, center, radiusPx, zoom);
  } catch (error) {
    console.info("上流域を推定できませんでした。範囲で見るやり方に戻します。", error);
    return null;
  }
}

function chooseCatchmentZoom(latlng) {
  for (let zoom = GEOLOGY_MAX_ZOOM; zoom >= DEM_MIN_ZOOM; zoom -= 1) {
    if (radiusPixels(latlng, CATCHMENT_RADIUS_DEG, zoom) <= CATCHMENT_TARGET_PX) {
      return zoom;
    }
  }
  return DEM_MIN_ZOOM;
}

function traceCatchment(geology, dem, grid, center, radiusPx, zoom) {
  const { width, height } = geology;
  const elevations = new Float32Array(width * height);
  for (let i = 0; i < elevations.length; i += 1) {
    const value = decodeElevation(dem.data, i * 4);
    elevations[i] = value === null ? Number.NaN : value;
  }

  const startCell = snapToLowest(elevations, width, height, Math.round(center.x - grid.originX), Math.round(center.y - grid.originY));
  if (startCell < 0) {
    return null;
  }

  const inside = floodUphill(elevations, width, height, startCell);
  if (inside.count < CATCHMENT_MIN_CELLS) {
    console.info(`上流域が小さすぎます(${inside.count}画素)。範囲で見るやり方に戻します。`);
    return null;
  }

  const kmPerPixel = (CATCHMENT_RADIUS_DEG * 111) / radiusPx;
  const shares = new Map();
  const ages = new Map();
  let total = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = y * width + x;
      const index = cell * 4;
      if (geology.data[index + 3] === 0) {
        continue;
      }
      const entry = legendIndex[toHex(geology.data, index)];
      if (!entry) {
        continue;
      }

      // 上流域の外は、この地点に石を供給しない。近くの地質は
      // 段階(tier)のほうで見ているので、ここでは数えない。
      if (!inside.mask[cell]) {
        continue;
      }

      const dx = x + grid.originX - center.x;
      const dy = y + grid.originY - center.y;
      const distanceKm = Math.hypot(dx, dy) * kmPerPixel;
      // 遠い上流ほど、石は途中で砕けて届きにくくなる。
      const weight = 1 / (1 + distanceKm / CATCHMENT_HALF_DISTANCE_KM);

      const [key, age] = entry;
      shares.set(key, (shares.get(key) || 0) + weight);
      if (!ages.has(key)) {
        ages.set(key, age);
      }
      total += weight;
    }
  }

  if (total <= 0) {
    return null;
  }

  shares.forEach((value, key) => shares.set(key, Math.min(1, value / total)));

  const areaKm2 = Math.round(inside.count * kmPerPixel * kmPerPixel);
  console.info(
    `上流域を推定: ズーム${zoom} ${grid.cols}x${grid.rows}タイル ` +
    `約${areaKm2}km²(${inside.count}画素) / ${shares.size}区分 / 標高データ欠損${inside.missing}画素`
  );

  return { shares, ages, areaKm2 };
}

// 出発点が河道から少しずれていても谷を拾えるように、近傍のいちばん低い画素へ寄せる。
function snapToLowest(elevations, width, height, x, y) {
  let best = -1;
  let bestElevation = Number.POSITIVE_INFINITY;
  for (let dy = -3; dy <= 3; dy += 1) {
    for (let dx = -3; dx <= 3; dx += 1) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
        continue;
      }
      const cell = ny * width + nx;
      const elevation = elevations[cell];
      if (Number.isNaN(elevation) || elevation >= bestElevation) {
        continue;
      }
      bestElevation = elevation;
      best = cell;
    }
  }
  return best;
}

// 出発点から「標高が下がらない経路」でたどり着ける範囲を塗る。
// 尾根を越えるには一度下る必要があるため、そこで自然に止まり、
// おおよその上流域になる。標高タイルには窪地や段差が入っているので、
// 一歩ぶんの下りだけは許して谷筋が途切れないようにする。
//
// 正攻法は窪地を埋めてからD8法で逆追跡することだが、それには
// 優先度付きキューによる sink filling が要る。この簡易版でも
// 多摩川で実測1227km²（実際の流域は約1240km²）と十分な精度が出る。
function floodUphill(elevations, width, height, startCell) {
  const mask = new Uint8Array(width * height);
  const queue = [startCell];
  const startElevation = elevations[startCell];
  mask[startCell] = 1;
  let count = 1;
  let missing = 0;

  for (let head = 0; head < queue.length; head += 1) {
    const cell = queue[head];
    const elevation = elevations[cell];
    const x = cell % width;
    const y = (cell - x) / width;

    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) {
          continue;
        }
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
          continue;
        }
        const next = ny * width + nx;
        if (mask[next]) {
          continue;
        }
        const nextElevation = elevations[next];
        if (Number.isNaN(nextElevation)) {
          missing += 1;
          continue;
        }
        // 一歩の下りは許すが、出発点より明確に低い場所は下流なので入れない。
        if (nextElevation < elevation - CATCHMENT_STEP_TOLERANCE) {
          continue;
        }
        if (nextElevation < startElevation - CATCHMENT_DROP_LIMIT) {
          continue;
        }
        mask[next] = 1;
        count += 1;
        queue.push(next);
      }
    }
  }

  return { mask, count, missing };
}

// 上流域に占める面積が大きい地質ほど、その石が流れ着いている。
function catchmentBoost(share) {
  if (!(share > 0)) {
    return 0;
  }
  return clamp(0.15 + 1.6 * Math.sqrt(share), 0.15, 0.95);
}

function pixelIndex(width, x, y) {
  return (y * width + x) * 4;
}

function toHex(data, index) {
  return (
    data[index].toString(16).padStart(2, "0") +
    data[index + 1].toString(16).padStart(2, "0") +
    data[index + 2].toString(16).padStart(2, "0")
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// 面積が広い地質ほど、その石に出会いやすい。
function areaBoost(share) {
  if (!(share > 0)) {
    return 0.55;
  }
  return clamp(0.45 + 1.7 * Math.sqrt(share), 0.45, 1.4);
}

// 同じ砂岩でも、古くて締まったものほど礫として残りやすい。
const AGE_DURABILITY = [0.8, 0.9, 1, 1.1, 1.15];

function ageDurability(legend) {
  return ageDurabilityFor(legend.group_ja || "", ageCodeOf(legend.formationAge_ja || ""));
}

function ageDurabilityFor(group, ageCode) {
  // 深成岩や変成岩の硬さは時代で決まらない。
  if (group !== "堆積岩" && group !== "付加体") {
    return 1;
  }
  return AGE_DURABILITY[ageCode] ?? 1;
}

function ageCodeOf(age) {
  if (/第四紀/.test(age)) return 0;
  if (/新第三紀/.test(age)) return 1;
  if (/古第三紀/.test(age)) return 2;
  if (/中生代/.test(age)) return 3;
  if (/古生代|原生代|太古代|先カンブリア/.test(age)) return 4;
  return /新生代/.test(age) ? 1 : 3;
}

// symbolから時代のプレフィックスを外すと、610種類の岩相と1対1で対応する。
function legendKey(legend) {
  return String(legend?.symbol || "").replace(/^[^_]+_/, "");
}

function lithologyEntry(legend) {
  if (!legend || !lithologyMap) {
    return null;
  }
  return lithologyMap[legendKey(legend)] || null;
}

// 足もとの地質と周辺の地質から、拾えそうな石を組み立てる。
function estimateRocks(pointLegend, tiers, carriedMode, area = null, catchment = null) {
  if (!catalogReady) {
    return { rocks: [], note: text.dataFailed };
  }

  const pointEntry = lithologyEntry(pointLegend);
  const scores = new Map();

  const addRocks = (rocks, factor, source) => {
    rocks.forEach(({ id, weight }) => {
      const score = weight * factor;
      const current = scores.get(id);
      if (!current) {
        scores.set(id, { id, score, sources: new Set([source]) });
        return;
      }
      current.sources.add(source);
      if (score > current.score) {
        current.score = score;
      }
    });
  };

  if (pointEntry) {
    if (pointEntry.kind === "bedrock") {
      addRocks(pointEntry.rocks, SCORE_AT_POINT, "point");
    } else {
      // 火山灰や岩屑なだれには、その火山の石そのものが含まれる。
      addRocks(pointEntry.rocks, SCORE_VOLCANIC_FALL, "point");
    }
  }

  // 内側の段階から順に重ねる。同じ地質が複数の段階に出たら、
  // いちばん内側（＝いちばん近い）の点数が残る。
  tiers.forEach(({ step, legends }) => {
    const base = tierFactor(step, carriedMode);
    if (base <= 0) {
      return;
    }

    legends.forEach((legend) => {
      const entry = lithologyEntry(legend);
      if (!entry || entry.kind !== "bedrock") {
        return;
      }

      let factor = base;
      // すぐ周りに広く分布する地質ほど、その石に出会いやすい。
      // 面積を測っているのはいちばん内側の段階だけ。
      if (area && step === 0) {
        factor *= areaBoost(area.shares.get(legendKey(legend)));
      }
      // 運ばれてくる石は、古くて締まった岩石ほど途中で壊れずに残る。
      if (carriedMode) {
        factor *= ageDurability(legend);
      }

      addRocks(entry.rocks, factor, carriedMode ? "carried" : "nearby");
    });
  });

  // 上流域が割り出せたときは、そこに広がる地質を運搬元として直接採点する。
  if (catchment) {
    catchment.shares.forEach((share, key) => {
      const entry = lithologyMap[key];
      if (!entry || entry.kind !== "bedrock") {
        return;
      }
      const factor = catchmentBoost(share) * ageDurabilityFor(entry.group, catchment.ages.get(key) ?? 3);
      addRocks(entry.rocks, factor, "upstream");
    });
  }

  // 運ばれてきた石は、硬い岩石ほど途中で壊れずに残る。
  if (carriedMode) {
    scores.forEach((entry) => {
      entry.score *= DURABILITY[entry.id] ?? 1;
    });
  }

  const best = [...scores.values()].reduce((top, entry) => Math.max(top, entry.score), 0);

  const rocks = [...scores.values()]
    .filter((entry) => entry.score >= ROCK_FLOOR)
    .map((entry) => {
      const rock = rockCatalog.get(entry.id);
      if (!rock) {
        console.warn("カタログに無い石が対応表から参照されました:", entry.id);
        return null;
      }
      return {
        ...rock,
        score: entry.score,
        level: scoreLevel(entry.score, best),
        source: mainSource(entry.sources)
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const outerStep = tiers.length > 0 ? Math.max(...tiers.map((tier) => tier.step)) : 0;

  return {
    rocks,
    minerals: estimateMinerals(scores, pointLegend, tiers, carriedMode),
    note: buildNote(pointEntry, pointLegend, carriedMode, outerStep)
  };
}

// 鉱物は「どの岩石に入っているか」と「どの変成帯か」の two 通りで拾う。
// 変成帯の名前（ざくろ石帯、菫青石帯、ローソン石青色片岩亜相…）は
// そこに何が結晶しているかを直接示していて、凡例にすでに入っている。
const MINERAL_LIKELY = 0.6;
const MINERAL_MAYBE = 0.3;
const MINERAL_FLOOR = 0.18;
const MINERAL_LIMIT = 8;

function estimateMinerals(rockScores, pointLegend, tiers, carriedMode) {
  if (minerals.length === 0) {
    return [];
  }

  // 足もとの変成帯はそのまま効かせる。周辺のものは石と同じだけ割り引く。
  // 割り引かないと、28km先の「ざくろ石帯」がこの場所の話として出てしまう。
  const zoneSources = [
    { text: pointLegend?.lithology_ja || "", factor: 1 },
    ...tiers.map(({ step, legends }) => ({
      text: legends.map((legend) => legend.lithology_ja || "").join(" "),
      factor: tierFactor(step, carriedMode)
    }))
  ];

  return minerals
    .map((mineral) => {
      let score = 0;
      let fromZone = false;

      (mineral.hosts || []).forEach(([rockId, weight]) => {
        const host = rockScores.get(rockId);
        if (host) {
          score = Math.max(score, host.score * weight);
        }
      });

      (mineral.zones || []).forEach(([keyword, weight]) => {
        zoneSources.forEach((source) => {
          if (!source.text.includes(keyword)) {
            return;
          }
          const zoneScore = weight * source.factor;
          if (zoneScore > score) {
            score = zoneScore;
            fromZone = true;
          }
        });
      });

      return { ...mineral, score, fromZone, level: mineralLevel(score) };
    })
    .filter((mineral) => mineral.score >= MINERAL_FLOOR)
    .sort((a, b) => b.score - a.score)
    .slice(0, MINERAL_LIMIT);
}

function mineralLevel(score) {
  if (score >= MINERAL_LIKELY) {
    return "likely";
  }
  return score >= MINERAL_MAYBE ? "maybe" : "rare";
}

// 平野の真ん中のように岩盤がどこも遠い場所では、全体の点数が低くとどまる。
// 絶対値だけで切ると候補が全部「珍しい」に落ちて順位が伝わらないので、
// その場所のなかでの相対順位も見て、上位のものは「見つかるかも」に上げる。
function scoreLevel(score, best) {
  if (score >= LEVEL_LIKELY) {
    return "likely";
  }
  if (score >= LEVEL_MAYBE) {
    return "maybe";
  }
  return best > 0 && score >= best * LEVEL_RELATIVE ? "maybe" : "rare";
}

function mainSource(sources) {
  if (sources.has("point")) {
    return "point";
  }
  if (sources.has("upstream")) {
    return "upstream";
  }
  if (sources.has("carried")) {
    return "carried";
  }
  return "nearby";
}

function buildNote(pointEntry, pointLegend, carriedMode, outerStep) {
  const range = `半径およそ${stepRadiusKm(outerStep)}kmまでの地質から推定しています。`;

  if (!pointEntry) {
    // 点の凡例が取れなかった場合と、対応表に無いsymbolだった場合。
    // どちらも周辺の地質だけで推定しているので、そのことを伝える。
    if (pointLegend) {
      console.warn("対応表に無い凡例です:", pointLegend.symbol, pointLegend.lithology_ja);
    }
    return `${pointUnknownNote}${range}`;
  }
  if (!carriedMode) {
    return "";
  }
  const noteKey = pointEntry.kind === "artificial" ? "artificial" : pointEntry.looseType || "other";
  return `${looseNotes[noteKey] || looseNotes.other}${range}`;
}

function sourceLabel(source) {
  return {
    point: text.atPoint,
    nearby: text.nearby,
    carried: text.carried,
    upstream: text.upstream
  }[source] || "";
}

function renderRocks({ rocks, minerals: found = [], note }, stillWidening = false, keepOpen = false) {
  // 候補が無いときの注記は「下の候補は…」と食い違うので出さない。
  // ただしデータ自体が読めていないときは、その理由をそのまま伝える。
  // 「推定できませんでした」と出すと、原因が地質側にあるように見えてしまう。
  if (rocks.length === 0) {
    setPanelMessage(rocksPanel, catalogReady ? text.noRocks : text.dataFailed);
    return;
  }

  clearPanelMessage(rocksPanel);
  const groups = ["likely", "maybe", "rare"]
    .map((level) => ({ level, rocks: rocks.filter((rock) => rock.level === level) }))
    .filter((group) => group.rocks.length > 0);

  // ±55kmの結果が届くと丸ごと描き直す。読んでいる最中に説明が閉じてしまうので、
  // 開いていた石を控えておいて戻す（開いた順も一緒に持っていく）
  const wasOpen = keepOpen
    ? [...rockCards.querySelectorAll(".rock-details:not([hidden])")]
      .map((detail) => ({ id: detail.dataset.rock, order: detail.dataset.openedAt }))
    : [];

  const noteHtml = note ? `<p class="rock-place-note">${escapeHtml(note)}</p>` : "";
  const wideningHtml = stillWidening
    ? `<p class="rock-widening-note">近くに石の元になる岩盤が少ないので、さらに広い範囲（半径およそ${stepRadiusKm(WIDEST_STEP)}km）も調べています。少し待つと候補が増えます。</p>`
    : "";

  rockCards.innerHTML = noteHtml + wideningHtml + groups.map((group) => `
    <section class="rock-level-section rock-level-${escapeHtml(group.level)}" aria-label="${levelLabel(group.level)}">
      <header class="rock-section-header">
        <h3 class="rock-section-title">${levelLabel(group.level)}</h3>
        <p>${escapeHtml(levelDescription(group.level))}</p>
      </header>
      <div class="rock-grid">
        ${group.rocks.map((rock) => renderRockCard(rock)).join("")}
      </div>
    </section>
  `).join("") + renderMinerals(found);

  rockCards.querySelectorAll("[data-details]").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".rock-card");
      setRockDetailOpen(card, !card.classList.contains("is-expanded"));
      layoutRockDetails();
    });
  });

  wasOpen.forEach(({ id, order }) => {
    const card = rockCards.querySelector(`.rock-card[data-rock="${CSS.escape(id)}"]`);
    if (card) {
      setRockDetailOpen(card, true);
      rockDetailOf(card).dataset.openedAt = order;
    }
  });

  layoutRockDetails();
}

// 開いた順番。同じ行に2つ開いたとき、どちらを残すかの判断に使う
let rockDetailOrder = 0;

function rockDetailOf(card) {
  return document.querySelector(`#rock-details-${CSS.escape(card.dataset.rock)}`);
}

function openedAt(card) {
  return Number(rockDetailOf(card).dataset.openedAt || 0);
}

function setRockDetailOpen(card, open) {
  const button = card.querySelector(".rock-card-summary");
  const detail = rockDetailOf(card);
  detail.hidden = !open;
  if (open) {
    detail.dataset.openedAt = String(++rockDetailOrder);
  }
  button.setAttribute("aria-expanded", String(open));
  button.classList.toggle("is-open", open);
  card.classList.toggle("is-expanded", open);
}

// 開いた説明を、そのカードが並んでいる行の真下に幅いっぱいで差し込む。
//
// カード自体を広げるやり方だと、最終列のカードを開いたときにそのカードが次の行へ
// 押し出され、押した本人が画面から消えて空きマスだけが残る。行の下に敷けば
// カードは1枚も動かず、説明もパネルの幅をまるごと使える（「珍しい」で
// 本文110px → 487px）。
//
// 差し込む位置は幅で変わるので、パネルの幅が変わったら測り直す。
function layoutRockDetails() {
  rockCards.querySelectorAll(".rock-grid").forEach((grid) => {
    const cardFor = (detail) => grid.querySelector(`.rock-card[data-rock="${CSS.escape(detail.dataset.rock)}"]`);
    // 閉じている説明はカードの直後に戻しておく。表示には関わらないが、
    // 読み上げやコピーのときに石の順番どおりに並んでいてほしい
    grid.querySelectorAll(".rock-details[hidden]").forEach((detail) => cardFor(detail).after(detail));

    const open = [...grid.querySelectorAll(".rock-details:not([hidden])")];
    // いったん末尾に逃がして、カードだけが並んだ状態で行を測る
    open.forEach((detail) => grid.append(detail));
    if (open.length === 0) {
      return;
    }

    const gridLeft = grid.getBoundingClientRect().left;
    const rows = [];
    grid.querySelectorAll(".rock-card").forEach((card) => {
      const top = card.getBoundingClientRect().top;
      const row = rows[rows.length - 1];
      if (row && Math.abs(row.top - top) < 2) {
        row.cards.push(card);
      } else {
        rows.push({ top, cards: [card] });
      }
    });

    // 同じ行に2つ以上開いていると、帯が縦に積み上がってどれがどのカードのものか
    // 分からなくなる。行ごとに、最後に開いたものだけ残す
    rows.forEach((row) => {
      row.cards
        .filter((card) => card.classList.contains("is-expanded"))
        .sort((a, b) => openedAt(b) - openedAt(a))
        .slice(1)
        .forEach((card) => {
          setRockDetailOpen(card, false);
          card.after(rockDetailOf(card));
        });
    });

    open.filter((detail) => !detail.hidden).forEach((detail) => {
      const card = cardFor(detail);
      const row = rows.find((entry) => entry.cards.includes(card));
      if (!row) {
        return;
      }
      row.cards[row.cards.length - 1].after(detail);
      // どのカードの説明かがわかるように、カードの真ん中に三角を出す
      const box = card.getBoundingClientRect();
      detail.style.setProperty("--notch-x", `${Math.round(box.left - gridLeft + box.width / 2)}px`);
    });
  });
}

function renderMinerals(found) {
  if (found.length === 0) {
    return "";
  }

  return `
    <section class="mineral-section" aria-label="見どころの鉱物">
      <header class="rock-section-header">
        <h3 class="rock-section-title">見どころの鉱物</h3>
        <p>石のなかに入っていることがある鉱物です</p>
      </header>
      <ul class="mineral-list">
        ${found.map((mineral) => `
          <li class="mineral-item mineral-${escapeHtml(mineral.level)}">
            <div class="mineral-head">
              <span class="mineral-name">${escapeHtml(mineral.name)}</span>
              <span class="mineral-level">${levelLabel(mineral.level)}</span>
            </div>
            <p class="mineral-note">${escapeHtml(mineral.shortDescription || "")}</p>
            <div class="tags">${(mineral.features || []).map((feature) => `<span class="tag">${escapeHtml(feature)}</span>`).join("")}</div>
            ${mineral.fromZone ? '<p class="mineral-source">この地質の変成帯が、その名前のとおりこの鉱物を含みます</p>' : ""}
          </li>
        `).join("")}
      </ul>
    </section>
  `;
}

function renderRockCard(rock) {
  const detailUrl = `stone.html?id=${encodeURIComponent(rock.id)}`;
  const tags = (rock.features || []).slice(0, 3);
  // 説明はカードの外に出しておく。カード自体を広げると、押したカードが
  // 別の行へ動いてしまう（layoutRockDetails() の注記を参照）。
  return `
    <article class="rock-card rock-card-${escapeHtml(rock.level)}" data-rock="${escapeHtml(rock.id)}">
      <a class="rock-photo-link" href="${detailUrl}" aria-label="${escapeHtml(rock.name)}${text.details}">
        <img class="rock-photo" src="${rockImageSrc(rock)}" alt="${escapeHtml(rock.name)}の表面イメージ" loading="lazy">
      </a>
      ${rockPhotoCredit(rock)}
      <button class="rock-card-summary" type="button" data-details="${escapeHtml(rock.id)}" aria-expanded="false" aria-controls="rock-details-${escapeHtml(rock.id)}">
        <div>
          <h4>${escapeHtml(rock.name)}</h4>
          <p class="rock-source">${escapeHtml(sourceLabel(rock.source))}</p>
        </div>
        <span class="rock-toggle-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </span>
      </button>
    </article>
    <div class="rock-details" id="rock-details-${escapeHtml(rock.id)}" data-rock="${escapeHtml(rock.id)}" hidden>
      <div class="tags">${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
      <p class="rock-minerals">${escapeHtml(mainMinerals(rock))}</p>
      <p>${escapeHtml(rock.shortDescription || text.noDetails)}</p>
      <a class="secondary-button rock-detail-link" href="${detailUrl}">${text.details}</a>
    </div>
  `;
}

function levelDescription(level) {
  return {
    likely: "このあたりでよく見つかる可能性がある石",
    maybe: "条件によって見つかる可能性がある石",
    rare: "運がよければ見つかるかもしれない石"
  }[level] || "";
}

function mainMinerals(rock) {
  const minerals = rock.minerals || [];
  return minerals.length > 0 ? `主な鉱物：${minerals.join("・")}` : "主な鉱物：未登録";
}

// 写真の出典表示。CC BY などは表記が義務なので、写真を出す場所には必ず添える。
// カードは幅がないので出典元だけ。ライセンスと改変の明示は詳細ページの photoCredit() が出す。
function rockPhotoCredit(rock) {
  const image = rock.images?.[0];
  if (!image?.src || !image.credit) {
    return "";
  }
  return `<p class="rock-credit">出典：${escapeHtml(image.credit)}</p>`;
}

function rockImageSrc(rock) {
  // 実物の写真があればそれを使う。無い場合だけ模様で代用する。
  const photo = rock.images?.[0]?.src;
  if (photo) {
    return photo;
  }

  const palette = rock.images?.[0]?.palette || ["#9b9487", "#554f48", "#ddd8cf"];

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${palette[0]}"/>
          <stop offset="0.58" stop-color="${palette[1]}"/>
          <stop offset="1" stop-color="${palette[2]}"/>
        </linearGradient>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="${rock.images?.[0]?.seed ?? rock.id.length}"/>
          <feColorMatrix type="saturate" values="0.2"/>
          <feBlend mode="multiply" in2="SourceGraphic"/>
        </filter>
      </defs>
      <rect width="320" height="240" fill="url(#g)"/>
      <g filter="url(#grain)" opacity="0.45">
        <rect width="320" height="240" fill="${palette[0]}"/>
      </g>
      <g opacity="0.36" fill="${palette[2]}">
        <circle cx="58" cy="48" r="18"/>
        <circle cx="132" cy="92" r="11"/>
        <circle cx="238" cy="62" r="15"/>
        <circle cx="276" cy="164" r="24"/>
        <circle cx="84" cy="184" r="13"/>
      </g>
    </svg>
  `;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function renderGeology(pointLegend, tiers, area = null, catchment = null) {
  const anyLegend = tiers.some((tier) => tier.legends.length > 0);
  if (!pointLegend && !anyLegend && !catchment) {
    setPanelMessage(geologyPanel, text.noGeology);
    return;
  }

  clearPanelMessage(geologyPanel);

  const sections = [];
  if (catchment) {
    sections.push(renderCatchment(catchment));
  }
  if (pointLegend) {
    sections.push(`
      <h3 class="geology-group-title">${text.atPoint}</h3>
      ${geologyCard(pointLegend, true, area)}
    `);
  }

  // 外側の段階には内側の地質も含まれるので、新しく出てきたものだけを並べる。
  const shown = new Set(pointLegend ? [pointLegend.symbol] : []);
  [...tiers]
    .sort((a, b) => a.step - b.step)
    .forEach(({ step, legends }) => {
      const fresh = legends
        .filter((legend) => !shown.has(legend.symbol))
        .sort((a, b) => shareOf(area, b) - shareOf(area, a));
      fresh.forEach((legend) => shown.add(legend.symbol));

      if (fresh.length === 0) {
        return;
      }
      sections.push(`
        <h3 class="geology-group-title">${text.nearby}（±${stepRadiusKm(step)}km）</h3>
        ${fresh.map((legend) => geologyCard(legend, false, area)).join("")}
      `);
    });

  geologyList.innerHTML = sections.join("");
}

function shareOf(area, legend) {
  return area?.shares.get(legendKey(legend)) || 0;
}

// 上流域にどの地質がどれだけ広がっているかを一覧にする。
function renderCatchment(catchment) {
  const rows = [...catchment.shares.entries()]
    .map(([key, share]) => ({ key, share, entry: lithologyMap[key] }))
    .filter(({ entry, share }) => entry && entry.kind === "bedrock" && share >= 0.01)
    .sort((a, b) => b.share - a.share)
    .slice(0, 10);

  if (rows.length === 0) {
    return "";
  }

  return `
    <h3 class="geology-group-title">上流域の地質（約${catchment.areaKm2}km²）</h3>
    <article class="geology-card geology-card-point">
      <p class="geology-meta">この地点に流れ込む範囲の地質です。ここにある岩石が石として運ばれてきます。</p>
      <ul class="catchment-list">
        ${rows.map(({ share, entry }) => `
          <li>
            <span class="catchment-share">${Math.round(share * 100)}%</span>
            <span class="catchment-lithology">${escapeHtml(entry.lithology)}</span>
          </li>
        `).join("")}
      </ul>
    </article>
  `;
}

function geologyCard(legend, isPoint, area) {
  const entry = lithologyEntry(legend);
  const rockNames = (entry?.rocks || [])
    .map(({ id }) => rockCatalog.get(id)?.name)
    .filter(Boolean);

  const share = shareOf(area, legend);
  const shareHtml = share > 0
    ? `<p class="geology-share">この範囲の約${Math.round(share * 100)}%</p>`
    : "";

  return `
    <article class="geology-card${isPoint ? " geology-card-point" : ""}">
      <div class="geology-color" style="background:#${escapeHtml(legend.value || "d9ded2")}"></div>
      <h3>${escapeHtml(legend.group_ja || text.geologyUnavailable)}</h3>
      ${shareHtml}
      <p class="geology-meta">${escapeHtml(legend.lithology_ja || text.lithologyUnavailable)}</p>
      <p class="geology-meta">${escapeHtml(legend.formationAge_ja || text.ageUnavailable)}</p>
      ${rockNames.length > 0 ? `<p class="geology-rocks">対応する石：${escapeHtml(rockNames.join("・"))}</p>` : ""}
      <!-- 記号は石を拾うのに要らないが、対応表の突き合わせには要る。畳んで残す -->
      <details class="geology-symbol">
        <summary>地質図の記号</summary>
        <p>${escapeHtml(legend.symbol || "-")}</p>
      </details>
    </article>
  `;
}

async function fetchAddress(latlng) {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "json");
    url.searchParams.set("accept-language", "ja");
    url.searchParams.set("lat", String(latlng.lat));
    url.searchParams.set("lon", String(latlng.lng));
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "0");

    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`reverse geocode failed: ${response.status}`);
    }
    const result = await response.json();
    return formatAddress(result.display_name || "");
  } catch (error) {
    console.info("Address lookup failed:", error);
    return "";
  }
}

function formatAddress(address) {
  const parts = String(address)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return String(address);
  }

  const countryIndex = parts.findIndex((part) => part === "日本" || part.toLowerCase() === "japan");
  if (countryIndex <= 0) {
    return parts.join(" ");
  }

  const [country] = parts.splice(countryIndex, 1);
  return [country, ...parts.reverse()].join(" ");
}

function locateUser() {
  if (!navigator.geolocation) {
    selectedPoint.textContent = text.currentUnsupported;
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const latlng = L.latLng(position.coords.latitude, position.coords.longitude);
      map.setView(latlng, 13);
      selectAndInspect(latlng);
      setTimeout(() => map.invalidateSize(), 0);
    },
    () => {
      selectedPoint.textContent = text.currentFailed;
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

async function searchPlace(event) {
  event.preventDefault();
  const query = document.querySelector("#searchInput").value.trim();
  if (!query) {
    return;
  }

  const fixedPlaces = {
    "函館": [41.768712, 140.72881],
    "筑波山": [36.22593, 140.10688],
    "東京駅": [35.681236, 139.767125]
  };

  if (fixedPlaces[query]) {
    const latlng = L.latLng(fixedPlaces[query][0], fixedPlaces[query][1]);
    map.setView(latlng, 12);
    selectAndInspect(latlng, query);
    setTimeout(() => map.invalidateSize(), 0);
    return;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    // 混み合うとHTMLのエラーページが返る。JSONとして読む前に確かめる。
    if (!response.ok) {
      throw new Error(`place search failed: ${response.status}`);
    }
    const results = await response.json();
    if (!results.length) {
      selectedPoint.textContent = text.searchNotFound;
      return;
    }
    const latlng = L.latLng(Number(results[0].lat), Number(results[0].lon));
    map.setView(latlng, 12);
    selectAndInspect(latlng, results[0].display_name || query);
    setTimeout(() => map.invalidateSize(), 0);
  } catch (error) {
    console.error("Place search failed:", error);
    selectedPoint.textContent = text.searchFailed;
  }
}

function activateTab(name) {
  const rocksActive = name === "rocks";
  rocksTab.classList.toggle("active", rocksActive);
  geologyTab.classList.toggle("active", !rocksActive);
  rocksTab.setAttribute("aria-selected", String(rocksActive));
  geologyTab.setAttribute("aria-selected", String(!rocksActive));
  rocksPanel.classList.toggle("active", rocksActive);
  geologyPanel.classList.toggle("active", !rocksActive);
}

function setPanelMessage(panel, message) {
  const empty = panel.querySelector(".empty-message");
  if (empty) {
    empty.hidden = false;
    empty.textContent = message;
  }
}

function clearPanelMessage(panel) {
  const empty = panel.querySelector(".empty-message");
  if (empty) {
    empty.hidden = true;
  }
}

function levelLabel(level) {
  return {
    likely: text.likely,
    maybe: text.maybe,
    rare: text.rare
  }[level] || text.candidate;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
