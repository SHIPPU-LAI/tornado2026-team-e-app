/* ===================================================================
   profile.js — プロフィール画面
   /api/auth/me・/api/auth/logout は login.js と同じく直接呼び出し
   （credentials: "include"）。
   /api/introduce/* も、frontend/www と同じ Worker から配信されているので
   同一オリジン。中継役は不要で、直接叩ける（AGENTS.md / a4306c1 参照）。
=================================================================== */

const AUTH_API_BASE = 'https://noren.zzjjnn2005.workers.dev' // login.js と同じ
const PROXY_BASE = location.origin // introduce系も同一オリジンで直接叩く

const STORAGE_KEY = 'craftsMatchingIsLoggedIn' // auth-demo.js / login.js と共有
const ROLE_KEY = 'craftsMatchingRole' // 同上

async function fetchMe() {
    const res = await fetch(new URL('/api/auth/me', AUTH_API_BASE), {
        credentials: 'include',
    })
    if (!res.ok) {
        const err = new Error('未ログインです')
        err.status = res.status
        throw err
    }
    return res.json()
}

async function fetchJson(path) {
    const res = await fetch(new URL(path, PROXY_BASE))
    if (!res.ok) throw new Error(`取得に失敗しました（status: ${res.status}）`)
    return res.json()
}

// カードのidから安定したパレット番号（1〜5）を作る簡易ハッシュ
// （home.js / search.js と同じ考え方）
function paletteIndexFor(id) {
    const str = String(id ?? Math.random())
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) >>> 0
    }
    return (hash % 5) + 1
}

function renderCardGrid(listEl, items, emptyMessage) {
    listEl.innerHTML = ''

    if (items.length === 0) {
        listEl.innerHTML = `<p class="profile-empty-note">${emptyMessage}</p>`
        return
    }

    items.forEach((card) => {
        const item = document.createElement('div')
        item.className = 'profile-card-item'
        item.innerHTML = `
      <div class="profile-card-photo profile-card-photo--${paletteIndexFor(card.id)}"></div>
      <div class="profile-card-caption">
        <div class="profile-card-name"></div>
        <div class="profile-card-sub"></div>
      </div>
    `
        item.querySelector('.profile-card-name').textContent = card.name || '(名前未設定)'
        item.querySelector('.profile-card-sub').textContent = card.region || card.workshop_name || ''
        listEl.appendChild(item)
    })
}

function renderArtisanCards(items) {
    renderCardGrid(
        document.getElementById('artisan-card-list'),
        items,
        'まだ登録した工芸品がありません。'
    )
}

function renderUserCards(items) {
    renderCardGrid(
        document.getElementById('user-card-list'),
        items,
        'まだお気に入りに保存した工芸品がありません。'
    )
}

async function loadArtisanSection() {
    const section = document.getElementById('artisan-section')
    section.style.display = ''
    try {
        const data = await fetchJson('/api/introduce/artisan/mine')
        const items = data.items || []
        document.getElementById('artisan-count').textContent = String(data.total ?? items.length)
        renderArtisanCards(items)
    } catch (err) {
        console.error(err)
        document.getElementById('artisan-card-list').innerHTML =
            '<p class="profile-empty-note">登録済みの工芸品を取得できませんでした。</p>'
    }
}

async function loadUserSection() {
    const section = document.getElementById('user-section')
    section.style.display = ''
    try {
        const data = await fetchJson('/api/introduce/user/liked')
        const items = data.items || []
        document.getElementById('user-count').textContent = String(data.total ?? items.length)
        renderUserCards(items)
    } catch (err) {
        console.error(err)
        document.getElementById('user-card-list').innerHTML =
            '<p class="profile-empty-note">お気に入りを取得できませんでした。</p>'
    }
}

async function init() {
    const noticeEl = document.getElementById('auth-notice')
    const noticeTextEl = document.getElementById('auth-notice-text')
    const bodyEl = document.getElementById('profile-body')

    let me
    try {
        me = await fetchMe()
    } catch (err) {
        bodyEl.style.display = 'none'
        noticeEl.style.display = ''
        noticeTextEl.textContent = 'ログインしていません。'
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(ROLE_KEY)
        return
    }

    // ログイン済みなので、他ページ（drawer menu等）とも状態を合わせておく
    localStorage.setItem(STORAGE_KEY, 'true')
    localStorage.setItem(ROLE_KEY, me.user.role)

    noticeEl.style.display = 'none'
    bodyEl.style.display = ''

    document.getElementById('profile-email').textContent = me.user.display_name || me.user.email
    const roleBadge = document.getElementById('profile-role-badge')
    roleBadge.textContent = me.user.role === 'artisan' ? '職人アカウント' : '一般アカウント'

    if (me.user.role === 'artisan') {
        await loadArtisanSection()
    } else {
        await loadUserSection()
    }
}

document.addEventListener('DOMContentLoaded', () => {
    init()

    // ---- ログアウト ----
    const logoutBtn = document.getElementById('logout-btn')
    const logoutStatusEl = document.getElementById('logout-status')

    logoutBtn.addEventListener('click', async () => {
        logoutStatusEl.textContent = 'ログアウトしています…'
        logoutStatusEl.className = 'profile-status'
        logoutBtn.disabled = true

        try {
            await fetch(new URL('/api/auth/logout', AUTH_API_BASE), {
                method: 'POST',
                credentials: 'include',
            })
        } catch (err) {
            console.error('ログアウトAPIの呼び出しに失敗しました', err)
        }

        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(ROLE_KEY)
        location.href = '../html/home.html'
    })

    // ---- ハンバーガーメニュー（ドロワー）の開閉設定 ----
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