// ===================================================================
// language.js
// ハンバーガーメニュー内「言語設定」から開く、表示言語の切り替え
// ポップアップ。選んだ言語は localStorage に保存され、他のページに
// 移動しても引き継がれる。
//
// バックエンド（features/search, features/introduce）の各API は
// ?lang=en を付けると card_i18n(lang='en') があれば差し替えて返す
// （その場翻訳はしない。英訳が無ければ日本語のまま）。
// 選択肢が日本語／Englishの2つだけなのは、card_i18nがenしか
// 持っていないため。
//
// ---------------------------------------------------------------
// UI文言の英語化（このファイルだけで完結させる。html/cssは触らない）
// ---------------------------------------------------------------
// 方式：日本語のテキストそのものを辞書のキーにし、完全一致した
// ときだけ差し替える。data-i18n属性等をHTML側に振ってもらう必要はない。
//
//   ・完全一致のみ。部分一致・正規表現置換はしない
//     （trimした全文が辞書のキーと一致したときだけ差し替える）
//   ・辞書に無い文字列は日本語のまま残す（絶対に空文字にしない）
//   ・翻訳しないもの：APIから来たデータ（カード名・説明・タグ・
//     職人名・地名など。lang=enでバックエンドが既に処理済み）、
//     利用者の入力値、<script>/<style>/<code>の中身
//   ・属性も対象：placeholder / aria-label / title / alt / value
//   ・<html lang> を切り替える
//   ・lang==="ja" のときは走査そのものをしない
//   ・MutationObserverで、後から挿入された要素も拾う
//     （home.js/auth-demo.js/genre.js 等、他のJSは一切変更しない）
//
// 【重要】ジャンルボタンのラベル（陶磁器・漆器…）は、カードのタグや
// 工芸品ジャンルと文字列が完全に同じため、全体辞書には入れていない
// （入れると検索のタグチップ等まで英語になってしまう）。
// genre.js は goToGenre() 内で表示テキストではなく内部の GENRES
// オブジェクトの値をAPIに渡すため、表示だけを差し替えても実害が
// 無いことを確認した上で、.genre-btn-label だけを対象にした
// 専用の小さな辞書で別扱いにしている。
// ===================================================================

(() => {
  "use strict";

  const STORAGE_KEY = "craftsMatchingLang";

  // 選択肢はja/enの2つだけ（card_i18nがenしか持っていないため）
  const LANG_OPTIONS = [
    { code: "ja", label: "日本語", flag: "🇯🇵" },
    { code: "en", label: "English", flag: "🇺🇸" },
  ];

  function getSavedLang() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const match = LANG_OPTIONS.find((opt) => opt.code === saved);
    return match ? match.code : "ja";
  }

  // 他のJSが「今の表示言語」を読むための公開関数
  window.getCraftsLang = getSavedLang;

  /* -----------------------------------------------------------
     UI辞書（段階1：操作に関わるものが中心）
  ----------------------------------------------------------- */
  const DICT = {
    // --- ドロワーメニュー ---
    "ホーム": "Home",
    "ログイン": "Log in",
    "初めてご利用の方へ": "New here?",
    "お気に入り": "Favorites",
    "プロフィール": "Profile",
    "工芸品を登録する": "List a craft",
    "ログアウト": "Log out",
    "言語設定": "Language",
    "文字の大きさ": "Text size",
    "その他設定": "Other settings",
    "FAQ": "FAQ",
    "メニュー": "Menu",
    "検索": "Search",
    "タグを追加": "Add tag",

    // --- ヘッダー／共通 ---
    "ホームへ": "Back to home",
    "閉じる": "Close",

    // --- スワイプ操作（home.html） ---
    "保存": "Save",
    "飛ばす": "Skip",
    "ジャンルへ戻る": "Back to genres",
    "表示できるカードがありません": "No cards to show.",
    "カードの読み込みに失敗しました": "Couldn't load the cards.",
    "サンプル": "Sample",
    "「気になる」を保存するにはログインが必要です。ログイン画面へ移動しますか？":
      "You need to log in to save this. Go to the login page?",

    // --- カード詳細モーダル ---
    "この工芸品について": "About this piece",
    "特徴": "Features",
    "この工芸品をつくる職人": "The artisan behind it",
    "この工芸品の詳しい説明は準備中です。": "A detailed description is coming soon.",
    "担当職人": "Artisan",
    "実演あり": "Live demonstrations",
    "お気に入りに保存するにはログインが必要です。ログイン画面へ移動しますか？":
      "You need to log in to save favorites. Go to the login page?",

    // --- 検索画面 ---
    "工芸品をさがす": "Find a craft",
    "検索キーワード": "Search keyword",
    "工芸品名・職人名・地域などで検索": "Search by name, artisan, or region",
    "条件をクリア": "Clear filters",
    "地方で絞り込む": "Filter by region",
    "都道府県で絞り込む": "Filter by prefecture",
    "タグで絞り込む": "Filter by tag",
    "検索中…": "Searching…",
    "0件見つかりました": "0 results found",
    "条件に合う工芸品が見つかりませんでした。条件を減らしてお試しください。":
      "No matching items found. Try removing some filters.",
    "検索に失敗しました。時間をおいて再度お試しください。":
      "Search failed. Please try again later.",

    // --- ログイン／新規登録 ---
    "アカウントをお持ちの方はログイン、初めての方は下の「新規登録」からアカウントを作成してください。":
      "If you already have an account, log in. If not, create one below.",
    "確認中…": "Checking…",
    "メールアドレス": "Email",
    "パスワード": "Password",
    "はじめての方はこちら": "First time here",
    "新規登録には、メールアドレスとパスワードが必要です。": "You'll need an email address and password to sign up.",
    "12文字以上にしてください。大文字や記号は不要です。": "Use at least 12 characters. Uppercase letters and symbols are not required.",
    "ご利用の種類": "Account type",
    "職人として登録する": "Sign up as an artisan",
    "一般利用者として登録する": "Sign up as a general user",
    "表示名（任意）": "Display name (optional)",
    "新規登録": "Sign up",
    "ログアウトする": "Log out",
    "ログインでお困りの際は、お近くの詳しい方に一緒に画面を見てもらいながら操作していただくのがおすすめです。":
      "If you have trouble logging in, we recommend asking someone nearby to help you through it.",
    "現在ログインしていません": "You're not logged in.",
    "ログインしています…": "Logging in…",
    "ログインしました。ホームへ移動します…": "Logged in. Taking you to the home page…",
    "登録しています…": "Signing up…",
    "登録してログインしました。ホームへ移動します…": "Signed up and logged in. Taking you to the home page…",
    "ログアウトしています…": "Logging out…",
    "ログアウトしました": "Logged out.",
    "職人": "Artisan",
    "一般": "General",

    // --- 新規ご利用案内（見出しのみ。本文は段階2） ---
    "はじめての方へ": "Getting started",
    "サイトを見てみる": "Take a look around",

    // --- 登録フォーム（工芸品登録） ---
    "職人アカウントでログインしている必要があります。": "You need to be logged in with an artisan account.",
    "ログイン状態を確認しています…": "Checking your login status…",
    "ログインする": "Log in",
    "説明文の下書きを手伝ってもらう": "Get help drafting a description",
    "下書きを作成する": "Generate a draft",
    "下書きを作成しています…": "Generating a draft…",
    "下書き案：": "Draft:",
    "この文章を③に使う": "Use this in ③",
    "何を作って（演じて）いますか。ひとことで。": "In a sentence, what do you make?",
    "その中で、いちばん手間がかかるのはどこですか。": "What part takes the most effort?",
    "そこは、ひとりでできるまでどれくらいかかりましたか。": "How long did it take you to master that on your own?",
    "よそと違うと思うのは、どんなところですか。": "What sets it apart from others?",
    "はじめて見る人に、どこを見てほしいですか。": "What should a first-time viewer notice?",
    "先に②の「工芸品の名前」を入力してください。": "Please fill in the \"Name\" field in ② first.",
    "もう少し詳しく教えてください。答えたら、もう一度「下書きを作成する」を押してください。":
      "Please tell us a bit more. Once you've answered, press \"Generate a draft\" again.",
    "AIの下書きを作れませんでした。お手数ですが②に直接ご記入ください。":
      "We couldn't generate a draft. Please write directly in ② instead.",
    "下書きができました。内容を確認して、③に使ってください。": "Draft ready. Review it and use it in ③.",
    "基本情報": "Basic information",
    "工芸品の名前": "Name of the craft",
    "ふりがな": "Reading (furigana)",
    "職人名": "Artisan name",
    "工房名": "Workshop name",
    "ホームページURL": "Website URL",
    "（任意）": " (optional)",
    "説明文": "Description",
    "この工芸品の特徴や魅力を書いてください。①で作った下書きをそのまま使うこともできます。":
      "Describe the craft's features and appeal. You can also use the draft from ① as-is.",
    "「工芸品の名前」と「説明文」は必須です。": "\"Name\" and \"Description\" are required.",
    "所在地": "Location",
    "郵便番号を入れると住所を自動で入力できます。位置情報が無くても登録できます。":
      "Enter a postal code to fill in the address automatically. You can register without location info.",
    "郵便番号": "Postal code",
    "住所を調べる": "Look up address",
    "都道府県": "Prefecture",
    "住所": "Address",
    "位置を検索": "Find location",
    "郵便番号は7桁の数字で入力してください。": "Enter a 7-digit postal code.",
    "住所を調べています…": "Looking up the address…",
    "該当する住所が見つかりませんでした。": "No matching address was found.",
    "住所を入力しました。番地・建物名などは続けてご記入ください。":
      "Address filled in. Please add the street number and building name.",
    "先に住所を入力してください。": "Please enter an address first.",
    "位置を検索しています…": "Searching for the location…",
    "候補が見つかりませんでした。住所の表記を変えてお試しください。":
      "No matches found. Try a different way of writing the address.",
    "沿革": "History",
    "この工芸品の歴史や、産地の背景などがあれば書いてください": "Share the craft's history or the background of the region, if any.",
    "タグ": "Tags",
    "検索で見つけてもらいやすくするための言葉です。Enterで追加できます（例：陶磁器、食器、贈り物）。":
      "Words that help people find this in search. Press Enter to add one.",
    "タグを入力してEnter": "Type a tag and press Enter",
    "お気に入りから削除": "Remove from favorites",
    "写真": "Photos",
    "工芸品の写真を追加してください（1枚5MBまで）。": "Add photos of the craft (up to 5MB each).",
    "写真を追加": "Add a photo",
    "この画像を削除": "Remove this image",
    "アップロードに失敗しました": "Upload failed.",
    "この内容で登録する": "Submit",
    "登録しています…": "Submitting…",
    "登録しました。ご協力ありがとうございます！": "Registered. Thank you for your contribution!",
    "ログイン状態を確認できませんでした。時間をおいて再度お試しください。": "Couldn't check your login status. Please try again later.",
    "ログインが必要です。": "You need to log in.",
    "職人アカウントでログインしてください。": "Please log in with an artisan account.",

    // --- プロフィール画面 ---
    "読み込み中…": "Loading…",
    "登録した工芸品": "Registered crafts",
    "件登録中": " registered",
    "件保存中": " saved",
    "＋ 新しく登録する": "+ Register a new one",
    "お気に入り一覧を見る": "View your favorites",
    "まだ登録した工芸品がありません。": "You haven't registered any crafts yet.",
    "まだお気に入りに保存した工芸品がありません。": "You haven't saved any favorites yet.",
    "登録済みの工芸品を取得できませんでした。": "Couldn't load your registered crafts.",
    "お気に入りを取得できませんでした。": "Couldn't load your favorites.",
    "ログインしていません。": "You're not logged in.",
    "職人アカウント": "Artisan account",
    "一般アカウント": "General account",

    // --- お気に入り画面 ---
    "表示するタグがありません。下の「＋」から追加してください。": "No tags to show. Add one with the \"+\" button below.",
    "まだ気になるに追加した工芸品がありません。": "You haven't added anything to your favorites yet.",
    "ログインすると、気になるに追加した工芸品がここに表示されます。": "Log in to see the items you've saved here.",
    "お気に入りの読み込みに失敗しました。時間をおいて再度お試しください。": "Couldn't load your favorites. Please try again later.",
    "お気に入りの解除に失敗しました。時間をおいて再度お試しください。": "Couldn't remove this favorite. Please try again later.",
    "ログイン画面へ": "Go to login",
    "編集": "Edit",
    "表示するタグを選ぶ": "Choose tags to show",
    "追加済み": "Added",

    // --- 文字の大きさ／言語設定モーダル ---
    "標準": "Default",
    "大きい": "Large",
    "もっと大きい": "Larger",
    "特大": "Extra large",
    "言語を選ぶと、次回からその言語で表示されるよう準備を進めます。英訳がないものは日本語のままとなります。":
      "Choose a language. Craft names and descriptions are shown in the language you pick, when a translation is available.",
    "言語を選ぶと、次回からその言語で表示されるよう準備を進めます。現在は日本語の内容のみのご案内となります。":
      "Choose a language. Craft names and descriptions are shown in the language you pick, when a translation is available.",

    // --- のれん・ジャンル選択画面 ---
    "のれん": "Noren",
    "おまかせ": "Surprise me",

    // --- FAQ（見出しのみ。本文は段階2） ---
    "よくある質問": "FAQ",
    "質問をタップすると、回答が下に開きます。": "Tap a question to reveal the answer below.",
    "サイトの使い方": "How to use the site",
    "アカウント・ログイン": "Account & login",
    "職人の方へ": "For artisans",
    "表示・設定": "Display & settings",
    "その他": "Other",
  };

  // ジャンルボタン専用の辞書。.genre-btn-label にだけ適用する
  // （カードのタグ表示・検索の絞り込みタグと文字列が同じため、
  //   全体辞書には入れられない）
  const GENRE_LABEL_DICT = {
    "陶磁器": "Ceramics",
    "漆器": "Lacquerware",
    "染物": "Dyeing",
    "木工": "Woodwork",
    "金工": "Metalwork",
    "ガラス": "Glass",
    "和紙": "Washi paper",
    "竹工": "Bamboo craft",
    "織物": "Textiles",
    "楽器": "Instruments",
  };

  // 検索画面「地方で絞り込む」チップ専用。#block-chip-row の中だけに適用する。
  // 地方名はカードのタグとは衝突しないが、他の用途に混ざらないよう
  // ジャンルと同じ考え方でスコープを絞っている。
  const REGION_LABEL_DICT = {
    "北海道": "Hokkaido",
    "東北": "Tohoku",
    "関東": "Kanto",
    "中部": "Chubu",
    "近畿": "Kinki",
    "中国": "Chugoku",
    "四国": "Shikoku",
    "九州・沖縄": "Kyushu & Okinawa",
  };

  // 検索画面「都道府県で絞り込む」チップ専用。#prefecture-chip-row の
  // 中だけに適用する（カード本体のregion表示はAPIデータなので触らない）。
  // "-ken"等の接尾辞は付けず、一般的な英語表記のみ。
  const PREFECTURE_LABEL_DICT = {
    "北海道": "Hokkaido",
    "青森県": "Aomori", "岩手県": "Iwate", "宮城県": "Miyagi",
    "秋田県": "Akita", "山形県": "Yamagata", "福島県": "Fukushima",
    "茨城県": "Ibaraki", "栃木県": "Tochigi", "群馬県": "Gunma", "埼玉県": "Saitama",
    "千葉県": "Chiba", "東京都": "Tokyo", "神奈川県": "Kanagawa",
    "新潟県": "Niigata", "富山県": "Toyama", "石川県": "Ishikawa", "福井県": "Fukui",
    "山梨県": "Yamanashi", "長野県": "Nagano", "岐阜県": "Gifu", "静岡県": "Shizuoka",
    "愛知県": "Aichi",
    "三重県": "Mie", "滋賀県": "Shiga", "京都府": "Kyoto", "大阪府": "Osaka",
    "兵庫県": "Hyogo", "奈良県": "Nara", "和歌山県": "Wakayama",
    "鳥取県": "Tottori", "島根県": "Shimane", "岡山県": "Okayama",
    "広島県": "Hiroshima", "山口県": "Yamaguchi",
    "徳島県": "Tokushima", "香川県": "Kagawa", "愛媛県": "Ehime", "高知県": "Kochi",
    "福岡県": "Fukuoka", "佐賀県": "Saga", "長崎県": "Nagasaki",
    "熊本県": "Kumamoto", "大分県": "Oita", "宮崎県": "Miyazaki",
    "鹿児島県": "Kagoshima", "沖縄県": "Okinawa",
  };

  // 特定のスコープ（CSSセレクタ）配下だけに適用する辞書の一覧。
  // 全体辞書には入れられない、実データと文字列が衝突しうる語のための仕組み。
  const SCOPED_DICTS = [
    { selector: ".genre-btn-label", dict: GENRE_LABEL_DICT },
    { selector: "#block-chip-row .search-chip", dict: REGION_LABEL_DICT },
    { selector: "#prefecture-chip-row .search-chip", dict: PREFECTURE_LABEL_DICT },
  ];

  // 属性で見るべきもの
  const TRANSLATABLE_ATTRS = ["placeholder", "aria-label", "title", "alt"];

  // テキストノードを翻訳しないタグ（コード・入力欄そのもの等）
  const SKIP_ANCESTOR_TAGS = new Set(["SCRIPT", "STYLE", "CODE", "TEXTAREA", "INPUT"]);

  function translateExact(text) {
    if (text == null) return null;
    const trimmed = text.trim();
    if (!trimmed) return null;
    if (Object.prototype.hasOwnProperty.call(DICT, trimmed)) {
      return DICT[trimmed];
    }
    return null;
  }

  function hasSkippedAncestor(node) {
    let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    while (el) {
      if (SKIP_ANCESTOR_TAGS.has(el.tagName)) return true;
      el = el.parentElement;
    }
    return false;
  }

  function translateTextNode(node) {
    if (hasSkippedAncestor(node)) return;
    const translated = translateExact(node.textContent);
    if (translated !== null) {
      node.textContent = translated;
    }
  }

  function translateElementAttrs(el) {
    TRANSLATABLE_ATTRS.forEach((attr) => {
      if (!el.hasAttribute(attr)) return;
      const translated = translateExact(el.getAttribute(attr));
      if (translated !== null) {
        el.setAttribute(attr, translated);
      }
    });

    // ボタン／inputのvalue（表示テキストとして使われるもの）
    if (
      (el.tagName === "INPUT" && (el.type === "button" || el.type === "submit")) ||
      el.tagName === "BUTTON"
    ) {
      if (el.hasAttribute("value")) {
        const translated = translateExact(el.getAttribute("value"));
        if (translated !== null) el.setAttribute("value", translated);
      }
    }
  }

  // scoped辞書を、対象セレクタに一致する要素（rootが対象要素自身のときも
  // 含める）だけに適用する。実データと文字列が衝突しうる語を、全体辞書
  // ではなく特定の場所にだけ効かせるための仕組み（ジャンルボタン・
  // 地方チップ・都道府県チップで使う）。
  function translateScoped(root) {
    if (!root.querySelectorAll) return;

    SCOPED_DICTS.forEach(({ selector, dict }) => {
      const targets = [];
      if (root.matches && root.matches(selector)) targets.push(root);
      root.querySelectorAll(selector).forEach((el) => targets.push(el));

      targets.forEach((el) => {
        const trimmed = el.textContent.trim();
        if (Object.prototype.hasOwnProperty.call(dict, trimmed)) {
          el.textContent = dict[trimmed];
        }
      });
    });
  }

  function translateSubtree(root) {
    // テキストノード
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    let n;
    while ((n = walker.nextNode())) textNodes.push(n);
    textNodes.forEach(translateTextNode);

    // 属性（root自身も含める）
    if (root.nodeType === Node.ELEMENT_NODE) {
      translateElementAttrs(root);
      root.querySelectorAll("*").forEach(translateElementAttrs);
    } else if (root.nodeType === Node.DOCUMENT_NODE || root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      root.querySelectorAll("*").forEach(translateElementAttrs);
    }

    // scoped辞書（ジャンルボタン・地方チップ・都道府県チップ）
    translateScoped(root);
  }

  function applyEnglishUI() {
    document.documentElement.lang = "en";
    translateSubtree(document.body);

    // 後から挿入・書き換えされた要素も拾う。
    // 自分の書き込みで再度ミューテーションが発火しないよう、
    // 処理中はobserverを止めておく。
    const observer = new MutationObserver((mutations) => {
      observer.disconnect();
      mutations.forEach((mutation) => {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target);
        } else if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              translateTextNode(node);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              translateSubtree(node);
            }
          });
        } else if (mutation.type === "attributes") {
          if (mutation.target.nodeType === Node.ELEMENT_NODE) {
            translateElementAttrs(mutation.target);
          }
        }
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: TRANSLATABLE_ATTRS.concat(["value"]),
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATABLE_ATTRS.concat(["value"]),
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (getSavedLang() === "en") {
      applyEnglishUI();
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    const openBtn = document.getElementById("languageBtn");
    const overlay = document.getElementById("languageModalOverlay");

    // このページにポップアップ用のHTMLが無ければ何もせず終了する
    if (!openBtn || !overlay) return;

    const closeBtn = document.getElementById("languageModalClose");
    const optionListEl = document.getElementById("languageOptionList");

    function renderOptions() {
      const active = getSavedLang();
      optionListEl.innerHTML = "";

      LANG_OPTIONS.forEach((opt) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className =
          "language-option-btn" + (opt.code === active ? " is-selected" : "");

        btn.innerHTML = `
          <span class="language-flag">${opt.flag}</span>
          <span class="language-label">${opt.label}</span>
          <span class="language-check">${opt.code === active ? "✓" : ""}</span>
        `;

        btn.addEventListener("click", () => {
          if (opt.code === active) return;
          localStorage.setItem(STORAGE_KEY, opt.code);
          // 各画面ごとに再取得処理を書き足さずに済むよう、reloadで反映する
          location.reload();
        });

        optionListEl.appendChild(btn);
      });
    }

    function openModal() {
      renderOptions();
      overlay.classList.add("is-open");
      document.body.style.overflow = "hidden";
    }

    function closeModal() {
      overlay.classList.remove("is-open");
      document.body.style.overflow = "";
    }

    openBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openModal();
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", closeModal);
    }

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) {
        closeModal();
      }
    });
  });
})();
