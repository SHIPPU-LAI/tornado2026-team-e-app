// ===================================================================
// auth-demo.js
// ハンバーガーメニュー上部の表示を、ログイン状態に応じて
// 「ホーム／ログイン／初めての方へ」⇔「ホーム／お気に入り／
// プロフィール／ログアウト」に切り替える。
//
// ログイン状態そのものは login.js（実際のバックエンドAPI）が
// localStorage の craftsMatchingIsLoggedIn フラグを更新する。
// このスクリプトはそのフラグを読んで見た目を出し分けるだけ。
//
// 前提：各HTMLで、このスクリプトを読み込む直前に
//   <script>window.SITE_BASE = '../';</script>
// のように、ルートからの相対パス（'../' や './'）を指定しておくこと。
// ===================================================================

(() => {
    "use strict";

    const STORAGE_KEY = "craftsMatchingIsLoggedIn";
    const API_BASE = window.location.origin;
    const BASE = window.SITE_BASE || "../";

    function isLoggedIn() {
        return localStorage.getItem(STORAGE_KEY) === "true";
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

    // 「プロフィール」の項目は、遷移先のページ自体が無く、出す内容も
    // 未決のためいったん外してある。画面ができたら<li>を戻すだけで復活する
    // （images/profileicon.pngは残してあるので削除しないこと）。
    function loggedInNavHTML() {
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
      <li>
        <a href="#" class="drawer-nav-item" id="logoutBtnDemo">
          <span class="drawer-nav-icon" aria-hidden="true">🚪</span>
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
                renderNav();
            });
        }
    }

    document.addEventListener("DOMContentLoaded", renderNav);
})();