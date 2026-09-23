// 右上のメニュー。押すと右から引き出し（ドロワー）が出る。
// 背景を押す・Esc・もう一度ボタンを押す、のどれでも閉じる。
// 閉じているあいだは inert にして、タブ移動でも触れないようにする。
//
// **項目はここ（MENU_ITEMS）1つで持ち、ボタンと引き出しは JS が組み立てて body に足す。**
// 地図画面だけでなく、分類マップや用語集からもメニューを出すので、HTML に書くとページの数だけ写しができて必ずずれる。
// いま開いているページの項目は、押しても同じページなので aria-current を付けて薄くする。
//
// **ボタンは body 直下に置く（ヘッダーの中に入れない）。** ヘッダーの中に入れるとヘッダーが重なり順の入れ物になり、
// ボタンだけを引き出し（z-index 2000）より前に出せない。前に出せないと、開いたときにボタンが引き出しの下に隠れる。
const MENU_ITEMS = [
  { href: "index.html", title: "地図", note: "地点を選んで、拾えそうな石を見る" },
  { href: "glossary.html", title: "用語集", note: "石・鉱物・地質の言葉をさがす" },
  { href: "rock-tree.html", title: "石と鉱物の分類マップ", note: "石と鉱物の仲間分けを、枝分かれでたどる" },
  { href: "litho-tree.html", title: "地質の分類マップ", note: "地質図の610種類の地質を、枝分かれでたどる" }
];

(() => {
  const here = window.location.pathname.split("/").pop() || "index.html";
  const arrow = `<svg class="app-menu-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>`;
  const items = MENU_ITEMS.map(({ href, title, note }) => `
    <a class="app-menu-item" href="${href}"${href === here ? ` aria-current="page"` : ""}>
      <span class="app-menu-item-text">
        <span class="app-menu-title">${title}</span>
        <span class="app-menu-note">${note}</span>
      </span>
      ${arrow}
    </a>
  `).join("");

  document.body.insertAdjacentHTML("beforeend", `
    <div class="app-menu">
      <button id="menuButton" class="menu-button" type="button" aria-label="メニューを開く" aria-expanded="false" aria-controls="appMenu">
        <span class="menu-bars" aria-hidden="true"><i></i><i></i><i></i></span>
      </button>
    </div>
    <div id="menuBackdrop" class="app-menu-backdrop"></div>
    <nav id="appMenu" class="app-menu-drawer" aria-label="メニュー">${items}</nav>
  `);

  const button = document.querySelector("#menuButton");
  const drawer = document.querySelector("#appMenu");
  const backdrop = document.querySelector("#menuBackdrop");

  const setOpen = (open) => {
    document.body.classList.toggle("menu-open", open);
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
    drawer.inert = !open;
    if (open) {
      // 出てくる途中（visibility: hidden）の要素にはフォーカスが当たらないので、開ききってから
      drawer.addEventListener("transitionend", () => drawer.querySelector("a, button")?.focus(), { once: true });
    }
  };

  setOpen(false);

  button.addEventListener("click", () => {
    setOpen(!document.body.classList.contains("menu-open"));
  });

  backdrop.addEventListener("click", () => setOpen(false));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("menu-open")) {
      setOpen(false);
      button.focus();
    }
  });
})();
