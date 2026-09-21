const mineralDetail = document.querySelector("#mineralDetail");

window.addEventListener("DOMContentLoaded", async () => {
  await renderMineralPage();
});

async function renderMineralPage() {
  const id = new URLSearchParams(window.location.search).get("id");

  if (!id) {
    renderMissingMineral();
    return;
  }

  try {
    // 石の名前は「入っていることが多い石」のリンクに使う。読めなくても本文は出す。
    const [minerals, rocks] = await Promise.all([
      loadData("data/minerals.json", "minerals"),
      loadData("data/rocks.json", "rocks").catch(() => [])
    ]);
    const mineral = minerals.find((item) => item.id === id);

    if (!mineral) {
      renderMissingMineral();
      return;
    }

    registerCatalog("rocks", rocks);
    registerCatalog("minerals", minerals);
    renderMineral(mineral, new Map(rocks.map((rock) => [rock.id, rock])));
  } catch (error) {
    console.info("data/minerals.json could not be loaded.", error);
    mineralDetail.innerHTML = `
      <section class="stone-message-panel">
        <h1>鉱物の情報を読み込めませんでした。</h1>
        <p>時間をおいてもう一度お試しください。</p>
      </section>
    `;
  }
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
      console.info(`${path} を読めないので data/bundle.js を使います。`, error);
      return window.ISHIHIROI_DATA[key];
    }
    throw error;
  }
}

function renderMissingMineral() {
  mineralDetail.innerHTML = `
    <section class="stone-message-panel">
      <h1>鉱物の情報が見つかりませんでした。</h1>
      <p>鉱物の一覧からもう一度選んでください。</p>
      <a class="secondary-button" href="index.html">地図に戻る</a>
    </section>
  `;
}

function renderMineral(mineral, rockCatalog) {
  document.title = `${mineral.name} - いしひろいマップ`;

  const self = { type: "mineral", id: mineral.id };
  const sections = [
    ["identify", "見分け方", `
      <article id="identify" class="stone-info-panel stone-identify-panel">
        <h2>${panelIcon("search")}見分け方</h2>
        <p>${escapeHtml(mineral.identification || "")}</p>
        ${renderFieldTests(mineral.fieldTests)}
      </article>
    `],
    ["confused", "間違えやすい鉱物", renderConfusedWith(mineral.confusedWith, mineral)],
    ["hosts", "入っている石", renderHosts(mineral.hosts, rockCatalog)],
    ["zones", "出る変成帯", renderZones(mineral.zones)]
  ].filter(([, , html]) => html);

  // 石・岩相・用語のページと同じ2段組み。左に読む本文、右に要点と目次。
  mineralDetail.innerHTML = `
    <div class="detail-layout">
      <header class="detail-title">
        <p class="stone-category">鉱物</p>
        <h1>${escapeHtml(mineral.name)}</h1>
        <p class="stone-english">${escapeHtml(mineral.english || "")}</p>
        <p class="detail-lead">${escapeHtml(mineral.shortDescription || "")}</p>
      </header>

      <aside class="detail-aside" aria-label="要点">
        <dl class="detail-facts">
          <dt>読み</dt>
          <dd>${escapeHtml(mineral.reading || "")}</dd>
          <dt>特徴</dt>
          <dd class="stone-tag-list">${renderList(mineral.features, "stone-tag")}</dd>
        </dl>

        <nav class="detail-toc" aria-label="このページの内容">
          <p class="detail-toc-title">このページの内容</p>
          <ol>
            ${sections.map(([anchor, label]) => `<li><a href="#${anchor}">${label}</a></li>`).join("")}
          </ol>
          <a class="detail-toc-more" href="glossary.html?kind=mineral">用語集でほかの鉱物を見る</a>
        </nav>
      </aside>

      <div class="detail-main">
        ${sections.map(([, , html]) => html).join("")}
      </div>
    </div>
  `;
}

// 道具なしか、身近なもので現場でできる確かめ方。
function renderFieldTests(tests) {
  if (!Array.isArray(tests) || tests.length === 0) {
    return "";
  }

  return `
    <h3 class="stone-subheading">現場でできる確かめ方</h3>
    <ul class="stone-test-list">
      ${tests.map((test) => `<li>${escapeHtml(test)}</li>`).join("")}
    </ul>
  `;
}

// 似ていて取り違えやすい鉱物と、その決め手。
function renderConfusedWith(pairs, mineral) {
  if (!Array.isArray(pairs) || pairs.length === 0) {
    return "";
  }

  return `
    <article id="confused" class="stone-info-panel">
      <h2>${panelIcon("swap")}間違えやすい鉱物</h2>
      <div class="confuse-list">
        ${pairs.map((pair) => confusedItem(pair, { type: "mineral", id: mineral.id }, false)).join("")}
      </div>
    </article>
  `;
}

// 母岩。入っている割合が高い順に、写真のタイルで並べる（link-preview.js の stoneTile）。
function renderHosts(hosts, rockCatalog) {
  const rocks = [...(hosts || [])]
    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
    .map(([id]) => rockCatalog.get(id))
    .filter(Boolean);

  if (rocks.length === 0) {
    return "";
  }

  return `
    <article id="hosts" class="stone-info-panel">
      <h2>${panelIcon("pebble")}入っていることが多い石</h2>
      <div class="stone-tiles">
        ${rocks.map((rock) => stoneTile(rock)).join("")}
      </div>
    </article>
  `;
}

// 変成帯の名前は、そこに何が結晶しているかを直接示している。
function renderZones(zones) {
  if (!Array.isArray(zones) || zones.length === 0) {
    return "";
  }

  return `
    <article id="zones" class="stone-info-panel">
      <h2>${panelIcon("layers")}この鉱物が出る変成帯</h2>
      <p>地質図の岩相にこの名前が入っていれば、その場所の石にこの鉱物が結晶しています。</p>
      <div class="stone-term-list">
        ${zones.map(([name]) => `<span class="stone-term">${escapeHtml(name)}</span>`).join("")}
      </div>
    </article>
  `;
}

function renderList(items, className) {
  if (!Array.isArray(items) || items.length === 0) {
    return `<span class="${className}">未登録</span>`;
  }

  return items.map((item) => `<span class="${className}">${escapeHtml(item)}</span>`).join("");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
