// 分類マップ（石：rock-tree.html、地質：litho-tree.html）の木を描く共通の部品。
// 左の根から右へ枝分かれし、枝の先の中身（石や地質の系統）は横並びの房（.cluster）にまとめて折り返す。
//
// 木は次の2種類のもので組む。
//   枝 … { key, parent, label, note, term, stone, mineral, branch, children: [...] }
//         term / stone / mineral があれば、用語／石／鉱物のページへのリンクになる。branch は色分け（tree-branch-○○）
//   房 … { key, parent, cluster: true, branch, children: [] }
//         中身の <li> は、ページごとに clusterItems(node) で作る。触れたときに根までの道筋を濃くするので、
//         中身の触れる要素には data-cluster="房の key" を付けておく
//
// 位置は JS で計算して absolute で置き、枝の線は後ろの SVG に描く。房は折り返しで高さが変わるので、
// いったん上端に並べて高さを測ってから縦の位置を決める。横幅は枠いっぱいで、横スクロールはしない。

// 枝の箱の幅、箱と箱のあいだ、房どうしのあいだ、大枝の境目の間、上下の余白。
// 広い画面では枝の箱を広めにして、枝のひとことを1行に収める（1段の高さは枝の箱で決まるため）。
// 狭い画面では、根と大枝を縦書きの細い帯にして子の範囲いっぱいに伸ばし、横幅を画面に収める。
// そうしないと木が横にはみ出す
const TREE_SIZES = {
  wide: { node: 190, minNode: 100, minCluster: 300, gap: 30, rowGap: 6, groupGap: 14, pad: 10, bars: false },
  narrow: { node: 74, minNode: 50, minCluster: 150, bar: 28, gap: 10, rowGap: 8, groupGap: 16, pad: 10, bars: true }
};

const narrowQuery = window.matchMedia("(max-width: 640px)");
const treeScroll = document.querySelector("#treeScroll");
const treeCanvas = document.querySelector("#treeCanvas");

// 木を描いて、枠の幅や画面の広さが変わったら組み直す。返す関数を呼ぶと、同じ木を描き直す（房の中身を開いたときなど）。
// wide は広い画面の寸法の上書き（地質の分類マップは枝が深く房の中身も多いので、枝の箱を細くして房に幅を回す）。
// 同じ枠に別の木を描き直してもよい（石と鉱物の切り替え）。そのときは、組み直すのは最後に渡した木になる
let mountedTree = null;
let treeWatching = false;

function mountTree(root, clusterItems, { wide = {} } = {}) {
  mountedTree = { root, clusterItems, wide };
  if (!treeWatching) {
    treeWatching = true;
    narrowQuery.addEventListener("change", redrawMountedTree);
    let lastWidth = treeScroll.clientWidth;
    new ResizeObserver(() => {
      if (treeScroll.clientWidth !== lastWidth) {
        lastWidth = treeScroll.clientWidth;
        redrawMountedTree();
      }
    }).observe(treeScroll);
  }
  redrawMountedTree();
  return redrawMountedTree;
}

function redrawMountedTree() {
  if (mountedTree) {
    drawTree(mountedTree.root, mountedTree.clusterItems, mountedTree.wide);
  }
}

function drawTree(root, clusterItems, wide = {}) {
  const size = narrowQuery.matches ? TREE_SIZES.narrow : { ...TREE_SIZES.wide, ...wide };
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
  // いちばん深い房にも minCluster の幅が残るよう、足りなければ枝の箱を細くする（minNode まで）。
  // 房の手前には枝の列が deepest 本（うち帯が barColumns 本）と、あいだが deepest 個ある
  const deepest = Math.max(...nodes.filter((node) => node.cluster).map((node) => node.depth));
  const barColumns = size.bars ? Math.min(2, deepest) : 0;
  const nodeColumns = Math.max(1, deepest - barColumns);
  const room = width - size.minCluster - deepest * size.gap - (barColumns > 0 ? barColumns * size.bar : 0);
  const nodeWidth = Math.max(size.minNode, Math.min(size.node, Math.floor(room / nodeColumns)));
  nodes.forEach((node) => {
    node.left = node.parent ? node.parent.right + size.gap : 0;
    node.right = node.cluster ? width : node.left + (node.bar ? size.bar : nodeWidth);
  });

  // いったん横の位置だけで置いて、房（折り返しの段数で高さが変わる）と枝の箱の高さを測る
  treeCanvas.classList.remove("is-measured");
  treeCanvas.style.width = `${width}px`;
  treeCanvas.innerHTML = `<ul class="tree-list" role="list">${nodes.map((node) => treeNodeHtml(node, clusterItems)).join("")}</ul>`;
  const elements = new Map([...treeCanvas.querySelectorAll(".tree-node, .cluster")].map((el) => [el.dataset.key, el]));
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
    // 帯からは、子の高さでまっすぐ横に出す
    if (parent.bar) {
      return `<path class="${cls}" data-key="${node.key}" d="M${parent.right} ${node.y} H${node.left}"/>`;
    }
    // 親の右端から少し右へ → 縦に子の高さまで → 子の左端まで横へ。曲がり角は少し丸める
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

  bindTreeHighlight(nodes);
}

function treeNodeHtml(node, clusterItems) {
  const branch = `tree-branch-${node.branch || "root"}`;
  const style = node.bar
    ? `left:${node.left}px;width:${node.right - node.left}px`
    : `left:${node.left}px;top:0;width:${node.right - node.left}px`;

  if (node.cluster) {
    return `
      <li class="tree-item is-cluster-item" style="${style}">
        <ul class="cluster ${branch}" data-key="${node.key}" role="list">${clusterItems(node)}</ul>
      </li>
    `;
  }

  const href = node.stone
    ? `stone.html?id=${encodeURIComponent(node.stone)}`
    : node.mineral
      ? `mineral.html?id=${encodeURIComponent(node.mineral)}`
      : node.term ? `term.html?id=${encodeURIComponent(node.term)}` : "";
  const tag = href ? "a" : "span";
  const kind = (node.depth === 0 ? " is-root" : node.depth === 1 ? " is-major" : "") + (node.bar ? " is-bar" : "");
  // 帯は縦書きで細いので、ひとことは title に回す
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

// 枝や房の中身に触れると、そこから根までの道筋を濃くする。房の中身なら、触れたものと、その房から根まで
function bindTreeHighlight(nodes) {
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

  const bind = (el, key) => {
    el.addEventListener("pointerenter", () => light(key, el.classList.contains("tree-node") ? null : el));
    el.addEventListener("pointerleave", clear);
    el.addEventListener("focus", () => light(key, el.classList.contains("tree-node") ? null : el));
    el.addEventListener("blur", clear);
  };
  treeCanvas.querySelectorAll(".tree-node").forEach((el) => bind(el, el.dataset.key));
  treeCanvas.querySelectorAll("[data-cluster]").forEach((el) => bind(el, el.dataset.cluster));
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
