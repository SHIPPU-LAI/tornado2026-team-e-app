// ===================================================================
// language.js
// ハンバーガーメニュー内「言語設定」から開く、カードの表示言語の
// 切り替えポップアップ。選んだ言語は localStorage に保存され、
// 他のページに移動しても引き継がれる。
//
// バックエンド（features/search, features/introduce）の各API は
// ?lang=en を付けると card_i18n(lang='en') があれば差し替えて返す
// （その場翻訳はしない。英訳が無ければ日本語のまま）。
// 選択肢が日本語／Englishの2つだけなのは、card_i18nがenしか
// 持っていないため（このアプリの仕様そのまま。UIの文言は英語化しない）。
//
// 使い方（各HTMLページ側での準備。font-size.jsと同じ構造）:
//   1. 「言語設定」の <a> タグに id="languageBtn" を付ける
//   2. </body> の直前あたりに、以下のポップアップ用HTMLを追加する
//
//      <div class="language-modal-overlay" id="languageModalOverlay">
//        <div class="language-modal" role="dialog" aria-modal="true">
//          <div class="language-modal-header">
//            <h2>言語設定</h2>
//            <button class="language-modal-close" id="languageModalClose" aria-label="閉じる">✕</button>
//          </div>
//          <div class="language-option-list" id="languageOptionList"></div>
//        </div>
//      </div>
//
//   3. <script src="../js/language.js"></script> を、APIを叩く他のJSより
//      先に読み込む（window.getCraftsLang() を使えるようにするため）
// ===================================================================

(() => {
  "use strict";

  const STORAGE_KEY = "craftsMatchingLang";

  // 選択肢はja/enの2つだけ（card_i18nがenしか持っていないため）
  const LANG_OPTIONS = [
    { code: "ja", label: "日本語", flag: "🇯🇵" },
    { code: "en", label: "English", flag: "🇺🇸" },
  ];

  function getSavedLang() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const match = LANG_OPTIONS.find((opt) => opt.code === saved);
    return match ? match.code : "ja";
  }

  // 他のJSが「今の表示言語」を読むための公開関数
  window.getCraftsLang = getSavedLang;

  document.addEventListener("DOMContentLoaded", () => {
    const openBtn = document.getElementById("languageBtn");
    const overlay = document.getElementById("languageModalOverlay");

    // このページにポップアップ用のHTMLが無ければ何もせず終了する
    if (!openBtn || !overlay) return;

    const closeBtn = document.getElementById("languageModalClose");
    const optionListEl = document.getElementById("languageOptionList");

    function renderOptions() {
      const active = getSavedLang();
      optionListEl.innerHTML = "";

      LANG_OPTIONS.forEach((opt) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className =
          "language-option-btn" + (opt.code === active ? " is-selected" : "");

        btn.innerHTML = `
          <span class="language-flag">${opt.flag}</span>
          <span class="language-label">${opt.label}</span>
          <span class="language-check">${opt.code === active ? "✓" : ""}</span>
        `;

        btn.addEventListener("click", () => {
          if (opt.code === active) return;
          localStorage.setItem(STORAGE_KEY, opt.code);
          // 各画面ごとに再取得処理を書き足さずに済むよう、reloadで反映する
          location.reload();
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
