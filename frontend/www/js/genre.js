/* ===================================================================
   genre.js — のれん演出（揺れ・強風・上下しなり・開く・ズーム）＋
              ジャンル選択のインタラクション
=================================================================== */

(() => {
  "use strict";

  const genreShell = document.getElementById("genre-shell");
  const norenLayer = document.getElementById("noren-layer");
  const scene = document.getElementById("genre-scene");
  const omakaseBtn = document.getElementById("omakase-btn");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* -----------------------------------------------------------
     0. 境目をまたぐ円の位置合わせ（実測してピクセル単位で補正）
  ----------------------------------------------------------- */

  const leafLeft = document.getElementById("leaf-left");
  const leafLeftUpper = document.getElementById("leaf-left-upper");
  const leafLeftLower = document.getElementById("leaf-left-lower");

  // PC版（幅1024px以上）でだけ表示される追加パネル。
  // スマホ版はCSS側でdisplay:noneのため、常にDOMに存在していても
  // アニメーションのコストはごくわずか（見た目に影響しない）。
  const leafMidLeft = document.getElementById("leaf-mid-left");
  const leafMidLeftUpper = document.getElementById("leaf-mid-left-upper");
  const leafMidLeftLower = document.getElementById("leaf-mid-left-lower");

  const leafCenter = document.getElementById("leaf-center");
  const leafCenterUpper = document.getElementById("leaf-center-upper");
  const leafCenterLower = document.getElementById("leaf-center-lower");

  const leafMidRight = document.getElementById("leaf-mid-right");
  const leafMidRightUpper = document.getElementById("leaf-mid-right-upper");
  const leafMidRightLower = document.getElementById("leaf-mid-right-lower");

  const leafRight = document.getElementById("leaf-right");
  const leafRightUpper = document.getElementById("leaf-right-upper");
  const leafRightLower = document.getElementById("leaf-right-lower");

  function alignSeamCircle(upperEl, upperSelector, lowerEl, lowerSelector) {
    const upperCircle = upperEl.querySelector(upperSelector);
    const lowerCircle = lowerEl.querySelector(lowerSelector);
    if (!upperCircle || !lowerCircle) return;

    const circleSize = upperCircle.offsetHeight;
    const upperHeight = upperEl.offsetHeight;
    const circleTop = upperCircle.offsetTop;

    const visibleInUpper = upperHeight - circleTop;
    const remaining = circleSize - visibleInUpper;

    lowerCircle.style.top = `${-remaining}px`;
  }

  function alignAllSeamCircles() {
    alignSeamCircle(
      leafCenterUpper, ".noren-pattern--seamB-left",
      leafCenterLower, ".noren-pattern--seamB-left-lower"
    );
    alignSeamCircle(
      leafRightUpper, ".noren-pattern--seamB-right",
      leafRightLower, ".noren-pattern--seamB-right-lower"
    );
  }

  /* -----------------------------------------------------------
     1. のれんの揺れ（rAFで毎フレーム計算）
        全体の傾きはrotateで外枠に、しなりはskewXのみでupper/lowerに。
        断面が見えないよう、skewXの角度はごく小さく抑えている。
        ＋ ときどき強風
  ----------------------------------------------------------- */

  const LEAVES = [
    { outerEl: leafLeft, upperEl: leafLeftUpper, lowerEl: leafLeftLower, delayMs: 0, swayRight: 1.0, swayLeft: 6, skewRight: -3, skewLeft: 6 },
    { outerEl: leafMidLeft, upperEl: leafMidLeftUpper, lowerEl: leafMidLeftLower, delayMs: 80, swayRight: 0.8, swayLeft: 4.8, skewRight: -2, skewLeft: 4.6 },
    { outerEl: leafCenter, upperEl: leafCenterUpper, lowerEl: leafCenterLower, delayMs: 160, swayRight: 0.5, swayLeft: 3.6, skewRight: -1.5, skewLeft: 3.5 },
    { outerEl: leafMidRight, upperEl: leafMidRightUpper, lowerEl: leafMidRightLower, delayMs: 200, swayRight: 1.6, swayLeft: 4.2, skewRight: -2, skewLeft: 4 },
    { outerEl: leafRight, upperEl: leafRightUpper, lowerEl: leafRightLower, delayMs: 240, swayRight: 2.4, swayLeft: 4.5, skewRight: -2.5, skewLeft: 4.5 },
  ];

  const DURATION_MS = 2400;
  const TURN_POINT = 0.65;
  const LOWER_LAG_MS = 80;

  function easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  function swayFactor(phase) {
    if (phase < TURN_POINT) {
      return easeInOutSine(phase / TURN_POINT);
    }
    return 1 - easeInOutSine((phase - TURN_POINT) / (1 - TURN_POINT));
  }

  function swayValues(now, delayMs, swayRight, swayLeft, skewRight, skewLeft, gust) {
    const t = (now - delayMs) % DURATION_MS;
    const phase = ((t / DURATION_MS) + 1) % 1;
    const f = swayFactor(phase);
    const rotate = (-swayRight + (swayLeft - -swayRight) * f) * gust;
    const skew = (skewRight + (skewLeft - skewRight) * f) * gust;
    return { rotate, skew };
  }

  const GUST_PEAK = 1.7;
  const GUST_RAMP_MS = 350;
  const GUST_HOLD_MS = 450;
  const GUST_MIN_INTERVAL_MS = 4000;
  const GUST_MAX_INTERVAL_MS = 10000;

  let gustStartTime = null;

  function scheduleNextGust(now) {
    const wait =
      GUST_MIN_INTERVAL_MS + Math.random() * (GUST_MAX_INTERVAL_MS - GUST_MIN_INTERVAL_MS);
    gustStartTime = now + wait;
  }

  function easeOutSine(t) { return Math.sin((t * Math.PI) / 2); }
  function easeInSine(t) { return 1 - Math.cos((t * Math.PI) / 2); }

  function getGustMultiplier(now) {
    if (gustStartTime === null) return 1;
    const elapsed = now - gustStartTime;
    const totalMs = GUST_RAMP_MS * 2 + GUST_HOLD_MS;

    if (elapsed < 0) return 1;
    if (elapsed > totalMs) {
      scheduleNextGust(now);
      return 1;
    }
    if (elapsed < GUST_RAMP_MS) {
      const t = elapsed / GUST_RAMP_MS;
      return 1 + (GUST_PEAK - 1) * easeOutSine(t);
    }
    if (elapsed < GUST_RAMP_MS + GUST_HOLD_MS) {
      return GUST_PEAK;
    }
    const t = (elapsed - GUST_RAMP_MS - GUST_HOLD_MS) / GUST_RAMP_MS;
    return GUST_PEAK - (GUST_PEAK - 1) * easeInSine(t);
  }

  let isOpening = false;

  function tick(now) {
    if (isOpening) return;

    if (gustStartTime === null) scheduleNextGust(now);
    const gust = getGustMultiplier(now);

    for (const leaf of LEAVES) {
      const mainVals = swayValues(now, leaf.delayMs, leaf.swayRight, leaf.swayLeft, leaf.skewRight, leaf.skewLeft, gust);
      leaf.outerEl.style.transform = `rotate(${mainVals.rotate}deg)`;

      // upperはほぼ動かさない
      leaf.upperEl.style.transform = `skewX(${mainVals.skew * 0.06}deg)`;

      // lowerも断面が見えない範囲まで角度を抑える
      const lowerVals = swayValues(now, leaf.delayMs + LOWER_LAG_MS, leaf.swayRight, leaf.swayLeft, leaf.skewRight, leaf.skewLeft, gust);
      const lowerSkew = lowerVals.skew * 0.4;

      // 傾きの絶対値が大きいほど、ほんの少し縦に伸びる（1.0〜1.03倍程度）
      const stretch = 1 + Math.abs(lowerSkew) * 0.006;

      leaf.lowerEl.style.transform = `skewX(${lowerSkew}deg) scaleY(${stretch})`;

      const foldPos = 50 + mainVals.rotate * 3.5;
      leaf.outerEl.style.setProperty("--fold-pos", `${foldPos}%`);
    }

    requestAnimationFrame(tick);
  }

  if (!reduceMotion) {
    requestAnimationFrame(tick);
  }

  /* -----------------------------------------------------------
     2. タップで開く → ズーム → 実際のシーンを表示
  ----------------------------------------------------------- */

  let hasOpened = false;

  function openNoren() {
    if (hasOpened) return;
    hasOpened = true;
    isOpening = true;

    scene.classList.add("is-revealed");
    genreShell.classList.add("is-opened");

    if (reduceMotion) {
      norenLayer.classList.add("is-hidden");
      return;
    }

    const OPEN_DURATION = "1.8s";
    const OPEN_EASE = "cubic-bezier(0.55, 0, 0.1, 1)";
    const FADE_MASK = "linear-gradient(to bottom, #000 14%, transparent 100%)";

    // 左側2枚（left, mid-left）は正の角度で左へ開き、
    // 右側2枚（mid-right, right）は負の角度で右へ開く。
    // 中央（center）はどちらにも属さないので、左側と同じ向きで軽く開く。
    for (const el of [leafLeft, leafMidLeft, leafCenter]) {
      el.style.transition = `transform ${OPEN_DURATION} ${OPEN_EASE}`;
      el.style.transform = "rotate(20deg)";
    }
    for (const el of [leafMidRight, leafRight]) {
      el.style.transition = `transform ${OPEN_DURATION} ${OPEN_EASE}`;
      el.style.transform = "rotate(-10deg)";
    }

    for (const el of [leafLeftLower, leafMidLeftLower, leafCenterLower, leafMidRightLower, leafRightLower]) {
      el.style.transition = `-webkit-mask-image 1.6s ease, mask-image 1.6s ease`;
      el.style.webkitMaskImage = FADE_MASK;
      el.style.maskImage = FADE_MASK;
    }

    norenLayer.classList.add("is-zooming");

    let norenHidden = false;
    function hideNoren() {
      if (norenHidden) return;
      norenHidden = true;
      norenLayer.classList.add("is-hidden");
    }

    norenLayer.addEventListener(
      "transitionend",
      (e) => {
        if (e.target === norenLayer && e.propertyName === "transform") {
          hideNoren();
        }
      },
      { once: true }
    );

    // transitionend が何らかの理由で発火しなかった場合の保険。
    // これが無いと、暖簾レイヤーが見た目上消えていても
    // クリック・スクロールを吸い続けてしまうことがあった。
    window.setTimeout(hideNoren, 2200);
  }

  norenLayer.addEventListener("click", openNoren);

  window.addEventListener("load", alignAllSeamCircles);
  window.addEventListener("resize", alignAllSeamCircles);
  alignAllSeamCircles();

  /* -----------------------------------------------------------
   3. ジャンル選択（横スクロール・タップでhome.htmlへ遷移）
----------------------------------------------------------- */

  const genreScroll = document.getElementById("genre-scroll");
  const genreTrack = document.getElementById("genre-track");

  // 実際のバックエンド（cards.tags）に存在する値、または
  // 今後追加予定のジャンル（能楽など）。ボタンのkeyは表示上使わず、
  // クリック時は label（＝tagsの値）をそのままAPIの ?tag= に渡す。
  const GENRES = {
    toujiki: { label: "陶磁器" },
    shikki: { label: "漆器" },
    senshoku: { label: "染物" },
    mokkou: { label: "木工" },
    kinkou: { label: "金工" },
    garasu: { label: "ガラス" },
    washi: { label: "和紙" },
    take: { label: "竹工" },
    nuno: { label: "織物" },
    gakki: { label: "楽器" },
  };

  function renderGenreButtons() {
    genreTrack.innerHTML = "";

    Object.entries(GENRES).forEach(([key, data]) => {
      const btn = document.createElement("button");
      btn.className = "genre-btn";
      btn.type = "button";
      btn.dataset.genre = key;
      btn.textContent = data.label;
      genreTrack.appendChild(btn);
    });
  }

  renderGenreButtons();

  // home.html側では ?genre=ラベル で受け取り、card.category と
  // そのまま文字列一致させてフィルタする（キーではなくラベルを渡す）
  function goToGenre(genreKey) {
    const label = GENRES[genreKey]?.label ?? genreKey;
    location.href = `html/home.html?genre=${encodeURIComponent(label)}`;
  }

  genreTrack.addEventListener("click", (event) => {
    const item = event.target.closest(".genre-btn");
    if (!item) return;
    goToGenre(item.dataset.genre);
  });
  /* ---- マウスドラッグでの横スクロール（PC向け） ---- */

  let isDragging = false;
  let dragStartX = 0;
  let dragStartScrollLeft = 0;
  let dragMoved = false;
  const DRAG_MOVE_THRESHOLD = 5; // これ以上動いたら「ドラッグ」とみなし、クリックを無効化する

  genreScroll.addEventListener("mousedown", (event) => {
    isDragging = true;
    dragMoved = false;
    dragStartX = event.pageX;
    dragStartScrollLeft = genreScroll.scrollLeft;
    genreScroll.style.cursor = "grabbing";
  });

  window.addEventListener("mousemove", (event) => {
    if (!isDragging) return;

    const dx = event.pageX - dragStartX;
    if (Math.abs(dx) > DRAG_MOVE_THRESHOLD) {
      dragMoved = true;
    }

    genreScroll.scrollLeft = dragStartScrollLeft - dx;
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
    genreScroll.style.cursor = "";
  });

  // ドラッグ操作の直後に発生する click は、ボタン遷移として扱わない
  genreTrack.addEventListener(
    "click",
    (event) => {
      if (dragMoved) {
        event.stopImmediatePropagation(); // 既存のclickリスナーより先にここで止める
        event.preventDefault();
      }
    },
    true // キャプチャフェーズで先に実行させる
  );

  /* ---- マウスホイールでの横スクロール ---- */

  genreScroll.addEventListener(
    "wheel",
    (event) => {
      // 縦方向のホイール操作を横スクロールに変換する
      if (event.deltaY !== 0) {
        genreScroll.scrollLeft += event.deltaY;
        event.preventDefault();
      }
    },
    { passive: false }
  );


  /* -----------------------------------------------------------
     4. 「おまかせ」ボタン
        ジャンルを絞らず、home.html にジャンル指定なしで遷移する。
        home.js側は ?genre= が無ければ全ジャンルのカードを表示する。
  ----------------------------------------------------------- */

  if (omakaseBtn) {
    omakaseBtn.addEventListener("click", () => {
      location.href = "html/home.html";
    });
  }
})();

// --- 5. ハンバーガーメニュー（ドロワー）の開閉設定 ---
// ※他ページ（home.js / favorites.js）と同じ処理をこのページにも追加
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