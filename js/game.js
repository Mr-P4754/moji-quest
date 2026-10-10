import {
  HIRAGANA_SEION,
  HIRAGANA_DAKUON_HANDAKUON,
  HIRAGANA_YOUON,
  HIRAGANA_ALL,
  KATAKANA_SEION,
  KATAKANA_DAKUON_HANDAKUON,
  KATAKANA_YOUON,
  KATAKANA_ALL,
  LETTER_MODES,
  DEFAULT_WORDS
} from "./constants.js?v=18";
import { ApiManager } from "./api.js?v=18";

/**
 * ゲーム進行・判定ロジック管理クラス
 * ゲームの進行状態、単字の自動ランダム生成（モード別）、入力判定を行う
 */
export class GameManager {
  constructor() {
    this.category = null; // 1: ひらがな1字, 2: カタカナ1字, 3: ことば音声, 4: えをみて
    this.letterMode = "all"; // 'all': すべて, 'seion': 50音のみ, 'dakuon': 濁音半濁音のみ, 'youon': 拗音のみ
    this.totalQuestions = 5;
    this.currentIndex = 0;
    this.score = 0;
    this.questions = [];
    this.currentInput = "";
    this.wordsPool = DEFAULT_WORDS;
  }

  /**
   * 外部またはキャッシュから単語リソースを読み込む
   */
  async loadResources() {
    this.wordsPool = await ApiManager.fetchWords();
  }

  /**
   * カテゴリーおよび出題モードに応じた問題セットを初期化・生成
   * @param {number} categoryId - 選択されたカテゴリーID (1-4)
   * @param {string} [letterMode='all'] - 出題モード ('all'|'seion'|'dakuon'|'youon')
   */
  setupGame(categoryId, letterMode = "all") {
    this.category = categoryId;
    this.letterMode = letterMode;
    this.currentIndex = 0;
    this.score = 0;
    this.currentInput = "";
    this.questions = [];

    if (categoryId === 1) {
      // ① ひらがな1字：出題モード（50音のみ・濁音半濁音のみ・拗音のみ・すべて）からランダム生成
      let pool = HIRAGANA_ALL;
      if (letterMode === "seion") pool = HIRAGANA_SEION;
      else if (letterMode === "dakuon") pool = HIRAGANA_DAKUON_HANDAKUON;
      else if (letterMode === "youon") pool = HIRAGANA_YOUON;

      this.questions = this._pickRandomLetters(pool, "hiragana");
    } else if (categoryId === 2) {
      // ② カタカナ1字：出題モードからランダム生成
      let pool = KATAKANA_ALL;
      if (letterMode === "seion") pool = KATAKANA_SEION;
      else if (letterMode === "dakuon") pool = KATAKANA_DAKUON_HANDAKUON;
      else if (letterMode === "youon") pool = KATAKANA_YOUON;

      this.questions = this._pickRandomLetters(pool, "katakana");
    } else if (categoryId === 3) {
      // ③ ことばのおと
      this.questions = this._pickRandomWords("speech");
    } else if (categoryId === 4) {
      // ④ えをみてなまえ
      this.questions = this._pickRandomWords("image");
    }
  }

  /**
   * 現在の出題モード情報を取得
   * @returns {{id: string, label: string, icon: string, desc: string}}
   */
  getLetterModeInfo() {
    return LETTER_MODES[this.letterMode] || LETTER_MODES.all;
  }

  /**
   * 配列から重複なくシャッフルして指定件数抽出（文字）
   * @private
   * @param {string[]} pool - 抽出元の文字配列
   * @param {string} type - 'hiragana' または 'katakana'
   * @returns {Array<{type: string, target: string, display: string, speechText: string}>} 問題配列
   */
  _pickRandomLetters(pool, type) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, this.totalQuestions).map(character => ({
      type,
      target: character,
      display: "?",
      speechText: character
    }));
  }

  /**
   * 単語プールから重複なくシャッフルして指定件数抽出（単語）
   * @private
   * @param {string} type - 'speech' または 'image'
   * @returns {Array<{type: string, target: string, display: string, speechText: string}>} 問題配列
   */
  _pickRandomWords(type) {
    const shuffled = [...this.wordsPool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, this.totalQuestions).map(wordItem => ({
      type,
      target: wordItem.kana,
      display: type === "image" ? wordItem.emoji : "🔊",
      speechText: wordItem.text
    }));
  }

  /**
   * 現在の問題オブジェクトを取得
   * @returns {Object} 現在の問題
   */
  getCurrentQuestion() {
    return this.questions[this.currentIndex];
  }

  /**
   * 1文字入力時の判定ロジック
   * @param {string} char - 入力された文字
   * @returns {{isCorrect: boolean, isFinished: boolean, expected?: string, current?: string}} 判定結果
   */
  inputChar(char) {
    const currentQuestion = this.getCurrentQuestion();

    if (this.category === 1 || this.category === 2) {
      // 単字問題：正解なら完了、不正解なら再挑戦できるようにisFinished: falseを返す
      const isCorrect = (char === currentQuestion.target);
      if (isCorrect) {
        this.score++;
        return { isCorrect: true, isFinished: true, expected: currentQuestion.target };
      } else {
        return { isCorrect: false, isFinished: false, expected: currentQuestion.target };
      }
    }

    // 単語問題：複数文字を順に入力
    this.currentInput += char;
    const target = currentQuestion.target;

    // 現在の入力がターゲットと一致しているか
    if (this.currentInput === target) {
      this.score++;
      const result = { isCorrect: true, isFinished: true, expected: target, current: this.currentInput };
      this.currentInput = "";
      return result;
    }

    // 入力途中（前方一致）か誤入力か
    if (target.startsWith(this.currentInput)) {
      return { isCorrect: true, isFinished: false, current: this.currentInput };
    } else {
      this.currentInput = ""; // 打ち間違えたらリセット
      return { isCorrect: false, isFinished: false, current: "" };
    }
  }

  /**
   * 次の問題へ進める
   * @returns {boolean} まだ問題が残っているかどうか
   */
  nextQuestion() {
    this.currentIndex++;
    this.currentInput = "";
    return this.currentIndex < this.questions.length;
  }
}
