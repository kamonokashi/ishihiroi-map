// 岩石の名前の決まり方を「物差し」で描く。stone.html と lithology.html の両方から読む。
//
// 物差しは国際的な分類の境界そのもの。岩石ごとの「よくある割合」は産地で変わり、
// 出典をそろえられないので出さない。載せる数値は必ず SOURCES のどれかに基づくこと。
// 石ごとにどの物差しのどの区間を強調するかは rocks.json の classification に持つ。

const CLASSIFICATION_SOURCES = {
  qapf: "Streckeisen (1976) Earth-Science Reviews 12, 1–33／Le Maitre 編 (2002) Igneous Rocks: A Classification and Glossary of Terms, 2nd ed.（国際地質科学連合 IUGS の分類）",
  tas: "Le Bas ほか (1986) Journal of Petrology 27, 745–750／Le Maitre 編 (2002)（IUGS の TAS 分類）",
  wentworth: "Wentworth (1922) Journal of Geology 30, 377–392",
  schmid: "Schmid (1981) Geology 9, 41–43（IUGS の火山砕屑岩の分類）"
};

// segments は左から順に隙間なく並べる。key は rocks.json の highlight から指す名前。
// scale: "log2" のときは from / to を 2 を底とした対数（1mm = 0）で持つ。
const CLASSIFICATION_SCALES = {
  "qapf-quartz": {
    title: "石英の割合",
    basis: "石英・アルカリ長石・斜長石の合計のうち（体積%）",
    unit: "%",
    source: "qapf",
    segments: [
      { key: "q0", from: 0, to: 5, label: "閃緑岩・斑れい岩・閃長岩など" },
      { key: "q5", from: 5, to: 20, label: "石英閃緑岩・石英モンゾニ岩など" },
      { key: "q20", from: 20, to: 60, label: "花崗岩・花崗閃緑岩・トーナル岩など" },
      { key: "q60", from: 60, to: 90, label: "石英に富む花崗岩類" },
      { key: "q90", from: 90, to: 100, label: "ほぼ石英だけの岩石" }
    ]
  },
  "qapf-plag-granitic": {
    title: "長石のうち斜長石の割合",
    basis: "アルカリ長石と斜長石の合計のうち（石英が20〜60%の岩石の場合）",
    unit: "%",
    source: "qapf",
    segments: [
      { key: "p0", from: 0, to: 10, label: "アルカリ長石花崗岩" },
      { key: "p10", from: 10, to: 65, label: "花崗岩" },
      { key: "p65", from: 65, to: 90, label: "花崗閃緑岩" },
      { key: "p90", from: 90, to: 100, label: "トーナル岩" }
    ]
  },
  "qapf-plag-dioritic": {
    title: "長石のうち斜長石の割合",
    basis: "アルカリ長石と斜長石の合計のうち（石英が5%未満の岩石の場合）",
    unit: "%",
    source: "qapf",
    segments: [
      { key: "p0", from: 0, to: 10, label: "アルカリ長石閃長岩" },
      { key: "p10", from: 10, to: 35, label: "閃長岩" },
      { key: "p35", from: 35, to: 65, label: "モンゾニ岩" },
      { key: "p65", from: 65, to: 90, label: "モンゾ閃緑岩・モンゾ斑れい岩" },
      { key: "p90", from: 90, to: 100, label: "閃緑岩・斑れい岩" }
    ]
  },
  "plag-an": {
    title: "斜長石のカルシウム成分",
    basis: "斜長石にしめる灰長石（An）成分の割合（モル%）。上の割合では区別できない閃緑岩と斑れい岩を、これで分けます",
    unit: "%",
    source: "qapf",
    segments: [
      { key: "an0", from: 0, to: 50, label: "閃緑岩" },
      { key: "an50", from: 50, to: 100, label: "斑れい岩" }
    ]
  },
  "gabbro-mafic": {
    title: "黒っぽい鉱物（有色鉱物）の割合",
    basis: "斜長石・輝石・かんらん石の合計のうち、輝石とかんらん石の割合（体積%）",
    unit: "%",
    source: "qapf",
    segments: [
      { key: "m0", from: 0, to: 10, label: "斜長岩" },
      { key: "m10", from: 10, to: 90, label: "斑れい岩" },
      { key: "m90", from: 90, to: 100, label: "超苦鉄質岩（かんらん岩・輝岩）" }
    ]
  },
  "ultramafic-m": {
    title: "黒っぽい鉱物（有色鉱物）の割合",
    basis: "岩石全体のうち（体積%）",
    unit: "%",
    source: "qapf",
    segments: [
      { key: "m0", from: 0, to: 90, label: "ほかの深成岩（石英・長石の割合で分類）" },
      { key: "m90", from: 90, to: 100, label: "超苦鉄質岩" }
    ]
  },
  "ultramafic-ol": {
    title: "かんらん石の割合",
    basis: "かんらん石・斜方輝石・単斜輝石の合計のうち（体積%）",
    unit: "%",
    source: "qapf",
    segments: [
      { key: "ol0", from: 0, to: 40, label: "輝岩" },
      { key: "ol40", from: 40, to: 90, label: "かんらん岩（ハルツバージャイト・レールゾライトなど）" },
      { key: "ol90", from: 90, to: 100, label: "ダナイト（かんらん岩の一種）" }
    ]
  },
  "tas-sio2": {
    title: "シリカ（SiO₂）の量",
    // 見出しの「シリカ」を用語ページ（term.html?id=silica）へのリンクにする。
    titleTerm: { word: "シリカ", id: "silica" },
    basis: "水と二酸化炭素を除いて100%に換算した重さ%。アルカリ（Na₂O＋K₂O）が少ない、日本でふつうの火山岩の場合",
    unit: "%",
    source: "tas",
    segments: [
      { key: "s41", from: 41, to: 45, label: "ピクロ玄武岩など" },
      { key: "s45", from: 45, to: 52, label: "玄武岩" },
      { key: "s52", from: 52, to: 57, label: "玄武岩質安山岩" },
      { key: "s57", from: 57, to: 63, label: "安山岩" },
      { key: "s63", from: 63, to: 69, label: "デイサイト" },
      { key: "s69", from: 69, to: 77.3, label: "デイサイトか流紋岩（境目はアルカリの量で動く）", boundary: true, hint: "69〜77.3%の範囲は、アルカリの量によってデイサイトにも流紋岩にもなります。" },
      { key: "s77", from: 77.3, to: 80, label: "流紋岩", open: true }
    ]
  },
  "grain-size": {
    title: "粒の大きさ",
    basis: "粒の直径（mm）。目盛りは2倍ごとの対数",
    scale: "log2",
    source: "wentworth",
    segments: [
      { key: "clay", from: -10, to: -8, label: "粘土" },
      { key: "silt", from: -8, to: -4, label: "シルト" },
      { key: "sand", from: -4, to: 1, label: "砂" },
      { key: "granule", from: 1, to: 2, label: "細礫" },
      { key: "pebble", from: 2, to: 6, label: "中礫" },
      { key: "cobble", from: 6, to: 8, label: "大礫" },
      { key: "boulder", from: 8, to: 10, label: "巨礫", open: true }
    ]
  },
  "pyroclast-size": {
    title: "火山から飛び出した破片の大きさ",
    basis: "破片の直径（mm）。目盛りは2倍ごとの対数",
    scale: "log2",
    source: "schmid",
    segments: [
      { key: "ash", from: -6, to: 1, label: "火山灰", openStart: true },
      { key: "lapilli", from: 1, to: 6, label: "火山礫" },
      { key: "block", from: 6, to: 9, label: "火山岩塊・火山弾", open: true }
    ]
  }
};

// rockName は要約の文（「玄武岩は、シリカ（SiO₂）の量が45〜52%の岩石です」）と、
// 横棒の上の名札に使う。図だけだと、見出しと横棒の関係がひと目で分からないため。
function classificationPanel(classification, rockName) {
  const scales = (classification?.scales || []).filter(({ id }) => CLASSIFICATION_SCALES[id]);
  const sources = [...new Set(scales.map(({ id }) => CLASSIFICATION_SCALES[id].source))];

  return `
    ${scales.map((ref) => classificationScale(ref, rockName)).join("")}
    ${classification?.note ? `<p class="classification-note">${classificationEscape(classification.note)}</p>` : ""}
    ${sources.length > 0 ? `
      <p class="classification-source">出典：${sources.map((key) => classificationEscape(CLASSIFICATION_SOURCES[key])).join("／")}</p>
    ` : ""}
  `;
}

function classificationScale({ id, highlight = [] }, rockName) {
  const scale = CLASSIFICATION_SCALES[id];
  const first = scale.segments[0].from;
  const last = scale.segments[scale.segments.length - 1].to;
  const position = (value) => ((value - first) / (last - first)) * 100;
  const marked = new Set(highlight);
  const span = markedSpan(scale, marked);

  return `
    <figure class="classification-scale">
      <figcaption>
        <span class="classification-title">${scaleTitle(scale)}</span>
        ${span && rockName ? `<span class="classification-summary">${classificationEscape(summaryText(scale, span, rockName))}</span>` : ""}
      </figcaption>
      ${span && rockName ? rockTag(rockName, (position(span.from) + position(span.to)) / 2) : ""}
      <div class="classification-bar" aria-hidden="true">
        ${scale.segments.map((segment) => `
          <span class="classification-segment${marked.has(segment.key) ? " is-marked" : ""}${segment.boundary ? " is-boundary" : ""}"
            style="left:${position(segment.from)}%;width:${position(segment.to) - position(segment.from)}%"
            title="${classificationEscape(`${segment.label}：${segmentRange(scale, segment)}`)}"></span>
        `).join("")}
      </div>
      <div class="classification-ticks" aria-hidden="true">
        ${scaleTicks(scale).map((value) => `<span${position(value) >= 100 ? ' class="is-end"' : ""} style="left:${position(value)}%">${classificationEscape(tickLabel(scale, value))}</span>`).join("")}
      </div>
      <ul class="classification-legend">
        ${scale.segments.map((segment) => `
          <li class="${marked.has(segment.key) ? "is-marked" : ""}">
            <span class="classification-swatch${segment.boundary ? " is-boundary" : ""}" aria-hidden="true"></span>
            <span class="classification-range">${classificationEscape(segmentRange(scale, segment))}</span>
            <span class="classification-label">${classificationEscape(segment.label)}${marked.has(segment.key) ? '<span class="visually-hidden">（この石）</span>' : ""}</span>
          </li>
        `).join("")}
      </ul>
      <p class="classification-basis">${classificationEscape(scale.basis)}</p>
    </figure>
  `;
}

// 見出しのうち titleTerm の言葉を、用語ページへのリンクにする。
// ホバーしたときの説明カードは link-preview.js が出す。
function scaleTitle(scale) {
  const term = scale.titleTerm;
  const title = classificationEscape(scale.title);
  if (!term || !scale.title.includes(term.word)) {
    return title;
  }
  const link = `<a class="term-link" href="term.html?id=${encodeURIComponent(term.id)}" target="_blank">${classificationEscape(term.word)}</a>`;
  return title.replace(classificationEscape(term.word), link);
}

// 強調する区間はつながっている前提で、ひとつの区間にまとめる（安山岩の 52〜57 と 57〜63 → 52〜63%）。
function markedSpan(scale, marked) {
  const segments = scale.segments.filter((segment) => marked.has(segment.key));
  if (segments.length === 0) {
    return null;
  }
  const head = segments[0];
  const tail = segments[segments.length - 1];
  return {
    from: head.from,
    to: tail.to,
    openStart: head.openStart,
    open: tail.open,
    hint: segments.find((segment) => segment.hint)?.hint || ""
  };
}

function summaryText(scale, span, rockName) {
  return `${rockName}は、${scale.title}が${segmentRange(scale, span)}の岩石です。${span.hint}`;
}

// 横棒の上の名札。端に寄りすぎると枠からはみ出すので、端では左右どちらかにそろえる。
function rockTag(rockName, center) {
  const align = center < 15 ? "is-start" : center > 85 ? "is-end" : "";
  return `<div class="classification-tag-row" aria-hidden="true"><span class="classification-tag ${align}" style="left:${center}%">${classificationEscape(rockName)}</span></div>`;
}

// 区間の境目を目盛りにする。% の物差しは両端（0 と 100 など）も出すが、
// 対数の物差しの両端は描くために切っただけの値なので出さない。
function scaleTicks(scale) {
  const inner = scale.segments.slice(1).map((segment) => segment.from);
  if (scale.scale === "log2") {
    return inner;
  }
  const last = scale.segments[scale.segments.length - 1];
  return [scale.segments[0].from, ...inner, ...(last.open ? [] : [last.to])];
}

function tickLabel(scale, value) {
  return scale.scale === "log2" ? millimetres(value) : `${value}`;
}

function segmentRange(scale, segment) {
  if (scale.scale === "log2") {
    if (segment.openStart) {
      return `${millimetres(segment.to)}mm未満`;
    }
    if (segment.open) {
      return `${millimetres(segment.from)}mm以上`;
    }
    if (segment.from === scale.segments[0].from) {
      return `${millimetres(segment.to)}mm未満`;
    }
    return `${millimetres(segment.from)}〜${millimetres(segment.to)}mm`;
  }
  return segment.open ? `${segment.from}${scale.unit}以上` : `${segment.from}〜${segment.to}${scale.unit}`;
}

// 2 の累乗を mm で書く。1mm 未満は 1/16 のような分数で。
function millimetres(exponent) {
  return exponent >= 0 ? `${2 ** exponent}` : `1/${2 ** -exponent}`;
}

// 「名前の決まり方」の見出しに付けるヘルプ。ページに1つだけ置く。
function classificationHelpButton() {
  return `<button class="classification-help-button" type="button" data-classification-help aria-haspopup="dialog">名前の決まり方とは</button>`;
}

function bindClassificationHelp() {
  const buttons = document.querySelectorAll("[data-classification-help]");
  if (buttons.length === 0) {
    return;
  }

  let dialog = document.querySelector("#classificationHelp");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "classificationHelp";
    dialog.className = "classification-dialog";
    dialog.setAttribute("aria-labelledby", "classificationHelpTitle");
    dialog.innerHTML = `
      <h2 id="classificationHelpTitle">岩石の名前の決まり方</h2>
      <p>岩石の名前は、見た目の印象ではなく、国際的に決められた物差し（国際地質科学連合 IUGS などの分類）で決まります。何を測るかは、岩石のでき方によって違います。</p>
      <dl>
        <dt>深成岩（花崗岩・斑れい岩など）</dt>
        <dd>結晶が目で見える大きさなので、<strong>鉱物の割合</strong>で決めます。石英・アルカリ長石・斜長石の割合がおもな物差しです。</dd>
        <dt>火山岩（玄武岩・安山岩など）</dt>
        <dd>粒が細かくガラスも混じり、鉱物の割合を測りにくいので、<strong>化学組成</strong>（おもにシリカ＝SiO₂の量）で決めます。鉱物の組み合わせは、同じ成分の深成岩とほぼ同じです。</dd>
        <dt>堆積岩（砂岩・泥岩など）</dt>
        <dd>おもに<strong>粒の大きさ</strong>で決めます。石灰岩やチャートのように、何でできているかで決まるものもあります。</dd>
        <dt>変成岩（片岩・片麻岩など）</dt>
        <dd>はがれやすさや縞模様といった<strong>見た目のつくり</strong>と、もとの岩石で決めます。</dd>
      </dl>
      <p>図の境目の数字は、分類で決められた値そのものです。実際の石がどのあたりに入るかは産地によって違います。また、野外で見ただけでは測れない物差し（化学組成など）もあるので、石の名前は「見分け方」の特徴とあわせて考えてください。</p>
      <form method="dialog"><button class="secondary-button" type="submit">閉じる</button></form>
    `;
    document.body.appendChild(dialog);
    // 枠の外（背景）を押しても閉じる。
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        dialog.close();
      }
    });
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => dialog.showModal());
  });
}

function classificationEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
