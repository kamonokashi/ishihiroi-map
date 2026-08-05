const mineralDetail = document.querySelector("#mineralDetail");
const backButton = document.querySelector("#backButton");

window.addEventListener("DOMContentLoaded", async () => {
  bindBackButton();
  await renderMineralPage();
});

function bindBackButton() {
  backButton.addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = "index.html";
  });
}

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

  mineralDetail.innerHTML = `
    <section class="stone-hero mineral-hero">
      <div class="stone-summary">
        <p class="stone-category">鉱物</p>
        <h1>${escapeHtml(mineral.name)}</h1>
        <p class="stone-english">${escapeHtml(mineral.english || "")}</p>
        <p class="stone-short">${escapeHtml(mineral.shortDescription || "")}</p>
      </div>
    </section>

    <section class="stone-content-grid">
      <article class="stone-info-panel stone-wide-panel stone-identify-panel">
        <h2>${panelIcon("search")}見分け方</h2>
        <p>${escapeHtml(mineral.identification || "")}</p>
        ${renderFieldTests(mineral.fieldTests)}
      </article>

      ${renderConfusedWith(mineral.confusedWith)}

      <article class="stone-info-panel">
        <h2>${panelIcon("tag")}特徴タグ</h2>
        <div class="stone-tag-list">
          ${renderList(mineral.features, "stone-tag")}
        </div>
      </article>

      <article class="stone-info-panel">
        <h2>${panelIcon("pebble")}入っていることが多い石</h2>
        <div class="stone-mineral-list">
          ${renderHosts(mineral.hosts, rockCatalog)}
        </div>
      </article>

      ${renderZones(mineral.zones)}
    </section>
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
function renderConfusedWith(pairs) {
  if (!Array.isArray(pairs) || pairs.length === 0) {
    return "";
  }

  return `
    <article class="stone-info-panel stone-wide-panel">
      <h2>${panelIcon("swap")}間違えやすい鉱物</h2>
      <dl class="stone-confuse-list">
        ${pairs.map((pair) => `
          <dt>${escapeHtml(pair.name)}</dt>
          <dd>${escapeHtml(pair.howToTell)}</dd>
        `).join("")}
      </dl>
    </article>
  `;
}

// 母岩。入っている割合が高い順に並べ、カタログにある石は詳細へ飛ばす。
function renderHosts(hosts, rockCatalog) {
  if (!Array.isArray(hosts) || hosts.length === 0) {
    return `<span class="stone-mineral">この鉱物は特定の石ではなく、変成帯を手がかりに探します</span>`;
  }

  return [...hosts]
    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
    .map(([id]) => {
      const rock = rockCatalog.get(id);
      if (!rock) {
        return "";
      }
      return `<a class="stone-mineral stone-mineral-link" href="stone.html?id=${encodeURIComponent(id)}" target="_blank" rel="noopener noreferrer">${escapeHtml(rock.name)}</a>`;
    })
    .filter(Boolean)
    .join("") || `<span class="stone-mineral">未登録</span>`;
}

// 変成帯の名前は、そこに何が結晶しているかを直接示している。
function renderZones(zones) {
  if (!Array.isArray(zones) || zones.length === 0) {
    return "";
  }

  return `
    <article class="stone-info-panel stone-wide-panel">
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
