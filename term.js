const termDetail = document.querySelector("#termDetail");
const backButton = document.querySelector("#backButton");

// 用語ページから石・鉱物の詳細へ飛ぶリンク先。
const TERM_LINK_PAGES = {
  stone: "stone.html",
  mineral: "mineral.html",
  term: "term.html"
};

window.addEventListener("DOMContentLoaded", async () => {
  bindBackButton();
  await renderTermPage();
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

async function renderTermPage() {
  const id = new URLSearchParams(window.location.search).get("id");

  if (!id) {
    renderMissingTerm();
    return;
  }

  try {
    const terms = await loadData("data/terms.json", "terms");
    const term = terms.find((item) => item.id === id);

    if (!term) {
      renderMissingTerm();
      return;
    }

    renderTerm(term);
  } catch (error) {
    console.info("data/terms.json could not be loaded.", error);
    termDetail.innerHTML = `
      <section class="stone-message-panel">
        <h1>用語の説明を読み込めませんでした。</h1>
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

function renderMissingTerm() {
  termDetail.innerHTML = `
    <section class="stone-message-panel">
      <h1>用語の説明が見つかりませんでした。</h1>
      <a class="secondary-button" href="index.html">地図に戻る</a>
    </section>
  `;
}

function renderTerm(term) {
  document.title = `${term.name} - いしひろいマップ`;

  termDetail.innerHTML = `
    <section class="stone-hero mineral-hero">
      <div class="stone-summary">
        <p class="stone-category">用語</p>
        <h1>${escapeHtml(term.name)}</h1>
        <p class="stone-english">${escapeHtml(term.english || "")}</p>
        <p class="stone-short">${escapeHtml(term.shortDescription || "")}</p>
      </div>
    </section>

    <section class="stone-content-grid">
      ${(term.sections || []).map(renderSection).join("")}
      ${renderSources(term.sources)}
    </section>
  `;
}

function renderSection(section) {
  return `
    <article class="stone-info-panel stone-wide-panel">
      <h2>${panelIcon(section.icon || "book")}${escapeHtml(section.title)}</h2>
      ${(section.paragraphs || []).map((text) => `<p>${escapeHtml(text)}</p>`).join("")}
      ${renderItems(section.items)}
      ${(section.after || []).map((text) => `<p class="term-after">${escapeHtml(text)}</p>`).join("")}
    </article>
  `;
}

// 名前（詳細ページへのリンク）と、その説明を並べる。
function renderItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }

  return `
    <dl class="term-item-list">
      ${items.map((item) => `
        <dt>${itemName(item)}</dt>
        <dd>${escapeHtml(item.text || "")}</dd>
      `).join("")}
    </dl>
  `;
}

function itemName(item) {
  const page = TERM_LINK_PAGES[item.link?.type];
  if (!page) {
    return `<span class="stone-mineral">${escapeHtml(item.name)}</span>`;
  }
  return `<a class="stone-mineral stone-mineral-link" href="${page}?id=${encodeURIComponent(item.link.id)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.name)}</a>`;
}

function renderSources(sources) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return "";
  }

  return `
    <article class="stone-info-panel stone-wide-panel">
      <h2>${panelIcon("link")}出典</h2>
      <ul class="term-source-list">
        ${sources.map((source) => `<li>${escapeHtml(source)}</li>`).join("")}
      </ul>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
