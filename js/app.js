import { audio } from "./audio.js?v=17";
import { ApiManager } from "./api.js?v=17";
import { GameManager } from "./game.js?v=17";
import { UIManager } from "./ui.js?v=17";
import { LETTER_MODES } from "./constants.js?v=17";

document.addEventListener("DOMContentLoaded", async () => {
  const game = new GameManager();
  await game.loadResources();

  let isProcessing = false; // 操作排他制御フラグ
  let currentLetterMode = "all"; // 単文字出題モード: 'all', 'seion', 'dakuon', 'youon'

  // 文字が押された時のハンドラ
  const handleCharInput = async (char, buttonElement) => {
    if (isProcessing) return;
    isProcessing = true;

    // 音声や演出が終わるまでキーボードを無効化（誤連打防止）
    ui.setKeyboardDisabled(true);

    try {
      // ① ボタンを押した瞬間に、選択した文字を問題エリア（スロット）に即座に表示！
      ui.showPendingInput(char);

      // ② ボタンに対応する文字音声を流す（子どもが目と耳で同時に文字を確認）
      await audio.speakChar(char);
      await audio.sleep(260); // 音声後の自然な間

      // 文字音声が流れた後に正解・不正解を判定
      const result = game.inputChar(char);

      if (result.isCorrect && result.isFinished) {
        // 正解・問題完了
        if (buttonElement) ui.highlightCorrectKey(buttonElement);

        const isLastQuestion = (game.currentIndex === game.questions.length - 1);

        // はなまる演出と「ピンポーン」効果音
        await ui.showHanamaru();

        if (game.nextQuestion()) {
          // 正解後：「すごーい！せいかい！」→ 少し間 →「つぎの もんだい！（間）『か』（間）どーーれだ？」
          await audio.speakCorrect(false);
          await audio.sleep(400);
          await nextTurn(false);
        } else {
          // 全問終了
          await audio.speakCorrect(true);
          showResults();
        }
      } else if (!result.isCorrect) {
        // 不正解：「うーん、おしい！もう一度かんがえてみてね！（間）『〇』（間）どーーれだ？」
        if (buttonElement) ui.shakeKey(buttonElement);
        ui.showIncorrectFeedback();
        ui.showIncorrectSlot(char); // スロットを誤答スタイルにして文字表示は維持

        const currentQuestion = game.getCurrentQuestion();
        if (currentQuestion) {
          // 音声が流れ終わるまで待機
          await audio.speakIncorrect(currentQuestion.speechText);
        }

        // ★ 音声が終わると同時に、スロットの表示を「？」に戻す！
        ui.resetQuestionSlot();

        // 音声が流れ終わったので回答再受付
        ui.setKeyboardDisabled(false);
      } else {
        // 単語問題で正しい文字を入力中（まだ完了していない場合）
        const currentQuestion = game.getCurrentQuestion();
        ui.updateQuestionView(currentQuestion, result.current);
        ui.setKeyboardDisabled(false);
      }
    } finally {
      isProcessing = false;
    }
  };

  const ui = new UIManager(game, handleCharInput);

  /**
   * 次のターン（出題）を開始
   * ② 音声が流れ終わるまでボタンを押せないように制御
   * @param {boolean} isFirst - 最初の問題かどうか
   */
  async function nextTurn(isFirst = false) {
    const currentQuestion = game.getCurrentQuestion();
    if (!currentQuestion) return;

    ui.updateQuestionView(currentQuestion);

    // ② 出題音声が流れ終わるまでキーボードをロック
    ui.setKeyboardDisabled(true);
    try {
      // ① 1問目: 「はじめるよ！（間）『か』（間）どーーれだ？」
      // ③ 2問目以降: 「つぎの もんだい！（間）『か』（間）どーーれだ？」
      await audio.speakQuestion(currentQuestion.speechText, isFirst);
    } finally {
      ui.setKeyboardDisabled(false);
    }
  }

  /**
   * 結果画面の表示
   */
  function showResults() {
    audio.playFanfare();
    const resultScoreElement = document.getElementById("result-score");
    if (resultScoreElement) {
      resultScoreElement.innerText = `${game.totalQuestions} もんちゅう ${game.score} もん せいかい！`;
    }
    ui.showScreen("screen-result");
  }

  // 出題モードボタンのバインド（50音のみ・濁音半濁音のみ・拗音のみ・すべて）
  const modeButtons = document.querySelectorAll("[data-letter-mode]");
  const updateModeBadges = (modeKey) => {
    const modeInfo = LETTER_MODES[modeKey] || LETTER_MODES.all;
    const badgeText = `しゅつだい: ${modeInfo.label}`;
    const badge1 = document.getElementById("mode-badge-1");
    const badge2 = document.getElementById("mode-badge-2");
    if (badge1) badge1.innerText = badgeText;
    if (badge2) badge2.innerText = badgeText;
  };

  modeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      audio.init();
      audio.playPop();

      const selectedMode = btn.dataset.letterMode;
      currentLetterMode = selectedMode;

      modeButtons.forEach(b => {
        const isActive = (b.dataset.letterMode === selectedMode);
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-checked", isActive ? "true" : "false");
      });

      updateModeBadges(selectedMode);
    });
  });

  // カテゴリー選択ボタンのバインド
  document.querySelectorAll("[data-category]").forEach(button => {
    button.addEventListener("click", async () => {
      audio.init();
      audio.playPop();

      const categoryId = parseInt(button.dataset.category, 10);
      // 単文字問題（①ひらがな・②カタカナ）には現在の出題モードを渡す
      game.setupGame(categoryId, currentLetterMode);
      
      // カタカナモードの切り替え
      const isKatakana = (categoryId === 2);
      ui.renderKeyboard(isKatakana);
      
      ui.showScreen("screen-game");
      await nextTurn(true); // 1問目は「始めるよ！」からスタート
    });
  });

  // 音声もう一度ボタン
  const repeatSoundButton = document.getElementById("btn-repeat-sound");
  if (repeatSoundButton) {
    repeatSoundButton.addEventListener("click", async () => {
      audio.init();
      audio.playPop();
      const currentQuestion = game.getCurrentQuestion();
      if (currentQuestion) {
        // ② 音声が流れ終わるまでキーボードともう1回ボタンをロック
        ui.setKeyboardDisabled(true);
        try {
          await audio.speakRepeat(currentQuestion.speechText);
        } finally {
          ui.setKeyboardDisabled(false);
        }
      }
    });
  }

  // トップへ戻るボタン
  const backMenuButton = document.getElementById("btn-back-menu");
  if (backMenuButton) {
    backMenuButton.addEventListener("click", () => {
      // 音声再生中や演出処理中は戻る処理を実行しない（誤タップ防止）
      if (audio.isSpeaking || isProcessing) return;
      audio.playPop();
      audio.stop();
      ui.showScreen("screen-menu");
    });
  }

  // リトライボタン
  const retryButton = document.getElementById("btn-retry");
  if (retryButton) {
    retryButton.addEventListener("click", () => {
      audio.playPop();
      audio.stop();
      ui.showScreen("screen-menu");
    });
  }

  // スプレッドシート設定モーダル
  const modal = document.getElementById("settings-modal");
  const gasInput = document.getElementById("gas-url-input");
  const settingsButton = document.getElementById("btn-settings");
  const saveSettingsButton = document.getElementById("btn-save-settings");
  const closeSettingsButton = document.getElementById("btn-close-settings");

  if (settingsButton && modal && gasInput) {
    settingsButton.addEventListener("click", () => {
      audio.playPop();
      gasInput.value = ApiManager.getGasUrl();
      modal.classList.add("open");
    });
  }

  if (saveSettingsButton && modal && gasInput) {
    saveSettingsButton.addEventListener("click", async () => {
      audio.playPop();
      ApiManager.setGasUrl(gasInput.value);
      await game.loadResources();
      modal.classList.remove("open");
      alert("スプレッドシート設定をほぞんしました！");
    });
  }

  if (closeSettingsButton && modal) {
    closeSettingsButton.addEventListener("click", () => {
      audio.playPop();
      modal.classList.remove("open");
    });
  }

  // PWA Service Worker 登録
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(console.error);
    });
  }
});
