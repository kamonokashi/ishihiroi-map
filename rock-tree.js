// 石の分類マップ。左の「岩石」から右へ、でき方で枝分かれしていく木の形で石を並べる。
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

let rocksById = new Map();

window.addEventListener("DOMContentLoaded", async () => {
  let rocks;
  try {
    rocks = await loadData("data/rocks.json", "rocks");
  } catch (error) {
    console.info("rock tree data could not be loaded.", error);
    treeCanvas.innerHTML = `<p class="tree-loading">石のデータを読み込めませんでした。時間をおいてもう一度お試しください。</p>`;
    return;
  }

  registerCatalog("rocks", rocks);
  rocksById = new Map(rocks.map((rock) => [rock.id, rock]));

  // 木の描き方は tree-layout.js（地質の分類マップと共通）
  mountTree(toClusters(buildTree(TREE, rocks)), stoneClusterItems);
  fillGuideStone(rocksById.get("granite"));
});

// TREE の書き方（stones: [...] と children: [...]）を、どれも children を持つ形にそろえる。
// 石が rocks.json にないものは落とし、逆に TREE に書かれていない石は同じ category の大枝の下に足す。
function buildTree(spec, rocks) {
  const placed = new Set();
  let serial = 0;

  const toNode = (item, parent) => {
    const node = {
      key: `n${serial += 1}`,
      parent,
      label: item.label || rocksById.get(item.stone)?.name || "",
      note: item.note || "",
      term: item.term || "",
      stone: item.stone && rocksById.has(item.stone) ? item.stone : "",
      branch: item.branch || parent?.branch || "",
      category: item.category || "",
      children: []
    };
    if (node.stone) {
      placed.add(node.stone);
    }
    const kids = [
      ...(item.children || []),
      ...(item.stones || []).map((id) => ({ stone: id }))
    ];
    kids.forEach((kid) => {
      if (kid.stone && !kid.label && !kid.children && !kid.stones && !rocksById.has(kid.stone)) {
        console.info(`rock tree: ${kid.stone} is not in rocks.json`);
        return;
      }
      node.children.push(toNode(kid, node));
    });
    return node;
  };

  const root = toNode(spec, null);

  rocks.filter((rock) => !placed.has(rock.id)).forEach((rock) => {
    const home = root.children.find((node) => node.category === (rock.category || "その他"));
    if (!home) {
      console.info(`rock tree: no branch for ${rock.id} (${rock.category})`);
      return;
    }
    home.children.push(toNode({ stone: rock.id }, home));
  });

  return root;
}

// 枝の子のうち、続けて並ぶ石をひとまとまり（房）にする。
// 広域変成岩のように石と枝（結晶片岩）が混ざるところは、順番を保つため「粘板岩・千枚岩」「結晶片岩」「片麻岩・角閃岩」に分かれる
function toClusters(node) {
  let serial = 0;
  const walk = (item) => {
    const children = [];
    let run = null;
    item.children.forEach((child) => {
      if (child.children.length === 0) {
        if (!run) {
          run = { key: `${item.key}c${serial += 1}`, parent: item, cluster: true, branch: child.branch, stones: [], children: [] };
          children.push(run);
        }
        run.stones.push(child.stone);
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

// 房の中身。石の写真と名前の札
function stoneClusterItems(node) {
  return node.stones.map((id) => {
    const rock = rocksById.get(id);
    const photo = stonePhoto(rock);
    return `
      <li>
        <a class="cluster-chip" data-cluster="${node.key}" href="stone.html?id=${encodeURIComponent(rock.id)}">
          <img class="cluster-chip-photo" src="${escapeHtml(photo.src)}" alt="" loading="lazy">
          <span class="cluster-chip-name">${escapeHtml(rock.name)}</span>
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
