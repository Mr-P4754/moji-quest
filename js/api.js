import { DEFAULT_WORDS } from "./constants.js?v=17";

const STORAGE_KEY_GAS_URL = "kana_game_gas_url";
const STORAGE_KEY_DATA = "kana_game_cached_words";

/**
 * 外部API連携・キャッシュ管理クラス
 * カテゴリー③・④用のスプレッドシート（GAS）データ通信とキャッシュを管理
 */
export class ApiManager {
  /**
   * 保存されているGASのWebアプリURLを取得
   * @returns {string} GASのWebアプリURL
   */
  static getGasUrl() {
    return localStorage.getItem(STORAGE_KEY_GAS_URL) || "";
  }

  /**
   * GASのWebアプリURLを保存
   * @param {string} url - GASのWebアプリURL
   */
  static setGasUrl(url) {
    localStorage.setItem(STORAGE_KEY_GAS_URL, url.trim());
  }

  /**
   * スプレッドシートから単語データを取得（失敗時はキャッシュまたはデフォルトデータを利用）
   * @returns {Promise<Array<{text: string, emoji: string, kana: string}>>} 単語データの配列
   */
  static async fetchWords() {
    const url = this.getGasUrl();
    if (!url) {
      return this.getCachedWords();
    }

    try {
      const response = await fetch(url, { redirect: "follow" });
      if (!response.ok) throw new Error("ネットワークエラー");
      const data = await response.json();
      
      // スプレッドシートのデータを整形 [{ text, emoji, kana }]
      const formattedWords = data.map(item => ({
        text: item.text || item.word || "",
        emoji: item.emoji || "📝",
        kana: item.kana || item.text || ""
      }));

      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(formattedWords));
      return formattedWords;
    } catch (error) {
      console.warn("GASデータ取得失敗。キャッシュまたはデフォルトを使用:", error);
      return this.getCachedWords();
    }
  }

  /**
   * キャッシュされた単語データを取得（キャッシュがない場合は内蔵デフォルト）
   * @returns {Array<{text: string, emoji: string, kana: string}>} 単語データの配列
   */
  static getCachedWords() {
    const cachedData = localStorage.getItem(STORAGE_KEY_DATA);
    return cachedData ? JSON.parse(cachedData) : DEFAULT_WORDS;
  }
}
