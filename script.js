const API_BASE = "https://gbank.gsj.jp/seamless/v2/api/1.3";
const PROXY_URL = "api/geology.php";
const DEFAULT_CENTER = [35.681236, 139.767125];
const DEFAULT_ZOOM = 11;
const BBOX_DELTA = 0.01;

const text = {
  loading: "\u8abf\u3079\u3066\u3044\u307e\u3059",
  inspect: "\u3053\u3053\u3092\u8abf\u3079\u308b\uff01",
  fetching: "\u5730\u8cea\u60c5\u5831\u3092\u53d6\u5f97\u3057\u3066\u3044\u307e\u3059\u3002",
  noRocks: "\u898b\u3064\u304b\u308b\u77f3\u3092\u63a8\u5b9a\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u5730\u8cea\u3092\u898b\u308b\u30bf\u30d6\u3067\u53d6\u5f97\u7d50\u679c\u3092\u78ba\u8a8d\u3067\u304d\u307e\u3059\u3002",
  noGeology: "\u3053\u306e\u7bc4\u56f2\u3067\u306f\u5730\u8cea\u60c5\u5831\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3067\u3057\u305f\u3002",
  fetchFailed: "\u5730\u8cea\u60c5\u5831\u3092\u53d6\u5f97\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002CORS\u306e\u5834\u5408\u306fPHP\u30d7\u30ed\u30ad\u30b7\u3067\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  selectedTitle: "\u9078\u629e\u5730\u70b9",
  addressLoading: "\u4f4f\u6240\u3092\u78ba\u8a8d\u3057\u3066\u3044\u307e\u3059",
  addressUnavailable: "\u4f4f\u6240\u3092\u53d6\u5f97\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f",
  likely: "\u3088\u304f\u898b\u3064\u304b\u308b",
  maybe: "\u898b\u3064\u304b\u308b\u304b\u3082",
  rare: "\u73cd\u3057\u3044",
  candidate: "\u5019\u88dc",
  details: "\u8a73\u3057\u304f",
  matchedKeyword: "\u5bfe\u5fdc\u30ad\u30fc\u30ef\u30fc\u30c9",
  noDetails: "\u7c21\u6613\u60c5\u5831\u306f\u672a\u767b\u9332\u3067\u3059\u3002",
  currentFailed: "\u73fe\u5728\u5730\u3092\u53d6\u5f97\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u5730\u56f3\u3092\u30af\u30ea\u30c3\u30af\u3057\u3066\u5834\u6240\u3092\u9078\u3093\u3067\u304f\u3060\u3055\u3044\u3002",
  currentUnsupported: "\u3053\u306e\u30d6\u30e9\u30a6\u30b6\u3067\u306f\u73fe\u5728\u5730\u3092\u53d6\u5f97\u3067\u304d\u307e\u305b\u3093\u3002",
  searchNotFound: "\u691c\u7d22\u7d50\u679c\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3067\u3057\u305f\u3002",
  searchFailed: "\u691c\u7d22\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002\u51fd\u9928\u3001\u7b51\u6ce2\u5c71\u3001\u6771\u4eac\u99c5\u306f\u56fa\u5b9a\u5019\u88dc\u3068\u3057\u3066\u691c\u7d22\u3067\u304d\u307e\u3059\u3002",
  geologyToggle: "\u5730\u8cea\u56f3\u8868\u793a",
  geologyUnavailable: "\u5730\u8cea\u60c5\u5831\u306a\u3057",
  lithologyUnavailable: "\u5ca9\u76f8\u60c5\u5831\u306a\u3057",
  ageUnavailable: "\u6642\u4ee3\u60c5\u5831\u306a\u3057"
};

const fallbackRockMap = [
  {
    keyword: "\u82b1\u5d17",
    rocks: [{
      id: "granite",
      name: "\u82b1\u5d17\u5ca9",
      en: "Granite",
      level: "likely",
      tags: ["\u706b\u6210\u5ca9", "\u767d\u3063\u307d\u3044", "\u3054\u307e\u5869\u6a21\u69d8"],
      description: "\u77f3\u82f1\u3084\u9577\u77f3\u3092\u542b\u3080\u3001\u7c92\u304c\u898b\u3048\u308b\u3053\u3068\u306e\u591a\u3044\u786c\u3044\u77f3\u3067\u3059\u3002"
    }]
  },
  {
    keyword: "\u7802\u5ca9",
    rocks: [{
      id: "sandstone",
      name: "\u7802\u5ca9",
      en: "Sandstone",
      level: "likely",
      tags: ["\u5806\u7a4d\u5ca9", "\u3056\u3089\u3056\u3089"],
      description: "\u7802\u7c92\u304c\u56fa\u307e\u3063\u3066\u3067\u304d\u305f\u77f3\u3067\u3001\u624b\u89e6\u308a\u306b\u7c92\u611f\u304c\u51fa\u308b\u3053\u3068\u304c\u3042\u308a\u307e\u3059\u3002"
    }]
  },
  {
    keyword: "\u6ce5\u5ca9",
    rocks: [{
      id: "mudstone",
      name: "\u6ce5\u5ca9",
      en: "Mudstone",
      level: "maybe",
      tags: ["\u5806\u7a4d\u5ca9", "\u7d30\u304b\u3044\u7c92"],
      description: "\u6ce5\u304c\u56fa\u307e\u3063\u305f\u77f3\u3067\u3001\u5272\u308c\u3084\u3059\u3044\u3082\u306e\u3082\u3042\u308a\u307e\u3059\u3002"
    }]
  },
  {
    keyword: "\u7384\u6b66\u5ca9",
    rocks: [{
      id: "basalt",
      name: "\u7384\u6b66\u5ca9",
      en: "Basalt",
      level: "maybe",
      tags: ["\u706b\u6210\u5ca9", "\u9ed2\u3063\u307d\u3044"],
      description: "\u6eb6\u5ca9\u304c\u51b7\u3048\u3066\u3067\u304d\u305f\u3001\u9ed2\u304b\u3089\u6697\u3044\u7070\u8272\u306e\u77f3\u3067\u3059\u3002"
    }]
  },
  {
    keyword: "\u5b89\u5c71\u5ca9",
    rocks: [{
      id: "andesite",
      name: "\u5b89\u5c71\u5ca9",
      en: "Andesite",
      level: "maybe",
      tags: ["\u706b\u6210\u5ca9", "\u7070\u8272"],
      description: "\u65e5\u672c\u306e\u706b\u5c71\u5730\u57df\u3067\u3088\u304f\u898b\u3089\u308c\u308b\u3001\u7070\u8272\u304b\u3089\u6697\u7070\u8272\u306e\u77f3\u3067\u3059\u3002"
    }]
  },
  {
    keyword: "\u77f3\u7070\u5ca9",
    rocks: [{
      id: "limestone",
      name: "\u77f3\u7070\u5ca9",
      en: "Limestone",
      level: "likely",
      tags: ["\u5806\u7a4d\u5ca9", "\u767d\u3063\u307d\u3044"],
      description: "\u70ad\u9178\u30ab\u30eb\u30b7\u30a6\u30e0\u3092\u591a\u304f\u542b\u3080\u77f3\u3067\u3001\u767d\u304b\u3089\u7070\u8272\u306e\u3082\u306e\u304c\u3042\u308a\u307e\u3059\u3002"
    }]
  },
  {
    keyword: "\u30c1\u30e3\u30fc\u30c8",
    rocks: [{
      id: "chert",
      name: "\u30c1\u30e3\u30fc\u30c8",
      en: "Chert",
      level: "rare",
      tags: ["\u5806\u7a4d\u5ca9", "\u786c\u3044", "\u3064\u308b\u3064\u308b"],
      description: "\u3068\u3066\u3082\u786c\u304f\u7dfb\u5bc6\u306a\u77f3\u3067\u3001\u8d64\u30fb\u7070\u30fb\u767d\u306a\u3069\u8272\u306e\u5e45\u304c\u3042\u308a\u307e\u3059\u3002"
    }]
  },
  {
    keyword: "\u5806\u7a4d\u5ca9",
    rocks: [{
      id: "sedimentary-fragment",
      name: "\u5806\u7a4d\u5ca9\u306e\u304b\u3051\u3089",
      en: "Sedimentary rock fragment",
      level: "maybe",
      tags: ["\u5806\u7a4d\u5ca9", "\u5ddd\u3084\u6d77\u5cb8", "\u7c92\u304c\u898b\u3048\u308b\u3053\u3068\u304c\u3042\u308b"],
      description: "\u5468\u8fba\u304c\u5806\u7a4d\u5ca9\u5730\u57df\u306e\u5834\u5408\u306e\u7c21\u6613\u5019\u88dc\u3067\u3059\u3002\u5b9f\u969b\u306e\u77f3\u7a2e\u306f\u5ca9\u76f8\u306e\u8a73\u7d30\u3067\u5909\u308f\u308a\u307e\u3059\u3002"
    }]
  },
  {
    keyword: "\u706b\u6210\u5ca9",
    rocks: [{
      id: "igneous-fragment",
      name: "\u706b\u6210\u5ca9\u306e\u304b\u3051\u3089",
      en: "Igneous rock fragment",
      level: "maybe",
      tags: ["\u706b\u6210\u5ca9", "\u786c\u3044", "\u7d50\u6676\u304c\u898b\u3048\u308b\u3053\u3068\u304c\u3042\u308b"],
      description: "\u5468\u8fba\u304c\u706b\u6210\u5ca9\u5730\u57df\u306e\u5834\u5408\u306e\u7c21\u6613\u5019\u88dc\u3067\u3059\u3002\u82b1\u5d17\u5ca9\u3084\u5b89\u5c71\u5ca9\u306a\u3069\u306e\u8a73\u7d30\u306f\u5ca9\u76f8\u3068\u5bfe\u5fdc\u8868\u3067\u5224\u5b9a\u3057\u307e\u3059\u3002"
    }]
  }
];

let map;
let marker;
let geologyLayer;
let clickedLatLng = null;
let rockMap = fallbackRockMap;
let lastLegends = [];
let inspectInProgress = false;
let selectedAddressRequestId = 0;

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
  await loadRockMap();
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
}

function setMapCollapsed(collapsed) {
  appShell.classList.toggle("map-collapsed", collapsed);
  mapCollapseButton.setAttribute("aria-expanded", String(!collapsed));
  mapRestoreButton.hidden = !collapsed;
  setTimeout(() => {
    map.invalidateSize();
    updateInspectPopupPosition();
  }, 260);
}

async function loadRockMap() {
  try {
    const response = await fetch("data/rock-map.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`rock-map fetch failed: ${response.status}`);
    }
    rockMap = await response.json();
  } catch (error) {
    console.info("data/rock-map.json could not be loaded. Fallback data will be used.", error);
  }
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

  const address = initialAddress ? pendingAddress : await fetchAddress(latlng);
  if (requestId !== selectedAddressRequestId) {
    return;
  }

  updateSelectedAddress(address || text.addressUnavailable);
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

function updateInspectPopupPosition() {
  if (!clickedLatLng || inspectPopupOverlay.hidden || !map) {
    return;
  }

  const mapPaneRect = document.querySelector(".map-pane").getBoundingClientRect();
  const markerRect = marker?._icon?.getBoundingClientRect();
  const point = markerRect
    ? {
        x: markerRect.left - mapPaneRect.left + markerRect.width / 2,
        y: markerRect.top - mapPaneRect.top
      }
    : map.latLngToContainerPoint(clickedLatLng);
  const width = inspectPopupOverlay.offsetWidth;
  const height = inspectPopupOverlay.offsetHeight;
  inspectPopupOverlay.style.left = `${Math.round(point.x - width / 2)}px`;
  inspectPopupOverlay.style.top = `${Math.round(point.y - height - 12)}px`;
}

async function inspectGeology(latlng) {
  inspectInProgress = true;
  setInspectPopupButtonsState({ disabled: true, label: text.loading });
  rockCards.innerHTML = "";
  geologyList.innerHTML = "";
  setPanelMessage(rocksPanel, text.fetching);
  setPanelMessage(geologyPanel, text.fetching);

  try {
    const legends = await fetchLegends(latlng);
    lastLegends = normalizeLegendResponse(legends);
    console.log("GSJ seamless geology response:", lastLegends);
    renderGeology(lastLegends);
    renderRocks(matchRocks(lastLegends));
    activateTab("rocks");
  } catch (error) {
    console.error("Geology lookup failed:", error);
    setPanelMessage(rocksPanel, text.fetchFailed);
    setPanelMessage(geologyPanel, text.fetchFailed);
  } finally {
    inspectInProgress = false;
    setInspectPopupButtonsState({ disabled: false, label: text.inspect });
  }
}

async function fetchLegends(latlng) {
  const minLat = latlng.lat - BBOX_DELTA;
  const maxLat = latlng.lat + BBOX_DELTA;
  const minLng = latlng.lng - BBOX_DELTA;
  const maxLng = latlng.lng + BBOX_DELTA;
  const box = `${minLat},${minLng},${maxLat},${maxLng}`;
  const directUrl = `${API_BASE}/legend.json?box=${encodeURIComponent(box)}`;
  console.info("Fetching GSJ legend:", directUrl);

  try {
    const response = await fetch(directUrl);
    if (!response.ok) {
      throw new Error(`GSJ API error: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.info("Direct GSJ API fetch failed. Trying PHP proxy.", error);
    const proxyResponse = await fetch(`${PROXY_URL}?box=${encodeURIComponent(box)}`);
    if (!proxyResponse.ok) {
      throw new Error(`Proxy API error: ${proxyResponse.status}`);
    }
    return proxyResponse.json();
  }
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

  const countryIndex = parts.findIndex((part) => part === "\u65e5\u672c" || part.toLowerCase() === "japan");
  if (countryIndex <= 0) {
    return parts.join(" ");
  }

  const [country] = parts.splice(countryIndex, 1);
  return [country, ...parts.reverse()].join(" ");
}

function normalizeLegendResponse(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => item && Object.keys(item).length > 0);
  }
  if (value && Object.keys(value).length > 0) {
    return [value];
  }
  return [];
}

function matchRocks(legends) {
  const matched = new Map();

  legends.forEach((legend) => {
    const targetText = [
      legend.group_ja,
      legend.lithology_ja,
      legend.formationAge_ja,
      legend.symbol,
      legend.title
    ].filter(Boolean).join(" ");

    rockMap.forEach((entry) => {
      if (targetText.includes(entry.keyword)) {
        entry.rocks.forEach((rock) => {
          if (!matched.has(rock.id)) {
            matched.set(rock.id, { ...rock, matchedKeyword: entry.keyword, legend });
          }
        });
      }
    });
  });

  return [...matched.values()].sort((a, b) => levelWeight(a.level) - levelWeight(b.level));
}

function levelWeight(level) {
  return { likely: 0, maybe: 1, rare: 2 }[level] ?? 3;
}

function renderRocks(rocks) {
  if (rocks.length === 0) {
    setPanelMessage(rocksPanel, text.noRocks);
    return;
  }

  clearPanelMessage(rocksPanel);
  const groups = ["likely", "maybe", "rare"]
    .map((level) => ({ level, rocks: rocks.filter((rock) => rock.level === level) }))
    .filter((group) => group.rocks.length > 0);

  rockCards.innerHTML = groups.map((group) => `
    <section class="rock-level-section rock-level-${escapeHtml(group.level)}" aria-label="${levelLabel(group.level)}">
      <header class="rock-section-header">
        <h3 class="rock-section-title">${levelLabel(group.level)}</h3>
        <p>${escapeHtml(levelDescription(group.level))}</p>
      </header>
      <div class="rock-grid">
        ${group.rocks.map((rock) => renderRockCard(rock)).join("")}
      </div>
    </section>
  `).join("");

  rockCards.querySelectorAll("[data-details]").forEach((button) => {
    button.addEventListener("click", () => {
      const detail = document.querySelector(`#rock-details-${CSS.escape(button.dataset.details)}`);
      const expanded = detail.hidden;
      detail.hidden = !expanded;
      button.setAttribute("aria-expanded", String(expanded));
      button.classList.toggle("is-open", expanded);
    });
  });
}

function renderRockCard(rock) {
  const detailUrl = `stone.html?id=${encodeURIComponent(rock.id)}`;
  return `
    <article class="rock-card rock-card-${escapeHtml(rock.level)}">
      <a class="rock-photo-link" href="${detailUrl}" aria-label="${escapeHtml(rock.name)}${text.details}">
        <img class="rock-photo" src="${rockImageSrc(rock)}" alt="${escapeHtml(rock.name)}の表面イメージ" loading="lazy">
      </a>
      <button class="rock-card-summary" type="button" data-details="${escapeHtml(rock.id)}" aria-expanded="false" aria-controls="rock-details-${escapeHtml(rock.id)}">
        <div>
          <h4>${escapeHtml(rock.name)}</h4>
        </div>
        <span class="rock-toggle-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </span>
      </button>
      <div class="rock-details" id="rock-details-${escapeHtml(rock.id)}" hidden>
        <div class="tags">${rock.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
        <p class="rock-minerals">${escapeHtml(mainMinerals(rock))}</p>
        <p>${escapeHtml(rock.description || text.noDetails)}</p>
        <a class="secondary-button rock-detail-link" href="${detailUrl}">${text.details}</a>
      </div>
    </article>
  `;
}

function levelDescription(level) {
  return {
    likely: "\u3053\u306e\u3042\u305f\u308a\u3067\u3088\u304f\u898b\u3064\u304b\u308b\u53ef\u80fd\u6027\u304c\u3042\u308b\u77f3",
    maybe: "\u6761\u4ef6\u306b\u3088\u3063\u3066\u898b\u3064\u304b\u308b\u53ef\u80fd\u6027\u304c\u3042\u308b\u77f3",
    rare: "\u904b\u304c\u3088\u3051\u308c\u3070\u898b\u3064\u304b\u308b\u304b\u3082\u3057\u308c\u306a\u3044\u77f3"
  }[level] || "";
}

function mainMinerals(rock) {
  return {
    granite: "\u4e3b\u306a\u9271\u7269\uff1a\u77f3\u82f1\u30fb\u9577\u77f3\u30fb\u9ed2\u96f2\u6bcd",
    sandstone: "\u4e3b\u306a\u69cb\u6210\uff1a\u77f3\u82f1\u7c92\u30fb\u9577\u77f3\u7c92\u30fb\u5ca9\u7247",
    mudstone: "\u4e3b\u306a\u69cb\u6210\uff1a\u7c98\u571f\u9271\u7269\u30fb\u77f3\u82f1\u306e\u7d30\u7c92",
    basalt: "\u4e3b\u306a\u9271\u7269\uff1a\u8f1d\u77f3\u30fb\u659c\u9577\u77f3\u30fb\u304b\u3093\u3089\u3093\u77f3",
    andesite: "\u4e3b\u306a\u9271\u7269\uff1a\u659c\u9577\u77f3\u30fb\u8f1d\u77f3\u30fb\u89d2\u9583\u77f3",
    limestone: "\u4e3b\u306a\u6210\u5206\uff1a\u65b9\u89e3\u77f3",
    chert: "\u4e3b\u306a\u6210\u5206\uff1a\u77f3\u82f1\u306e\u5fae\u7d30\u306a\u7d50\u6676",
    "sedimentary-fragment": "\u4e3b\u306a\u69cb\u6210\uff1a\u7802\u30fb\u6ce5\u30fb\u5ca9\u7247",
    "igneous-fragment": "\u4e3b\u306a\u9271\u7269\uff1a\u9577\u77f3\u30fb\u8f1d\u77f3\u30fb\u77f3\u82f1\u306a\u3069"
  }[rock.id] || "\u4e3b\u306a\u9271\u7269\uff1a\u672a\u767b\u9332";
}

function rockImageSrc(rock) {
  const palette = {
    granite: ["#d7d2c9", "#7e7468", "#f3f0ea"],
    sandstone: ["#c99b5d", "#8f6f45", "#ead1a5"],
    mudstone: ["#6e6a63", "#373b36", "#a39b8f"],
    basalt: ["#333a3b", "#111719", "#677071"],
    andesite: ["#848987", "#565d5d", "#c4c7bd"],
    limestone: ["#e5e1d3", "#b8b49f", "#faf8ed"],
    chert: ["#8e5b5d", "#52465a", "#d1c2b6"],
    "sedimentary-fragment": ["#b99369", "#6f5841", "#e2c398"],
    "igneous-fragment": ["#7e8178", "#343934", "#c5c6bc"]
  }[rock.id] || ["#9b9487", "#554f48", "#ddd8cf"];

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${palette[0]}"/>
          <stop offset="0.58" stop-color="${palette[1]}"/>
          <stop offset="1" stop-color="${palette[2]}"/>
        </linearGradient>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="${escapeHtml(rock.id).length}"/>
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

function renderGeology(legends) {
  if (legends.length === 0) {
    setPanelMessage(geologyPanel, text.noGeology);
    return;
  }

  clearPanelMessage(geologyPanel);
  geologyList.innerHTML = legends.map((legend) => `
    <article class="geology-card">
      <div class="geology-color" style="background:#${escapeHtml(legend.value || "d9ded2")}"></div>
      <h3>${escapeHtml(legend.group_ja || text.geologyUnavailable)}</h3>
      <p class="geology-meta">${escapeHtml(legend.lithology_ja || text.lithologyUnavailable)}</p>
      <p class="geology-meta">${escapeHtml(legend.formationAge_ja || text.ageUnavailable)}</p>
      <p class="geology-meta">symbol: ${escapeHtml(legend.symbol || "-")}</p>
    </article>
  `).join("");
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
      selectPoint(latlng);
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
    "\u51fd\u9928": [41.768712, 140.72881],
    "\u7b51\u6ce2\u5c71": [36.22593, 140.10688],
    "\u6771\u4eac\u99c5": [35.681236, 139.767125]
  };

  if (fixedPlaces[query]) {
    const latlng = L.latLng(fixedPlaces[query][0], fixedPlaces[query][1]);
    map.setView(latlng, 12);
    selectPoint(latlng, query);
    setTimeout(() => map.invalidateSize(), 0);
    return;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    const results = await response.json();
    if (!results.length) {
      selectedPoint.textContent = text.searchNotFound;
      return;
    }
    const latlng = L.latLng(Number(results[0].lat), Number(results[0].lon));
    map.setView(latlng, 12);
    selectPoint(latlng, results[0].display_name || query);
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
