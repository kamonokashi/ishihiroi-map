const lithologyDetail = document.querySelector("#lithologyDetail");
const backButton = document.querySelector("#backButton");

// 地図画面（script.js）の鉱物の判定と同じ値。ここでは「この地質そのもの」の話なので
// 周辺の割り引きはしない。
const MINERAL_LIKELY = 0.6;
const MINERAL_MAYBE = 0.3;
const MINERAL_FLOOR = 0.18;
const MINERAL_LIMIT = 8;

// 対応表の weight（tools/build-lithology-map.mjs の P / S / M と随伴物）を言葉にする。
const ROCK_ROLES = [
  { min: 0.9, label: "この地質そのもの" },
  { min: 0.45, label: "一緒に出ることが多い" },
  { min: 0, label: "混じることがある" }
];

// group_ja は5種類しかない。
const GROUP_NOTES = {
  "付加体": "海のプレートが陸の下に沈み込むとき、海底の岩石や、海溝にたまった砂や泥がはぎ取られて陸側に押し付けられたものです。日本列島の土台の大部分がこれでできています。海の底でできたチャートや緑色岩と、陸から来た砂岩・泥岩が一緒に見つかるのが特徴です。",
  "堆積岩": "砂や泥、生き物の殻などが積もって、長い時間をかけて固まった岩石です。",
  "火成岩": "マグマが冷えて固まった岩石です。地表や地表近くで急に冷えたもの（火山岩）は粒が細かく、地下深くでゆっくり冷えたもの（深成岩）は粒が粗くなります。",
  "変成岩": "もとの岩石が、地下の熱や圧力を受けて、溶けないまま鉱物が作り変えられた岩石です。どんな熱と圧力を受けたかで、名前に「○○帯」「○○相」が付きます。",
  "その他": "岩石ではなく、人の手が入った土地などです。"
};

// 未固結堆積物（kind: loose）と人工地盤（kind: artificial）。石はほかの場所から来ている。
const LOOSE_NOTES = {
  river: "川が運んできた砂や礫がたまった低地です。足もとは固まった岩石ではないので、拾える石は上流の山にある地質で決まります。",
  coast: "海岸の砂や砂丘です。石は川や海流に乗って遠くから集まってきます。",
  terrace: "昔の川原が、土地の隆起や川の削り込みで台地として残った場所です。当時の川が上流から運んだ石が埋まっています。",
  slope: "扇状地や崖錐、崩れた土砂です。すぐ上の斜面の石と、川がさらに上流から運んだ石が積もっています。",
  volcanic: "火山の噴出物が積もった場所です。軽石や火山の岩石がそのまま拾えるほか、運ばれてきた石も混じります。",
  other: "湖や湿地にたまった泥や砂などで、固まった岩石ではありません。石はほかの場所から運ばれてきたものです。",
  artificial: "盛り土や埋立地です。地面は人が運んできた土砂なので、地質図からは足もとの石を決められません。"
};

// 岩相名に出てくる言葉の意味。地質図の名前は略語だらけで、そのままでは読めない。
// 上から順に岩相名と照らし、当たったものをすべて出す。
const TERMS = [
  [/混在岩/, "混在岩", "プレートの沈み込みにもまれて、泥岩のなかに砂岩・チャート・緑色岩などの塊がばらばらに混ざった岩石です。"],
  [/互層/, "互層", "砂岩と泥岩のように、種類の違う地層が交互に重なっていることです。"],
  [/非海成層/, "非海成層", "川や湖など、陸の上でたまった地層です。"],
  [/(^|[^非])海成層/, "海成層", "海の底でたまった地層です。"],
  [/苦鉄質岩類に富む/, "苦鉄質岩類に富む", "玄武岩のような、黒っぽくて重い岩石（苦鉄質岩）を多く含んでいます。"],
  [/[紀世]-?[^\s　]*付加体/, "○○付加体", "頭に付く時代は、岩石が陸に付け加わった時代です。岩石そのものができた時代はもっと古いことがあります。"],
  [/溶岩・火砕岩/, "溶岩・火砕岩", "噴火で地表に流れ出て固まった溶岩と、噴き飛ばされた破片が積もった火砕岩です。"],
  [/貫入岩/, "貫入岩", "地表まで出ずに、地下の割れ目などに入り込んで固まったマグマです。"],
  [/大規模火砕流/, "大規模火砕流", "カルデラをつくるような巨大噴火の火砕流が積もったものです。熱いまま積もって固まると、溶結凝灰岩になります。"],
  [/塊状/, "塊状", "鉱物の並び方に向きがなく、どの方向から見ても同じような見た目の岩石です。"],
  [/片麻状/, "片麻状", "鉱物が縞のように並んでいる岩石です。マグマが固まるときや、固まったあとに力を受けてできます。"],
  [/高P\/T型広域変成岩/, "高P/T型広域変成岩", "温度の割に強い圧力を受けてできた変成岩です。プレートが沈み込む深いところでできます。三波川変成帯が代表です。"],
  [/中P\/T型広域変成岩/, "中P/T型広域変成岩", "圧力と温度がどちらも中くらいの条件でできた変成岩です。"],
  [/低P\/T型広域変成岩/, "低P/T型広域変成岩", "圧力の割に温度が高い条件でできた変成岩です。地下にマグマが多く、広い範囲が熱せられた場所でできます。領家変成帯が代表です。"],
  [/接触変成岩/, "接触変成岩", "入り込んできたマグマの熱で、まわりの岩石が焼かれてできた変成岩です。"],
  [/変位変成岩/, "変位変成岩", "断層が動いたときに、岩石がすりつぶされ、引き伸ばされてできた変成岩です。"],
  [/グラノフェルス/, "グラノフェルス", "はがれやすい面がなく、粒がそろった変成岩です。片岩や片麻岩と同じ原岩でも、力のかかり方でこうなります。"],
  [/片麻岩/, "片麻岩", "白っぽい鉱物と黒っぽい鉱物が、粗い縞模様に分かれた変成岩です。"],
  // 「緑色片岩相」「青色片岩亜相」は変成相の名前で、岩石が片岩だという意味ではない。
  [/片岩(?![相亜])/, "片岩", "鉱物が一方向に並び、薄くはがれやすい変成岩です。"],
  [/ぶどう石アクチノ閃石亜相/, "ぶどう石アクチノ閃石亜相", "変成の程度がとても低い段階です。もとの岩石の見た目がほとんど残っています。"],
  [/緑色片岩相|緑片岩相/, "緑色片岩相", "やや低い温度の変成です。緑泥石や緑れん石など緑色の鉱物ができて、岩石が緑がかります。"],
  [/ローソン石青色片岩亜相/, "ローソン石青色片岩亜相", "温度が低いのに圧力がとても高い条件です。プレートが沈み込む深いところでしかできません。"],
  [/エクロジャイト相/, "エクロジャイト相", "地下数十km以上に相当する、とても高い圧力を経験した岩石です。それがのちに地表まで上がってきています。"],
  [/角閃岩相/, "角閃岩相", "中くらいから高めの温度の変成です。角閃石と斜長石が主な鉱物になります。"],
  [/グラニュライト相/, "グラニュライト相", "とても高い温度の変成です。地殻の深いところでできます。"],
  [/輝石ホルンフェルス相/, "輝石ホルンフェルス相", "マグマのすぐそばで、とても高い温度に焼かれた段階です。"],
  [/緑泥石帯/, "緑泥石帯", "変成の温度が低い段階です。緑泥石ができる程度で、もとの岩石の性質が残りやすくなっています。"],
  [/黒雲母帯/, "黒雲母帯", "緑泥石帯より温度が上がり、黒雲母ができた段階です。頭のアルバイト・オリゴクレースは、一緒にできる斜長石の種類です。"],
  [/ざくろ石帯/, "ざくろ石帯", "さらに温度が上がり、ざくろ石ができた段階です。"],
  [/菫青石帯/, "菫青石帯", "低P/T型の変成で温度が高くなり、菫青石ができた段階です。"],
  [/珪線石カリ長石帯/, "珪線石カリ長石帯", "低P/T型の変成でいちばん温度が高い段階のひとつです。珪線石とカリ長石ができています。"],
  [/斜方輝石帯/, "斜方輝石帯", "とても温度が高く、斜方輝石ができた段階です。"]
];

// 付加体・火成岩の「海洋」「島弧・大陸」は、グループによって指すものが違う。
const SETTING_TERMS = {
  "付加体": [
    [/海洋/, "海洋", "海のプレートの上でできた岩石です。海底火山の玄武岩、プランクトンの殻が積もったチャート、海山のサンゴ礁などの石灰岩がこれにあたります。"],
    [/島弧・大陸/, "島弧・大陸", "陸から川で運ばれた砂や泥が、海溝にたまったものです。"]
  ],
  "火成岩": [
    [/海洋/, "海洋", "海のプレートをつくるマグマからできた岩石です。"],
    [/島弧・大陸/, "島弧・大陸", "日本列島のような島弧や大陸の地下でできたマグマから固まった岩石です。"]
  ]
};

window.addEventListener("DOMContentLoaded", async () => {
  bindBackButton();
  await renderLithologyPage();
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

async function renderLithologyPage() {
  const id = new URLSearchParams(window.location.search).get("id");

  if (!id) {
    renderMissingLithology();
    return;
  }

  try {
    // 時代・石・鉱物は補足なので、読めなくても岩相の本文は出す。
    const [lithologyMap, details, rocks, minerals] = await Promise.all([
      loadData("data/lithology-map.json", "lithology"),
      loadData("data/lithology-detail.json", "lithologyDetail").catch(() => ({})),
      loadData("data/rocks.json", "rocks").catch(() => []),
      loadData("data/minerals.json", "minerals").catch(() => [])
    ]);
    const entry = Object.hasOwn(lithologyMap, id) ? lithologyMap[id] : null;

    if (!entry) {
      renderMissingLithology();
      return;
    }

    renderLithology(id, entry, details[id], new Map(rocks.map((rock) => [rock.id, rock])), minerals);
  } catch (error) {
    console.info("data/lithology-map.json could not be loaded.", error);
    lithologyDetail.innerHTML = `
      <section class="stone-message-panel">
        <h1>地質の情報を読み込めませんでした。</h1>
        <p>時間をおいてもう一度お試しください。</p>
      </section>
    `;
  }
}

// file:// で開くと fetch が使えないので、data/bundle.js などの同じ内容に切り替える。
async function loadData(path, key) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`${key} fetch failed: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    if (window.ISHIHIROI_DATA?.[key]) {
      console.info(`${path} を読めないので同梱データを使います。`, error);
      return window.ISHIHIROI_DATA[key];
    }
    throw error;
  }
}

function renderMissingLithology() {
  lithologyDetail.innerHTML = `
    <section class="stone-message-panel">
      <h1>地質の情報が見つかりませんでした。</h1>
      <p>地図の「地質を見る」からもう一度選んでください。</p>
      <a class="secondary-button" href="index.html">地図に戻る</a>
    </section>
  `;
}

function renderLithology(id, entry, detail, rockCatalog, minerals) {
  document.title = `${entry.lithology} - いしひろいマップ`;

  const kindKey = entry.kind === "artificial" ? "artificial" : entry.looseType;
  const lead = entry.kind === "bedrock"
    ? GROUP_NOTES[entry.group]
    : LOOSE_NOTES[kindKey];

  lithologyDetail.innerHTML = `
    <section class="stone-hero mineral-hero">
      <div class="stone-summary">
        <p class="stone-category">地質・${escapeHtml(entry.group || "区分なし")}</p>
        <h1>${escapeHtml(entry.lithology)}</h1>
        <p class="stone-english">${escapeHtml(detail?.english || "")}</p>
        <p class="stone-short">${escapeHtml(lead || "")}</p>
      </div>
    </section>

    <section class="stone-content-grid">
      ${renderRocks(entry, rockCatalog)}
      ${renderMinerals(entry, rockCatalog, minerals)}
      ${renderTerms(entry)}
      ${renderAges(detail)}

      <article class="stone-info-panel stone-wide-panel">
        <h2>${panelIcon("tag")}地質図の記号</h2>
        <p>20万分の1日本シームレス地質図V2の凡例記号のうち、時代を除いた部分です。時代ごとに <code>K22_${escapeHtml(id)}</code> のように頭に時代の記号が付きます。</p>
        <div class="stone-term-list"><span class="stone-term">${escapeHtml(id)}</span></div>
      </article>
    </section>
  `;
}

function renderRocks(entry, rockCatalog) {
  const rocks = (entry.rocks || []).filter(({ id }) => rockCatalog.has(id));

  if (rocks.length === 0) {
    // 未固結堆積物と人工地盤は、足もとの地質からは石を決めない（地図画面の運搬モード）。
    const reason = entry.kind === "bedrock"
      ? "この地質に対応する石はまだ登録されていません。"
      : "ここにある石は、ほかの場所から運ばれてきたものです。地図でこの場所を調べると、上流や周辺の地質から拾えそうな石を推定します。";
    return `
      <article class="stone-info-panel stone-wide-panel">
        <h2>${panelIcon("pebble")}拾えそうな石</h2>
        <p>${reason}</p>
      </article>
    `;
  }

  const groups = ROCK_ROLES
    .map((role, index) => ({
      role,
      rocks: rocks.filter(({ weight }) => weight >= role.min && (index === 0 || weight < ROCK_ROLES[index - 1].min))
    }))
    .filter(({ rocks: list }) => list.length > 0);

  return `
    <article class="stone-info-panel stone-wide-panel">
      <h2>${panelIcon("pebble")}拾えそうな石</h2>
      <dl class="lithology-rock-groups">
        ${groups.map(({ role, rocks: list }) => `
          <dt>${escapeHtml(role.label)}</dt>
          <dd class="stone-mineral-list">
            ${list.map(({ id }) => rockLink(id, rockCatalog)).join("")}
          </dd>
        `).join("")}
      </dl>
      ${entry.kind === "bedrock" ? '<p class="lithology-note">石英脈やホルンフェルスのように、幅が狭くて地質図には描かれないものの、石拾いではよく手に取るものも含めています。</p>' : ""}
    </article>
  `;
}

function rockLink(id, rockCatalog) {
  const rock = rockCatalog.get(id);
  return `<a class="stone-mineral stone-mineral-link" href="stone.html?id=${encodeURIComponent(id)}" target="_blank" rel="noopener noreferrer">${escapeHtml(rock.name)}</a>`;
}

// 地図画面の estimateMinerals() と同じ2通り。母岩から導くものと、変成帯の名前から導くもの。
function renderMinerals(entry, rockCatalog, minerals) {
  const rockWeights = new Map((entry.rocks || []).map(({ id, weight }) => [id, weight]));

  const found = minerals
    .map((mineral) => {
      let score = 0;
      let reason = "";

      (mineral.hosts || []).forEach(([rockId, weight]) => {
        const hostScore = (rockWeights.get(rockId) || 0) * weight;
        if (hostScore > score && rockCatalog.has(rockId)) {
          score = hostScore;
          reason = `${rockCatalog.get(rockId).name}に入っていることが多い`;
        }
      });

      (mineral.zones || []).forEach(([keyword, weight]) => {
        if (entry.lithology.includes(keyword) && weight > score) {
          score = weight;
          reason = `「${keyword}」はこの鉱物ができている変成帯`;
        }
      });

      return { mineral, score, reason };
    })
    .filter(({ score }) => score >= MINERAL_FLOOR)
    .sort((a, b) => b.score - a.score)
    .slice(0, MINERAL_LIMIT);

  if (found.length === 0) {
    return "";
  }

  return `
    <article class="stone-info-panel stone-wide-panel">
      <h2>${panelIcon("crystal")}見どころの鉱物</h2>
      <ul class="lithology-mineral-list">
        ${found.map(({ mineral, score, reason }) => `
          <li>
            <a class="stone-mineral stone-mineral-link" href="mineral.html?id=${encodeURIComponent(mineral.id)}" target="_blank" rel="noopener noreferrer">${escapeHtml(mineral.name)}</a>
            <span class="lithology-mineral-level">${mineralLevelLabel(score)}</span>
            <span class="lithology-mineral-reason">${escapeHtml(reason)}</span>
          </li>
        `).join("")}
      </ul>
    </article>
  `;
}

function mineralLevelLabel(score) {
  if (score >= MINERAL_LIKELY) {
    return "よく見つかる";
  }
  return score >= MINERAL_MAYBE ? "見つかるかも" : "珍しい";
}

function renderTerms(entry) {
  const rules = [...(SETTING_TERMS[entry.group] || []), ...TERMS];
  const terms = rules.filter(([pattern]) => pattern.test(entry.lithology));

  if (terms.length === 0) {
    return "";
  }

  return `
    <article class="stone-info-panel stone-wide-panel">
      <h2>${panelIcon("book")}名前の読み方</h2>
      <dl class="stone-confuse-list lithology-term-list">
        ${terms.map(([, name, meaning]) => `
          <dt>${escapeHtml(name)}</dt>
          <dd>${escapeHtml(meaning)}</dd>
        `).join("")}
      </dl>
    </article>
  `;
}

// 同じ岩相でも、時代ごとに別の凡例になっていて地図の色も違う。
function renderAges(detail) {
  if (!detail || !Array.isArray(detail.ages) || detail.ages.length === 0) {
    return "";
  }

  return `
    <article class="stone-info-panel stone-wide-panel">
      <h2>${panelIcon("layers")}できた時代と地図の色</h2>
      <p>同じ種類の地質でも、できた時代ごとに地図の色が分かれています。古い順に並べています。</p>
      <ul class="lithology-age-list">
        ${detail.ages.map(([age, color]) => `
          <li>
            <span class="lithology-age-swatch" style="background:#${escapeHtml(color)}"></span>
            <span>${escapeHtml(age || "時代情報なし")}</span>
          </li>
        `).join("")}
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
