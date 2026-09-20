// 用語集（索引）。石・鉱物・用語をまとめて、読みの五十音順に行（あ行・か行…）ごとに並べる。
// 種類（石／鉱物／地質／用語）で絞り込め、石はさらに火成岩・堆積岩・変成岩で絞り込める。
// 検索は名前・読み・別名・英名・説明のどれかに含まれていれば当たり。ひらがなとカタカナは区別しない。
// 検索語と絞り込みは URL（?q= / kind= / sub=）に残し、詳細ページから戻っても元の表示に戻るようにする。

const glossaryList = document.querySelector("#glossaryList");
const glossaryCount = document.querySelector("#glossaryCount");
const glossarySearch = document.querySelector("#glossarySearch");
const glossaryIndex = document.querySelector("#glossaryIndex");
const glossarySubFilters = document.querySelector("#glossarySubFilters");

const KANA_ROWS = [
  ["あ", "あいうえおぁぃぅぇぉゔ"],
  ["か", "かきくけこがぎぐげご"],
  ["さ", "さしすせそざじずぜぞ"],
  ["た", "たちつてとだぢづでどっ"],
  ["な", "なにぬねの"],
  ["は", "はひふへほばびぶべぼぱぴぷぺぽ"],
  ["ま", "まみむめも"],
  ["や", "やゆよゃゅょ"],
  ["ら", "らりるれろ"],
  ["わ", "わをん"]
];

const KINDS = {
  stone: { label: "石", page: "stone.html" },
  mineral: { label: "鉱物", page: "mineral.html" },
  geology: { label: "地質", page: "term.html" },
  term: { label: "用語", page: "term.html" }
};

const state = { query: "", kind: "all", sub: "all" };
let entries = [];

window.addEventListener("DOMContentLoaded", async () => {
  try {
    entries = await loadEntries();
  } catch (error) {
    console.info("glossary data could not be loaded.", error);
    glossaryList.innerHTML = "<p>用語を読み込めませんでした。時間をおいてもう一度お試しください。</p>";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  state.query = params.get("q") || "";
  state.kind = KINDS[params.get("kind")] ? params.get("kind") : "all";
  state.sub = params.get("sub") || "all";
  glossarySearch.value = state.query;

  glossarySearch.addEventListener("input", () => {
    state.query = glossarySearch.value;
    update();
  });
  document.querySelectorAll("[data-kind]").forEach((button) => {
    button.addEventListener("click", () => {
      state.kind = button.dataset.kind;
      state.sub = "all";
      update();
    });
  });
  document.querySelectorAll("[data-sub]").forEach((button) => {
    button.addEventListener("click", () => {
      state.sub = button.dataset.sub;
      update();
    });
  });

  render();
});

async function loadEntries() {
  const [rocks, minerals, terms] = await Promise.all([
    loadData("data/rocks.json", "rocks"),
    loadData("data/minerals.json", "minerals"),
    loadData("data/terms.json", "terms")
  ]);

  registerCatalog("rocks", rocks);
  registerCatalog("minerals", minerals);
  registerCatalog("terms", terms);

  const list = [
    ...rocks.map((rock) => entry("stone", rock, rock.category || "その他")),
    ...minerals.map((mineral) => entry("mineral", mineral, "")),
    ...terms.map((term) => entry(term.category === "地質" ? "geology" : "term", term, ""))
  ];
  return list.sort((a, b) => a.reading.localeCompare(b.reading, "ja") || a.name.localeCompare(b.name, "ja"));
}

function entry(kind, item, sub) {
  return {
    kind,
    sub,
    id: item.id,
    name: item.name,
    reading: item.reading || item.name,
    description: item.shortDescription || "",
    search: normalize([item.name, item.reading || "", ...(item.aliases || []), item.english || "", item.shortDescription || ""].join(" ")),
    href: `${KINDS[kind].page}?id=${encodeURIComponent(item.id)}`
  };
}

// file:// で開くと fetch が使えないので、data/bundle.js の同じ内容に切り替える。
async function loadData(path, key) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`${key} fetch failed: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    if (window.ISHIHIROI_DATA?.[key]) {
      return window.ISHIHIROI_DATA[key];
    }
    throw error;
  }
}

function update() {
  const url = new URL(window.location.href);
  const set = (key, value, empty) => (value && value !== empty ? url.searchParams.set(key, value) : url.searchParams.delete(key));
  set("q", state.query, "");
  set("kind", state.kind, "all");
  set("sub", state.sub, "all");
  window.history.replaceState(null, "", url);
  render();
}

function render() {
  document.querySelectorAll("[data-kind]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.kind === state.kind));
  });
  document.querySelectorAll("[data-sub]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.sub === state.sub));
  });
  glossarySubFilters.hidden = state.kind !== "stone";

  const needle = normalize(state.query.trim());
  const hits = entries.filter((item) =>
    (state.kind === "all" || item.kind === state.kind) &&
    (state.kind !== "stone" || state.sub === "all" || item.sub === state.sub) &&
    (!needle || item.search.includes(needle))
  );

  const groups = groupByRow(hits);
  renderIndex(groups);

  const scope = state.kind === "all" ? "" : `${KINDS[state.kind].label}${state.kind === "stone" && state.sub !== "all" ? `（${state.sub}）` : ""}のうち、`;
  glossaryCount.textContent = needle
    ? `${scope}「${state.query.trim()}」に当てはまるもの：${hits.length}件`
    : `${scope}${hits.length}件`;

  if (hits.length === 0) {
    glossaryList.innerHTML = `<p class="glossary-empty">当てはまるものがありません。別の言葉やひらがなで試すか、絞り込みを「すべて」に戻してみてください。</p>`;
    return;
  }

  glossaryList.innerHTML = groups.map(({ row, items }) => `
    <section class="glossary-group" aria-labelledby="glossary-row-${row}">
      <h2 id="glossary-row-${row}" class="glossary-row">
        <span class="glossary-row-kana">${row}</span>
        <span class="glossary-row-label">${row === "他" ? "その他" : "行"}</span>
        <span class="glossary-row-count">${items.length}</span>
      </h2>
      <ul class="glossary-items">
        ${items.map(itemHtml).join("")}
      </ul>
    </section>
  `).join("");
}

// 辞書の索引のような「あ か さ た な…」の帯。その行に言葉がなければ押せない。
function renderIndex(groups) {
  const present = new Set(groups.map(({ row }) => row));
  glossaryIndex.innerHTML = [...KANA_ROWS.map(([row]) => row), ...(present.has("他") ? ["他"] : [])]
    .map((row) => present.has(row)
      ? `<a class="glossary-index-link" href="#glossary-row-${row}">${row}</a>`
      : `<span class="glossary-index-link is-empty" aria-hidden="true">${row}</span>`)
    .join("");
}

function itemHtml(item) {
  return `
    <li>
      <a class="glossary-item" href="${item.href}">
        <span class="glossary-kind glossary-kind-${item.kind}">${KINDS[item.kind].label}</span>
        <span class="glossary-name">${escapeHtml(item.name)}</span>
        <span class="glossary-reading">${escapeHtml(item.reading)}</span>
      </a>
    </li>
  `;
}

function groupByRow(items) {
  const groups = new Map();
  items.forEach((item) => {
    const head = toHiragana(item.reading).charAt(0);
    const row = KANA_ROWS.find(([, chars]) => chars.includes(head))?.[0] || "他";
    if (!groups.has(row)) {
      groups.set(row, []);
    }
    groups.get(row).push(item);
  });
  return [...KANA_ROWS.map(([row]) => row), "他"]
    .filter((row) => groups.has(row))
    .map((row) => ({ row, items: groups.get(row) }));
}

// カタカナをひらがなに、英字を小文字にそろえる。
function normalize(text) {
  return toHiragana(text).toLowerCase();
}

function toHiragana(text) {
  return String(text).replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
