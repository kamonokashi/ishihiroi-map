const termDetail = document.querySelector("#termDetail");

// 用語ページから石・鉱物の詳細へ飛ぶリンク先。
const TERM_LINK_PAGES = {
  stone: "stone.html",
  mineral: "mineral.html",
  term: "term.html"
};

window.addEventListener("DOMContentLoaded", async () => {
  await renderTermPage();
});

async function renderTermPage() {
  const id = new URLSearchParams(window.location.search).get("id");

  if (!id) {
    renderMissingTerm();
    return;
  }

  try {
    const terms = await loadData("data/terms.json", "terms");
    registerCatalog("terms", terms);
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

  const sections = (term.sections || []).map((section, index) => ({ ...section, anchor: `section-${index + 1}` }));
  const toc = [
    ...sections.map(({ anchor, title }) => [anchor, title]),
    ...(Array.isArray(term.sources) && term.sources.length > 0 ? [["sources", "出典"]] : [])
  ];
  const self = { type: "term", id: term.id };
  const kind = term.category === "地質" ? "geology" : "term";

  // 石のページと同じ2段組み。左に読む本文、右に読み・別名などの要点と目次。
  termDetail.innerHTML = `
    <div class="detail-layout">
      <header class="detail-title">
        <p class="stone-category">${escapeHtml(term.category || "用語")}</p>
        <h1>${escapeHtml(term.name)}</h1>
        <p class="stone-english">${escapeHtml(term.english || "")}</p>
        <p class="detail-lead">${escapeHtml(term.shortDescription || "")}</p>
      </header>

      <aside class="detail-aside" aria-label="要点">
        <dl class="detail-facts">
          <dt>読み</dt>
          <dd>${escapeHtml(term.reading || "")}</dd>
          ${Array.isArray(term.aliases) && term.aliases.length > 0 ? `
            <dt>別名</dt>
            <dd>${term.aliases.map(escapeHtml).join("、")}</dd>
          ` : ""}
          <dt>種類</dt>
          <dd>${escapeHtml(term.category || "用語")}</dd>
        </dl>

        <nav class="detail-toc" aria-label="このページの内容">
          <p class="detail-toc-title">このページの内容</p>
          <ol>
            ${toc.map(([anchor, label]) => `<li><a href="#${anchor}">${escapeHtml(label)}</a></li>`).join("")}
          </ol>
          <a class="detail-toc-more" href="glossary.html?kind=${kind}">用語集でほかの言葉を見る</a>
        </nav>
      </aside>

      <div class="detail-main">
        ${sections.map((section) => renderSection(section, self)).join("")}
        ${renderSources(term.sources)}
      </div>
    </div>
  `;
}

function renderSection(section, self) {
  return `
    <article id="${section.anchor}" class="stone-info-panel">
      <h2>${panelIcon(section.icon || "book")}${escapeHtml(section.title)}</h2>
      ${(section.paragraphs || []).map((text) => `<p>${escapeHtml(text)}</p>`).join("")}
      ${renderItems(section.items, self)}
      ${(section.after || []).map((text) => `<p class="term-after">${escapeHtml(text)}</p>`).join("")}
    </article>
  `;
}

// 名前（詳細ページへのリンク）と説明の一覧。石なら写真を添える（link-preview.js の catalogRow）。
// 一覧に石が1つでもあれば、写真のない項目にも枠を出して列をそろえる。
function renderItems(items, self) {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }

  const withPlaceholder = items.some((item) => item.link?.type === "stone");
  return `
    <div class="confuse-list term-items">
      ${items.map((item) => catalogRow({
        name: item.name,
        text: item.text,
        target: TERM_LINK_PAGES[item.link?.type] ? item.link : null,
        self,
        withPlaceholder
      })).join("")}
    </div>
  `;
}

function renderSources(sources) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return "";
  }

  return `
    <article id="sources" class="stone-info-panel">
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
