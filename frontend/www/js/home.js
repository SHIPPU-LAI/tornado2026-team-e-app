/* ============================================
   home.js
   ホーム画面：カードのスワイプ（気になる／スキップ）を
   ライブラリなしの Pointer Events + CSS変数で実装

   カードデータは検索チームのバックエンドAPIから取得する。
   GET /api/search/cards?tag=... （tag省略で全件）

   frontend/www は同じ Worker から配信されているので API とは同一オリジン。
   中継役は不要で、直接叩ける（AGENTS.md / a4306c1 参照）。
   ============================================ */

const API_BASE = location.origin

// 画面に同時に見せる「重なり」の枚数
const VISIBLE_STACK = 3
// この距離（px）を超えてドラッグを離したら「決定」とみなす
const SWIPE_THRESHOLD = 100
// ドラッグ量に対する回転の効き具合
const ROTATION_FACTOR = 18
// この範囲内の動きなら、時間に関係なく「タップ」とみなす
// （長押しでもほとんど動いていなければタップ扱いにする）
const TAP_MAX_MOVEMENT = 15
// 指を触れてから離すまでがこの時間以内なら「タップ」とみなす
// （多少動いていても、素早い操作ならタップとして許容する）
const TAP_QUICK_DURATION_MS = 1000
// 上記の「素早いタップ」判定に許容する動きの上限（px）
// これを超えて動いていれば、短時間でも「スワイプしようとした」とみなす
const TAP_QUICK_MAX_MOVEMENT = 40

// 1段ごとに下へ覗かせる量（px）。奥のカードほど大きくずれる。
const STACK_PEEK_STEP = 16
// 1段ごとの縮小率。覗かせる見た目を優先し、控えめにしている。
const STACK_SCALE_STEP = 0.03

// タグの色（通常＝青 → 右スワイプで赤に変化させる）
const TAG_COLOR_DEFAULT_1 = [74, 134, 216] // #4a86d8
const TAG_COLOR_DEFAULT_2 = [31, 79, 160] // #1f4fa0
const TAG_COLOR_LIKE_1 = [232, 96, 60] // #e8603c
const TAG_COLOR_LIKE_2 = [163, 43, 43] // #a32b2b

// APIから取得したカード一覧（先頭が「今表示中」のカード）
let deck = []

const stackEl = document.getElementById('card-stack')
// 右（保存）／左（スキップ）スワイプ中に画面端を色付けするオーバーレイ
const likeOverlayEl = document.getElementById('like-overlay')
const skipOverlayEl = document.getElementById('skip-overlay')

// ---- バックエンドAPIからカード一覧を取得 ----
// tag を渡すと、そのタグを含むカードだけに絞り込まれる（サーバー側でフィルタ）。
// 省略時は全件（＝「おまかせ」）。
async function fetchCards(tag) {
  const url = new URL('/api/search/cards', API_BASE)
  if (tag) url.searchParams.set('tag', tag)
  // 既定(ja)のときはURLを汚さないので付けない
  const lang = window.getCraftsLang ? window.getCraftsLang() : 'ja'
  if (lang !== 'ja') url.searchParams.set('lang', lang)

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`カード取得に失敗しました (status: ${res.status})`)
  }
  const data = await res.json()
  // /api/search/cards の items はカードオブジェクトそのもの
  return Array.isArray(data.items) ? data.items : []
}

// カードのidは数値ではなく文字列（UUIDや "c001" など）のため、
// 文字列から安定したパレット番号（1〜5）を作る簡易ハッシュ。
function paletteIndexFor(id) {
  const str = String(id)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  }
  return (hash % 5) + 1
}

// description（長文）からカード表面用の短い紹介文を作る
function makeTeaser(description) {
  if (!description) return ''
  const MAX = 46
  return description.length > MAX ? `${description.slice(0, MAX)}…` : description
}

// 画像URLは今のAPIには無いため、常にグラデーションのプレースホルダーを使う
function resolveImageClassAndStyle(card) {
  const paletteIndex = paletteIndexFor(card.id)
  return { className: ` swipe-card-image--${paletteIndex}`, style: '' }
}

// カード1枚分のDOM（タグ行＋カード本体）をまとめて生成する。
// タグはこのカード専用で、次に表示されるカードは renderStack() のたびに
// 別のカードとして新しく作られるタグを持つ（スワイプ後に古いタグが戻ることはない）。
function createCardElement(card) {
  const el = document.createElement('div')
  el.className = 'swipe-card'
  el.dataset.id = card.id

  const { className: imageClass, style: imageStyle } = resolveImageClassAndStyle(card)

  // 上部の3つのタグ：①主なジャンル（tagsの先頭） ②都道府県（無ければ地方） ③地方（①と重複しなければ）
  const category = (card.tags && card.tags[0]) || '工芸'
  const region = card.region || card.block || '―'
  const era = card.block && card.block !== region ? card.block : (card.tags && card.tags[1]) || '―'

  el.innerHTML = `
    <div class="swipe-card-tags">
      <span class="home-tab-pill">${category}</span>
      <span class="home-tab-pill">${region}</span>
      <span class="home-tab-pill">${era}</span>
    </div>
    <div class="swipe-card-body">
      <div class="swipe-card-image${imageClass}" ${imageStyle}></div>
      <div class="swipe-card-footer">
        <h3 class="swipe-card-title">${card.is_dummy ? '<span class="stat-badge">サンプル</span>' : ''}${card.name}</h3>
        <p class="swipe-card-teaser">${makeTeaser(card.description)}</p>
      </div>
    </div>
  `
  return el
}

function renderStack() {
  stackEl.innerHTML = ''

  if (deck.length === 0) {
    stackEl.innerHTML = '<p class="empty-state">表示できるカードがありません</p>'
    return
  }

  const visibleCards = deck.slice(0, VISIBLE_STACK)

  // 後ろのカードから描画していく（一番上のカードが最後 = 一番前面）
  visibleCards
    .slice()
    .reverse()
    .forEach((card, i) => {
      const positionFromTop = visibleCards.length - 1 - i
      const el = createCardElement(card)

      if (positionFromTop === 0) {
        // 一番上のカード：操作可能
        el.style.setProperty('--stack-y', '0px')
        el.style.setProperty('--stack-scale', '1')
        el.style.zIndex = 10
        el.dataset.top = 'true'
        attachDragHandlers(el, card)
      } else {
        // 奥に控えているカード（操作不可）。
        // transform-origin: top（home.css側）と組み合わせることで、
        // 上端は揃えたまま下方向にだけ次のカードが覗くようにする。
        el.classList.add('is-stacked')
        el.style.setProperty('--stack-y', `${positionFromTop * STACK_PEEK_STEP}px`)
        el.style.setProperty('--stack-scale', `${1 - positionFromTop * STACK_SCALE_STEP}`)
        el.style.zIndex = 10 - positionFromTop
        el.style.opacity = String(1 - positionFromTop * 0.15)
      }

      stackEl.appendChild(el)
    })
}

// ドラッグ量に応じて、右＝赤／左＝青の端の色を薄く／濃く表示する
function setSwipeOverlayProgress(dx) {
  const progress = Math.min(Math.abs(dx) / SWIPE_THRESHOLD, 1)
  if (dx > 0) {
    likeOverlayEl.style.opacity = String(progress)
    skipOverlayEl.style.opacity = '0'
  } else if (dx < 0) {
    skipOverlayEl.style.opacity = String(progress)
    likeOverlayEl.style.opacity = '0'
  } else {
    likeOverlayEl.style.opacity = '0'
    skipOverlayEl.style.opacity = '0'
  }
}

function resetSwipeOverlay() {
  likeOverlayEl.style.opacity = '0'
  skipOverlayEl.style.opacity = '0'
}

function lerpColor(from, to, t) {
  const r = Math.round(from[0] + (to[0] - from[0]) * t)
  const g = Math.round(from[1] + (to[1] - from[1]) * t)
  const b = Math.round(from[2] + (to[2] - from[2]) * t)
  return `rgb(${r}, ${g}, ${b})`
}

// 右にドラッグしている量に応じて、そのカードのタグ（青）を赤へなじませる
function setTagColorProgress(el, dx) {
  const progress = dx > 0 ? Math.min(dx / SWIPE_THRESHOLD, 1) : 0
  el.style.setProperty('--tab-color-1', lerpColor(TAG_COLOR_DEFAULT_1, TAG_COLOR_LIKE_1, progress))
  el.style.setProperty('--tab-color-2', lerpColor(TAG_COLOR_DEFAULT_2, TAG_COLOR_LIKE_2, progress))
}

function resetTagColor(el) {
  el.style.removeProperty('--tab-color-1')
  el.style.removeProperty('--tab-color-2')
}

function attachDragHandlers(el, card) {
  let startX = 0
  let startY = 0
  let startTime = 0
  let dragging = false

  function onPointerDown(e) {
    dragging = true
    startX = e.clientX
    startY = e.clientY
    startTime = performance.now()
    el.classList.add('is-dragging')
    el.setPointerCapture(e.pointerId)
    // タッチ操作でのスクロールや、後から発生する疑似クリックを抑制する
    e.preventDefault()
  }

  function onPointerMove(e) {
    if (!dragging) return
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    const rot = dx / ROTATION_FACTOR

    el.style.setProperty('--drag-x', `${dx}px`)
    el.style.setProperty('--drag-y', `${dy}px`)
    el.style.setProperty('--drag-rot', `${rot}deg`)

    setSwipeOverlayProgress(dx)
    setTagColorProgress(el, dx)
  }

  function onPointerUp(e) {
    if (!dragging) return
    dragging = false
    el.classList.remove('is-dragging')
    resetSwipeOverlay()

    const dx = e.clientX - startX
    const dy = e.clientY - startY
    const distance = Math.hypot(dx, dy)
    const elapsed = performance.now() - startTime

    // 「タップ」とみなす条件：
    // ・ほぼ動いていない（TAP_MAX_MOVEMENT以内）→ 長押しでもOK
    // ・1秒以内に離していて、動きが TAP_QUICK_MAX_MOVEMENT 以内
    const isTap =
      distance < TAP_MAX_MOVEMENT ||
      (elapsed <= TAP_QUICK_DURATION_MS && distance < TAP_QUICK_MAX_MOVEMENT)

    if (isTap) {
      // → その場でカード詳細ポップアップを開く（card-modal.js側の処理）
      // 見た目上ドラッグしかけていた場合に備えて位置を中央へ戻しておく
      el.style.setProperty('--drag-x', '0px')
      el.style.setProperty('--drag-y', '0px')
      el.style.setProperty('--drag-rot', '0deg')
      resetTagColor(el)
      openDetailModal(el, card)
      return
    }

    if (dx > SWIPE_THRESHOLD) {
      commitSwipe(el, card, 'like')
    } else if (dx < -SWIPE_THRESHOLD) {
      commitSwipe(el, card, 'skip')
    } else {
      // 閾値に届かなかった場合は中央へ戻す
      el.style.setProperty('--drag-x', '0px')
      el.style.setProperty('--drag-y', '0px')
      el.style.setProperty('--drag-rot', '0deg')
      resetTagColor(el)
    }
  }

  el.addEventListener('pointerdown', onPointerDown)
  el.addEventListener('pointermove', onPointerMove)
  el.addEventListener('pointerup', onPointerUp)
  el.addEventListener('pointercancel', onPointerUp)
}

// 「気になる」を保存する（POST /api/introduce/user/:id/like はトグルAPI）。
// 未ログインなら401が返るので、無言で失敗させずログインへ誘導する。
async function likeCard(id) {
  try {
    const res = await fetch(new URL(`/api/introduce/user/${id}/like`, API_BASE), {
      method: 'POST',
      credentials: 'include',
    })
    if (res.status === 401) {
      const base = window.SITE_BASE || '../'
      if (confirm('「気になる」を保存するにはログインが必要です。ログイン画面へ移動しますか？')) {
        location.href = `${base}html/login.html`
      }
      return
    }
    if (!res.ok) throw new Error(`いいねに失敗しました (status: ${res.status})`)
  } catch (err) {
    console.error(err)
  }
}

// ボタン操作 or ドラッグ確定時、共通で呼ばれる「確定」処理
function commitSwipe(el, card, action) {
  el.classList.add(action === 'like' ? 'fly-right' : 'fly-left')

  if (action === 'like') likeCard(card.id)

  // アニメーション終了を待ってからカード（タグごと）を取り除き、次を繰り上げる。
  // 次のカードは renderStack() が新しく作る別要素なので、
  // 飛んでいったタグがここに戻ってくることはない。
  el.addEventListener(
    'transitionend',
    () => {
      deck.shift()
      renderStack()
    },
    { once: true }
  )
}

// ========================================================
// 初期化処理（DOMContentLoaded後にまとめて実行）
// ========================================================
document.addEventListener('DOMContentLoaded', async () => {

  // --- 1. スワイプ操作ボタン（スキップ／気になる）の設定 ---
  const skipBtn = document.getElementById('skip-btn')
  const likeBtn = document.getElementById('like-btn')

  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      const topCard = stackEl.querySelector('.swipe-card[data-top="true"]')
      if (topCard && deck.length > 0) commitSwipe(topCard, deck[0], 'skip')
    })
  }

  if (likeBtn) {
    likeBtn.addEventListener('click', () => {
      const topCard = stackEl.querySelector('.swipe-card[data-top="true"]')
      if (topCard && deck.length > 0) commitSwipe(topCard, deck[0], 'like')
    })
  }

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

  // --- 3. APIからカード一覧を取得してから、最初の描画を行う ---
  // ジャンル選択画面（index.html）から ?genre=タグ名 が渡っていれば、
  // そのタグを含むカードだけをサーバー側で絞り込んで取得する。
  // 「おまかせ」で来た場合（genre無し）は全件。
  const params = new URLSearchParams(location.search)
  const genre = params.get('genre') || ''

  try {
    deck = await fetchCards(genre)
    // 指定ジャンルのカードが1件も無かった場合は、全件（おまかせ相当）にフォールバックする
    if (genre && deck.length === 0) {
      deck = await fetchCards()
    }
  } catch (err) {
    console.error(err)
    stackEl.innerHTML = '<p class="empty-state">カードの読み込みに失敗しました</p>'
    return
  }

  renderStack()
})