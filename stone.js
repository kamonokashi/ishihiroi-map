const stoneDetail = document.querySelector("#stoneDetail");

window.addEventListener("DOMContentLoaded", async () => {
  await renderStonePage();
});

async function renderStonePage() {
  const id = new URLSearchParams(window.location.search).get("id");

  if (!id) {
    renderMissingStone();
    return;
  }

  try {
    const rocks = await loadRocks();
    // 間違えやすい石の写真やリンクのカードも、このページが読んだデータから作る（link-preview.js）
    registerCatalog("rocks", rocks);
    const stone = rocks.find((rock) => rock.id === id);

    if (!stone) {
      renderMissingStone();
      return;
    }

    renderStone(stone);
  } catch (error) {
    console.info("data/rocks.json could not be loaded.", error);
    stoneDetail.innerHTML = `
      <section class="stone-message-panel">
        <h1>\u77f3\u306e\u60c5\u5831\u3092\u8aad\u307f\u8fbc\u3081\u307e\u305b\u3093\u3067\u3057\u305f\u3002</h1>
        <p>\u6642\u9593\u3092\u304a\u3044\u3066\u3082\u3046\u4e00\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002</p>
      </section>
    `;
  }
}

// file:// で開くと fetch が使えないので、data/bundle.js の同じ内容に切り替える。
async function loadRocks() {
  try {
    const response = await fetch("data/rocks.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`rocks fetch failed: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    if (window.ISHIHIROI_DATA?.rocks) {
      console.info("data/rocks.json を読めないので data/bundle.js を使います。", error);
      return window.ISHIHIROI_DATA.rocks;
    }
    throw error;
  }
}

function renderMissingStone() {
  stoneDetail.innerHTML = `
    <section class="stone-message-panel">
      <h1>\u77f3\u306e\u60c5\u5831\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3067\u3057\u305f\u3002</h1>
      <p>\u77f3\u30ab\u30fc\u30c9\u304b\u3089\u3082\u3046\u4e00\u5ea6\u9078\u3093\u3067\u304f\u3060\u3055\u3044\u3002</p>
      <a class="secondary-button" href="index.html">\u5730\u56f3\u306b\u623b\u308b</a>
    </section>
  `;
}

function renderStone(stone) {
  const images = Array.isArray(stone.images) && stone.images.length > 0 ? stone.images : [{}];
  const mainImage = stoneImageSrc(images[0], stone, 0);
  document.title = `${stone.name} - \u3044\u3057\u3072\u308d\u3044\u30de\u30c3\u30d7`;

  const confused = renderConfusedWith(stone.confusedWith, stone);
  // 右の列の目次。欄がない石（間違えやすい石が未登録など）は飛ばす。
  const toc = [
    ["identify", "見分け方"],
    confused ? ["confused", "間違えやすい石"] : null,
    ["description", "説明"],
    ["classification", "名前の決まり方"],
    ["places", "見つかる場所"],
    ["related", "関連用語"]
  ].filter(Boolean);

  // 広い画面では、左に読む本文、右に写真と要点（図鑑の「データ欄」）を置く2段組み。
  // 本文の列は1行40字前後に収まる幅にしてある。1行が長いと次の行の頭を探しにくいため。
  // 狭い画面では 名前 → 写真と要点 → 本文 の順に1列で並ぶ（.detail-layout の grid-template-areas）。
  stoneDetail.innerHTML = `
    <div class="detail-layout">
      <header class="detail-title">
        <p class="stone-category">${escapeHtml(categoryLabel(stone))}</p>
        <h1>${escapeHtml(stone.name)}</h1>
        <p class="stone-english">${escapeHtml(stone.english || "")}</p>
        <p class="detail-lead">${escapeHtml(stone.shortDescription || "")}</p>
      </header>

      <aside class="detail-aside" aria-label="写真と要点">
        <div class="stone-gallery">
          <div class="stone-stage">
            <img id="mainStonePhoto" class="stone-main-photo" src="${mainImage}" alt="${escapeHtml(stone.name)}の表面イメージ">
            ${images.length > 1 ? `
              <button class="stone-nav stone-nav-prev" type="button" data-stone-step="-1" aria-label="前の写真">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7"/></svg>
              </button>
              <button class="stone-nav stone-nav-next" type="button" data-stone-step="1" aria-label="次の写真">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
              </button>
              <p id="stoneCounter" class="stone-counter">1 / ${images.length}</p>
            ` : ""}
          </div>
          <p id="mainStoneCredit" class="stone-credit">${shotCaption(images[0], 0)}</p>
          ${images.length > 1 ? `
            <div class="stone-thumbnail-strip">
              ${images.map((image, index) => renderThumbnail(image, stone, index)).join("")}
            </div>
          ` : ""}
        </div>

        <dl class="detail-facts">
          <dt>分類</dt>
          <dd>${categoryLinks(stone)}</dd>
          <dt>特徴</dt>
          <dd class="stone-tag-list">${renderList(stone.features, "stone-tag")}</dd>
          <dt>${stone.category === "堆積岩" ? "主な構成物" : "主な造岩鉱物"}</dt>
          <dd class="stone-mineral-list">${renderLinkedList(stone.minerals, "stone-mineral", stone)}</dd>
        </dl>

        <nav class="detail-toc" aria-label="このページの内容">
          <p class="detail-toc-title">このページの内容</p>
          <ol>
            ${toc.map(([id, label]) => `<li><a href="#${id}">${label}</a></li>`).join("")}
          </ol>
        </nav>
      </aside>

      <div class="detail-main">
        <article id="identify" class="stone-info-panel stone-identify-panel">
          <h2>${panelIcon("search")}見分け方</h2>
          <p>${escapeHtml(stone.identification || "")}</p>
          ${renderFieldTests(stone.fieldTests)}
        </article>

        ${confused}

        <article id="description" class="stone-info-panel">
          <h2>${panelIcon("book")}説明</h2>
          <p>${escapeHtml(stone.description || "")}</p>
        </article>

        <article id="classification" class="stone-info-panel">
          <h2>${panelIcon("ruler")}名前の決まり方${classificationHelpButton()}</h2>
          ${classificationPanel(stone.classification, stone.name)}
        </article>

        <article id="places" class="stone-info-panel">
          <h2>${panelIcon("pin")}見つかりやすい場所・地質との関係</h2>
          <p>${escapeHtml(stone.likelyPlaces || "")}</p>
          <p>${escapeHtml(stone.geologyRelation || "")}</p>
        </article>

        <article id="related" class="stone-info-panel">
          <h2>${panelIcon("link")}関連用語</h2>
          <div class="stone-term-list">
            ${renderLinkedList(stone.relatedTerms, "stone-term", stone)}
          </div>
        </article>
      </div>
    </div>
  `;

  bindGallery(stone, images);
  bindClassificationHelp();
}

function bindGallery(stone, images) {
  const mainPhoto = document.querySelector("#mainStonePhoto");
  const mainCredit = document.querySelector("#mainStoneCredit");
  const counter = document.querySelector("#stoneCounter");
  const gallery = document.querySelector(".stone-gallery");
  const buttons = [...document.querySelectorAll("[data-stone-image]")];
  let current = 0;

  const show = (index) => {
    // \u7aef\u3067\u6b62\u3081\u305a\u306b\u5dfb\u304d\u623b\u3059\u30023\u679a\u3057\u304b\u306a\u3044\u306e\u3067\u3001\u884c\u304d\u6b62\u307e\u308a\u304c\u3042\u308b\u307b\u3046\u304c\u7169\u308f\u3057\u3044
    current = (index + images.length) % images.length;
    const image = images[current];
    mainPhoto.src = stoneImageSrc(image, stone, current);
    mainPhoto.alt = `${stone.name}\u306e${image.label || "\u8868\u9762"}\u30a4\u30e1\u30fc\u30b8`;
    // \u5199\u771f\u3092\u5207\u308a\u66ff\u3048\u305f\u3089\u51fa\u5178\u3082\u5fc5\u305a\u5dee\u3057\u66ff\u3048\u308b\u3002\u51fa\u3057\u3063\u3071\u306a\u3057\u306f\u8aa4\u8868\u793a\u306b\u306a\u308b\u3002
    mainCredit.innerHTML = shotCaption(image, current);
    if (counter) {
      counter.textContent = `${current + 1} / ${images.length}`;
    }
    buttons.forEach((item, itemIndex) => {
      item.classList.toggle("is-active", itemIndex === current);
      item.setAttribute("aria-current", String(itemIndex === current));
    });
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => show(Number(button.dataset.stoneImage)));
  });

  document.querySelectorAll("[data-stone-step]").forEach((button) => {
    button.addEventListener("click", () => show(current + Number(button.dataset.stoneStep)));
  });

  if (images.length > 1) {
    gallery.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        show(current - 1);
      } else if (event.key === "ArrowRight") {
        show(current + 1);
      } else {
        return;
      }
      event.preventDefault();
    });

    // \u6307\u3067\u3082\u9001\u308c\u308b\u3088\u3046\u306b\u3059\u308b\u300240px \u306f\u3075\u3064\u3046\u306e\u30bf\u30c3\u30d7\u3067\u306f\u52d5\u304b\u306a\u3044\u5e45
    let startX = null;
    const stage = document.querySelector(".stone-stage");
    stage.addEventListener("pointerdown", (event) => {
      startX = event.clientX;
    });
    stage.addEventListener("pointerup", (event) => {
      if (startX === null) {
        return;
      }
      const moved = event.clientX - startX;
      startX = null;
      if (Math.abs(moved) >= 40) {
        show(current + (moved < 0 ? 1 : -1));
      }
    });
    stage.addEventListener("pointercancel", () => {
      startX = null;
    });
  }

  show(0);
}

function renderThumbnail(image, stone, index) {
  const label = image.label || `\u5199\u771f${index + 1}`;
  return `
    <button class="stone-thumbnail" type="button" data-stone-image="${index}" aria-label="${escapeHtml(label)}\u3092\u8868\u793a" title="${escapeHtml(label)}">
      <img src="${stoneImageSrc(image, stone, index)}" alt="" loading="lazy">
    </button>
  `;
}

function categoryLabel(stone) {
  const category = stone.category || "\u672a\u5206\u985e";
  return stone.subCategory ? `${category} / ${stone.subCategory}` : category;
}

// 表示中の1枚の説明。何の面を見ているかと、出典を1行にまとめる。
// 写真が未収録のコマは模様で代用しているので、写真と思われないよう断りを出す。
function shotCaption(image, index) {
  const label = escapeHtml((image && image.label) || `写真${index + 1}`);
  const rest = image && image.src
    ? photoCredit(image)
    : "模様はイメージです（この面の写真は未収録）";
  return `<span class="stone-shot-label">${label}</span>${rest}`;
}

// 写真の出典表示。ライセンスによっては表記が義務なので、
// 写真を出すところには必ずこれを添える。src が空（模様で代用）なら何も出さない。
function photoCredit(image) {
  if (!image || !image.src) {
    return "";
  }

  const parts = [];
  if (image.credit) {
    parts.push(escapeHtml(image.credit));
  }
  if (image.license) {
    parts.push(
      image.licenseUrl
        ? `<a href="${escapeHtml(image.licenseUrl)}" target="_blank" rel="noreferrer noopener">${escapeHtml(image.license)}</a>`
        : escapeHtml(image.license)
    );
  }
  if (image.sourceUrl) {
    parts.push(`<a href="${escapeHtml(image.sourceUrl)}" target="_blank" rel="noreferrer noopener">出典</a>`);
  }
  if (image.modified) {
    parts.push("表示のためにサイズを変更しています");
  }

  return parts.join(" / ");
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

// 似ていて取り違えやすい石と、その決め手。
function renderConfusedWith(pairs, stone) {
  if (!Array.isArray(pairs) || pairs.length === 0) {
    return "";
  }

  return `
    <article id="confused" class="stone-info-panel">
      <h2>${panelIcon("swap")}間違えやすい石</h2>
      <div class="confuse-list">
        ${pairs.map((pair) => confusedItem(pair, { type: "stone", id: stone.id }, true)).join("")}
      </div>
    </article>
  `;
}

// カタログ（石・鉱物・用語）にある名前は詳細ページへのリンクにする（link-preview.js の catalogLink）。
// 「火成岩 / 深成岩」の分類を、用語ページがある言葉だけリンクにする。
function categoryLinks(stone) {
  return [stone.category, stone.subCategory]
    .filter(Boolean)
    .map((name) => catalogLink(name, "", { type: "stone", id: stone.id }))
    .join(" / ");
}

function renderLinkedList(items, className, stone) {
  if (!Array.isArray(items) || items.length === 0) {
    return renderList(items, className);
  }
  return items.map((item) => catalogLink(item, className, { type: "stone", id: stone.id })).join("");
}

function renderList(items, className) {
  if (!Array.isArray(items) || items.length === 0) {
    return `<span class="${className}">\u672a\u767b\u9332</span>`;
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
