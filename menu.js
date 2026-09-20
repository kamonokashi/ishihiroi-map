// 地図画面の右上のメニュー。押すと右から引き出しが出る。
// 背景を押す・Esc・もう一度ボタンを押す、のどれでも閉じる。
// 閉じているあいだは inert にして、タブ移動でも触れないようにする。
(() => {
  const button = document.querySelector("#menuButton");
  const drawer = document.querySelector("#appMenu");
  const backdrop = document.querySelector("#menuBackdrop");
  if (!button || !drawer || !backdrop) {
    return;
  }

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
