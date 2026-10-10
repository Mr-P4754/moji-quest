/**
 * 音声再生・効果音管理クラス
 * Web Speech API（幼児向けのゆったり発音）と Web Audio API（効果音）を担当
 */
class AudioManager {
  constructor() {
    this.ctx = null;
    this.voices = [];
    this.currentUtterance = null; // GC（ガベージコレクション）による発話中断防止
    this.isSpeaking = false; // 音声再生中フラグ
    this._initSpeechVoices();
  }

  /**
   * 音声合成エンジンの日本語ボイス準備
   */
  _initSpeechVoices() {
    if (!("speechSynthesis" in window)) return;
    const loadVoices = () => {
      this.voices = window.speechSynthesis.getVoices();
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  /**
   * AudioContextの初期化と再開
   */
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  /**
   * 指定ミリ秒待機するユーティリティ
   * @param {number} ms - 待機ミリ秒
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 音声読み上げを即時停止
   */
  stop() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
    this.isSpeaking = false;
  }

  /**
   * 単一テキストの音声発話（内部メソッド・シーケンシャル再生対応）
   * ②全体のキー音（ピッチ）を大幅に引き上げ（1.55）、再生速度をゆっくり（0.72）に設定
   * @param {string} text - 発音するテキスト
   * @param {Object} [options] - 発話オプション（pitch, volume, rate）
   * @returns {Promise<void>} 発話終了時に解決されるプロミス
   */
  speakText(text, options = {}) {
    return new Promise(resolve => {
      if (!("speechSynthesis" in window)) {
        resolve();
        return;
      }
      this.init();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ja-JP";
      utterance.rate = options.rate ?? 0.72; // 幼児向けにゆっくり聞き取りやすい速度
      utterance.pitch = options.pitch ?? 1.55; // ② 全体的にキー（ピッチ）を1.55に引き上げ！
      utterance.volume = options.volume ?? 1.0; // ボリューム設定

      if (this.voices.length === 0) {
        this.voices = window.speechSynthesis.getVoices();
      }
      const japaneseVoice = this.voices.find(v => v.lang === "ja-JP" && !v.name.includes("Google"));
      if (japaneseVoice) utterance.voice = japaneseVoice;

      this.currentUtterance = utterance;

      let hasResolved = false;
      const finish = () => {
        if (!hasResolved) {
          hasResolved = true;
          this.currentUtterance = null;
          resolve();
        }
      };

      utterance.onend = finish;
      utterance.onerror = finish;

      // 安全タイマー
      const maxDuration = Math.max(1800, text.length * 500 + 1000);
      setTimeout(finish, maxDuration);

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * 単発の音声発話
   * @param {string} text - 発音するテキスト
   * @returns {Promise<void>}
   */
  async speak(text) {
    this.stop();
    await this.sleep(40);
    this.isSpeaking = true;
    try {
      await this.speakText(text);
    } finally {
      this.isSpeaking = false;
    }
  }

  /**
   * 押された文字ボタンの発音
   * ボタンを押したときに対応する文字音声を再生
   * @param {string} char - 押された文字（「あ」「しゃ」等）
   * @returns {Promise<void>}
   */
  async speakChar(char) {
    this.stop();
    await this.sleep(30);
    this.isSpeaking = true;
    try {
      await this.speakText(char, { pitch: 1.55, volume: 1.0, rate: 0.75 });
    } finally {
      this.isSpeaking = false;
    }
  }

  /**
   * 出題音声の発話
   * 1問目: 「始めるよ！」→（間）→「か」（ピッチ1.68＆大音量）→（間）→「どぉれだ？」
   * 2問目以降: 「つぎの もんだい！」→（間）→「か」（ピッチ1.68＆大音量）→（間）→「どぉれだ？」
   * @param {string} target - 出題文字または単語
   * @param {boolean} isFirst - 最初の問題かどうか
   * @returns {Promise<void>}
   */
  async speakQuestion(target, isFirst = false) {
    this.stop();
    await this.sleep(40);
    this.isSpeaking = true;

    try {
      if (isFirst) {
        // 1問目開始時: 「はじめるよ！」
        await this.speakText("はじめるよ！");
      } else {
        // 2問目以降: 「つぎの もんだい！」
        await this.speakText("つぎの もんだい！");
      }

      // 文字の前の「間」
      await this.sleep(480);

      // 問題の文字「か」：ピッチ1.68、ボリューム最大でハッキリ際立たせる！
      await this.speakText(target, { pitch: 1.68, volume: 1.0, rate: 0.70 });

      // 文字の後の「間」
      await this.sleep(480);

      // 「どぉれだ？」
      await this.speakText("どぉれだ？");
    } finally {
      this.isSpeaking = false;
    }
  }

  /**
   * 正解時の褒め言葉音声の発話
   * @param {boolean} isLast - 最終問題かどうか
   * @returns {Promise<void>}
   */
  async speakCorrect(isLast = false) {
    this.stop();
    await this.sleep(40);
    this.isSpeaking = true;

    try {
      if (isLast) {
        await this.speakText("すごーい！ぜんぶ おわったよ！よくがんばったね！");
        return;
      }
      const phrases = [
        "すごーい！せいかい！",
        "やったー！だいせいかい！",
        "すごーい！よくできたね！"
      ];
      const phrase = phrases[Math.floor(Math.random() * phrases.length)];
      await this.speakText(phrase);
    } finally {
      this.isSpeaking = false;
    }
  }

  /**
   * 不正解時の励まし＆問題再読上げ音声の発話
   * 「うーん、おしい！もう一度かんがえてみてね！」→（間）→「か」（ピッチ1.68＆大音量）→（間）→「どぉれだ？」
   * @param {string} target - 出題文字または単語
   * @returns {Promise<void>}
   */
  async speakIncorrect(target = "") {
    this.stop();
    await this.sleep(40);
    this.isSpeaking = true;

    try {
      // 励まし音声
      await this.speakText("うーん、おしい！もう一度かんがえてみてね！");

      if (target) {
        // 励まし音声の後の「間」
        await this.sleep(520);

        // 問題の文字「か」：ピッチ1.68、ボリューム最大で際立たせる！
        await this.speakText(target, { pitch: 1.68, volume: 1.0, rate: 0.70 });

        // 文字の後の「間」
        await this.sleep(480);

        // 「どぉれだ？」
        await this.speakText("どぉれだ？");
      }
    } finally {
      this.isSpeaking = false;
    }
  }

  /**
   * もう一度音声を聞くときの発話（「か」→ 間 →「どぉれだ？」）
   * @param {string} target - 出題文字または単語
   * @returns {Promise<void>}
   */
  async speakRepeat(target) {
    this.stop();
    await this.sleep(40);
    this.isSpeaking = true;

    try {
      // 問題の文字「か」：ピッチ1.68、ボリューム最大で際立たせる！
      await this.speakText(target, { pitch: 1.68, volume: 1.0, rate: 0.70 });
      await this.sleep(480);
      await this.speakText("どぉれだ？");
    } finally {
      this.isSpeaking = false;
    }
  }

  /**
   * 効果音：ボタンタップ音
   */
  playPop() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  /**
   * 効果音：ピンポーン（正解音）
   */
  playCorrect() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [
      { f: 659.25, t: 0 },    // E5
      { f: 880.00, t: 0.15 }  // A5
    ].forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(note.f, now + note.t);
      gain.gain.setValueAtTime(0.3, now + note.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + note.t);
      osc.stop(now + note.t + 0.4);
    });
  }

  /**
   * 効果音：はなまるファンファーレ
   */
  playFanfare() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((frequency, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(frequency, now + index * 0.1);
      gain.gain.setValueAtTime(0.3, now + index * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.1 + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + index * 0.1);
      osc.stop(now + index * 0.1 + 0.35);
    });
  }
}

export const audio = new AudioManager();
