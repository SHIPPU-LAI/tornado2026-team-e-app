/* ===================================================================
   register.js — 工芸品の登録画面（職人アカウント用）
   バックエンド（features/introduce）の /api/introduce/artisan/* を使う。
   直接叩くとCORSでブロックされるため、中継役
   （functions/api/proxy/[[path]].js）を経由する。
=================================================================== */

const API_BASE = location.origin

// ---- 共通のAPI呼び出しヘルパー（JSON版） ----
async function api(path, opts = {}) {
    const res = await fetch(new URL(path, API_BASE), {
        credentials: 'same-origin',
        ...opts,
    })
    let data = null
    try {
        data = await res.json()
    } catch {
        // レスポンスがJSONでない場合はそのまま（画像取得など、今回は使わない）
    }
    if (!res.ok) {
        const message = data?.error?.message || `リクエストに失敗しました（status: ${res.status}）`
        const err = new Error(message)
        err.status = res.status
        err.code = data?.error?.code
        throw err
    }
    return data
}

function setStatus(el, message, kind) {
    el.textContent = message || ''
    el.className = 'reg-status' + (kind ? ` is-${kind}` : '')
}

// ========================================================
// ログイン状態の確認（職人アカウントかどうか）
// 専用のAPIが無いため、GET /mine を試して判定する
// （未ログイン／一般アカウントなら401が返る）
// ========================================================
async function checkArtisanLogin() {
    const noticeEl = document.getElementById('reg-auth-notice')
    const noticeTextEl = document.getElementById('reg-auth-notice-text')
    const formEl = document.getElementById('reg-form')

    try {
        await api('/api/proxy/introduce/artisan/mine')
        // 成功＝職人アカウントでログイン済み
        formEl.style.display = ''
        noticeEl.style.display = 'none'
        return true
    } catch (err) {
        formEl.style.display = 'none'
        noticeEl.style.display = ''
        if (err.status === 401) {
            noticeTextEl.textContent = err.message.includes('職人')
                ? '職人アカウントでログインしてください。'
                : 'ログインが必要です。'
        } else {
            noticeTextEl.textContent = 'ログイン状態を確認できませんでした。時間をおいて再度お試しください。'
        }
        return false
    }
}

// ========================================================
// ① AI下書きサポート
// ========================================================
function setupDraftSupport() {
    const composeBtn = document.getElementById('draft-compose-btn')
    const statusEl = document.getElementById('draft-status')
    const resultEl = document.getElementById('draft-result')
    const resultTextEl = document.getElementById('draft-result-text')
    const useBtn = document.getElementById('draft-use-btn')
    const nameInput = document.getElementById('name')
    const descriptionInput = document.getElementById('description')

    const questionIds = ['draft-q0', 'draft-q1', 'draft-q2', 'draft-q3']

    composeBtn.addEventListener('click', async () => {
        const name = nameInput.value.trim()
        if (!name) {
            setStatus(statusEl, '先に②の「工芸品の名前」を入力してください。', 'error')
            nameInput.focus()
            return
        }

        const answers = questionIds.map((id) => document.getElementById(id).value.trim())

        setStatus(statusEl, '下書きを作成しています…')
        composeBtn.disabled = true

        try {
            const data = await api('/api/proxy/introduce/artisan/compose', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ name, answers, followups: [] }),
            })

            // レスポンスの形が正確に分からないため、いくつかの候補を順に見る
            const draft = data?.description || data?.text || data?.result || data?.draft || ''

            if (!draft) {
                setStatus(statusEl, '下書きを作成しましたが、内容を読み取れませんでした。お手数ですが③に直接ご記入ください。', 'error')
                return
            }

            resultTextEl.textContent = draft
            resultEl.classList.add('is-visible')
            setStatus(statusEl, '下書きができました。内容を確認して、③に使ってください。', 'ok')
        } catch (err) {
            console.error(err)
            setStatus(statusEl, err.message, 'error')
        } finally {
            composeBtn.disabled = false
        }
    })

    useBtn.addEventListener('click', () => {
        descriptionInput.value = resultTextEl.textContent
        document.getElementById('description').scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
}

// ========================================================
// ④ 所在地（郵便番号 → 住所 / 住所 → 位置情報）
// ========================================================
function setupAddressSupport() {
    const postalInput = document.getElementById('postal_code')
    const postalBtn = document.getElementById('postal-lookup-btn')
    const postalStatusEl = document.getElementById('postal-status')
    const regionInput = document.getElementById('region')
    const addressInput = document.getElementById('address')

    const geocodeBtn = document.getElementById('geocode-btn')
    const geocodeStatusEl = document.getElementById('geocode-status')
    const geocodeResultsEl = document.getElementById('geocode-results')
    const geoConfirmedEl = document.getElementById('geo-confirmed')
    const latInput = document.getElementById('lat')
    const lngInput = document.getElementById('lng')
    const geoSourceInput = document.getElementById('geo_source')

    postalBtn.addEventListener('click', async () => {
        const code = postalInput.value.replace(/-/g, '').trim()
        if (!/^\d{7}$/.test(code)) {
            setStatus(postalStatusEl, '郵便番号は7桁の数字で入力してください。', 'error')
            return
        }

        setStatus(postalStatusEl, '住所を調べています…')
        postalBtn.disabled = true

        try {
            const data = await api(`/api/proxy/introduce/artisan/postal?code=${encodeURIComponent(code)}`)
            // zipcloud準拠のレスポンス想定：{ results: [{ address1, address2, address3 }] }
            const result = data?.results?.[0]
            if (!result) {
                setStatus(postalStatusEl, '該当する住所が見つかりませんでした。', 'error')
                return
            }
            regionInput.value = result.address1 || regionInput.value
            addressInput.value = [result.address1, result.address2, result.address3].filter(Boolean).join('')
            setStatus(postalStatusEl, '住所を入力しました。番地・建物名などは続けてご記入ください。', 'ok')
        } catch (err) {
            console.error(err)
            setStatus(postalStatusEl, err.message, 'error')
        } finally {
            postalBtn.disabled = false
        }
    })

    geocodeBtn.addEventListener('click', async () => {
        const q = addressInput.value.trim()
        if (!q) {
            setStatus(geocodeStatusEl, '先に住所を入力してください。', 'error')
            return
        }

        setStatus(geocodeStatusEl, '位置を検索しています…')
        geocodeResultsEl.innerHTML = ''
        geoConfirmedEl.textContent = ''
        geocodeBtn.disabled = true

        try {
            const data = await api(`/api/proxy/introduce/artisan/geocode?q=${encodeURIComponent(q)}`)
            const items = data?.items || []

            if (items.length === 0) {
                setStatus(geocodeStatusEl, '候補が見つかりませんでした。住所の表記を変えてお試しください。', 'error')
                return
            }

            setStatus(geocodeStatusEl, `${items.length}件の候補が見つかりました。近いものを選んでください。`, 'ok')

            items.forEach((item, index) => {
                const btn = document.createElement('button')
                btn.type = 'button'
                btn.className = 'reg-geocode-item'
                btn.textContent = item.display_name || item.name || `候補 ${index + 1}`

                btn.addEventListener('click', () => {
                    geocodeResultsEl.querySelectorAll('.reg-geocode-item').forEach((el) => el.classList.remove('is-selected'))
                    btn.classList.add('is-selected')

                    latInput.value = item.lat ?? ''
                    lngInput.value = item.lng ?? item.lon ?? ''
                    geoSourceInput.value = 'geocode'
                    geoConfirmedEl.textContent = `選択中の位置：${btn.textContent}`
                })

                geocodeResultsEl.appendChild(btn)
            })
        } catch (err) {
            console.error(err)
            setStatus(geocodeStatusEl, err.message, 'error')
        } finally {
            geocodeBtn.disabled = false
        }
    })
}

// ========================================================
// ⑥ タグ
// ========================================================
function setupTagInput() {
    const input = document.getElementById('tag-input')
    const listEl = document.getElementById('tag-list')
    const tags = []

    function render() {
        listEl.innerHTML = ''
        tags.forEach((tag, index) => {
            const chip = document.createElement('span')
            chip.className = 'reg-tag-chip'
            chip.innerHTML = `<span></span><button type="button" aria-label="「${tag}」を削除">✕</button>`
            chip.querySelector('span').textContent = tag
            chip.querySelector('button').addEventListener('click', () => {
                tags.splice(index, 1)
                render()
            })
            listEl.appendChild(chip)
        })
    }

    input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return
        e.preventDefault()
        const value = input.value.trim()
        if (!value || tags.includes(value)) {
            input.value = ''
            return
        }
        tags.push(value)
        input.value = ''
        render()
    })

    return () => tags.slice() // 現在のタグ一覧を返す関数
}

// ========================================================
// ⑦ 画像アップロード
// ========================================================
function setupImageUpload() {
    const listEl = document.getElementById('image-list')
    const addBtn = document.getElementById('image-add-btn')
    const fileInput = document.getElementById('image-input')
    const statusEl = document.getElementById('image-status')

    // { key, previewUrl } の配列。keyがnullの間はアップロード中
    const images = []

    function render() {
        listEl.querySelectorAll('.reg-image-item').forEach((el) => el.remove())

        images.forEach((image, index) => {
            const item = document.createElement('div')
            item.className = 'reg-image-item' + (image.key ? '' : ' is-uploading')

            const img = document.createElement('img')
            img.src = image.previewUrl
            img.alt = ''
            item.appendChild(img)

            const removeBtn = document.createElement('button')
            removeBtn.type = 'button'
            removeBtn.className = 'reg-image-remove'
            removeBtn.setAttribute('aria-label', 'この画像を削除')
            removeBtn.textContent = '✕'
            removeBtn.addEventListener('click', () => {
                images.splice(index, 1)
                render()
            })
            item.appendChild(removeBtn)

            listEl.insertBefore(item, addBtn)
        })
    }

    addBtn.addEventListener('click', () => fileInput.click())

    fileInput.addEventListener('change', async () => {
        const files = Array.from(fileInput.files || [])
        fileInput.value = '' // 同じファイルを続けて選べるようにリセット

        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                setStatus(statusEl, `${file.name} は画像ファイルではないため、スキップしました。`, 'error')
                continue
            }
            if (file.size > 5 * 1024 * 1024) {
                setStatus(statusEl, `${file.name} は5MBを超えているため、スキップしました。`, 'error')
                continue
            }

            const image = { key: null, previewUrl: URL.createObjectURL(file) }
            images.push(image)
            render()

            try {
                const formData = new FormData()
                formData.append('file', file)
                const res = await fetch(new URL('/api/proxy/introduce/artisan/upload-image', API_BASE), {
                    method: 'POST',
                    credentials: 'same-origin',
                    body: formData,
                })
                const data = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(data?.error?.message || 'アップロードに失敗しました')

                image.key = data.key
                render()
            } catch (err) {
                console.error(err)
                setStatus(statusEl, `${file.name} のアップロードに失敗しました：${err.message}`, 'error')
                const i = images.indexOf(image)
                if (i !== -1) images.splice(i, 1)
                render()
            }
        }
    })

    render()

    // 送信時に使うため、アップロード済みのkey一覧を返す関数
    return () => images.filter((image) => image.key).map((image) => image.key)
}

// ========================================================
// フォーム送信
// ========================================================
function setupFormSubmit(getTags, getImageKeys) {
    const form = document.getElementById('reg-form')
    const submitBtn = document.getElementById('submit-btn')
    const statusEl = document.getElementById('submit-status')

    form.addEventListener('submit', async (e) => {
        e.preventDefault()

        const name = document.getElementById('name').value.trim()
        const description = document.getElementById('description').value.trim()

        if (!name || !description) {
            setStatus(statusEl, '「工芸品の名前」と「説明文」は必須です。', 'error')
            return
        }

        const payload = {
            name,
            description,
            name_kana: document.getElementById('name_kana').value.trim() || null,
            artisan_name: document.getElementById('artisan_name').value.trim() || null,
            workshop_name: document.getElementById('workshop_name').value.trim() || null,
            hp_url: document.getElementById('hp_url').value.trim() || null,
            region: document.getElementById('region').value.trim() || null,
            address: document.getElementById('address').value.trim() || null,
            history: document.getElementById('history').value.trim() || null,
            tags: getTags(),
            image_keys: getImageKeys(),
        }

        const lat = document.getElementById('lat').value
        const lng = document.getElementById('lng').value
        if (lat && lng) {
            payload.lat = Number(lat)
            payload.lng = Number(lng)
            payload.geo_source = document.getElementById('geo_source').value || 'geocode'
        }

        setStatus(statusEl, '登録しています…')
        submitBtn.disabled = true

        try {
            const data = await api('/api/proxy/introduce/artisan', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(payload),
            })
            setStatus(statusEl, '登録しました。ご協力ありがとうございます！', 'ok')
            console.log('登録したカード:', data)
            form.reset()
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } catch (err) {
            console.error(err)
            setStatus(statusEl, err.message, 'error')
        } finally {
            submitBtn.disabled = false
        }
    })
}

// ========================================================
// 初期化
// ========================================================
document.addEventListener('DOMContentLoaded', async () => {
    const isArtisan = await checkArtisanLogin()
    if (!isArtisan) return

    setupDraftSupport()
    setupAddressSupport()
    const getTags = setupTagInput()
    const getImageKeys = setupImageUpload()
    setupFormSubmit(getTags, getImageKeys)
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