// 石と鉱物の分類マップ。左の根から右へ枝分かれする木の形で並べる。上のバーのスイッチで、石（でき方で分ける）と鉱物（何でできているかで分ける）を切り替える。
// 枝の組み方（TREE）はここで持つ。石の名前・読み・写真は rocks.json から引くので、ここには id だけを書く。
// 枝の途中の「火成岩」「深成岩」などは用語ページ（terms.json）へのリンクにする。
// 石は枝の先に横並びの房（クラスタ）でまとめ、入りきらなければ折り返す。石を1行に1つ並べると木が縦に
// 約1600pxまで伸び、「岩石 → 火成岩 → 深成岩」の骨組みが1画面に収まらなかった（段の数が石の数33になる）。
// 房にすると段の数は房の数（約12）になり、PCでは木全体がほぼ1画面に入る。
// rocks.json に石を足してここに書き忘れても、category が同じ大枝の下に直接ぶら下げて、一覧から漏れないようにする。

const TREE = {
  label: "岩石",
  note: "でき方で分ける",
  children: [
    {
      label: "火成岩", term: "igneous-rock", note: "マグマが冷えて固まった", branch: "igneous", category: "火成岩",
      children: [
        { label: "深成岩", term: "plutonic-rock", note: "地下でゆっくり冷えた。粒が粗い",
          stones: ["granite", "granodiorite", "diorite", "gabbro", "peridotite"] },
        { label: "火山岩", term: "volcanic-rock", note: "地表で急に冷えた。粒が細かい",
          stones: ["rhyolite", "dacite", "andesite", "basalt", "trachyte", "obsidian"] }
      ]
    },
    {
      label: "堆積岩", term: "sedimentary-rock", note: "積もったものが固まった", branch: "sedimentary", category: "堆積岩",
      children: [
        { label: "砕屑岩", term: "clastic-rock", note: "岩のかけら。粒の大きさで分ける",
          stones: ["conglomerate", "sandstone", "mudstone"] },
        // 噴火の破片が積もったもので、火成岩と堆積岩のあいだにある。rocks.json では凝灰岩だけ堆積岩、
        // 軽石・溶結凝灰岩は火成岩にしているが、でき方の枝としては1つにまとめたほうが分かりやすい
        { label: "火山砕屑岩", term: "pyroclastic-rock", note: "噴火の破片が積もった。火成岩との境目",
          stones: ["tuff", "welded-tuff", "pumice"] },
        { label: "化学岩・生物岩", term: "chemical-rock", note: "殻や、水に溶けていたもの",
          stones: ["limestone", "chert"] }
      ]
    },
    {
      label: "変成岩", term: "metamorphic-rock", note: "熱や圧力でつくり変わった", branch: "metamorphic", category: "変成岩",
      children: [
        { label: "広域変成岩", term: "regional-metamorphic-rock", note: "深く押されて縞ができた",
          children: [
            { stone: "slate" },
            { stone: "phyllite" },
            { label: "結晶片岩", stone: "schist", note: "薄くはがれる",
              stones: ["pelitic-schist", "mafic-schist", "siliceous-schist"] },
            { stone: "gneiss" },
            { stone: "amphibolite" }
          ] },
        { label: "接触変成岩", term: "contact-metamorphic-rock", note: "マグマの熱で焼かれた",
          stones: ["hornfels", "marble"] },
        // 緑色岩・蛇紋岩は、海底やマントルの岩石が水と反応して鉱物が入れ替わったもの
        { label: "水で変わった岩石", note: "海底やマントルで水と反応した",
          stones: ["greenstone", "serpentinite"] },
        // 石が1つだけの枝は、狭い画面で箱が何行にも折り返すと隣の枝とぶつかる。2つの枝のあいだではなく端に置く
        { label: "変位変成岩", term: "dynamic-metamorphic-rock", note: "断層でこすれて伸びた",
          stones: ["mylonite"] }
      ]
    },
    {
      label: "鉱脈", term: "ore-vein", note: "割れ目を鉱物が埋めた", branch: "vein", category: "その他",
      stones: ["vein-quartz"]
    }
  ]
};

// 鉱物の分類。鉱物学の基本の分け方（何でできているか）に従う。
// 岩石をつくる鉱物のほとんどはケイ酸塩鉱物で、ケイ素と酸素の四面体（骨組み）がどうつながっているかで分ける。
// つながりの少ない順（ばらばら → 2つ組・輪 → 鎖 → 板 → 立体の網目）に並べる。結晶の形や割れ方がこの順に変わる。
// 石英は骨組みが立体につながったものとしてケイ酸塩に入れる（酸化鉱物に分ける流儀もあるが、造岩鉱物としてはこちらが一般的）。
// 書き方は TREE と同じで、鉱物は minerals: [id…]、ほかの鉱物をまとめる鉱物（雲母・輝石）は mineral: id の枝にする
const MINERAL_TREE = {
  label: "鉱物",
  note: "何でできているかで分ける",
  children: [
    {
      label: "ケイ酸塩鉱物", note: "ケイ素と酸素が骨組み。岩石の鉱物のほとんど", branch: "silicate",
      children: [
        { label: "骨組みがばらばら", note: "ころんとした粒になりやすい",
          minerals: ["olivine", "garnet", "sillimanite"] },
        { label: "骨組みが2つ組・輪", note: "少しだけつながる",
          minerals: ["epidote", "lawsonite", "cordierite"] },
        { label: "骨組みが鎖", note: "細長い柱や針に育つ",
          children: [
            { label: "輝石", mineral: "pyroxene", note: "1本の鎖", minerals: ["jadeite"] },
            { mineral: "amphibole" }
          ] },
        { label: "骨組みが板", note: "薄くはがれる",
          children: [
            { label: "雲母", mineral: "mica", note: "うすく何枚にもはがれる", minerals: ["biotite", "muscovite"] },
            { mineral: "chlorite" },
            { mineral: "serpentine" },
            { mineral: "talc" }
          ] },
        { label: "骨組みが立体の網目", note: "すきまなく組み合う。硬い",
          minerals: ["quartz", "rock-crystal", "agate", "feldspar"] }
      ]
    },
    {
      label: "炭酸塩鉱物", note: "炭酸と金属。うすい酸に溶ける", branch: "carbonate",
      minerals: ["calcite", "dolomite"]
    },
    {
      label: "酸化鉱物", note: "金属と酸素。重く、黒や赤", branch: "oxide",
      minerals: ["magnetite", "hematite", "chromian-spinel"]
    },
    {
      label: "硫化鉱物", note: "金属と硫黄。金色に光るものが多い", branch: "sulfide",
      minerals: ["pyrite", "chalcopyrite"]
    },
    {
      label: "元素鉱物", note: "1種類の元素だけでできている", branch: "native",
      minerals: ["native-gold"]
    }
  ]
};

// 石と鉱物で違うところ。spec の中で中身を並べる名前（stones / minerals）、1つを指す名前（stone / mineral）、
// 詳しいページ、書き忘れたものの置き場所
const TREE_KINDS = {
  stone: {
    list: "stones", item: "stone", page: "stone.html", source: "rocks.json", byId: new Map(),
    // 石は category が同じ大枝の下に
    home: (root, item) => root.children.find((node) => node.category === (item.category || "その他"))
  },
  mineral: {
    list: "minerals", item: "mineral", page: "mineral.html", source: "minerals.json", byId: new Map(),
    // 鉱物は根の下の「そのほか」に
    home: (root, item, makeNode) => {
      let other = root.children.find((node) => node.label === "そのほか");
      if (!other) {
        other = makeNode({ label: "そのほか", branch: "root" }, root);
        root.children.push(other);
      }
      return other;
    }
  }
};

const TABS = {
  stone: { title: "石の分類マップ", tree: null },
  mineral: { title: "鉱物の分類マップ", tree: null }
};

window.addEventListener("DOMContentLoaded", async () => {
  let rocks;
  let minerals;
  try {
    [rocks, minerals] = await Promise.all([
      loadData("data/rocks.json", "rocks"),
      loadData("data/minerals.json", "minerals")
    ]);
  } catch (error) {
    console.info("rock tree data could not be loaded.", error);
    treeCanvas.innerHTML = `<p class="tree-loading">石と鉱物のデータを読み込めませんでした。時間をおいてもう一度お試しください。</p>`;
    return;
  }

  registerCatalog("rocks", rocks);
  registerCatalog("minerals", minerals);
  TREE_KINDS.stone.byId = new Map(rocks.map((rock) => [rock.id, rock]));
  TREE_KINDS.mineral.byId = new Map(minerals.map((mineral) => [mineral.id, mineral]));

  // 木の描き方は tree-layout.js（地質の分類マップと共通）
  TABS.stone.tree = toClusters(buildTree(TREE, rocks, TREE_KINDS.stone));
  TABS.mineral.tree = toClusters(buildTree(MINERAL_TREE, minerals, TREE_KINDS.mineral));
  fillGuideStone(TREE_KINDS.stone.byId.get("granite"));

  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => showTab(button.dataset.tab, { remember: true }));
  });
  const first = new URLSearchParams(window.location.search).get("tab");
  showTab(TABS[first] ? first : "stone");
});

// 石と鉱物の切り替え。同じ枠に描き直し、見方の説明も入れ替える。どちらを見ているかは URL（?tab=mineral）に残す
function showTab(name, { remember = false } = {}) {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    const active = button.dataset.tab === name;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  // 白い面の位置は data-active で決める（CSS で滑らせる）
  document.querySelector("#treeSwitch").dataset.active = name;
  document.querySelectorAll("[data-tab-guide]").forEach((guide) => {
    guide.hidden = guide.dataset.tabGuide !== name;
  });
  document.querySelector("#treePanel")?.setAttribute("aria-labelledby", `${name}Tab`);
  document.querySelector("#treeTitle").textContent = TABS[name].title;
  document.title = `${TABS[name].title} - いしひろいマップ`;

  if (remember) {
    const url = new URL(window.location.href);
    if (name === "stone") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", name);
    }
    window.history.replaceState(null, "", url);
  }

  mountTree(TABS[name].tree, (node) => clusterItems(node, name));

  // 下のほうで切り替えたら、新しい木の頭（紹介文）が上のバーのすぐ下に見えるところまで戻す
  // （そのままだと、短い木の下の余白を見ていることになる）
  if (remember) {
    const panel = document.querySelector("#treePanel");
    const bar = document.querySelector(".tree-header");
    const top = panel.getBoundingClientRect().top - bar.getBoundingClientRect().bottom;
    if (top < 0) {
      // 行き先は絶対位置で渡す（scrollBy だと、途中で止まったり重なったりしたときにずれる）
      window.scrollTo({ top: window.scrollY + top - 8, behavior: "smooth" });
    }
  }
}

// spec の書き方（stones: [...] / minerals: [...] と children: [...]）を、どれも children を持つ形にそろえる。
// カタログにないものは落とし、逆に spec に書かれていないものは kind.home() の枝の下に足す（一覧から漏らさないため）
function buildTree(spec, items, kind) {
  const placed = new Set();
  let serial = 0;

  const toNode = (item, parent) => {
    const id = item[kind.item] && kind.byId.has(item[kind.item]) ? item[kind.item] : "";
    const node = {
      key: `${kind.item}${serial += 1}`,
      parent,
      label: item.label || kind.byId.get(id)?.name || "",
      note: item.note || "",
      term: item.term || "",
      id,
      // 名前の付いた枝（結晶片岩・雲母など）は、その石・鉱物のページへのリンクになる（tree-layout.js）
      [kind.item]: item.label ? id : "",
      branch: item.branch || parent?.branch || "",
      category: item.category || "",
      children: []
    };
    if (id) {
      placed.add(id);
    }
    const kids = [
      ...(item.children || []),
      ...(item[kind.list] || []).map((kidId) => ({ [kind.item]: kidId }))
    ];
    kids.forEach((kid) => {
      const kidId = kid[kind.item];
      if (kidId && !kid.label && !kid.children && !kid[kind.list] && !kind.byId.has(kidId)) {
        console.info(`tree: ${kidId} is not in ${kind.source}`);
        return;
      }
      node.children.push(toNode(kid, node));
    });
    return node;
  };

  const root = toNode(spec, null);

  items.filter((item) => !placed.has(item.id)).forEach((item) => {
    const home = kind.home(root, item, toNode);
    if (!home) {
      console.info(`tree: no branch for ${item.id}`);
      return;
    }
    home.children.push(toNode({ [kind.item]: item.id }, home));
  });

  return root;
}

// 枝の子のうち、続けて並ぶ石（鉱物）をひとまとまり（房）にする。
// 広域変成岩のように石と枝（結晶片岩）が混ざるところは、順番を保つため「粘板岩・千枚岩」「結晶片岩」「片麻岩・角閃岩」に分かれる
function toClusters(node) {
  let serial = 0;
  const walk = (item) => {
    const children = [];
    let run = null;
    item.children.forEach((child) => {
      if (child.children.length === 0) {
        if (!run) {
          run = { key: `${item.key}c${serial += 1}`, parent: item, cluster: true, branch: child.branch, ids: [], children: [] };
          children.push(run);
        }
        run.ids.push(child.id);
      } else {
        run = null;
        children.push(walk(child));
      }
    });
    item.children = children;
    return item;
  };
  return walk(node);
}

// 房の中身。石は写真と名前の札、鉱物は名前の札（鉱物のカタログは写真を持たない）
function clusterItems(node, tab) {
  const kind = TREE_KINDS[tab];
  return node.ids.map((id) => {
    const item = kind.byId.get(id);
    const photo = tab === "stone"
      ? `<img class="cluster-chip-photo" src="${escapeHtml(stonePhoto(item).src)}" alt="" loading="lazy">`
      : "";
    return `
      <li>
        <a class="cluster-chip${tab === "mineral" ? " mineral-chip" : ""}" data-cluster="${node.key}" href="${kind.page}?id=${encodeURIComponent(item.id)}">
          ${photo}<span class="cluster-chip-name">${escapeHtml(item.name)}</span>
        </a>
      </li>
    `;
  }).join("");
}

// 見方の見本の石の札に、木の中と同じ写真を入れる（写真は stonePhoto() から作るので、ここで入れる）
function fillGuideStone(rock) {
  const sample = document.querySelector("#guideStone");
  if (!sample || !rock) {
    return;
  }
  sample.insertAdjacentHTML("afterbegin", `<img class="cluster-chip-photo" src="${escapeHtml(stonePhoto(rock).src)}" alt="">`);
}
