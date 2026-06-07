const stoneDetail = document.querySelector("#stoneDetail");
const backButton = document.querySelector("#backButton");

window.addEventListener("DOMContentLoaded", async () => {
  bindBackButton();
  await renderStonePage();
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

async function renderStonePage() {
  const id = new URLSearchParams(window.location.search).get("id");

  if (!id) {
    renderMissingStone();
    return;
  }

  try {
    const response = await fetch("data/rocks.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`rocks fetch failed: ${response.status}`);
    }

    const rocks = await response.json();
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
  const mainImage = imageSrc(images[0], stone, 0);
  document.title = `${stone.name} - \u3044\u3057\u3072\u308d\u3044\u30de\u30c3\u30d7`;

  stoneDetail.innerHTML = `
    <section class="stone-hero">
      <div class="stone-main-photo-wrap">
        <img id="mainStonePhoto" class="stone-main-photo" src="${mainImage}" alt="${escapeHtml(stone.name)}\u306e\u8868\u9762\u30a4\u30e1\u30fc\u30b8">
      </div>
      <div class="stone-summary">
        <p class="stone-category">${escapeHtml(stone.category || "\u672a\u5206\u985e")}</p>
        <h1>${escapeHtml(stone.name)}</h1>
        <p class="stone-english">${escapeHtml(stone.english || "")}</p>
        <p class="stone-short">${escapeHtml(stone.shortDescription || "")}</p>
      </div>
    </section>

    <section class="stone-content-grid">
      <article class="stone-info-panel stone-description-panel">
        <h2>\u57fa\u672c\u60c5\u5831\u30fb\u8aac\u660e</h2>
        <p>${escapeHtml(stone.description || "")}</p>
      </article>

      <article class="stone-info-panel">
        <h2>\u7279\u5fb4\u30bf\u30b0</h2>
        <div class="stone-tag-list">
          ${renderList(stone.features, "stone-tag")}
        </div>
      </article>

      <article class="stone-info-panel">
        <h2>\u4e3b\u306a\u9020\u5ca9\u9271\u7269</h2>
        <div class="stone-mineral-list">
          ${renderList(stone.minerals, "stone-mineral")}
        </div>
      </article>

      <article class="stone-info-panel stone-gallery-panel">
        <h2>\u5199\u771f\u4e00\u89a7</h2>
        <div class="stone-thumbnail-grid">
          ${images.map((image, index) => renderThumbnail(image, stone, index)).join("")}
        </div>
      </article>

      <article class="stone-info-panel stone-wide-panel">
        <h2>\u898b\u3064\u304b\u308a\u3084\u3059\u3044\u5730\u57df\u30fb\u5730\u8cea\u3068\u306e\u95a2\u4fc2</h2>
        <p>${escapeHtml(stone.likelyPlaces || "")}</p>
        <p>${escapeHtml(stone.geologyRelation || "")}</p>
      </article>

      <article class="stone-info-panel stone-wide-panel">
        <h2>\u95a2\u9023\u7528\u8a9e</h2>
        <div class="stone-term-list">
          ${renderList(stone.relatedTerms, "stone-term")}
        </div>
      </article>
    </section>
  `;

  bindGallery(stone, images);
}

function bindGallery(stone, images) {
  const mainPhoto = document.querySelector("#mainStonePhoto");
  const buttons = document.querySelectorAll("[data-stone-image]");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.stoneImage);
      const image = images[index];
      mainPhoto.src = imageSrc(image, stone, index);
      mainPhoto.alt = `${stone.name}\u306e${image.label || "\u8868\u9762"}\u30a4\u30e1\u30fc\u30b8`;

      buttons.forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
    });
  });
}

function renderThumbnail(image, stone, index) {
  const activeClass = index === 0 ? " is-active" : "";
  const label = image.label || `\u5199\u771f${index + 1}`;
  return `
    <button class="stone-thumbnail${activeClass}" type="button" data-stone-image="${index}" aria-label="${escapeHtml(label)}\u3092\u8868\u793a">
      <img src="${imageSrc(image, stone, index)}" alt="${escapeHtml(label)}">
      <span>${escapeHtml(label)}</span>
    </button>
  `;
}

function renderList(items, className) {
  if (!Array.isArray(items) || items.length === 0) {
    return `<span class="${className}">\u672a\u767b\u9332</span>`;
  }

  return items.map((item) => `<span class="${className}">${escapeHtml(item)}</span>`).join("");
}

function imageSrc(image, stone, index) {
  if (image && image.src) {
    return image.src;
  }

  const palette = image && Array.isArray(image.palette)
    ? image.palette
    : ["#d7d2c9", "#7e7468", "#f3f0ea"];
  const seed = image && image.seed ? image.seed : stone.id.length + index;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 620">
      <defs>
        <linearGradient id="base" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${palette[0]}"/>
          <stop offset="0.56" stop-color="${palette[1]}"/>
          <stop offset="1" stop-color="${palette[2]}"/>
        </linearGradient>
        <filter id="texture">
          <feTurbulence type="fractalNoise" baseFrequency="0.76" numOctaves="4" seed="${seed}"/>
          <feColorMatrix type="saturate" values="0.28"/>
          <feBlend mode="multiply" in2="SourceGraphic"/>
        </filter>
      </defs>
      <rect width="900" height="620" fill="url(#base)"/>
      <g filter="url(#texture)" opacity="0.42">
        <rect width="900" height="620" fill="${palette[0]}"/>
      </g>
      <g opacity="0.34" fill="${palette[2]}">
        <circle cx="132" cy="112" r="44"/>
        <circle cx="352" cy="212" r="28"/>
        <circle cx="658" cy="148" r="38"/>
        <circle cx="742" cy="418" r="62"/>
        <circle cx="238" cy="474" r="34"/>
      </g>
      <g opacity="0.22" fill="${palette[1]}">
        <circle cx="216" cy="250" r="20"/>
        <circle cx="516" cy="386" r="24"/>
        <circle cx="612" cy="286" r="17"/>
      </g>
    </svg>
  `;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
