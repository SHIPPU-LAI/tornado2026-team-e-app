/* ===================================================================
   search.js — 検索画面
   バックエンド（検索チーム / features/search）の
     GET /api/search/facets   … 絞り込み候補（地方・都道府県・タグ）
     GET /api/search          … 段階式検索（q, block, prefecture, tag）
   を使う。フロントと同じ Worker に同居しているため、同一オリジン。
=================================================================== */

const API_BASE = window.location.origin

// 現在の絞り込み状態
const state = {
  q: '',
  block: '',
  prefecture: '',
  tag: '',
}

let facetsData = { blocks: [], prefectures_by_block: {}, tags: [] }
let currentResults = []

const searchForm = document.getElementById('search-form')
const searchInput = document.getElementById('search-input')
const clearBtn = document.getElementById('search-clear-btn')
const blockRowEl = document.getElementById('block-chip-row')
const prefectureRowEl = document.getElementById('prefecture-chip-row')
const tagRowEl = document.getElementById('tag-chip-row')
const resultCountEl = document.getElementById('search-result-count')
const resultListEl = document.getElementById('search-result-list')

// ---- カードのidから安定したパレット番号（1〜5）を作る簡易ハッシュ ----
function paletteIndexFor(id) {
  const str = String(id)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  }
  return (hash % 5) + 1
}

function makeTeaser(description) {
  if (!description) return ''
  const MAX = 70
  return description.length > MAX ? `${description.slice(0, MAX)}…` : description
}

// ---- 絞り込み候補（facets）を取得してチップを描画 ----
async function loadFacets() {
  const res = await fetch(new URL('/api/search/facets', API_BASE))
  if (!res.ok) throw new Error(`facets取得に失敗しました (status: ${res.status})`)
  facetsData = await res.json()
  renderBlockChips()
  renderPrefectureChips()
  renderTagChips()
}

function renderChipRow(containerEl, items, selectedValue, onSelect) {
  containerEl.innerHTML = ''
  items.forEach((label) => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'search-chip' + (label === selectedValue ? ' is-selected' : '')
    btn.textContent = label
    btn.addEventListener('click', () => onSelect(label))
    containerEl.appendChild(btn)
  })
}

function renderBlockChips() {
  renderChipRow(blockRowEl, facetsData.blocks || [], state.block, (label) => {
    // もう一度押したら選択解除
    state.block = state.block === label ? '' : label
    // 地方を変えたら、都道府県の選択はいったんリセットする
    state.prefecture = ''
    renderBlockChips()
    renderPrefectureChips()
    runSearch()
  })
}

function renderPrefectureChips() {
  const byBlock = facetsData.prefectures_by_block || {}
  const list = state.block
    ? byBlock[state.block] || []
    : Object.values(byBlock).flat()

  renderChipRow(prefectureRowEl, list, state.prefecture, (label) => {
    state.prefecture = state.prefecture === label ? '' : label
    renderPrefectureChips()
    runSearch()
  })
}

function renderTagChips() {
  renderChipRow(tagRowEl, facetsData.tags || [], state.tag, (label) => {
    state.tag = state.tag === label ? '' : label
    renderTagChips()
    runSearch()
  })
}

// ---- 検索実行 ----
async function runSearch() {
  resultCountEl.textContent = '検索中…'
  resultListEl.innerHTML = ''

  const url = new URL('/api/search', API_BASE)
  if (state.q) url.searchParams.set('q', state.q)
  if (state.block) url.searchParams.set('block', state.block)
  if (state.prefecture) url.searchParams.set('prefecture', state.prefecture)
  if (state.tag) url.searchParams.set('tag', state.tag)

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`検索に失敗しました (status: ${res.status})`)
    const data = await res.json()
    currentResults = (data.items || []).map((item) => item.card || item)
    renderResults()
  } catch (err) {
    console.error(err)
    resultCountEl.textContent = ''
    resultListEl.innerHTML = '<p class="search-empty">検索に失敗しました。時間をおいて再度お試しください。</p>'
  }
}

function renderResults() {
  if (currentResults.length === 0) {
    resultCountEl.textContent = '0件見つかりました'
    resultListEl.innerHTML = '<p class="search-empty">条件に合う工芸品が見つかりませんでした。条件を減らしてお試しください。</p>'
    return
  }

  resultCountEl.textContent = `${currentResults.length}件見つかりました`
  resultListEl.innerHTML = ''

  currentResults.forEach((card) => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'search-result-card'

    const region = card.region || card.block || ''
    const tagsHtml = (card.tags || [])
      .slice(0, 4)
      .map((t) => `<span class="tag">${t}</span>`)
      .join('')

    btn.innerHTML = `
      <span class="search-result-thumb swipe-card-image--${paletteIndexFor(card.id)}"></span>
      <span class="search-result-body">
        <span class="search-result-name">${card.is_dummy ? '<span class="stat-badge">サンプル</span>' : ''}${card.name}</span>
        <span class="search-result-region">${region}</span>
        <span class="search-result-teaser">${makeTeaser(card.description)}</span>
        <span class="search-result-tags">${tagsHtml}</span>
      </span>
    `

    btn.addEventListener('click', () => openDetailModal(card))
    resultListEl.appendChild(btn)
  })
}

// ---- 詳細ポップアップ（検索結果用・スワイプ操作ボタンなし版） ----
const modalOverlay = document.getElementById('detail-modal-overlay')
const modalHeartBtn = document.getElementById('modal-heart-btn')
const modalCloseBtn = document.getElementById('modal-close-btn')

let currentModalCard = null

function openDetailModal(card) {
  currentModalCard = card
  const description = card.description || 'この工芸品の詳しい説明は準備中です。'
  const tags = card.tags && card.tags.length > 0 ? card.tags : []
  const craftsmanName = card.artisan_name || '担当職人'
  const craftsmanWorkshop = card.address || card.region || ''

  document.getElementById('modal-tag').textContent = tags[0] || '工芸'
  document.getElementById('modal-title').textContent = card.name
  document.getElementById('modal-region').textContent = card.region || card.block || ''
  document.getElementById('modal-description').textContent = card.history
    ? `${description}\n\n${card.history}`
    : description

  const modalImageEl = document.getElementById('modal-image')
  modalImageEl.style.backgroundImage = ''
  modalImageEl.className = `detail-modal-image detail-modal-image--${paletteIndexFor(card.id)}`

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

  modalHeartBtn.classList.remove('liked', 'pop')

  modalOverlay.classList.add('is-open')
  document.body.style.overflow = 'hidden'
}

function closeDetailModal() {
  modalOverlay.classList.remove('is-open')
  document.body.style.overflow = ''
}

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeDetailModal()
})
modalCloseBtn.addEventListener('click', closeDetailModal)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay.classList.contains('is-open')) closeDetailModal()
})
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
  void modalHeartBtn.offsetWidth
  modalHeartBtn.classList.add('pop')
})

// ---- 検索フォーム ----
searchForm.addEventListener('submit', (e) => {
  e.preventDefault()
  state.q = searchInput.value.trim()
  runSearch()
})

clearBtn.addEventListener('click', () => {
  state.q = ''
  state.block = ''
  state.prefecture = ''
  state.tag = ''
  searchInput.value = ''
  renderBlockChips()
  renderPrefectureChips()
  renderTagChips()
  runSearch()
})

// ---- ハンバーガーメニュー（ドロワー）の開閉設定 ----
document.addEventListener('DOMContentLoaded', () => {
  const openMenuBtn = document.getElementById('openMenuBtn')
  const closeMenuBtn = document.getElementById('closeMenuBtn')
  const drawerMenu = document.getElementById('drawerMenu')
  const menuOverlay = document.getElementById('menuOverlay')

  if (openMenuBtn) {
    openMenuBtn.addEventListener('click', () => {
      drawerMenu?.classList.add('is-open')
      menuOverlay?.classList.add('is-visible')
      document.body.style.overflow = 'hidden'
    })
  }
  if (closeMenuBtn) {
    closeMenuBtn.addEventListener('click', () => {
      drawerMenu?.classList.remove('is-open')
      menuOverlay?.classList.remove('is-visible')
      document.body.style.overflow = ''
    })
  }
  if (menuOverlay) {
    menuOverlay.addEventListener('click', () => {
      drawerMenu?.classList.remove('is-open')
      menuOverlay?.classList.remove('is-visible')
      document.body.style.overflow = ''
    })
  }
})

// ---- 初期化：facetsを読み込み、まず全件を表示する ----
;(async () => {
  try {
    await loadFacets()
  } catch (err) {
    console.error(err)
    // facetsが取れなくても検索自体は続行できるようにする
  }
  runSearch()
})()