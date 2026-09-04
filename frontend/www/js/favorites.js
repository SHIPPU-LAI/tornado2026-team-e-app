/* ===================================================================
   favorites.js — お気に入り画面
   タグごとの横スクロール表示、タグの追加・編集、作品詳細ポップアップ

   バックエンド（紹介チーム / features/introduce）の
     GET  /api/introduce/user/liked        いいねした一覧（要ログイン）
     POST /api/introduce/user/:id/like     いいねトグル（要ログイン）
   を使う。フロントと同じ Worker に同居しているため、同一オリジン。
=================================================================== */

(() => {
    "use strict";

    const API_BASE = window.location.origin;
    const SITE_BASE = window.SITE_BASE || "../";

    /* -----------------------------------------------------------
       0. データ（GET /api/introduce/user/liked から取得する）

       タグの並びは固定の分類ではなく、実際にいいねしたカードが
       持っているタグから作る（ジャンル選択画面の固定タグとは
       粒度が違うため。粒度合わせはフロント側の別課題）。
    ----------------------------------------------------------- */

    let likedCards = []; // 取得した「いいね」済みカード（そのままのカードオブジェクト）
    let TAG_LABELS = {}; // 実際に付いているタグから作る { タグ文字列: タグ文字列 }
    let activeTags = [];
    let isLoggedIn = false;

    function itemsForTag(tagKey) {
        return likedCards.filter((item) => (item.tags || []).includes(tagKey));
    }

    function paletteIndexFor(id) {
        const str = String(id);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
        }
        return (hash % 5) + 1;
    }

    // ジャンルアイコン（genre.js:372-381 と同じ対応表。共有モジュールの
    // 仕組みがこのリポジトリに無いため各ファイルに複製している。
    // 仕組みができたら一本化すべき）。home.js と同じ考え方。
    const GENRE_ICON_MAP = {
        陶磁器: "genre-icon-toujiki.png",
        漆器: "genre-icon-shikki.png",
        染物: "genre-icon-someomo.png",
        木工: "genre-icon-mokko.png",
        金工: "genre-icon-kinkou.png",
        ガラス: "genre-icon-garasu.png",
        和紙: "genre-icon-washi.png",
        竹工: "genre-icon-take.png",
        織物: "genre-icon-nuno.png",
        楽器: "genre-icon-gakki.png",
    };

    function hasRealImage(card) {
        return Boolean(card.image_url) || Boolean(card.images && card.images.length > 0);
    }

    // containerElが使い回しの要素（詳細モーダル等）の場合、前回分の
    // アイコンを先に消してから、必要なら新しいアイコンを重ねる。
    function applyGenreIcon(containerEl, card) {
        if (!containerEl) return;
        const prev = containerEl.querySelector(".card-genre-icon");
        if (prev) prev.remove();
        if (hasRealImage(card)) return;

        const tag = (card.tags || []).find((t) => GENRE_ICON_MAP[t]);
        if (!tag) return;

        containerEl.style.position = "relative";
        const icon = document.createElement("span");
        icon.className = "card-genre-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.style.position = "absolute";
        icon.style.inset = "0";
        icon.style.margin = "auto";
        icon.style.width = "50%";
        icon.style.height = "50%";
        icon.style.backgroundImage = `url('${window.SITE_BASE || "../"}images/${GENRE_ICON_MAP[tag]}')`;
        icon.style.backgroundSize = "contain";
        icon.style.backgroundRepeat = "no-repeat";
        icon.style.backgroundPosition = "center";
        icon.style.opacity = "0.55";
        icon.style.pointerEvents = "none";
        containerEl.appendChild(icon);
    }

    /* -----------------------------------------------------------
       1. 状態管理
    ----------------------------------------------------------- */

    const favMain = document.getElementById("fav-main");
    const addBtn = document.getElementById("fav-add-btn");

    const tagsheetOverlay = document.getElementById("fav-tagsheet-overlay");
    const tagsheetList = document.getElementById("fav-tagsheet-list");
    const tagsheetClose = document.getElementById("fav-tagsheet-close");

    /* -----------------------------------------------------------
       2. セクションの描画
    ----------------------------------------------------------- */

    function renderAllSections() {
        favMain.innerHTML = "";
        addBtn.hidden = false;

        if (!isLoggedIn) {
            favMain.innerHTML =
                '<p class="fav-empty">ログインすると、気になるに追加した工芸品がここに表示されます。' +
                '<br><a href="' + SITE_BASE + 'html/login.html" style="color:inherit;text-decoration:underline">ログイン画面へ</a></p>';
            addBtn.hidden = true;
            return;
        }

        if (likedCards.length === 0) {
            favMain.innerHTML = '<p class="fav-empty">まだ気になるに追加した工芸品がありません。</p>';
            addBtn.hidden = true;
            return;
        }

        if (activeTags.length === 0) {
            const empty = document.createElement("p");
            empty.className = "fav-empty";
            empty.textContent = "表示するタグがありません。下の「＋」から追加してください。";
            favMain.appendChild(empty);
            return;
        }

        activeTags.forEach((tagKey) => {
            favMain.appendChild(renderSection(tagKey));
        });
    }

    function renderSection(tagKey) {
        const items = itemsForTag(tagKey);

        const section = document.createElement("section");
        section.className = "fav-section";
        section.dataset.tag = tagKey;

        section.innerHTML = `
      <div class="fav-section-header">
        <div class="fav-section-title-wrap">
          <span class="fav-section-title">${TAG_LABELS[tagKey] || tagKey}</span>
          <span class="fav-section-count">${items.length} 品</span>
          <span class="fav-section-arrow">→</span>
        </div>
        <button class="fav-edit-btn" type="button">編集</button>
      </div>
      <div class="fav-row"></div>
    `;

        const row = section.querySelector(".fav-row");
        if (items.length === 0) {
            row.innerHTML = `<p class="fav-empty">お気に入りがまだありません</p>`;
        } else {
            items.forEach((item) => {
                row.appendChild(createItemButton(item, section));
            });
        }

        // 編集モードの切り替え
        const editBtn = section.querySelector(".fav-edit-btn");
        editBtn.addEventListener("click", () => {
            section.classList.toggle("is-editing");
            editBtn.classList.toggle("is-active");
        });

        return section;
    }

    function createItemButton(item, sectionEl) {
        const btn = document.createElement("button");
        btn.className = "fav-item";
        btn.type = "button";

        btn.innerHTML = `
      <span class="fav-item-image fav-item-image--${paletteIndexFor(item.id)}"></span>
      <button class="fav-item-remove" type="button" aria-label="お気に入りから削除">✕</button>
    `;

        applyGenreIcon(btn.querySelector(".fav-item-image"), item);

        // カード本体タップ → 詳細ポップアップ
        btn.addEventListener("click", (e) => {
            if (sectionEl.classList.contains("is-editing")) return; // 編集中はポップアップを開かない
            openDetailModal(item);
        });

        // ✕ボタン → お気に入りから削除（実際にAPIでいいねを外す）
        const removeBtn = btn.querySelector(".fav-item-remove");
        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            unlikeCard(item.id);
        });

        return btn;
    }

    /* -----------------------------------------------------------
       API：いいね一覧の取得／解除
    ----------------------------------------------------------- */

    async function loadLiked() {
        try {
            const likedUrl = new URL("/api/introduce/user/liked", API_BASE);
            const lang = window.getCraftsLang ? window.getCraftsLang() : "ja";
            if (lang !== "ja") likedUrl.searchParams.set("lang", lang);
            const res = await fetch(likedUrl, {
                credentials: "include",
            });
            if (res.status === 401) {
                isLoggedIn = false;
                likedCards = [];
                renderAllSections();
                return;
            }
            if (!res.ok) throw new Error(`いいね一覧の取得に失敗しました (status: ${res.status})`);
            const data = await res.json();
            isLoggedIn = true;
            likedCards = Array.isArray(data.items) ? data.items : [];

            // 実際に付いているタグからセクションを作る
            TAG_LABELS = {};
            likedCards.forEach((card) => {
                (card.tags || []).forEach((t) => {
                    TAG_LABELS[t] = t;
                });
            });
            activeTags = Object.keys(TAG_LABELS);

            renderAllSections();
        } catch (err) {
            console.error(err);
            favMain.innerHTML = '<p class="fav-empty">お気に入りの読み込みに失敗しました。時間をおいて再度お試しください。</p>';
            addBtn.hidden = true;
        }
    }

    async function unlikeCard(id) {
        try {
            const res = await fetch(new URL(`/api/introduce/user/${id}/like`, API_BASE), {
                method: "POST",
                credentials: "include",
            });
            if (res.status === 401) {
                alert("ログインが必要です。");
                return;
            }
            if (!res.ok) throw new Error(`いいねの解除に失敗しました (status: ${res.status})`);
            // このAPIはトグルなので、既にいいね済みのものを叩けば外れる想定
            likedCards = likedCards.filter((c) => c.id !== id);
            // タグの一覧も作り直す（外した結果、空になるセクションもあるため）
            TAG_LABELS = {};
            likedCards.forEach((card) => {
                (card.tags || []).forEach((t) => {
                    TAG_LABELS[t] = t;
                });
            });
            activeTags = activeTags.filter((t) => TAG_LABELS[t]);
            renderAllSections();
        } catch (err) {
            console.error(err);
            alert("お気に入りの解除に失敗しました。時間をおいて再度お試しください。");
        }
    }

    /* -----------------------------------------------------------
       3. タグ追加シート
    ----------------------------------------------------------- */

    function openTagSheet() {
        tagsheetList.innerHTML = "";

        Object.entries(TAG_LABELS).forEach(([key, label]) => {
            const isAdded = activeTags.includes(key);

            const li = document.createElement("li");
            const btn = document.createElement("button");
            btn.className = "fav-tagsheet-item" + (isAdded ? " is-added" : "");
            btn.type = "button";
            btn.innerHTML = `<span>${label}</span>${isAdded ? '<span class="fav-tagsheet-check">追加済み</span>' : ""}`;

            if (!isAdded) {
                btn.addEventListener("click", () => {
                    activeTags.push(key);
                    renderAllSections();
                    closeTagSheet();
                });
            }

            li.appendChild(btn);
            tagsheetList.appendChild(li);
        });

        tagsheetOverlay.classList.add("is-open");
        document.body.style.overflow = "hidden";
    }

    function closeTagSheet() {
        tagsheetOverlay.classList.remove("is-open");
        document.body.style.overflow = "";
    }

    addBtn.addEventListener("click", openTagSheet);
    tagsheetClose.addEventListener("click", closeTagSheet);
    tagsheetOverlay.addEventListener("click", (e) => {
        if (e.target === tagsheetOverlay) closeTagSheet();
    });

    /* -----------------------------------------------------------
       4. 作品詳細ポップアップ
    ----------------------------------------------------------- */

    const modalOverlay = document.getElementById("detail-modal-overlay");
    const modalCloseBtn = document.getElementById("modal-close-btn");
    const modalHeartBtn = document.getElementById("modal-heart-btn");

    let currentModalCard = null;

    function openDetailModal(item) {
        currentModalCard = item;

        const tags = item.tags && item.tags.length > 0 ? item.tags : [];

        document.getElementById("modal-tag").innerHTML = item.is_dummy
            ? '<span class="stat-badge">サンプル</span>' + (tags[0] || "工芸")
            : (tags[0] || "工芸");
        document.getElementById("modal-title").textContent = item.name;
        document.getElementById("modal-region").textContent = item.region || item.block || "";
        document.getElementById("modal-description").textContent =
            item.description || "この工芸品の詳しい説明は準備中です。";

        const modalImageEl = document.getElementById("modal-image");
        modalImageEl.style.backgroundImage = "";
        modalImageEl.className = `detail-modal-image fav-item-image--${paletteIndexFor(item.id)}`;
        applyGenreIcon(modalImageEl, item);

        const badges = [];
        if (item.block) badges.push(`<span class="stat-badge">${item.block}地方</span>`);
        if (tags.includes("体験できる")) badges.push('<span class="stat-badge">体験できる</span>');
        if (tags.includes("見学できる")) badges.push('<span class="stat-badge">見学できる</span>');
        if (tags.includes("実演")) badges.push('<span class="stat-badge">実演あり</span>');
        document.getElementById("modal-stats").innerHTML = badges.join("");

        document.getElementById("modal-tags").innerHTML = tags
            .map((tag) => `<span class="tag">${tag}</span>`)
            .join("");

        const craftsmanName = item.artisan_name || "担当職人";
        document.getElementById("modal-craftsman-name").innerHTML = item.is_dummy
            ? `<span class="stat-badge">サンプル</span>${craftsmanName}`
            : craftsmanName;
        document.getElementById("modal-craftsman-workshop").textContent =
            (item.address || item.region || "") + (item.region ? ` ／ ${item.region}` : "");

        // お気に入り画面から開く詳細は、既にお気に入り登録済みのため常に「liked」状態
        modalHeartBtn.classList.add("liked");

        modalOverlay.classList.add("is-open");
        document.body.style.overflow = "hidden";
    }

    function closeDetailModal() {
        modalOverlay.classList.remove("is-open");
        document.body.style.overflow = "";
    }

    modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) closeDetailModal();
    });
    modalCloseBtn.addEventListener("click", closeDetailModal);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (modalOverlay.classList.contains("is-open")) closeDetailModal();
            if (tagsheetOverlay.classList.contains("is-open")) closeTagSheet();
        }
    });

    // お気に入りハート：この画面に出ているものは常にいいね済みなので、
    // タップすると解除する（トグルAPIを叩いて外し、一覧から消す）
    modalHeartBtn.addEventListener("click", () => {
        if (!currentModalCard) return;
        unlikeCard(currentModalCard.id);
        closeDetailModal();
    });

    /* -----------------------------------------------------------
       初期化
    ----------------------------------------------------------- */

    loadLiked();
})();

// --- 2. ハンバーガーメニュー（ドロワー）の開閉設定 ---
const openMenuBtn = document.getElementById('openMenuBtn')
const closeMenuBtn = document.getElementById('closeMenuBtn')
const drawerMenu = document.getElementById('drawerMenu')
const menuOverlay = document.getElementById('menuOverlay')

// メニューを開く
if (openMenuBtn) {
    openMenuBtn.addEventListener('click', () => {
        drawerMenu?.classList.add('is-open')
        menuOverlay?.classList.add('is-visible')
        document.body.style.overflow = 'hidden' // 背景スクロールを防止
    })
}

// 閉じるボタンで閉じる
if (closeMenuBtn) {
    closeMenuBtn.addEventListener('click', () => {
        drawerMenu?.classList.remove('is-open')
        menuOverlay?.classList.remove('is-visible')
        document.body.style.overflow = '' // スクロール解除
    })
}

// 背景の黒幕クリックで閉じる
if (menuOverlay) {
    menuOverlay.addEventListener('click', () => {
        drawerMenu?.classList.remove('is-open')
        menuOverlay?.classList.remove('is-visible')
        document.body.style.overflow = '' // スクロール解除
    })
}
