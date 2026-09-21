const lithologyDetail = document.querySelector("#lithologyDetail");

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
  "変成岩": "もとの岩石が、地下の熱や圧力を受けて、溶けないまま鉱物が作り変えられた岩石です。どのくらいの熱と圧力を受けたかを、名前の「○○帯」「○○相」で表しています。",
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
  [/ぶどう石アクチノ閃石亜相/, "ぶどう石アクチノ閃石亜相", "変成の程度が低い段階です。もとの岩石のつくりが残っていることが多くあります。"],
  [/緑色片岩相|緑片岩相/, "緑色片岩相", "やや低い温度の変成です。玄武岩などがもとの岩石だと、緑泥石や緑れん石など緑色の鉱物ができて緑がかります。"],
  [/ローソン石青色片岩亜相/, "ローソン石青色片岩亜相", "温度が低いのに圧力が高い条件です。冷たいプレートが沈み込む場所に特有の条件です。"],
  [/エクロジャイト相/, "エクロジャイト相", "地下数十km以上に相当する、とても高い圧力を経験した岩石です。それがのちに地表まで上がってきています。"],
  [/角閃岩相/, "角閃岩相", "中くらいから高めの温度の変成です。玄武岩などがもとの岩石だと、角閃石と斜長石が主な鉱物になります。"],
  [/グラニュライト相/, "グラニュライト相", "とても高い温度の変成です。地殻の深いところでできます。"],
  [/輝石ホルンフェルス相/, "輝石ホルンフェルス相", "マグマのすぐそばで、とても高い温度に焼かれた段階です。"],
  [/緑泥石帯/, "緑泥石帯", "変成の温度が低い段階です。緑泥石ができる程度で、もとの岩石の性質が残りやすくなっています。"],
  [/黒雲母帯/, "黒雲母帯", "黒雲母ができる温度まで上がった段階です。頭にアルバイト・オリゴクレースが付くものは、一緒にできる斜長石の種類を表していて、オリゴクレースのほうが温度が高い段階です。"],
  [/ざくろ石帯/, "ざくろ石帯", "ざくろ石ができる温度まで上がった段階です。"],
  [/菫青石帯/, "菫青石帯", "低P/T型の変成で温度が高くなり、菫青石ができた段階です。"],
  [/珪線石カリ長石帯/, "珪線石カリ長石帯", "低P/T型の変成でいちばん温度が高い段階のひとつです。珪線石とカリ長石ができています。"],
  [/斜方輝石帯/, "斜方輝石帯", "とても温度が高く、斜方輝石ができた段階です。"]
];

// 付加体・火成岩の「海洋」「島弧・大陸」は、グループによって指すものが違う。
const SETTING_TERMS = {
  "付加体": [
    [/海洋/, "海洋", "海のプレートの上や、その中でできた岩石です。海底火山の玄武岩、プランクトンの殻が積もったチャート、海山のサンゴ礁などの石灰岩がこれにあたります。"],
    [/島弧・大陸/, "島弧・大陸", "島弧や大陸の側でできた岩石です。砂岩や泥岩なら、陸から川で運ばれた砂や泥が海溝にたまったものです。"]
  ],
  "火成岩": [
    [/海洋/, "海洋", "海のプレートをつくるマグマからできた岩石です。"],
    [/島弧・大陸/, "島弧・大陸", "日本列島のような島弧や大陸の地下でできたマグマから固まった岩石です。"]
  ]
};

window.addEventListener("DOMContentLoaded", async () => {
  await renderLithologyPage();
});

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

    registerCatalog("rocks", rocks);
    registerCatalog("minerals", minerals);
    renderLithology(id, entry, details[id], new Map(rocks.map((rock) => [rock.id, rock])), minerals);
    bindClassificationHelp();
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

  const sections = [
    ["rocks", "拾えそうな石", renderRocks(entry, rockCatalog)],
    ["minerals", "見どころの鉱物", renderMinerals(entry, rockCatalog, minerals)],
    ["terms", "名前の読み方", renderTerms(entry)],
    ["classification", "おもな岩石の名前の決まり方", renderClassification(entry, rockCatalog)]
  ].filter(([, , html]) => html);

  // 石のページと同じ2段組み。左に読む本文、右に区分・記号・時代などの要点と目次。
  lithologyDetail.innerHTML = `
    <div class="detail-layout">
      <header class="detail-title">
        <p class="stone-category">地質・${escapeHtml(entry.group || "区分なし")}</p>
        <h1 class="lithology-title">${escapeHtml(entry.lithology)}</h1>
        <p class="stone-english">${escapeHtml(detail?.english || "")}</p>
        <p class="detail-lead">${escapeHtml(lead || "")}</p>
      </header>

      <aside class="detail-aside" aria-label="要点">
        <dl class="detail-facts">
          <dt>区分</dt>
          <dd>
            ${catalogLink(entry.group || "区分なし")}${entry.kind === "bedrock" ? "" : "（固まっていない堆積物）"}
            <a class="detail-facts-link" href="litho-tree.html?id=${encodeURIComponent(id)}" target="_blank" rel="opener">分類マップでこの地質を見る</a>
          </dd>
          <dt>地質図の記号</dt>
          <dd>
            <code class="lithology-code">${escapeHtml(id)}</code>
            <span class="detail-facts-note">シームレス地質図V2の凡例記号から、頭の時代の記号（K22_ など）を除いたもの</span>
          </dd>
          ${renderAges(detail)}
        </dl>

        <nav class="detail-toc" aria-label="このページの内容">
          <p class="detail-toc-title">このページの内容</p>
          <ol>
            ${sections.map(([anchor, label]) => `<li><a href="#${anchor}">${label}</a></li>`).join("")}
          </ol>
        </nav>
      </aside>

      <div class="detail-main">
        ${sections.map(([, , html]) => html).join("")}
      </div>
    </div>
  `;
}

// 拾えそうな石は、写真のタイルで並べる（link-preview.js の stoneTile。写真は石のページと同じもの）。
function renderRocks(entry, rockCatalog) {
  const rocks = (entry.rocks || []).filter(({ id }) => rockCatalog.has(id));

  if (rocks.length === 0) {
    // 未固結堆積物と人工地盤は、足もとの地質からは石を決めない（地図画面の運搬モード）。
    const reason = entry.kind === "bedrock"
      ? "この地質に対応する石はまだ登録されていません。"
      : "ここにある石は、ほかの場所から運ばれてきたものです。地図でこの場所を調べると、上流や周辺の地質から拾えそうな石を推定します。";
    return `
      <article id="rocks" class="stone-info-panel">
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
    <article id="rocks" class="stone-info-panel">
      <h2>${panelIcon("pebble")}拾えそうな石</h2>
      ${groups.map(({ role, rocks: list }) => `
        <h3 class="lithology-role">${escapeHtml(role.label)}</h3>
        <div class="stone-tiles">
          ${list.map(({ id }) => stoneTile(rockCatalog.get(id))).join("")}
        </div>
      `).join("")}
      ${entry.kind === "bedrock" ? '<p class="lithology-note">石英脈やホルンフェルスのように、幅が狭くて地質図には描かれないものの、石拾いではよく手に取るものも含めています。</p>' : ""}
    </article>
  `;
}

// 「この地質そのもの」の岩石の、名前の決まり方の物差し。変成岩の地質では出さない。
// 変成岩の対応表には、もとの岩石（斑れい岩・チャートなど）がそのまま入っていて、
// その物差しを出すと、変成で鉱物が入れ替わったあとの実物と食い違うため。
function renderClassification(entry, rockCatalog) {
  if (entry.kind !== "bedrock" || entry.group === "変成岩") {
    return "";
  }

  const rocks = (entry.rocks || [])
    .filter(({ id, weight }) => weight >= ROCK_ROLES[0].min && rockCatalog.get(id)?.classification?.scales?.length)
    .map(({ id }) => rockCatalog.get(id));

  if (rocks.length === 0) {
    return "";
  }

  return `
    <article id="classification" class="stone-info-panel">
      <h2>${panelIcon("ruler")}おもな岩石の名前の決まり方${classificationHelpButton()}</h2>
      ${rocks.map((rock) => `
        <h3 class="classification-rock-title">${rockLink(rock.id, rockCatalog)}</h3>
        ${classificationPanel(rock.classification, rock.name)}
      `).join("")}
    </article>
  `;
}

function rockLink(id, rockCatalog) {
  const rock = rockCatalog.get(id);
  return `<a class="stone-mineral stone-mineral-link" href="stone.html?id=${encodeURIComponent(id)}" target="_blank" rel="opener">${escapeHtml(rock.name)}</a>`;
}

// 地図画面の estimateMinerals() と同じ2通り。母岩から導くものと、変成帯の名前から導くもの。
function renderMinerals(entry, rockCatalog, minerals) {
  const rockWeights = new Map((entry.rocks || []).map(({ id, weight }) => [id, weight]));

  const found = minerals
    .map((mineral) => {
      let score = 0;
      let reason = "";

      // 高P/T型の片麻岩に菫青石、のように、その地質ではできない鉱物は出さない。
      if (!mineralFits(mineral, entry.lithology)) {
        return { mineral, score: 0, reason };
      }

      (mineral.hosts || []).forEach(([rockId, weight]) => {
        const hostScore = (rockWeights.get(rockId) || 0) * weight;
        if (hostScore > score && rockCatalog.has(rockId)) {
          score = hostScore;
          const rockName = rockCatalog.get(rockId).name;
          reason = weight >= MINERAL_LIKELY ? `${rockName}によく入っている` : `${rockName}に入っていることがある`;
        }
      });

      (mineral.zones || []).forEach(([keyword, weight]) => {
        if (entry.lithology.includes(keyword) && weight > score) {
          score = weight;
          reason = `「${keyword}」は、この鉱物ができる段階まで変成したことを示す名前`;
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
    <article id="minerals" class="stone-info-panel">
      <h2>${panelIcon("crystal")}見どころの鉱物</h2>
      <ul class="lithology-mineral-list">
        ${found.map(({ mineral, score, reason }) => `
          <li>
            <a class="stone-mineral stone-mineral-link" href="mineral.html?id=${encodeURIComponent(mineral.id)}" target="_blank" rel="opener">${escapeHtml(mineral.name)}</a>
            <span class="lithology-mineral-level">${mineralLevelLabel(score)}</span>
            <span class="lithology-mineral-reason">${escapeHtml(reason)}</span>
          </li>
        `).join("")}
      </ul>
    </article>
  `;
}

// minerals.json の notIn。岩相名にその言葉があれば、その鉱物はできない（地図画面の script.js と同じ）。
function mineralFits(mineral, lithology) {
  return !(mineral.notIn || []).some((word) => lithology.includes(word));
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
    <article id="terms" class="stone-info-panel">
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

// 同じ岩相でも、時代ごとに別の凡例になっていて地図の色も違う。右の要点欄に古い順で並べる。
// 時代名は「古生代 後期オルドビス紀〜前期デボン紀」のように長い。右の列は狭いので、
// この項目だけ横幅いっぱいに使い、「古生代」などの代は小さく前に置いて紀・期を読みやすくする。
// チャートのように26件ある岩相もあるので、多いときは5件だけ出してあとは畳む。
const AGE_ERAS = /^(先カンブリア時代|太古代|原生代|古生代|中生代|新生代)\s*/;
const AGE_VISIBLE = 5;

function renderAges(detail) {
  if (!detail || !Array.isArray(detail.ages) || detail.ages.length === 0) {
    return "";
  }

  const shown = detail.ages.slice(0, AGE_VISIBLE);
  const rest = detail.ages.slice(AGE_VISIBLE);

  return `
    <dt class="facts-wide">時代と地図の色</dt>
    <dd class="facts-wide">
      ${ageList(shown)}
      ${rest.length > 0 ? `
        <details class="lithology-age-more">
          <summary>ほか${rest.length}件を見る</summary>
          ${ageList(rest)}
        </details>
      ` : ""}
      <span class="detail-facts-note">同じ種類でも、できた時代ごとに地図の色が違います（古い順）</span>
    </dd>
  `;
}

function ageList(ages) {
  return `
    <ul class="lithology-age-list">
      ${ages.map(([age, color]) => {
        const text = age || "時代情報なし";
        const era = text.match(AGE_ERAS)?.[1] || "";
        return `
          <li>
            <span class="lithology-age-swatch" style="background:#${escapeHtml(color)}"></span>
            <span class="lithology-age-name">
              ${era ? `<span class="lithology-age-era">${escapeHtml(era)}</span>` : ""}
              ${escapeHtml(text.replace(AGE_ERAS, ""))}
            </span>
          </li>
        `;
      }).join("")}
    </ul>
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
