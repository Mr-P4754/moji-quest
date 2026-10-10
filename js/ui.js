import { KEYBOARD_COLUMNS, toKatakana } from "./constants.js?v=18";
import { audio } from "./audio.js?v=18";

/**
 * UI表示・イベント演出管理クラス
 * 縦5段（あ・い・う・え・お）の五十音キーボードの動的構築、段インジケーター、花丸（💮）演出を担当
 */
export class UIManager {
  /**
   * @param {import("./game.js").GameManager} gameManager - ゲーム管理インスタンス
   * @param {function(string, HTMLButtonElement): void} onCharPress - 文字キーが押された時のコールバック
   */
  constructor(gameManager, onCharPress) {
    this.game = gameManager;
    this.onCharPress = onCharPress;
    this.keyboardContainer = document.getElementById("keyboard-matrix");
  }

  /**
   * 画面の切り替え
   * @param {string} screenId - 表示する画面要素のID
   */
  showScreen(screenId) {
    document.querySelectorAll(".screen").forEach(element => element.classList.remove("active"));
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.classList.add("active");
    }
  }

  /**
   * 縦5段の五十音キーボードを描画
   * 上段に清音（あ〜わ行の10列）、下段スペースに濁音・半濁音・拗音を配置し、横スクロールなしで1画面表示を実現
   * 段ラベル（あ段等）は削除し、全幅を文字ボタンスペースに充当
   * @param {boolean} isKatakana - カタカナ表示モードフラグ
   */
  renderKeyboard(isKatakana = false) {
    this.keyboardContainer.innerHTML = "";

    // 列グループ生成ヘルパー
    const createColumnGroup = (columns, className) => {
      const fragment = document.createDocumentFragment();
      // 教科書配置（右があ行・が行、左がわ行・小文字）にするため逆順配置
      [...columns].reverse().forEach(col => {
        const colDiv = document.createElement("div");
        colDiv.className = `keyboard-column ${className}`;

        col.chars.forEach(char => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "key-btn";
          if (!char) {
            btn.classList.add("key-empty");
            btn.disabled = true;
          } else {
            const displayChar = isKatakana ? toKatakana(char) : char;
            btn.innerText = displayChar;
            btn.dataset.char = displayChar;
            if (displayChar.length > 1) {
              btn.classList.add("key-multichar");
            }
            btn.onclick = () => {
              audio.playPop();
              this.onCharPress(displayChar, btn);
            };
          }
          colDiv.appendChild(btn);
        });
        fragment.appendChild(colDiv);
      });
      return fragment;
    };

    // ① 上段：清音ブロック（あいうえお表・10列）
    const seionSection = document.createElement("div");
    seionSection.className = "keyboard-section keyboard-seion-section";
    seionSection.appendChild(createColumnGroup(KEYBOARD_COLUMNS.seion, "group-seion"));
    this.keyboardContainer.appendChild(seionSection);

    // ② 区切りミニバナー
    const divider = document.createElement("div");
    divider.className = "keyboard-sub-divider";
    divider.innerHTML = `<span>だくおん・はんだくおん・ようおん</span>`;
    this.keyboardContainer.appendChild(divider);

    // ③ 下段：濁音・半濁音・拗音ブロック（あいうえおの下のスペースに配置）
    const subSection = document.createElement("div");
    subSection.className = "keyboard-section keyboard-sub-section";

    // 結合拗音（しゃ・しゅ・しょ、ちゃ・ちゅ・ちょ等）
    if (KEYBOARD_COLUMNS.youon) {
      subSection.appendChild(createColumnGroup(KEYBOARD_COLUMNS.youon, "group-komoji group-youon"));
    }
    // 半濁音（ぱ行）
    subSection.appendChild(createColumnGroup(KEYBOARD_COLUMNS.handakuon, "group-handakuon"));
    // 濁音（が行〜ば行）
    subSection.appendChild(createColumnGroup(KEYBOARD_COLUMNS.dakuon, "group-dakuon"));

    this.keyboardContainer.appendChild(subSection);
  }

  /**
   * 音声発話中のキーボード・ボタン操作可否を切り替え
   * 音声が流れ終わるまでボタンを押せないように制御
   * @param {boolean} disabled - 無効化フラグ
   */
  setKeyboardDisabled(disabled) {
    const keys = this.keyboardContainer.querySelectorAll(".key-btn");
    keys.forEach(btn => {
      if (!btn.classList.contains("key-empty")) {
        btn.disabled = disabled;
      }
    });

    // もう１かいボタンのロック制御
    const repeatBtn = document.getElementById("btn-repeat-sound");
    if (repeatBtn) {
      repeatBtn.disabled = disabled;
      repeatBtn.style.opacity = disabled ? "0.55" : "1";
      repeatBtn.style.pointerEvents = disabled ? "none" : "auto";
    }

    // もどるボタンのロック制御（音声が流れている時は押せないように制御）
    const backBtn = document.getElementById("btn-back-menu");
    if (backBtn) {
      backBtn.disabled = disabled;
      backBtn.style.opacity = disabled ? "0.55" : "1";
      backBtn.style.pointerEvents = disabled ? "none" : "auto";
    }

    if (disabled) {
      this.keyboardContainer.classList.add("keyboard-disabled");
    } else {
      this.keyboardContainer.classList.remove("keyboard-disabled");
    }
  }

  /**
   * 間違えたキーを揺らす視覚アニメーション
   * @param {HTMLButtonElement} button - クリックされたボタン
   */
  shakeKey(button) {
    if (!button) return;
    button.classList.add("key-shake");
    setTimeout(() => {
      button.classList.remove("key-shake");
    }, 500);
  }

  /**
   * 正解したキーをハイライトするアニメーション
   * @param {HTMLButtonElement} button - クリックされたボタン
   */
  highlightCorrectKey(button) {
    if (!button) return;
    button.classList.add("key-correct-flash");
    setTimeout(() => {
      button.classList.remove("key-correct-flash");
    }, 600);
  }

  /**
   * 問題出題カードの表示更新
   * @param {Object} currentQuestion - 現在の問題情報
   * @param {string} currentInput - 現在入力中の文字列
   */
  updateQuestionView(currentQuestion, currentInput = "") {
    const progressElement = document.getElementById("q-progress");
    const visualElement = document.getElementById("q-visual");
    const slotsElement = document.getElementById("q-slots");

    if (this.game.category === 1 || this.game.category === 2) {
      const modeInfo = this.game.getLetterModeInfo();
      const modeText = modeInfo.id === "all" ? "" : `（${modeInfo.label}）`;
      progressElement.innerText = `だい ${this.game.currentIndex + 1} もん${modeText}`;
      visualElement.innerText = "🔊";
      slotsElement.innerHTML = `<span class="slot active">?</span>`;
    } else if (this.game.category === 3) {
      progressElement.innerText = `だい ${this.game.currentIndex + 1} もん / ぜんぶで ${this.game.totalQuestions} もん`;
      visualElement.innerText = "🔊";
      this._renderSlots(slotsElement, currentQuestion.target.length, currentInput);
    } else if (this.game.category === 4) {
      progressElement.innerText = `だい ${this.game.currentIndex + 1} もん / ぜんぶで ${this.game.totalQuestions} もん`;
      visualElement.innerText = currentQuestion.display;
      this._renderSlots(slotsElement, currentQuestion.target.length, currentInput);
    }
  }

  /**
   * ボタンを押した瞬間に選択した文字をスロットに即時反映
   * @param {string} char - 押された文字
   */
  showPendingInput(char) {
    const slotsElement = document.getElementById("q-slots");
    if (!slotsElement) return;

    if (this.game.category === 1 || this.game.category === 2) {
      slotsElement.innerHTML = `<span class="slot active filled">${char}</span>`;
    } else {
      const currentQuestion = this.game.getCurrentQuestion();
      if (currentQuestion) {
        const tempInput = (this.game.currentInput || "") + char;
        this._renderSlots(slotsElement, currentQuestion.target.length, tempInput, false);
      }
    }
  }

  /**
   * 誤答時にスロットに誤答スタイル（赤枠）を適用（文字は表示維持）
   * @param {string} char - 押された文字
   */
  showIncorrectSlot(char) {
    const slotsElement = document.getElementById("q-slots");
    if (!slotsElement) return;

    if (this.game.category === 1 || this.game.category === 2) {
      slotsElement.innerHTML = `<span class="slot active incorrect">${char}</span>`;
    } else {
      const currentQuestion = this.game.getCurrentQuestion();
      if (currentQuestion) {
        const tempInput = (this.game.currentInput || "") + char;
        this._renderSlots(slotsElement, currentQuestion.target.length, tempInput, true);
      }
    }
  }

  /**
   * 誤答音声終了時にスロットの表示を「？」または入力待ちに戻す
   */
  resetQuestionSlot() {
    const slotsElement = document.getElementById("q-slots");
    if (!slotsElement) return;

    if (this.game.category === 1 || this.game.category === 2) {
      slotsElement.innerHTML = `<span class="slot active">?</span>`;
    } else {
      const currentQuestion = this.game.getCurrentQuestion();
      if (currentQuestion) {
        this._renderSlots(slotsElement, currentQuestion.target.length, this.game.currentInput || "", false);
      }
    }
  }

  /**
   * 単語問題用の文字入力スロット描画
   * @private
   * @param {HTMLElement} container - スロット配置コンテナ
   * @param {number} targetLength - 目標文字長
   * @param {string} currentInput - 入力済み文字
   * @param {boolean} [isIncorrect=false] - 最後の入力文字が誤答かどうか
   */
  _renderSlots(container, targetLength, currentInput, isIncorrect = false) {
    container.innerHTML = "";
    for (let index = 0; index < targetLength; index++) {
      const slot = document.createElement("span");
      slot.className = "slot";
      if (index < currentInput.length) {
        slot.innerText = currentInput[index];
        if (isIncorrect && index === currentInput.length - 1) {
          slot.classList.add("incorrect");
        } else {
          slot.classList.add("filled");
        }
      } else if (index === currentInput.length) {
        slot.classList.add("active");
        slot.innerText = "＿";
      } else {
        slot.innerText = "＿";
      }
      container.appendChild(slot);
    }
  }

  /**
   * はなまる（💮）アニメーション表示演出
   * @returns {Promise<void>} 演出終了プロミス
   */
  showHanamaru() {
    return new Promise(resolve => {
      const overlay = document.getElementById("hanamaru-overlay");
      overlay.classList.add("show");
      audio.playCorrect();
      setTimeout(() => {
        overlay.classList.remove("show");
        resolve();
      }, 900);
    });
  }

  /**
   * おしい！ 不正解モーダル/トースト表示演出
   * @param {string} [expectedChar] - 正解の文字（省略時はヒントなしの励ましメッセージ）
   * @returns {Promise<void>}
   */
  showIncorrectFeedback(expectedChar = "") {
    return new Promise(resolve => {
      const feedback = document.getElementById("incorrect-feedback");
      if (!feedback) {
        resolve();
        return;
      }
      const charSpan = document.getElementById("incorrect-expected-char");
      const detailSpan = feedback.querySelector(".incorrect-detail");
      if (charSpan && expectedChar) {
        charSpan.innerText = expectedChar;
        if (detailSpan) detailSpan.style.display = "block";
      } else if (detailSpan) {
        detailSpan.style.display = "none";
      }
      feedback.classList.add("show");
      setTimeout(() => {
        feedback.classList.remove("show");
        resolve();
      }, 1200);
    });
  }
}
