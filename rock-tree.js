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

// 枝の箱の幅、箱と箱のあいだ、房どうしのあいだ、大枝の境目の間、上下の余白。
// 広い画面では枝の箱を広めにして、枝のひとことを1行に収める（1段の高さは枝の箱で決まるため）。
// 狭い画面では、根と大枝（火成岩・堆積岩…）を縦書きの細い帯にして子の範囲いっぱいに伸ばし、横幅を画面に収める。
// そうしないと木が横にはみ出す
const CLUSTER_SIZES = {
  wide: { node: 190, gap: 30, rowGap: 6, groupGap: 14, pad: 10, bars: false },
  narrow: { node: 74, minNode: 50, minCluster: 150, bar: 28, gap: 10, rowGap: 8, groupGap: 16, pad: 10, bars: true }
};

const narrowQuery = window.matchMedia("(max-width: 640px)");
const treeScroll = document.querySelector("#treeScroll");
const treeCanvas = document.querySelector("#treeCanvas");

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

  const tree = toClusters(buildTree(TREE, rocks));
  renderClusters(tree);

  // 横幅は枠に合わせるので、枠の幅が変わったら組み直す
  let lastWidth = treeScroll.clientWidth;
  new ResizeObserver(() => {
    if (treeScroll.clientWidth !== lastWidth) {
      lastWidth = treeScroll.clientWidth;
      renderClusters(tree);
    }
  }).observe(treeScroll);
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

function renderClusters(root) {
  const size = narrowQuery.matches ? CLUSTER_SIZES.narrow : CLUSTER_SIZES.wide;
  const width = treeScroll.clientWidth;

  const nodes = [];
  const collect = (node, depth) => {
    node.depth = depth;
    node.bar = size.bars && depth <= 1 && !node.cluster;
    nodes.push(node);
    node.children.forEach((child) => collect(child, depth + 1));
  };
  collect(root, 0);

  // 横の位置。根が左端で、子は親のすぐ右。房は右端まで使う。
  // 狭い画面では、いちばん深い房（結晶片岩の下）にも幅が残るよう枝の箱を細くする
  const nodeWidth = size.bars
    ? Math.max(size.minNode, Math.min(size.node, Math.floor((width - 2 * size.bar - 4 * size.gap - size.minCluster) / 2)))
    : size.node;
  nodes.forEach((node) => {
    node.left = node.parent ? node.parent.right + size.gap : 0;
    node.right = node.cluster ? width : node.left + (node.bar ? size.bar : nodeWidth);
  });

  // いったん横の位置だけで置いて、房（折り返しの段数で高さが変わる）と枝の箱の高さを測る
  treeCanvas.style.width = `${width}px`;
  treeCanvas.innerHTML = `<ul class="tree-list" role="list">${nodes.map(clusterNodeHtml).join("")}</ul>`;
  const elements = new Map([...treeCanvas.querySelectorAll("[data-key]")].map((el) => [el.dataset.key, el]));
  nodes.forEach((node) => {
    node.height = node.bar ? 0 : elements.get(node.key).offsetHeight;
  });

  // 縦の位置。房を上から順に積み、枝はいちばん上の子といちばん下の子のまん中に置く。
  // 子が1つしかない枝は、枝の箱のほうが房より背が高いことがあるので、その高さぶんを確保する
  let cursor = size.pad;
  const place = (node) => {
    if (node.cluster) {
      const own = Math.max(node.height, node.parent.children.length === 1 ? node.parent.height : 0);
      node.top = cursor + (own - node.height) / 2;
      node.y = node.top + node.height / 2;
      cursor += own + size.rowGap;
      return;
    }
    node.children.forEach((child, index) => {
      if (node.depth === 0 && index > 0) {
        cursor += size.groupGap;
      }
      place(child);
    });
    const first = node.children[0];
    const last = node.children[node.children.length - 1];
    node.y = (first.y + last.y) / 2;
    // 帯は子の範囲いっぱいに伸ばす
    node.top = first.bar ? first.top : first.cluster ? first.top : first.y - first.height / 2;
    node.bottom = last.bar ? last.bottom : last.cluster ? last.top + last.height : last.y + last.height / 2;
  };
  place(root);
  const height = cursor - size.rowGap + size.pad;

  nodes.forEach((node) => {
    const item = elements.get(node.key).parentElement;
    if (node.bar) {
      item.style.top = `${node.top}px`;
      item.style.height = `${node.bottom - node.top}px`;
    } else if (node.cluster) {
      item.style.top = `${node.top}px`;
    } else {
      item.style.top = `${node.y}px`;
    }
  });

  const lines = nodes.filter((node) => node.parent).map((node) => {
    const parent = node.parent;
    const cls = `tree-line tree-branch-${node.branch || "root"}`;
    if (parent.bar) {
      return `<path class="${cls}" data-key="${node.key}" d="M${parent.right} ${node.y} H${node.left}"/>`;
    }
    const spine = parent.right + size.gap / 2;
    const bend = Math.min(8, Math.abs(node.y - parent.y) / 2, size.gap / 4);
    const down = node.y > parent.y ? 1 : -1;
    const d = bend < 1
      ? `M${parent.right} ${parent.y} H${node.left}`
      : `M${parent.right} ${parent.y} H${spine - bend} Q${spine} ${parent.y} ${spine} ${parent.y + down * bend} V${node.y - down * bend} Q${spine} ${node.y} ${spine + bend} ${node.y} H${node.left}`;
    return `<path class="${cls}" data-key="${node.key}" d="${d}"/>`;
  });

  treeCanvas.style.height = `${height}px`;
  treeCanvas.insertAdjacentHTML("afterbegin",
    `<svg class="tree-lines" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false">${lines.join("")}</svg>`);
  treeCanvas.classList.add("is-measured");

  bindClusterHighlight(nodes);
}

function clusterNodeHtml(node) {
  const branch = `tree-branch-${node.branch || "root"}`;
  const style = node.bar
    ? `left:${node.left}px;width:${node.right - node.left}px`
    : `left:${node.left}px;top:0;width:${node.right - node.left}px`;

  if (node.cluster) {
    return `
      <li class="tree-item is-cluster-item" style="${style}">
        <ul class="cluster ${branch}" data-key="${node.key}" role="list">
          ${node.stones.map((id) => {
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
          }).join("")}
        </ul>
      </li>
    `;
  }

  const href = node.stone
    ? `stone.html?id=${encodeURIComponent(node.stone)}`
    : node.term ? `term.html?id=${encodeURIComponent(node.term)}` : "";
  const tag = href ? "a" : "span";
  const kind = (node.depth === 0 ? " is-root" : node.depth === 1 ? " is-major" : "") + (node.bar ? " is-bar" : "");
  const note = node.bar ? "" : node.note;
  return `
    <li class="tree-item${node.bar ? " is-bar-item" : ""}" style="${style}">
      <${tag} class="tree-node ${branch}${kind}" data-key="${node.key}"${href ? ` href="${href}"` : ""}${node.bar && node.note ? ` title="${escapeHtml(node.note)}"` : ""}>
        <span class="tree-node-name">${escapeHtml(node.label)}</span>
        ${note ? `<span class="tree-node-note">${escapeHtml(note)}</span>` : ""}
      </${tag}>
    </li>
  `;
}

// 石や枝に触れると、そこから根までの道筋を濃くする。石に触れたときは、その石と、石の入った房から根まで
function bindClusterHighlight(nodes) {
  const byKey = new Map(nodes.map((node) => [node.key, node]));
  const lit = [];

  const clear = () => {
    lit.splice(0).forEach((el) => el.classList.remove("is-lit"));
    treeCanvas.classList.remove("has-lit");
  };

  const light = (key, extra) => {
    clear();
    for (let node = byKey.get(key); node; node = node.parent) {
      treeCanvas.querySelectorAll(`[data-key="${node.key}"]`).forEach((el) => {
        el.classList.add("is-lit");
        lit.push(el);
      });
    }
    if (extra) {
      extra.classList.add("is-lit");
      lit.push(extra);
    }
    treeCanvas.classList.add("has-lit");
  };

  treeCanvas.querySelectorAll(".tree-node").forEach((el) => {
    el.addEventListener("pointerenter", () => light(el.dataset.key));
    el.addEventListener("pointerleave", clear);
    el.addEventListener("focus", () => light(el.dataset.key));
    el.addEventListener("blur", clear);
  });
  treeCanvas.querySelectorAll(".cluster-chip").forEach((el) => {
    el.addEventListener("pointerenter", () => light(el.dataset.cluster, el));
    el.addEventListener("pointerleave", clear);
    el.addEventListener("focus", () => light(el.dataset.cluster, el));
    el.addEventListener("blur", clear);
  });
}

// file:// で開くと fetch が使えないので、data/bundle.js の同じ内容に切り替える。
async function loadData(path, key) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`${key} fetch failed: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    if (window.ISHIHIROI_DATA?.[key]) {
      return window.ISHIHIROI_DATA[key];
    }
    throw error;
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
