/* ===================================================================
   favorites.js — お気に入り画面
   タグごとの横スクロール表示、タグの追加・編集、作品詳細ポップアップ
=================================================================== */

(() => {
    "use strict";

    /* -----------------------------------------------------------
       0. データ（本来はAPI等から取得する想定のサンプル）
    ----------------------------------------------------------- */

    // ジャンル選択画面と共通のタグ一覧
    const TAG_LABELS = {
        toujiki: "陶磁器",
        shikki: "漆器",
        senshoku: "染織",
        mokkou: "木工",
        kinkou: "金工",
        garasu: "ガラス",
        washi: "和紙",
        take: "竹細工",
        ningyou: "人形",
        hamono: "刃物",
        someomo: "染物",
        nuno: "織物",
    };

    const FAVORITE_ITEMS = [
        {
            id: 1, tag: "garasu", name: "江戸切子 グラス", region: "東京都", imagePalette: 4,
            description: "色を被せたガラスに刃を当てて模様を彫り出す切子細工です。光の入り方によって表情を変える文様が魅力です。",
            tags: ["伝統工芸品指定", "光を纏うガラス細工"],
            stats: { likes: 112, craftsmen: 2, duration: "約2週間" },
            craftsmanName: "小林 硝子", craftsmanWorkshop: "小林切子工房"
        },
        {
            id: 2, tag: "garasu", name: "琉球ガラス コップ", region: "沖縄県", imagePalette: 2,
            description: "気泡や厚みのある独特の風合いが特徴のガラス工芸です。沖縄の光を受けて涼やかにきらめきます。",
            tags: ["伝統工芸品指定", "気泡の風合い"],
            stats: { likes: 88, craftsmen: 4, duration: "約1週間" },
            craftsmanName: "上原 瑠璃", craftsmanWorkshop: "琉球ガラス工房 上原"
        },
        {
            id: 3, tag: "garasu", name: "津軽びいどろ 花瓶", region: "青森県", imagePalette: 4,
            description: "色とりどりのガラスを幾重にも重ねて模様を作る技法です。四季を映すような色合いが人気です。",
            tags: ["伝統工芸品指定", "重ねガラス"],
            stats: { likes: 76, craftsmen: 3, duration: "約10日" },
            craftsmanName: "田中 硝子", craftsmanWorkshop: "北洋硝子"
        },
        {
            id: 4, tag: "garasu", name: "江戸硝子 風鈴", region: "東京都", imagePalette: 2,
            description: "宙吹きで一つ一つ手作りされる風鈴です。夏の涼を運ぶ、澄んだ音色が特徴です。",
            tags: ["伝統工芸品指定", "宙吹き"],
            stats: { likes: 64, craftsmen: 2, duration: "約3日" },
            craftsmanName: "山本 涼", craftsmanWorkshop: "山本硝子店"
        },
        {
            id: 5, tag: "garasu", name: "薩摩切子 タンブラー", region: "鹿児島県", imagePalette: 3,
            description: "色ガラスと透明ガラスの層を活かし、ぼかしのようなグラデーションを生み出すのが特徴です。",
            tags: ["伝統工芸品指定", "ぼかしの色合い"],
            stats: { likes: 95, craftsmen: 3, duration: "約2週間" },
            craftsmanName: "村田 薩摩", craftsmanWorkshop: "薩摩切子 村田工房"
        },

        {
            id: 6, tag: "kinkou", name: "南部鉄器 鉄瓶", region: "岩手県", imagePalette: 1,
            description: "砂と粘土を混ぜた鋳型に鉄を流し込んでかたちづくる伝統的な鋳物です。",
            tags: ["伝統工芸品指定", "経年変化を楽しむ"],
            stats: { likes: 128, craftsmen: 3, duration: "約3週間" },
            craftsmanName: "佐藤 一輝", craftsmanWorkshop: "江刺鋳造工房"
        },
        {
            id: 7, tag: "kinkou", name: "高岡銅器 花瓶", region: "富山県", imagePalette: 5,
            description: "銅を主体とした鋳物の産地として知られ、繊細な彫金が施されるのが特徴です。",
            tags: ["伝統工芸品指定", "彫金細工"],
            stats: { likes: 70, craftsmen: 2, duration: "約1ヶ月" },
            craftsmanName: "高岡 銅一", craftsmanWorkshop: "高岡銅器 工房"
        },

        {
            id: 8, tag: "shikki", name: "輪島塗 汁椀", region: "石川県", imagePalette: 1,
            description: "幾重にも漆を塗り重ね、研ぎ出す工程を繰り返す堅牢な漆器です。",
            tags: ["伝統工芸品指定", "堅牢な塗り"],
            stats: { likes: 101, craftsmen: 5, duration: "約半年" },
            craftsmanName: "輪島 塗", craftsmanWorkshop: "輪島塗 工房"
        },

        {
            id: 9, tag: "toujiki", name: "有田焼 染付皿", region: "佐賀県", imagePalette: 2,
            description: "透き通るように白い磁肌に呉須で絵付けをした焼き物です。",
            tags: ["伝統工芸品指定", "手描き絵付け"],
            stats: { likes: 96, craftsmen: 5, duration: "約1ヶ月" },
            craftsmanName: "中村 陶子", craftsmanWorkshop: "有田窯元 中村工房"
        },
        {
            id: 10, tag: "toujiki", name: "美濃焼 ぐい呑み", region: "岐阜県", imagePalette: 3,
            description: "多様な釉薬と焼き方が特徴で、日常使いにも馴染む器が多く作られています。",
            tags: ["伝統工芸品指定", "多彩な釉薬"],
            stats: { likes: 58, craftsmen: 6, duration: "約2週間" },
            craftsmanName: "美濃 陶山", craftsmanWorkshop: "美濃焼 陶山窯"
        },
    ];

    function itemsForTag(tagKey) {
        return FAVORITE_ITEMS.filter((item) => item.tag === tagKey);
    }

    /* -----------------------------------------------------------
       1. 状態管理
    ----------------------------------------------------------- */

    // 初期表示のタグ（添付イメージに合わせて「ガラス」のみ表示）
    let activeTags = ["garasu"];

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
      <span class="fav-item-image fav-item-image--${item.imagePalette}"></span>
      <button class="fav-item-remove" type="button" aria-label="お気に入りから削除">✕</button>
    `;

        // カード本体タップ → 詳細ポップアップ
        btn.addEventListener("click", (e) => {
            if (sectionEl.classList.contains("is-editing")) return; // 編集中はポップアップを開かない
            openDetailModal(item);
        });

        // ✕ボタン → お気に入りから削除
        const removeBtn = btn.querySelector(".fav-item-remove");
        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const index = FAVORITE_ITEMS.findIndex((i) => i.id === item.id);
            if (index !== -1) FAVORITE_ITEMS.splice(index, 1);
            renderAllSections(); // 件数表示も含め再描画
        });

        return btn;
    }

    renderAllSections();

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
       4. 作品詳細ポップアップ（card-modal.jsと同じ構造）
    ----------------------------------------------------------- */

    const modalOverlay = document.getElementById("detail-modal-overlay");
    const modalCloseBtn = document.getElementById("modal-close-btn");
    const modalHeartBtn = document.getElementById("modal-heart-btn");

    function openDetailModal(item) {
        document.getElementById("modal-tag").textContent = TAG_LABELS[item.tag] || item.tag;
        document.getElementById("modal-title").textContent = item.name;
        document.getElementById("modal-region").textContent = item.region;
        document.getElementById("modal-description").textContent = item.description;

        const modalImageEl = document.getElementById("modal-image");
        modalImageEl.className = `detail-modal-image fav-item-image--${item.imagePalette}`;

        document.getElementById("modal-stats").innerHTML = `
      <span class="stat-badge"><strong>${item.stats.likes}</strong> 人が気になる</span>
      <span class="stat-badge">職人 <strong>${item.stats.craftsmen}</strong> 名在籍</span>
      <span class="stat-badge">制作期間 <strong>${item.stats.duration}</strong></span>
    `;

        document.getElementById("modal-tags").innerHTML = item.tags
            .map((tag) => `<span class="tag">${tag}</span>`)
            .join("");

        document.getElementById("modal-craftsman-name").textContent = item.craftsmanName;
        document.getElementById("modal-craftsman-workshop").textContent =
            `${item.craftsmanWorkshop} ／ ${item.region}`;

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

    // お気に入りハート（詳細ポップアップ内）：タップでお気に入り解除も可能に
    modalHeartBtn.addEventListener("click", () => {
        modalHeartBtn.classList.toggle("liked");
    });
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

