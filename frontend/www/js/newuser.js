// ===================================================================
// newuser.js — 「初めてご利用の方へ」ページ
// ハンバーガーメニュー（左ドロワー）の開閉のみを扱う。
// ===================================================================

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