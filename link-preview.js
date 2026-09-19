// 石・鉱物・用語へのリンクにマウスを乗せたとき（キーボードで選んだとき）に、説明の小さなカードを出す。
// 押せばそのまま詳細ページへ移る。詳細ページ（stone / mineral / lithology / term）が共通で読む。
//
// 中身は data/bundle.js（どのページでも読む）の rocks / minerals / terms から作る。
// ページの本文はあとから描かれるので、個々のリンクではなく document で受けて判定する。
// 触るだけの端末ではホバーがないので出さない（タップでそのまま移る）。

// カタログ（石・鉱物・用語）にある名前なら、その詳細ページへのリンクにする。無ければ文字のまま。
// 詳細ページの「主な造岩鉱物」「間違えやすい石」「関連用語」などが共通で使う。
// self に今のページの { type, id } を渡すと、自分自身へのリンクは作らない。
//
// CATALOG_ALIASES は、カタログの項目の仲間であることが確かな言葉だけ（斜長石は長石の一種、など）。
// 似ているだけの別物をここに入れると、違うページへ連れていくことになるので入れない。
const CATALOG_ALIASES = {
  "斜長石": ["mineral", "feldspar"],
  "アルカリ長石": ["mineral", "feldspar"],
  "カリ長石": ["mineral", "feldspar"],
  "曹長石": ["mineral", "feldspar"],
  "長石の細粒": ["mineral", "feldspar"],
  "石英の細粒": ["mineral", "quartz"],
  "陽起石": ["mineral", "amphibole"],
  "石英脈": ["stone", "vein-quartz"],
  "石英の脈": ["stone", "vein-quartz"],
  "結晶質石灰岩": ["stone", "marble"]
};

const CATALOG_PAGES = { stone: "stone.html", mineral: "mineral.html", term: "term.html" };

function catalogTarget(name) {
  const data = window.ISHIHIROI_DATA || {};
  const lists = [["stone", data.rocks], ["mineral", data.minerals], ["term", data.terms]];
  for (const [type, list] of lists) {
    const found = (list || []).find((item) => item.name === name);
    if (found) {
      return { type, id: found.id };
    }
  }
  const alias = CATALOG_ALIASES[name];
  return alias ? { type: alias[0], id: alias[1] } : null;
}

function catalogLink(name, className = "", self = null) {
  const label = String(name)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
  const target = catalogTarget(name);
  // 「輝石・角閃石」のように並べて書いた名前は、それぞれをリンクにする。
  if (!target && String(name).includes("・")) {
    const parts = String(name).split("・").map((part) => catalogLink(part, "", self));
    return className ? `<span class="${className}">${parts.join("・")}</span>` : parts.join("・");
  }
  if (!target || (self && self.type === target.type && self.id === target.id)) {
    return className ? `<span class="${className}">${label}</span>` : label;
  }
  const href = `${CATALOG_PAGES[target.type]}?id=${encodeURIComponent(target.id)}`;
  return `<a class="${className} catalog-link" href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

(() => {
  const LINK_PATTERN = /^(stone|mineral|term)\.html\?id=([^&#]+)/;
  const SHOW_DELAY = 180;
  const canHover = window.matchMedia("(hover: hover)");

  let card = null;
  let currentLink = null;
  let showTimer = 0;

  function previewTarget(element) {
    const link = element?.closest?.("a[href]");
    if (!link) {
      return null;
    }
    const match = link.getAttribute("href").match(LINK_PATTERN);
    return match ? { link, type: match[1], id: decodeURIComponent(match[2]) } : null;
  }

  function findEntry(type, id) {
    const data = window.ISHIHIROI_DATA || {};
    const list = { stone: data.rocks, mineral: data.minerals, term: data.terms }[type] || [];
    return list.find((item) => item.id === id) || null;
  }

  function ensureCard() {
    if (!card) {
      card = document.createElement("div");
      card.className = "link-preview";
      card.setAttribute("role", "tooltip");
      card.id = "linkPreview";
      document.body.appendChild(card);
    }
    return card;
  }

  function show(target) {
    const entry = findEntry(target.type, target.id);
    if (!entry) {
      return;
    }
    const box = ensureCard();
    box.innerHTML = cardHtml(target.type, entry);
    box.classList.toggle("has-visual", target.type === "stone");
    box.classList.add("is-visible");
    target.link.setAttribute("aria-describedby", box.id);
    currentLink = target.link;
    place(box, target.link);
  }

  function hide() {
    window.clearTimeout(showTimer);
    if (card) {
      card.classList.remove("is-visible");
    }
    if (currentLink) {
      currentLink.removeAttribute("aria-describedby");
      currentLink = null;
    }
  }

  // 置き場所は 下 → 上 → 右 → 左 の順に試し、画面に完全に収まる最初の場所にする。
  // 右と左はリンクを隠さずに上下をずらせるので、縦長のカードでも収まりやすい。
  // 縦長（写真が上）でどこにも入らなければ、写真を左に置いた背の低い横長に切り替えて試し直す。
  // それでも入らない小さな画面では、横長のまま画面内に押し込む（高さは CSS の max-height で抑える）。
  function place(box, link) {
    const margin = 12;
    const gap = 10;
    const rect = link.getBoundingClientRect();
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

    const candidates = (width, height) => [
      { left: clamp(rect.left, margin, viewW - width - margin), top: rect.bottom + gap },
      { left: clamp(rect.left, margin, viewW - width - margin), top: rect.top - gap - height },
      { left: rect.right + gap, top: clamp(rect.top + rect.height / 2 - height / 2, margin, viewH - height - margin) },
      { left: rect.left - gap - width, top: clamp(rect.top + rect.height / 2 - height / 2, margin, viewH - height - margin) }
    ];
    const fits = ({ left, top }, width, height) =>
      left >= margin && top >= margin && left + width <= viewW - margin && top + height <= viewH - margin;

    for (const wide of [false, true]) {
      box.classList.toggle("is-wide", wide);
      const width = box.offsetWidth;
      // max-height で切られた高さではなく、中身が全部見える高さで判定する。
      const height = box.scrollHeight;
      const spot = candidates(width, height).find((candidate) => fits(candidate, width, height));
      if (spot) {
        box.style.left = `${spot.left}px`;
        box.style.top = `${spot.top}px`;
        return;
      }
    }

    const width = box.offsetWidth;
    const height = box.offsetHeight;
    box.style.left = `${clamp(rect.left, margin, viewW - width - margin)}px`;
    box.style.top = `${clamp(rect.bottom + gap, margin, viewH - height - margin)}px`;
  }

  function cardHtml(type, entry) {
    if (type === "stone") {
      return stoneCard(entry);
    }
    return `
      <p class="link-preview-kind">${type === "mineral" ? "鉱物" : "用語"}</p>
      <p class="link-preview-name">${esc(entry.name)}</p>
      ${tags(entry.features)}
      <p class="link-preview-text">${esc(entry.shortDescription || "")}</p>
      <p class="link-preview-more">押すと詳しいページを開きます</p>
    `;
  }

  // 地図画面の石カードと同じ並び（写真・名前・特徴・主な鉱物・ひとこと）。
  function stoneCard(rock) {
    const image = rock.images?.[0] || {};
    const palette = Array.isArray(image.palette) ? image.palette : ["#9b9487", "#554f48", "#ddd8cf"];
    // 写真を出すときは出典も必ず添える。写真がなければ模様の色だけを帯で出す。
    const visual = image.src
      ? `<img class="link-preview-photo" src="${esc(image.src)}" alt="">
         ${image.credit ? `<p class="link-preview-credit">出典：${esc(image.credit)}</p>` : ""}`
      : `<div class="link-preview-swatch" style="background:linear-gradient(135deg, ${palette.map(esc).join(", ")})"></div>`;
    const minerals = Array.isArray(rock.minerals) && rock.minerals.length > 0 ? rock.minerals.join("・") : "未登録";

    return `
      <div class="link-preview-visual">${visual}</div>
      <div class="link-preview-body">
      <p class="link-preview-kind">${esc([rock.category, rock.subCategory].filter(Boolean).join(" / "))}</p>
      <p class="link-preview-name">${esc(rock.name)}</p>
      ${tags(rock.features)}
      <p class="link-preview-text">${rock.category === "堆積岩" ? "主な構成物" : "主な鉱物"}：${esc(minerals)}</p>
      <p class="link-preview-text">${esc(rock.shortDescription || "")}</p>
      <p class="link-preview-more">押すと詳しいページを開きます</p>
      </div>
    `;
  }

  function tags(features) {
    if (!Array.isArray(features) || features.length === 0) {
      return "";
    }
    return `<div class="link-preview-tags">${features.slice(0, 3).map((feature) => `<span>${esc(feature)}</span>`).join("")}</div>`;
  }

  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function scheduleShow(target) {
    window.clearTimeout(showTimer);
    showTimer = window.setTimeout(() => show(target), SHOW_DELAY);
  }

  document.addEventListener("pointerover", (event) => {
    if (event.pointerType !== "mouse" || !canHover.matches) {
      return;
    }
    const target = previewTarget(event.target);
    if (target && target.link !== currentLink) {
      scheduleShow(target);
    }
  });

  document.addEventListener("pointerout", (event) => {
    const target = previewTarget(event.target);
    if (target && !target.link.contains(event.relatedTarget)) {
      hide();
    }
  });

  // キーボードで選んだときだけ出す。タップでのフォーカスでは出さない。
  document.addEventListener("focusin", (event) => {
    const target = previewTarget(event.target);
    if (target && target.link.matches(":focus-visible")) {
      show(target);
    }
  });

  document.addEventListener("focusout", hide);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hide();
    }
  });
  // 詳細ページはbodyがスクロールするので、どの要素のスクロールでも閉じるよう capture で受ける。
  document.addEventListener("scroll", hide, { capture: true, passive: true });
})();
