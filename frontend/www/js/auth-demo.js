// ===================================================================
// auth-demo.js
// ハンバーガーメニュー上部の表示を、ログイン状態に応じて
// 「ホーム／ログイン／初めての方へ」⇔「ホーム／お気に入り／
// （職人の場合のみ：工芸品を登録する）／プロフィール／ログアウト」に切り替える。
//
// ログイン状態そのものは login.js（実際のバックエンドAPI）が
// localStorage の craftsMatchingIsLoggedIn フラグ・craftsMatchingRole
// （職人／一般の別）を更新する。このスクリプトはそれを読んで
// 見た目を出し分けるだけ。
//
// 前提：各HTMLで、このスクリプトを読み込む直前に
//   <script>window.SITE_BASE = '../';</script>
// のように、ルートからの相対パス（'../' や './'）を指定しておくこと。
// ===================================================================

(() => {
    "use strict";

    const STORAGE_KEY = "craftsMatchingIsLoggedIn";
    const ROLE_KEY = "craftsMatchingRole"; // login.js が保存する「artisan」または「user」
    const API_BASE = "https://noren.zzjjnn2005.workers.dev";
    const BASE = window.SITE_BASE || "../";

    function isLoggedIn() {
        return localStorage.getItem(STORAGE_KEY) === "true";
    }

    function isArtisan() {
        return localStorage.getItem(ROLE_KEY) === "artisan";
    }

    function loggedOutNavHTML() {
        return `
      <li>
        <a href="${BASE}html/home.html" class="drawer-nav-item">
          <img src="${BASE}images/home.png" alt="">
          <span>ホーム</span>
        </a>
      </li>
      <li>
        <a href="${BASE}html/login.html" class="drawer-nav-item">
          <img src="${BASE}images/login.png" alt="">
          <span>ログイン</span>
        </a>
      </li>
      <li>
        <a href="${BASE}html/newuser.html" class="drawer-nav-item">
          <img src="${BASE}images/newuser.png" alt="">
          <span>初めてご利用の方へ</span>
        </a>
      </li>
    `;
    }

    function loggedInNavHTML() {
        // 職人アカウントでログインしているときだけ「工芸品を登録する」を追加する
        const registerItemHTML = isArtisan()
            ? `
      <li>
        <a href="${BASE}html/register.html" class="drawer-nav-item">
          <span class="drawer-nav-icon" aria-hidden="true">＋</span>
          <span>工芸品を登録する</span>
        </a>
      </li>`
            : "";

        return `
      <li>
        <a href="${BASE}html/home.html" class="drawer-nav-item">
          <img src="${BASE}images/home.png" alt="">
          <span>ホーム</span>
        </a>
      </li>
      <li>
        <a href="${BASE}html/favorites.html" class="drawer-nav-item">
          <img src="${BASE}images/Grocery Shelf.png" alt="">
          <span>お気に入り</span>
        </a>
      </li>
      ${registerItemHTML}
      <li>
        <a href="${BASE}html/profile.html" class="drawer-nav-item">
          <img src="${BASE}images/profile.svg" alt="">
          <span>プロフィール</span>
        </a>
      </li>
      <li>
        <a href="#" class="drawer-nav-item" id="logoutBtnDemo">
          <img src="${BASE}images/logout.svg" alt="">
          <span>ログアウト</span>
        </a>
      </li>
    `;
    }

    function renderNav() {
        const listEl = document.getElementById("drawerNavList");
        if (!listEl) return;

        listEl.innerHTML = isLoggedIn() ? loggedInNavHTML() : loggedOutNavHTML();

        const logoutBtn = document.getElementById("logoutBtnDemo");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", async (e) => {
                e.preventDefault();
                // 本物のセッションも終了させる（Cookieの削除はサーバー側が行う）
                try {
                    await fetch(new URL("/api/auth/logout", API_BASE), {
                        method: "POST",
                        credentials: "include",
                    });
                } catch (err) {
                    console.error("ログアウトAPIの呼び出しに失敗しました", err);
                }
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(ROLE_KEY);
                renderNav();
            });
        }
    }

    document.addEventListener("DOMContentLoaded", renderNav);
})();