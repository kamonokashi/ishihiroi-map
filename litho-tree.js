// 地質の分類マップ。地質図の岩相（610件）を、左の「地質」から右へ枝分かれする木の形で並べる。
// 木の描き方は石の分類マップと共通（tree-layout.js）。
//
// 610件を1件ずつ並べると多すぎるので、枝の先には岩相そのものではなく「系統」を並べる。
// 610件のほとんどは同じ岩石の帯ちがい・時代ちがい（泥質片岩なら高P/T型のアルバイト黒雲母帯・ざくろ石帯…で15件）で、
// 凡例の記号の頭（mscpe_hg の mscpe）と区分（group_ja）の組がその系統にあたる。全部で約120系統。
// 系統の札を押すと、その場で中身（帯・時代ちがいの岩相）が開き、そこから岩相のページへ行ける。1件しかない系統も同じく開く
// （直接リンクにすると、その地質の色（海成層の石灰岩は時代ごとに26色）を出す場所がなくなる）。
//
// 枝の組み方は LITHO_TREE に手で書く。families は [記号の頭, 札の名前] で、名前を省くと岩相名の最初の語を使う
// （変成岩は「泥質片岩 高P/T型広域変成岩 …」のように最初の語が岩石名なので、省いてある）。
// LITHO_TREE に書き忘れた系統は、区分の大枝の下の「そのほか」に入れて、一覧から漏れないようにする。
//
// ?id=岩相の記号（mscpe_hg など）で開くと、その岩相の系統を開いて、その岩相の位置までスクロールする（岩相のページからのリンク）。

const LITHO_TREE = {
  label: "地質",
  note: "地質図の5つの区分",
  children: [
    {
      label: "火成岩", term: "igneous-rock", note: "マグマが冷えて固まった", branch: "igneous", group: "火成岩",
      children: [
        { label: "深成岩", term: "plutonic-rock", note: "地下でゆっくり冷えた",
          families: [["pam", "花崗岩（塊状）"], ["pan", "花崗岩（片麻状）"], ["pim", "花崗閃緑岩・トーナル岩（塊状）"],
            ["pin", "花崗閃緑岩・トーナル岩（片麻状）"], ["pbd", "閃緑岩・石英閃緑岩"], ["pbg", "斑れい岩"], ["pu", "超苦鉄質岩類"]] },
        { label: "火山岩", term: "volcanic-rock", note: "地表近くで急に冷えた",
          families: [["vas", "デイサイト・流紋岩"], ["va", "デイサイト・流紋岩・粗面岩"], ["vaa", "粗面岩"],
            ["vis", "安山岩・玄武岩質安山岩"], ["vi", "安山岩・玄武岩質安山岩・粗面安山岩"], ["via", "粗面安山岩"],
            ["vbs", "玄武岩"], ["vb", "玄武岩・アルカリ玄武岩・粗面玄武岩"], ["vba", "アルカリ玄武岩・粗面玄武岩"],
            ["v", "岩屑なだれ・火山麓扇状地堆積物"]] }
      ]
    },
    {
      label: "堆積岩", term: "sedimentary-rock", note: "積もったものが固まった", branch: "sedimentary", group: "堆積岩",
      children: [
        { label: "海成層", note: "海の底に積もった",
          families: [["soc", "礫岩"], ["soss", "砂岩"], ["sosma", "砂岩泥岩互層"], ["som", "泥岩"], ["soi", "珪質泥岩"],
            ["son", "石灰質シルト岩・砂岩"], ["sol", "石灰岩"], ["so", "岩石の指定なし"]] },
        { label: "汽水成層", note: "河口や入り江など、海と陸のあいだ",
          families: [["sbc", "礫岩"], ["sbss", "砂岩"], ["sbs", "砂岩（互層を含む）"], ["sbsm", "砂岩泥岩互層"], ["sbm", "泥岩"],
            ["sbl", "石灰岩"], ["sb", "岩石の指定なし"]] },
        { label: "非海成層", note: "川や湖など、陸に積もった",
          families: [["snc", "礫岩"], ["snss", "砂岩"], ["sns", "砂岩（互層を含む）"], ["snsmm", "砂岩・泥岩"], ["snm", "泥岩"],
            ["sn", "岩石の指定なし"]] },
        // 地図画面の「運搬モード」になる地質（kind が bedrock でない）。石拾いではむしろ本命の場所
        { label: "固まっていない堆積物", note: "川原や段丘など。上流の石が集まる",
          families: [["std", "段丘堆積物"], ["sfd", "扇状地・崖錐堆積物"], ["sad", "谷底平野・河川・海岸平野堆積物"],
            ["svd", "自然堤防堆積物"], ["ssd", "海岸・砂丘堆積物"], ["sld", "湖沼堆積物"], ["smd", "湿原・湿地堆積物"],
            ["sdd", "地すべり堆積物"], ["sod", "海成層の崩壊堆積物"], ["sgd", "氷河堆積物"], ["se", "風成火山灰"]] }
      ]
    },
    {
      label: "付加体", term: "accretionary-complex", note: "海のプレートからはぎ取られて陸に付いた", branch: "accretion", group: "付加体",
      children: [
        { label: "砂岩・泥岩など", term: "clastic-rock", note: "陸から海溝に運ばれた砂や泥",
          families: [["sama", "砂岩・泥岩・礫岩"], ["soc", "礫岩"], ["soss", "砂岩"], ["sosma", "砂岩泥岩互層（海成層）"],
            ["somas", "砂岩泥岩互層"], ["somam", "泥岩砂岩互層"], ["som", "泥岩"], ["sor", "多色泥岩"], ["soi", "珪質泥岩"]] },
        { label: "チャート・石灰岩", term: "chemical-rock", note: "遠い海の殻やサンゴ礁",
          families: [["soh", "チャート"], ["sol", "石灰岩"]] },
        { label: "海の火成岩", note: "海底の溶岩や、海のプレートの岩石",
          families: [["vbs", "玄武岩"], ["vba", "アルカリ玄武岩・粗面玄武岩"], ["va", "デイサイト・流紋岩・粗面岩"],
            ["vas", "デイサイト・流紋岩"], ["vi", "安山岩・玄武岩質安山岩・粗面安山岩"], ["pb", "斑れい岩・閃緑岩・石英閃緑岩"],
            ["pi", "花崗閃緑岩・トーナル岩"], ["pim", "花崗閃緑岩・トーナル岩（塊状）"], ["pu", "超苦鉄質岩類"]] },
        { label: "混在岩", note: "いろいろな岩がちぎれて混ざった",
          families: [["sx", "混在岩"]] }
      ]
    },
    {
      label: "変成岩", term: "metamorphic-rock", note: "熱や圧力でつくり変わった", branch: "metamorphic", group: "変成岩",
      children: [
        { label: "広域変成岩", term: "regional-metamorphic-rock", note: "深く押されて縞ができた",
          children: [
            // もとの岩石（泥質・砂質・珪質・礫質・石灰質・苦鉄質・超苦鉄質・珪長質）の順に並べる
            { label: "粘板岩・千枚岩", note: "変成が弱い",
              families: [["msl"], ["mpype"], ["mpysi"], ["mpyma"]] },
            { label: "結晶片岩", stone: "schist", note: "薄くはがれる",
              families: [["mscpe"], ["mscps"], ["mscsi"], ["msccg"], ["mscca"], ["mscma"], ["msama"], ["mscfe"]] },
            { label: "片麻岩・グラノフェルス", stone: "gneiss", note: "変成が強い。粒が粗い",
              families: [["msgpe"], ["msmpe"], ["msnpe"], ["mgmpe"], ["mggps"], ["mgmps"], ["msmsi"], ["mgmsi"], ["mgnsi"],
                ["msgca"], ["msnca"], ["msgma"], ["mgama"], ["mmgma"], ["msgul"], ["mgnfe"], ["mgngr"], ["mgngb"]] },
            { label: "もとの岩石の名前で呼ぶもの", note: "変成前の岩石が分かる",
              families: [["mrps"], ["mrch"], ["mrbs"], ["mrga"], ["mrhb"], ["mrpr"], ["mrls"], ["msp"]] }
          ] },
        { label: "接触変成岩", term: "contact-metamorphic-rock", note: "マグマの熱で焼かれた",
          families: [["mghpe"], ["mghps"], ["mghch"], ["mghls"], ["mghma"], ["mghul"]] },
        { label: "変位変成岩", term: "dynamic-metamorphic-rock", note: "断層でこすれて伸びた",
          families: [["mmygr"], ["mmygd"], ["mmyry"], ["mmypn"]] }
      ]
    },
    {
      label: "その他", note: "人がつくった地面", branch: "other", group: "その他",
      families: [["or", "盛り土・埋立地・干拓地"]]
    }
  ]
};

// いま開いている系統（"区分|記号の頭"）
const openFamilies = new Set();
// 木に並んでいる全部の系統（「全部開く」用）
let allFamilies = [];
let currentId = "";
let redrawTree = () => {};

window.addEventListener("DOMContentLoaded", async () => {
  let lithology;
  let details;
  try {
    // 時代と色は補足なので、読めなくても木は出す
    [lithology, details] = await Promise.all([
      loadData("data/lithology-map.json", "lithology"),
      loadData("data/lithology-detail.json", "lithologyDetail").catch(() => ({}))
    ]);
  } catch (error) {
    console.info("litho tree data could not be loaded.", error);
    treeCanvas.innerHTML = `<p class="tree-loading">地質のデータを読み込めませんでした。時間をおいてもう一度お試しください。</p>`;
    return;
  }

  const families = collectFamilies(lithology, details);
  const root = buildLithoTree(LITHO_TREE, families);
  const collect = (node) => node.cluster ? node.families.map(({ key }) => key) : node.children.flatMap(collect);
  allFamilies = collect(root);

  // 岩相のページから来たときは、その岩相の系統を開いておく
  const id = new URLSearchParams(window.location.search).get("id");
  if (id && Object.hasOwn(lithology, id)) {
    currentId = id;
    openFamilies.add(familyKey(lithology[id].group, id));
  }

  // 枝が5段（地質 → 変成岩 → 広域変成岩 → 片麻岩… → 札）と深く、札も多いので、枝の箱を細くして房に幅を回す。
  // 枝のひとことは2行に折り返してよい
  redrawTree = mountTree(root, familyClusterItems, { wide: { node: 150, gap: 26 } });
  bindFamilyToggle();
  bindOpenAll();

  if (currentId) {
    treeCanvas.querySelector(".litho-variant.is-current")?.scrollIntoView({ block: "center" });
  }
});

function familyKey(group, suffix) {
  return `${group}|${suffix.split("_")[0]}`;
}

// 岩相を系統ごとにまとめる。並びは lithology-map.json の順（凡例の順）。
// 岩相ごとに、地質図に出てくる時代と色（lithology-detail.json の ages。古い順）を持たせる。
// 地質図の色は岩相1つに1色ではなく「岩相 × 時代」ごとに付いている（全2416色、1つの岩相に最大26色）。
// だから系統の札には色を出さない（1色だけ選ぶと、たまたまの色になる）。開いた中身の岩相ごとに全部の色を出す
function collectFamilies(lithology, details) {
  const families = new Map();
  Object.entries(lithology).forEach(([suffix, entry]) => {
    const key = familyKey(entry.group || "その他", suffix);
    if (!families.has(key)) {
      families.set(key, { key, members: [] });
    }
    families.get(key).members.push({ suffix, name: entry.lithology, ages: details?.[suffix]?.ages || [] });
  });

  families.forEach((family) => {
    const tokens = family.members.map(({ name }) => name.split(/[\s　]+/).filter(Boolean));
    // 系統の全員に共通する頭の語。残りが帯や時代のちがいになる
    let common = 0;
    while (tokens.every((list) => list.length > common && list[common] === tokens[0][common])) {
      common += 1;
    }
    family.firstWord = tokens[0][0];
    family.members.forEach((member, index) => {
      member.rest = tokens[index].slice(common);
    });
  });
  return families;
}

function buildLithoTree(spec, families) {
  const placed = new Set();
  let serial = 0;

  const toNode = (item, parent) => {
    const node = {
      key: `n${serial += 1}`,
      parent,
      label: item.label,
      note: item.note || "",
      term: item.term || "",
      stone: item.stone || "",
      branch: item.branch || parent?.branch || "",
      group: item.group || parent?.group || "",
      children: []
    };
    (item.children || []).forEach((child) => node.children.push(toNode(child, node)));
    if (item.families) {
      const list = item.families
        .map(([prefix, label]) => {
          const family = families.get(`${node.group}|${prefix}`);
          if (!family) {
            console.info(`litho tree: ${node.group} ${prefix} is not in lithology-map.json`);
            return null;
          }
          placed.add(family.key);
          return { ...family, label: label || shortLabel(family.firstWord), title: label ? "" : family.firstWord };
        })
        .filter(Boolean);
      if (list.length > 0) {
        node.children.push({ key: `${node.key}c`, parent: node, cluster: true, branch: node.branch, families: list, children: [] });
      }
    }
    return node;
  };

  const root = toNode(spec, null);

  // LITHO_TREE に書かれていない系統は、区分の大枝の下の「そのほか」に入れる
  root.children.forEach((major) => {
    const rest = [...families.values()].filter((family) => !placed.has(family.key) && family.key.startsWith(`${major.group}|`));
    if (rest.length === 0) {
      return;
    }
    console.info(`litho tree: ${rest.length} families are not placed in ${major.group}`, rest.map(({ key }) => key));
    const other = { key: `n${serial += 1}`, parent: major, label: "そのほか", note: "", term: "", stone: "", branch: major.branch, group: major.group, children: [] };
    other.children.push({
      key: `${other.key}c`, parent: other, cluster: true, branch: major.branch, children: [],
      families: rest.map((family) => ({ ...family, label: shortLabel(family.firstWord), title: family.firstWord }))
    });
    major.children.push(other);
  });

  return root;
}

// 変成岩の岩石名は「泥質片岩・泥質グラノフェルス・泥質片麻岩・泥質ミグマタイト」のように、もとの岩石（泥質）を
// 毎回くり返していて長い。2つめからは省いて「泥質片岩・グラノフェルス・片麻岩・ミグマタイト」にする（元の名前は札の title に出す）
function shortLabel(name) {
  const prefix = name.match(/^(.+?質)/)?.[1];
  if (!prefix) {
    return name;
  }
  return prefix + name.slice(prefix.length).split(prefix).join("");
}

// 房の中身。系統の札（名前・件数）。開いている系統は、札のあとに中身を房の幅いっぱいに出す
function familyClusterItems(node) {
  return node.families.map((family) => {
    const name = `<span class="cluster-chip-name">${escapeHtml(family.label)}</span>`;
    const title = family.title && family.title !== family.label ? ` title="${escapeHtml(family.title)}"` : "";

    const open = openFamilies.has(family.key);
    return `
      <li>
        <button type="button" class="cluster-chip litho-chip${open ? " is-open" : ""}" data-cluster="${node.key}" data-family="${escapeHtml(family.key)}" aria-expanded="${open}"${title}>
          ${name}${family.members.length > 1 ? `<span class="litho-count">${family.members.length}</span>` : ""}
        </button>
      </li>
      ${open ? `<li class="litho-variants">${variantsHtml(family)}</li>` : ""}
    `;
  }).join("");
}

// 系統の中身。帯・時代ちがいの岩相。「高P/T型広域変成岩」のように頭の語が2種類以上あれば、それで小見出しを立てる
function variantsHtml(family) {
  const heads = new Set(family.members.map(({ rest }) => (rest.length >= 2 ? rest[0] : "")));
  const grouped = !heads.has("") && heads.size >= 2;

  const link = (member, words) => `
    <li>
      <a class="litho-variant${member.suffix === currentId ? " is-current" : ""}" href="lithology.html?id=${encodeURIComponent(member.suffix)}">
        <span class="litho-variant-name">${escapeHtml(words.join(" ") || member.name)}</span>${agesHtml(member.ages)}
      </a>
    </li>
  `;

  if (!grouped) {
    return `<ul class="litho-variant-list" role="list">${family.members.map((member) => link(member, member.rest)).join("")}</ul>`;
  }
  return [...heads].map((head) => `
    <div class="litho-variant-group">
      <p class="litho-variant-head">${escapeHtml(head)}</p>
      <ul class="litho-variant-list" role="list">
        ${family.members.filter(({ rest }) => rest[0] === head).map((member) => link(member, member.rest.slice(1))).join("")}
      </ul>
    </div>
  `).join("");
}

// 地質図でその岩相が塗られている色を、時代ごとに小さな丸で並べる。丸に触れると時代が出る。
// 地図画面で地質図を重ねたときの答え合わせ用（「この色の場所が、この地質のこの時代」）
function agesHtml(ages) {
  if (!ages.length) {
    return "";
  }
  const label = `地質図の色：${ages.length}色（時代ごと）`;
  return `
    <span class="litho-colors" role="img" aria-label="${label}">
      ${ages.map(([age, color]) => `<span class="litho-dot" style="background:#${escapeHtml(color)}" title="${escapeHtml(age)}"></span>`).join("")}
    </span>
  `;
}

// 札を押すと開閉する。描き直すとボタンが作り直されるので、押した札にフォーカスを戻す
function bindFamilyToggle() {
  treeCanvas.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-family]");
    if (!button) {
      return;
    }
    const key = button.dataset.family;
    if (openFamilies.has(key)) {
      openFamilies.delete(key);
    } else {
      openFamilies.add(key);
    }
    redrawTree();
    updateOpenAll();
    treeCanvas.querySelector(`button[data-family="${CSS.escape(key)}"]`)?.focus({ preventScroll: true });
  });
}

// 見方の「全部開く」。全部開いているときは「全部閉じる」になる
const openAllButton = document.querySelector("#openAllButton");

function bindOpenAll() {
  if (!openAllButton) {
    return;
  }
  openAllButton.hidden = false;
  updateOpenAll();
  openAllButton.addEventListener("click", () => {
    const allOpen = allFamilies.every((key) => openFamilies.has(key));
    openFamilies.clear();
    if (!allOpen) {
      allFamilies.forEach((key) => openFamilies.add(key));
    }
    redrawTree();
    updateOpenAll();
  });
}

function updateOpenAll() {
  if (!openAllButton) {
    return;
  }
  const allOpen = allFamilies.length > 0 && allFamilies.every((key) => openFamilies.has(key));
  openAllButton.textContent = allOpen ? "全部閉じる" : "全部開く";
  openAllButton.setAttribute("aria-pressed", String(allOpen));
}
