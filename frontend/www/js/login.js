/* ===================================================================
   login.js — ログイン画面
   バックエンド（認証チーム / features/auth）を使う。
     POST /api/auth/signup  { email, password, role, display_name? }
     POST /api/auth/login   { email, password }
     POST /api/auth/logout
     GET  /api/auth/me      → { user: { email, role } }
   フロントと同じ Worker に同居しているため、同一オリジン。
   Cookieベースのセッションのため、fetchには credentials: "include" を付ける。
=================================================================== */

const API_BASE = window.location.origin
const LOGIN_FLAG_KEY = 'craftsMatchingIsLoggedIn' // auth-demo.js と共有するキー
const ROLE_KEY = 'craftsMatchingRole' // 職人／一般の別。auth-demo.js と共有するキー

const $ = (id) => document.getElementById(id)

function setStatus(id, msg, kind) {
    const el = $(id)
    el.className = 'lg-status' + (kind ? ` ${kind}` : '')
    el.textContent = msg || ''
}

async function api(path, opts) {
    const res = await fetch(new URL(path, API_BASE), {
        credentials: 'include', // Cookieを送るために必須
        ...opts,
    })
    let data = null
    try {
        data = await res.json()
    } catch {
        // ボディが無い/JSONでない場合もある
    }
    if (!res.ok) {
        throw new Error((data && data.error && data.error.message) || `${path} に失敗しました`)
    }
    return data
}

async function refreshSession() {
    const sessionEl = $('lg-session-info')
    const logoutSection = $('lg-logout-section')
    try {
        const data = await api('/api/auth/me')
        sessionEl.textContent = `ログイン中：${data.user.email}（役割：${data.user.role === 'artisan' ? '職人' : '一般'}）`
        logoutSection.style.display = ''
        localStorage.setItem(LOGIN_FLAG_KEY, 'true')
        localStorage.setItem(ROLE_KEY, data.user.role)
    } catch {
        sessionEl.textContent = '現在ログインしていません'
        logoutSection.style.display = 'none'
        localStorage.removeItem(LOGIN_FLAG_KEY)
        localStorage.removeItem(ROLE_KEY)
    }
}

async function doSignup() {
    setStatus('signup-status', '登録しています…')
    try {
        await api('/api/auth/signup', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                email: $('su-email').value,
                password: $('su-password').value,
                role: $('su-role').value,
                display_name: $('su-display-name').value || undefined,
            }),
        })
        setStatus('signup-status', '登録してログインしました。ホームへ移動します…', 'is-ok')
        await refreshSession()
        setTimeout(() => { location.href = 'home.html' }, 900)
    } catch (e) {
        setStatus('signup-status', e.message, 'is-error')
    }
}

async function doLogin() {
    setStatus('login-status', 'ログインしています…')
    try {
        await api('/api/auth/login', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                email: $('li-email').value,
                password: $('li-password').value,
            }),
        })
        setStatus('login-status', 'ログインしました。ホームへ移動します…', 'is-ok')
        await refreshSession()
        setTimeout(() => { location.href = 'home.html' }, 900)
    } catch (e) {
        setStatus('login-status', e.message, 'is-error')
    }
}

async function doLogout() {
    setStatus('logout-status', 'ログアウトしています…')
    try {
        await api('/api/auth/logout', { method: 'POST' })
        setStatus('logout-status', 'ログアウトしました', 'is-ok')
        await refreshSession()
    } catch (e) {
        setStatus('logout-status', e.message, 'is-error')
    }
}

$('signup').addEventListener('click', doSignup)
$('login').addEventListener('click', doLogin)
$('logout').addEventListener('click', doLogout)

refreshSession()

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