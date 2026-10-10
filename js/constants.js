/**
 * 50音マトリクス定義（縦5段：上から あ・い・う・え・お 段）
 * 各列は [あ段, い段, う段, え段, お段]
 */
export const KEYBOARD_COLUMNS = {
  seion: [
    { label: "あ行", chars: ["あ", "い", "う", "え", "お"] },
    { label: "か行", chars: ["か", "き", "く", "け", "こ"] },
    { label: "さ行", chars: ["さ", "し", "す", "せ", "そ"] },
    { label: "た行", chars: ["た", "ち", "つ", "て", "と"] },
    { label: "な行", chars: ["な", "に", "ぬ", "ね", "の"] },
    { label: "は行", chars: ["は", "ひ", "ふ", "へ", "ほ"] },
    { label: "ま行", chars: ["ま", "み", "む", "め", "も"] },
    { label: "や行", chars: ["や", "",   "ゆ", "",   "よ"] },
    { label: "ら行", chars: ["ら", "り", "る", "れ", "ろ"] },
    // ③ 50音表側の「っ」「ー」を削除（下段の拗音・記号エリアに集約）
    { label: "わ行", chars: ["わ", "を", "ん", "", ""] }
  ],
  dakuon: [
    { label: "が行", chars: ["が", "ぎ", "ぐ", "げ", "ご"] },
    { label: "ざ行", chars: ["ざ", "じ", "ず", "ぜ", "ぞ"] },
    { label: "だ行", chars: ["だ", "ぢ", "づ", "で", "ど"] },
    { label: "ば行", chars: ["ば", "び", "ぶ", "べ", "ぼ"] }
  ],
  handakuon: [
    { label: "ぱ行", chars: ["ぱ", "ぴ", "ぷ", "ぺ", "ぽ"] }
  ],
  // ② 拗音のみ縦6段にして飛び位置なく直結配置（ぎゃ・ぎゅ・ぎょ、じゃ・じゅ・じょ等を仲間同士で縦配置）
  youon: [
    { label: "か・が行", chars: ["きゃ", "きゅ", "きょ", "ぎゃ", "ぎゅ", "ぎょ"] },
    { label: "さ・ざ行", chars: ["しゃ", "しゅ", "しょ", "じゃ", "じゅ", "じょ"] },
    { label: "た行・記号", chars: ["ちゃ", "ちゅ", "ちょ", "っ", "ー", ""] },
    { label: "な・は行", chars: ["にゃ", "にゅ", "にょ", "ひゃ", "ひゅ", "ひょ"] },
    { label: "ま・ば行", chars: ["みゃ", "みゅ", "みょ", "びゃ", "びゅ", "びょ"] },
    { label: "ら・ぱ行", chars: ["りゃ", "りゅ", "りょ", "ぴゃ", "ぴゅ", "ぴょ"] }
  ]
};

/**
 * ひらがなからカタカナへの変換関数
 * 2文字の結合拗音（例:「しゃ」→「シャ」）も対応
 * @param {string} str - 変換対象の文字列
 * @returns {string} カタカナ変換後の文字列
 */
export function toKatakana(str) {
  return str.replace(/[\u3041-\u3096]/g, m => String.fromCharCode(m.charCodeAt(0) + 0x60));
}

// 出題モード定義
export const LETTER_MODES = {
  all: { id: "all", label: "すべて", icon: "🌟", desc: "ぜんぶの もじ" },
  seion: { id: "seion", label: "50おん", icon: "🌸", desc: "あ〜ん" },
  dakuon: { id: "dakuon", label: "だくおん・はんだくおん", icon: "🍀", desc: "が〜ぽ" },
  youon: { id: "youon", label: "ようおん", icon: "🚀", desc: "きゃ〜りょ" }
};

// ① 50音（清音 46文字）
export const HIRAGANA_SEION = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん".split("");

// ② 濁音・半濁音（25文字）
export const HIRAGANA_DAKUON_HANDAKUON = [
  ..."がぎぐげござじずぜぞだぢづでどばびぶべぼ".split(""),
  ..."ぱぴぷぺぽ".split("")
];

// ③ 拗音（結合拗音 全33種：ぎゃ・ぎゅ・ぎょ等も飛び位置なく全網羅）
export const HIRAGANA_YOUON = [
  "きゃ", "きゅ", "きょ",
  "ぎゃ", "ぎゅ", "ぎょ",
  "しゃ", "しゅ", "しょ",
  "じゃ", "じゅ", "じょ",
  "ちゃ", "ちゅ", "ちょ",
  "にゃ", "にゅ", "にょ",
  "ひゃ", "ひゅ", "ひょ",
  "びゃ", "びゅ", "びょ",
  "ぴゃ", "ぴゅ", "ぴょ",
  "みゃ", "みゅ", "みょ",
  "りゃ", "りゅ", "りょ"
];

// ④ すべて（合計 104文字）
export const HIRAGANA_ALL = [
  ...HIRAGANA_SEION,
  ...HIRAGANA_DAKUON_HANDAKUON,
  ...HIRAGANA_YOUON
];

// カタカナ対応
export const KATAKANA_SEION = HIRAGANA_SEION.map(toKatakana);
export const KATAKANA_DAKUON_HANDAKUON = HIRAGANA_DAKUON_HANDAKUON.map(toKatakana);
export const KATAKANA_YOUON = HIRAGANA_YOUON.map(toKatakana);
export const KATAKANA_ALL = HIRAGANA_ALL.map(toKatakana);

// 互換用
export const HIRAGANA_CHARS = HIRAGANA_ALL;
export const KATAKANA_CHARS = KATAKANA_ALL;

// カテゴリー③・④用の内蔵フォールバック単語（GAS未接続時も動作）
export const DEFAULT_WORDS = [
  { text: "いぬ", emoji: "🐶", kana: "いぬ" },
  { text: "ねこ", emoji: "🐱", kana: "ねこ" },
  { text: "くるま", emoji: "🚗", kana: "くるま" },
  { text: "ひこうき", emoji: "✈️", kana: "ひこうき" },
  { text: "りんご", emoji: "🍎", kana: "りんご" },
  { text: "ばなな", emoji: "🍌", kana: "ばなな" },
  { text: "パンダ", emoji: "🐼", kana: "ぱんだ" },
  { text: "でんしゃ", emoji: "🚃", kana: "でんしゃ" },
  { text: "すいか", emoji: "🍉", kana: "すいか" },
  { text: "ぞう", emoji: "🐘", kana: "ぞう" }
];
