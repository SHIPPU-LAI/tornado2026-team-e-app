/* ============================================
   card-modal.js
   カードタップ時に表示する詳細ポップアップの制御
   home.js から openDetailModal(el, card) を呼び出して使う

   card オブジェクトは検索バックエンド（/api/search/cards）から
   そのまま渡ってくる想定。主なフィールド：
     id, name, name_kana, artisan_name, description,
     hp_url, region, address, history, tags(配列),
     block（地方・導出）
   「いいね数」「制作期間」のような統計データはAPIに存在しないため、
   代わりに tags・region・block・hp_url など実在する情報を使って組み立てる。
   ============================================ */

const modalOverlay = document.getElementById('detail-modal-overlay')
const modalHeartBtn = document.getElementById('modal-heart-btn')
const modalCloseBtn = document.getElementById('modal-close-btn')
const modalSkipBtn = document.getElementById('modal-skip-btn')
const modalLikeBtn = document.getElementById('modal-like-btn')

// 今ポップアップに表示している対象（閉じる時・ボタン押下時に参照する）
let currentModalCardEl = null
let currentModalCard = null

// APIに項目が無かった場合のフォールバック文言
const FALLBACK_INFO = {
  description: 'この工芸品の詳しい説明は準備中です。',
  craftsmanName: '担当職人',
  craftsmanWorkshop: '',
}

// カードのidは数値ではなく文字列（UUIDや "c001" など）のため、
// 文字列から安定したパレット番号（1〜5）を作る簡易ハッシュ
// （home.js の同名関数と同じロジック）
function modalPaletteIndexFor(id) {
  const str = String(id)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  }
  return (hash % 5) + 1
}

function openDetailModal(cardEl, card) {
  currentModalCardEl = cardEl
  currentModalCard = card

  const description = card.description || FALLBACK_INFO.description
  const tags = card.tags && card.tags.length > 0 ? card.tags : []
  const craftsmanName = card.artisan_name || FALLBACK_INFO.craftsmanName
  const craftsmanWorkshop = card.address || card.region || FALLBACK_INFO.craftsmanWorkshop

  document.getElementById('modal-tag').textContent = tags[0] || '工芸'
  document.getElementById('modal-title').textContent = card.name
  document.getElementById('modal-region').textContent = card.region || card.block || ''

  // history（由来）があれば説明文の後に続けて表示する
  document.getElementById('modal-description').textContent = card.history
    ? `${description}\n\n${card.history}`
    : description

  const modalImageEl = document.getElementById('modal-image')
  // 現状のAPIには画像URLが無いため、常にグラデーションのプレースホルダーを使う
  const paletteIndex = modalPaletteIndexFor(card.id)
  modalImageEl.style.backgroundImage = ''
  modalImageEl.className = `detail-modal-image detail-modal-image--${paletteIndex}`

  // 「いいね数」等の統計は無いので、実在する情報（地方／体験可否）をバッジにする
  const badges = []
  if (card.block) badges.push(`<span class="stat-badge">${card.block}地方</span>`)
  if (tags.includes('体験できる')) badges.push('<span class="stat-badge">体験できる</span>')
  if (tags.includes('見学できる')) badges.push('<span class="stat-badge">見学できる</span>')
  if (tags.includes('実演')) badges.push('<span class="stat-badge">実演あり</span>')
  document.getElementById('modal-stats').innerHTML = badges.join('')

  document.getElementById('modal-tags').innerHTML = tags
    .map((tag) => `<span class="tag">${tag}</span>`)
    .join('')

  document.getElementById('modal-craftsman-name').innerHTML = card.is_dummy
    ? `<span class="stat-badge">サンプル</span>${craftsmanName}`
    : craftsmanName
  document.getElementById('modal-craftsman-workshop').textContent = craftsmanWorkshop
    ? `${craftsmanWorkshop}${card.region ? ` ／ ${card.region}` : ''}`
    : (card.region || '')

  // 公式サイト（hp_url）があればリンク先にする。無ければ押しても何も起きないようにする
  const craftsmanLinkEl = document.querySelector('.craftsman-preview')
  if (craftsmanLinkEl) {
    if (card.hp_url) {
      craftsmanLinkEl.href = card.hp_url
      craftsmanLinkEl.target = '_blank'
      craftsmanLinkEl.rel = 'noopener noreferrer'
    } else {
      craftsmanLinkEl.removeAttribute('href')
      craftsmanLinkEl.removeAttribute('target')
    }
  }

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

// お気に入りボタン（弾むアニメーションはCSS側の .pop に任せる）。
// POST /api/introduce/user/:id/like はトグルAPIなので、実際に叩いた結果
// （result.liked）に合わせて見た目を合わせる。未ログインなら401なので
// 無言で失敗させずログインへ誘導する。
modalHeartBtn.addEventListener('click', async () => {
  if (!currentModalCard) return
  try {
    const res = await fetch(new URL(`/api/introduce/user/${currentModalCard.id}/like`, API_BASE), {
      method: 'POST',
      credentials: 'include',
    })
    if (res.status === 401) {
      const base = window.SITE_BASE || '../'
      if (confirm('お気に入りに保存するにはログインが必要です。ログイン画面へ移動しますか？')) {
        location.href = `${base}html/login.html`
      }
      return
    }
    if (!res.ok) throw new Error(`いいねに失敗しました (status: ${res.status})`)
    const result = await res.json()
    modalHeartBtn.classList.toggle('liked', result.liked)
  } catch (err) {
    console.error(err)
    return
  }
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