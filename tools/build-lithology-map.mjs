// シームレス地質図V2の全凡例を取得し、岩相 → 拾える石 の対応表を生成する。
//
//   node tools/build-lithology-map.mjs
//
// 出力:
//   data/lithology-map.json  岩相(symbol接尾辞) → 石
//   data/legend-index.json   凡例の色 → [symbol接尾辞, 時代コード]
//
// V2の凡例は2416件あるが、岩相(lithology_ja)は610種類しかなく、symbolから
// 時代プレフィックスを除いた接尾辞(K22_pbg_a → pbg_a)と1対1で対応する。
// そこで接尾辞をキーにした完全な対応表を作り、実行時は純粋な辞書引きにする。
// 部分文字列マッチと違い、取りこぼしも誤爆も構造的に起きない。
//
// 色の索引は、地質図タイルの画素を数えて「周辺にどの地質がどれだけの面積を
// 占めるか」を測るために使う。2416件の色はすべて一意なので逆引きできる。

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const LEGEND_URL = "https://gbank.gsj.jp/seamless/v2/api/1.3/legend.json";
const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const OUT_PATH = join(DATA_DIR, "lithology-map.json");
const INDEX_PATH = join(DATA_DIR, "legend-index.json");
const BUNDLE_PATH = join(DATA_DIR, "bundle.js");
const CREDITS_PATH = join(DATA_DIR, "..", "PHOTO-CREDITS.md");

// 時代コード。堆積岩は古いものほど固く締まっていて、礫として残りやすい。
const AGE_QUATERNARY = 0;
const AGE_NEOGENE = 1;
const AGE_PALEOGENE = 2;
const AGE_MESOZOIC = 3;
const AGE_PALEOZOIC_OR_OLDER = 4;

function ageCode(formationAge) {
  const age = formationAge || "";
  if (/第四紀/.test(age)) return AGE_QUATERNARY;
  if (/新第三紀/.test(age)) return AGE_NEOGENE;
  if (/古第三紀/.test(age)) return AGE_PALEOGENE;
  if (/中生代/.test(age)) return AGE_MESOZOIC;
  if (/古生代|原生代|太古代|先カンブリア/.test(age)) return AGE_PALEOZOIC_OR_OLDER;
  // 「新生代」とだけ書かれている場合は新第三紀相当とみなす。
  return /新生代/.test(age) ? AGE_NEOGENE : AGE_MESOZOIC;
}

// weight: その岩相の場所で、その石がどれくらい主役か
//   1.0 = その岩相そのもの / 0.6 = 一緒に出ることが多い / 0.3 = 混じることがある
const P = 1;
const S = 0.6;
const M = 0.3;

// 未固結堆積物の種類。石そのものではなく「運ばれてきた石が集まる場所」を表す。
const LOOSE = {
  river: "river",
  coast: "coast",
  terrace: "terrace",
  slope: "slope",
  volcanic: "volcanic",
  other: "other"
};

const looseRules = [
  [/谷底平野・山間盆地・河川・海岸平野堆積物|自然堤防堆積物/, LOOSE.river],
  [/海岸・砂丘堆積物/, LOOSE.coast],
  [/段丘堆積物/, LOOSE.terrace],
  [/扇状地・崖錐堆積物|地すべり堆積物|崩壊堆積物/, LOOSE.slope],
  [/岩屑なだれ堆積物|火山麓扇状地堆積物|風成火山灰/, LOOSE.volcanic],
  [/湖沼堆積物|湿原・湿地堆積物|氷河堆積物/, LOOSE.other]
];

// 変成岩の岩相名(第1トークン) → 石。ミグマタイト・グラノフェルス等の言い換えを吸収する。
const metamorphicRules = [
  [/^蛇紋岩/, [["serpentinite", P], ["peridotite", M]]],
  [/^変成かんらん岩/, [["peridotite", P], ["serpentinite", S]]],
  [/^変成斑れい岩/, [["gabbro", P], ["amphibolite", M]]],
  [/^変成した角閃石岩・角閃岩/, [["amphibolite", P]]],
  [/^変成玄武岩/, [["greenstone", P], ["mafic-schist", S]]],
  [/^変成チャート/, [["chert", P]]],
  [/^変成砂岩/, [["sandstone", P]]],
  [/^大理石/, [["marble", P]]],
  [/マイロナイト/, [["mylonite", P]]],
  [/^泥質片岩・泥質グラノフェルス・泥質片麻岩/, [["pelitic-schist", P], ["gneiss", S], ["hornfels", M]]],
  [/^珪質片岩・珪質グラノフェルス・珪質片麻岩/, [["siliceous-schist", P], ["gneiss", S], ["chert", M]]],
  [/^石灰質片岩・石灰質グラノフェルス・石灰質片麻岩/, [["marble", P], ["schist", S]]],
  [/^泥質片岩/, [["pelitic-schist", P]]],
  [/^苦鉄質片岩・苦鉄質グラノフェルス・角閃岩/, [["mafic-schist", P], ["amphibolite", S]]],
  [/^苦鉄質片岩/, [["mafic-schist", P]]],
  [/^珪質片岩/, [["siliceous-schist", P]]],
  [/^砂質片岩/, [["schist", P], ["siliceous-schist", S]]],
  [/^礫質片岩|^珪長質片岩/, [["schist", P]]],
  [/^石灰質片岩/, [["marble", P], ["schist", S]]],
  [/^粘板岩/, [["slate", P]]],
  [/千枚岩/, [["phyllite", P]]],
  [/^苦鉄質片麻岩・角閃岩|^苦鉄質片麻岩・苦鉄質グラノフェルス|^苦鉄質片麻岩/, [["gneiss", P], ["amphibolite", S]]],
  [/^花崗岩質片麻岩/, [["gneiss", P], ["granite", S]]],
  [/^斑れい岩質片麻岩・閃緑岩質片麻岩/, [["gneiss", P], ["gabbro", M], ["diorite", M]]],
  [/^石灰質片麻岩・石灰質グラノフェルス/, [["marble", P], ["gneiss", S]]],
  [/^超苦鉄質片麻岩・超苦鉄質グラノフェルス/, [["peridotite", P], ["serpentinite", S]]],
  [/^泥質片麻岩/, [["gneiss", P], ["pelitic-schist", M]]],
  [/^砂質片麻岩|^珪質片麻岩|^珪長質片麻岩/, [["gneiss", P]]],
  [/^超苦鉄質グラノフェルス/, [["peridotite", P], ["hornfels", S]]],
  [/^石灰質グラノフェルス/, [["marble", P], ["hornfels", S]]],
  [/^苦鉄質グラノフェルス/, [["hornfels", P], ["amphibolite", M]]],
  [/^珪質グラノフェルス/, [["hornfels", P], ["chert", M]]],
  [/グラノフェルス/, [["hornfels", P]]]
];

// 堆積岩・付加体で使う岩相語。複数当たれば全部採用する(砂岩泥岩互層 → 砂岩+泥岩)。
const sedimentaryRules = [
  [/チャート/, [["chert", P]]],
  [/混在岩/, [["mudstone", P], ["sandstone", S], ["chert", S], ["greenstone", M], ["limestone", M]]],
  [/多色泥岩/, [["mudstone", P], ["chert", M]]],
  [/珪質泥岩/, [["mudstone", P], ["chert", S]]],
  [/石灰質シルト岩・砂岩/, [["sandstone", P], ["limestone", S]]],
  [/石灰岩/, [["limestone", P]]],
  [/礫岩/, [["conglomerate", P]]],
  [/砂岩泥岩互層|泥岩砂岩互層|砂岩・泥岩|砂岩，砂岩泥岩互層/, [["sandstone", P], ["mudstone", P]]],
  [/泥岩/, [["mudstone", P]]],
  [/砂岩/, [["sandstone", P]]]
];

// マイロナイトの原岩を拾うための緩いルール。「花崗閃緑岩マイロナイト」のように
// 単独の岩石名で書かれるため、igneousRulesの連名パターンでは当たらない。
const protolithRules = [
  [/花崗閃緑岩|トーナル岩/, [["granodiorite", S]]],
  [/花崗岩/, [["granite", P]]],
  [/デイサイト/, [["dacite", S]]],
  [/流紋岩/, [["rhyolite", S]]],
  [/安山岩/, [["andesite", S]]],
  [/玄武岩/, [["basalt", S]]]
];

// 火成岩の岩相語。
const igneousRules = [
  [/超苦鉄質岩類/, [["peridotite", P], ["serpentinite", S]]],
  [/斑れい岩・閃緑岩・石英閃緑岩/, [["gabbro", P], ["diorite", P]]],
  [/斑れい岩/, [["gabbro", P]]],
  [/閃緑岩・石英閃緑岩/, [["diorite", P]]],
  [/花崗閃緑岩・トーナル岩/, [["granodiorite", P], ["granite", S]]],
  [/花崗岩/, [["granite", P]]],
  [/デイサイト・流紋岩・粗面岩/, [["rhyolite", P], ["dacite", P], ["trachyte", S]]],
  [/デイサイト・流紋岩/, [["rhyolite", P], ["dacite", P]]],
  [/粗面安山岩/, [["andesite", P], ["trachyte", S]]],
  [/粗面玄武岩|アルカリ玄武岩/, [["basalt", P], ["trachyte", M]]],
  [/粗面岩/, [["trachyte", P]]],
  [/安山岩・玄武岩質安山岩/, [["andesite", P], ["basalt", S]]],
  [/安山岩/, [["andesite", P]]],
  [/玄武岩/, [["basalt", P]]]
];

function applyRules(rules, textToMatch, firstMatchOnly = false) {
  const found = [];
  for (const [pattern, rocks] of rules) {
    if (!pattern.test(textToMatch)) {
      continue;
    }
    found.push(...rocks);
    if (firstMatchOnly) {
      break;
    }
  }
  return found;
}

function classify(legend) {
  const lithology = legend.lithology_ja || "";
  const group = legend.group_ja || "";

  if (/盛り土・埋立地・干拓地/.test(lithology)) {
    return { kind: "artificial", rocks: [] };
  }

  const looseMatch = looseRules.find(([pattern]) => pattern.test(lithology));
  if (looseMatch) {
    // 未固結堆積物。ここにある石は他所から運ばれてきたものなので、
    // 岩相そのものからは石を決めない。周辺の岩盤から推定する。
    const rocks = looseMatch[1] === LOOSE.volcanic
      ? [["andesite", S], ["basalt", M], ["tuff", S], ["pumice", P]]
      : [];
    return { kind: "loose", looseType: looseMatch[1], rocks };
  }

  const rocks = [];

  if (group === "変成岩") {
    // 変成岩は「岩相名 変成タイプ 変成相」の形。第1トークンが原岩と組織を決める。
    rocks.push(...applyRules(metamorphicRules, lithology, true));
    if (/接触変成岩/.test(lithology) && !rocks.some(([id]) => id === "hornfels")) {
      rocks.push(["hornfels", S]);
    }
    // マイロナイトは原岩も一緒に出す。
    if (/マイロナイト/.test(lithology)) {
      rocks.push(...applyRules(protolithRules, lithology, true));
      if (/泥質片麻岩起源/.test(lithology)) {
        rocks.push(["gneiss", S], ["pelitic-schist", M]);
      }
    }
  } else {
    rocks.push(...applyRules(igneousRules, lithology, true));
    rocks.push(...applyRules(sedimentaryRules, lithology));

    // 付加体の玄武岩は海洋底起源で、野外では緑色岩として拾われる。
    if (group === "付加体" && /玄武岩/.test(lithology)) {
      rocks.push(["greenstone", P]);
    }
    // 溶岩・火砕岩／大規模火砕流には火山砕屑岩が伴う。
    if (/火砕岩/.test(lithology)) {
      rocks.push(["tuff", S]);
    }
    if (/大規模火砕流/.test(lithology)) {
      rocks.push(["welded-tuff", P], ["tuff", S]);
    }
    // 岩相の指定がない「海成層」「非海成層」だけの凡例。
    if (rocks.length === 0 && /海成層|非海成層|汽水成層/.test(lithology)) {
      rocks.push(["sandstone", S], ["mudstone", S]);
    }
  }

  addCompanions(rocks, lithology, group);

  return { kind: "bedrock", rocks };
}

// 20万分の1の地質図には描かれない随伴物を足す。
// 石英脈は幅が数cm〜数m、接触変成帯は幅が数百m、軽石層は薄い。
// どれもこの縮尺では表現できないが、石拾いでは普通に手に取る。
// 実測すると岩相の9割が石を1〜2種しか返しておらず、その粗さの主因がここだった。
function addCompanions(rocks, lithology, group) {
  const has = (id) => rocks.some(([rockId]) => rockId === id);

  // 石英脈はほとんどどんな岩盤にも入る。硬いので崩れずに残り、
  // 川原では白く目立つ石になる。付加体と変成岩でとくに多い。
  const veinQuartz = { "付加体": 0.55, "変成岩": 0.5, "堆積岩": 0.3 }[group]
    ?? (/花崗岩|花崗閃緑岩|閃緑岩|斑れい岩/.test(lithology) ? 0.5 : 0.25);
  rocks.push(["vein-quartz", veinQuartz]);

  // 花崗岩体のふちには必ず接触変成帯ができるが、幅が狭くて地質図に出ないことが多い。
  if (/花崗岩|花崗閃緑岩・トーナル岩/.test(lithology) && !has("hornfels")) {
    rocks.push(["hornfels", 0.35]);
  }

  // 火砕物のあるところには軽石が積もる。海岸には漂着することもある。
  if (/火砕岩|大規模火砕流|火山灰|岩屑なだれ/.test(lithology)) {
    rocks.push(["pumice", 0.45]);
  }

  // 黒曜石は珪長質マグマの急冷でできる。産出はごく一部なので控えめに。
  if (/デイサイト・流紋岩/.test(lithology)) {
    rocks.push(["obsidian", 0.25]);
  }
}

function mergeRocks(pairs) {
  const best = new Map();
  for (const [id, weight] of pairs) {
    if (!best.has(id) || best.get(id) < weight) {
      best.set(id, weight);
    }
  }
  return [...best.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, weight]) => ({ id, weight: Number(weight.toFixed(2)) }));
}

function symbolKey(symbol) {
  return String(symbol).replace(/^[^_]+_/, "");
}

// 写真を1枚でも置くなら、出典・著作者・ライセンスを必ずそろえる。
// ここで落としておかないと、表記のない写真がそのまま公開されてしまう。
const REQUIRED_PHOTO_FIELDS = ["credit", "license", "licenseUrl", "sourceUrl"];

function checkPhotoCredits(rocks) {
  const problems = [];

  rocks.forEach((rock) => {
    (rock.images || []).forEach((image, index) => {
      if (!image.src) {
        // 模様で代用しているものは出典不要。
        return;
      }
      const missing = REQUIRED_PHOTO_FIELDS.filter((field) => !image[field]);
      if (missing.length > 0) {
        problems.push(`${rock.id} の画像${index + 1}: ${missing.join(", ")} がない`);
      }
    });
  });

  if (problems.length > 0) {
    console.error("\n写真の出典表記が足りません。修正するまでビルドを中止します。");
    problems.forEach((problem) => console.error("  - " + problem));
    process.exit(1);
  }
}

// 出典一覧を自動生成する。手で書くと必ずずれるので rocks.json から作る。
function buildCreditList(rocks) {
  const lines = [
    "# 写真の出典",
    "",
    "このファイルは `tools/build-lithology-map.mjs` が `data/rocks.json` から生成します。手で編集しないでください。",
    ""
  ];

  const used = rocks.flatMap((rock) =>
    (rock.images || [])
      .filter((image) => image.src)
      .map((image) => ({ rock, image }))
  );

  if (used.length === 0) {
    lines.push("現在、実物の写真は使っていません。すべてSVGの模様で代用しています。", "");
    return lines.join("\n");
  }

  lines.push("| 石 | 説明 | 著作者 | ライセンス | 出典 |", "|---|---|---|---|---|");
  used.forEach(({ rock, image }) => {
    lines.push(
      `| ${rock.name} | ${image.label || "-"} | ${image.credit} | [${image.license}](${image.licenseUrl}) | [リンク](${image.sourceUrl}) |`
    );
  });
  lines.push("");
  return lines.join("\n");
}

const response = await fetch(LEGEND_URL);
if (!response.ok) {
  throw new Error(`legend.json fetch failed: ${response.status}`);
}
const legends = await response.json();

const table = {};
const colorIndex = {};
const stats = { bedrock: 0, loose: 0, artificial: 0, empty: 0 };
let colorCollisions = 0;

for (const legend of legends) {
  const key = symbolKey(legend.symbol);

  // 地質図タイルの画素から凡例を引くための索引。色は凡例ごとに一意。
  const color = String(legend.value || "").toLowerCase();
  if (color) {
    if (colorIndex[color] && colorIndex[color][0] !== key) {
      colorCollisions += 1;
    }
    colorIndex[color] = [key, ageCode(legend.formationAge_ja)];
  }

  if (table[key]) {
    continue;
  }

  const { kind, looseType, rocks } = classify(legend);
  const merged = mergeRocks(rocks);

  const entry = {
    lithology: legend.lithology_ja || "",
    group: legend.group_ja || "",
    kind,
    rocks: merged
  };
  if (looseType) {
    entry.looseType = looseType;
  }

  table[key] = entry;
  stats[kind] += 1;
  if (kind === "bedrock" && merged.length === 0) {
    stats.empty += 1;
    console.warn("石を決められなかった岩相:", key, legend.group_ja, legend.lithology_ja);
  }
}

const sorted = Object.fromEntries(Object.keys(table).sort().map((key) => [key, table[key]]));
await writeFile(OUT_PATH, `${JSON.stringify(sorted, null, 0)}\n`, "utf8");

const sortedIndex = Object.fromEntries(Object.keys(colorIndex).sort().map((key) => [key, colorIndex[key]]));
await writeFile(INDEX_PATH, `${JSON.stringify(sortedIndex, null, 0)}\n`, "utf8");

// file:// で開いたときは fetch が使えないので、同じ内容を <script> で読める形にも出す。
// これがないと、index.html をダブルクリックしただけでは石が一つも出ない。
const rocks = JSON.parse(await readFile(join(DATA_DIR, "rocks.json"), "utf8"));
const minerals = JSON.parse(await readFile(join(DATA_DIR, "minerals.json"), "utf8"));

checkPhotoCredits(rocks);
await writeFile(CREDITS_PATH, buildCreditList(rocks), "utf8");

const bundle = [
  "// 自動生成。tools/build-lithology-map.mjs が data/*.json から作ります。",
  "// file:// で開いたときの読み込み元です。直接編集しないでください。",
  `window.ISHIHIROI_DATA = ${JSON.stringify({ rocks, lithology: sorted, legendIndex: sortedIndex, minerals })};`,
  ""
].join("\n");
await writeFile(BUNDLE_PATH, bundle, "utf8");

console.log("岩相の総数:", Object.keys(sorted).length);
console.log("内訳:", stats);
console.log("色の索引:", Object.keys(sortedIndex).length, "色");
console.log("色の衝突:", colorCollisions);
console.log("bundle.js:", rocks.length, "石 /", minerals.length, "鉱物 を同梱");
