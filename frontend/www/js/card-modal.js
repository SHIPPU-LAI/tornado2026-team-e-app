/* ============================================
   card-modal.js
   カードタップ時に表示する詳細ポップアップの制御
   home.js から openDetailModal(el, card) を呼び出して使う

   card オブジェクトは D1（/api/cards）から取得した内容が
   そのまま渡ってくる想定（description / tags / stats /
   craftsmanName / craftsmanWorkshop / imageUrl を含む）。
   ============================================ */

const modalOverlay = document.getElementById('detail-modal-overlay')
const modalHeartBtn = document.getElementById('modal-heart-btn')
const modalCloseBtn = document.getElementById('modal-close-btn')
const modalSkipBtn = document.getElementById('modal-skip-btn')
const modalLikeBtn = document.getElementById('modal-like-btn')

// 今ポップアップに表示している対象（閉じる時・ボタン押下時に参照する）
let currentModalCardEl = null
let currentModalCard = null

// D1未登録の項目があってもポップアップが壊れないようにするフォールバック
const FALLBACK_INFO = {
  description: 'この工芸品の詳しい説明は準備中です。',
  tags: [],
  stats: { likes: 0, craftsmen: 0, duration: '-' },
  craftsmanName: '担当職人',
  craftsmanWorkshop: '-',
}

function openDetailModal(cardEl, card) {
  currentModalCardEl = cardEl
  currentModalCard = card

  const description = card.description || FALLBACK_INFO.description
  const tags = card.tags && card.tags.length > 0 ? card.tags : FALLBACK_INFO.tags
  const stats = card.stats || FALLBACK_INFO.stats
  const craftsmanName = card.craftsmanName || FALLBACK_INFO.craftsmanName
  const craftsmanWorkshop = card.craftsmanWorkshop || FALLBACK_INFO.craftsmanWorkshop

  document.getElementById('modal-tag').textContent = card.category
  document.getElementById('modal-title').textContent = card.name
  document.getElementById('modal-region').textContent = card.region
  document.getElementById('modal-description').textContent = description

  const modalImageEl = document.getElementById('modal-image')
  if (card.imageUrl) {
    // 実写画像が登録されている場合はそれを使う
    modalImageEl.className = 'detail-modal-image'
    modalImageEl.style.backgroundImage = `url('${card.imageUrl}')`
  } else {
    // 未登録の場合は従来のグラデーションプレースホルダーにフォールバック
    const paletteIndex = ((card.id - 1) % 5) + 1
    modalImageEl.style.backgroundImage = ''
    modalImageEl.className = `detail-modal-image detail-modal-image--${paletteIndex}`
  }

  document.getElementById('modal-stats').innerHTML = `
    <span class="stat-badge"><strong>${stats.likes}</strong> 人が気になる</span>
    <span class="stat-badge">職人 <strong>${stats.craftsmen}</strong> 名在籍</span>
    <span class="stat-badge">制作期間 <strong>${stats.duration}</strong></span>
  `

  document.getElementById('modal-tags').innerHTML = tags
    .map((tag) => `<span class="tag">${tag}</span>`)
    .join('')

  document.getElementById('modal-craftsman-name').textContent = craftsmanName
  document.getElementById('modal-craftsman-workshop').textContent =
    `${craftsmanWorkshop} ／ ${card.region}`

  // ハートの状態はカードごとにリセット（お気に入り状態を保持したい場合は別途データで管理）
  modalHeartBtn.classList.remove('liked', 'pop')

  modalOverlay.classList.add('is-open')
  document.body.style.overflow = 'hidden' // 背景のスクロールを止める
}

function closeDetailModal() {
  modalOverlay.classList.remove('is-open')
  document.body.style.overflow = ''
}

// 背景（オーバーレイの余白部分）をクリックしたら閉じる
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeDetailModal()
})

modalCloseBtn.addEventListener('click', closeDetailModal)

// Escキーでも閉じられるようにする
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay.classList.contains('is-open')) {
    closeDetailModal()
  }
})

// お気に入りボタン（弾むアニメーションはCSS側の .pop に任せる）
modalHeartBtn.addEventListener('click', () => {
  modalHeartBtn.classList.toggle('liked')
  modalHeartBtn.classList.remove('pop')
  void modalHeartBtn.offsetWidth // アニメーションを毎回再生させるためのリフロー
  modalHeartBtn.classList.add('pop')
})

// ポップアップ内の「スキップ／気になる」は、
// 裏にあるホーム画面のカードに対して本来のスワイプ処理を実行してから閉じる
modalSkipBtn.addEventListener('click', () => {
  if (currentModalCardEl && currentModalCard) {
    commitSwipe(currentModalCardEl, currentModalCard, 'skip')
  }
  closeDetailModal()
})

modalLikeBtn.addEventListener('click', () => {
  if (currentModalCardEl && currentModalCard) {
    commitSwipe(currentModalCardEl, currentModalCard, 'like')
  }
  closeDetailModal()
})