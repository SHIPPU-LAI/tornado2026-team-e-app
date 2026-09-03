// ===================================================================
// font-size.js
// ハンバーガーメニュー内「文字の大きさ」から開く、サイト全体の
// 文字サイズ設定ポップアップ。選んだ大きさは localStorage に保存され、
// 他のページに移動しても引き継がれる。
//
// 使い方（各HTMLページ側での準備）:
//   1. 「文字の大きさ」の <a> タグに id="fontSizeBtn" を付ける
//   2. </body> の直前あたりに、以下のポップアップ用HTMLを追加する
//      （drawer-menu や menu-overlay と同じ階層でよい）
//
//      <div class="fontsize-modal-overlay" id="fontsizeModalOverlay">
//        <div class="fontsize-modal" role="dialog" aria-modal="true">
//          <div class="fontsize-modal-header">
//            <h2>文字の大きさ</h2>
//            <button class="fontsize-modal-close" id="fontsizeModalClose" aria-label="閉じる">✕</button>
//          </div>
//          <div class="fontsize-option-list" id="fontsizeOptionList"></div>
//        </div>
//      </div>
//
//   3. <script src="../js/font-size.js"></script> を読み込む
// ===================================================================

(() => {
  "use strict";

  const STORAGE_KEY = "craftsMatchingFontScale";

  // 文字の大きさの選択肢（scaleは <html> の font-size に対するパーセント）
  const SIZE_OPTIONS = [
    { scale: 100, label: "標準" },
    { scale: 115, label: "大きい" },
    { scale: 130, label: "もっと大きい" },
    { scale: 150, label: "特大" },
  ];

  function getSavedScale() {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    const match = SIZE_OPTIONS.find((opt) => opt.scale === saved);
    return match ? match.scale : 100;
  }

  function applyScale(scale) {
    document.documentElement.style.fontSize = scale + "%";
  }

  // ページを開いた瞬間に、保存済みの設定をすぐ反映する
  // （DOMContentLoadedを待たずに実行してよい：documentElementは常に存在する）
  applyScale(getSavedScale());

  document.addEventListener("DOMContentLoaded", () => {
    const openBtn = document.getElementById("fontSizeBtn");
    const overlay = document.getElementById("fontsizeModalOverlay");

    // このページにポップアップ用のHTMLが無ければ、文字サイズの反映だけ行って終了する
    if (!openBtn || !overlay) return;

    const closeBtn = document.getElementById("fontsizeModalClose");
    const optionListEl = document.getElementById("fontsizeOptionList");

    function renderOptions() {
      const active = getSavedScale();
      optionListEl.innerHTML = "";

      SIZE_OPTIONS.forEach((opt) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className =
          "fontsize-option-btn" + (opt.scale === active ? " is-selected" : "");

        // プレビュー文字「あ」自体の大きさも、選択肢に合わせて変える
        const previewSize = (1.1 * (opt.scale / 100)).toFixed(2);

        btn.innerHTML = `
          <span class="fontsize-preview" style="font-size:${previewSize}rem">あ</span>
          <span class="fontsize-label">${opt.label}</span>
          <span class="fontsize-check"></span>
        `;

        btn.addEventListener("click", () => {
          localStorage.setItem(STORAGE_KEY, String(opt.scale));
          applyScale(opt.scale);
          renderOptions();
        });

        optionListEl.appendChild(btn);
      });
    }

    function openModal() {
      renderOptions();
      overlay.classList.add("is-open");
      document.body.style.overflow = "hidden";
    }

    function closeModal() {
      overlay.classList.remove("is-open");
      document.body.style.overflow = "";
    }

    openBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openModal();
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", closeModal);
    }

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) {
        closeModal();
      }
    });
  });
})();