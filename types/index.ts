// ============================================
// 股票晨間分析系統 — 型別定義
// ============================================

/** 股價預測情境 */
export interface PriceScenario {
  label: string;       // 樂觀 / 基本 / 悲觀
  low: number;
  high: number;
  confidence: number;  // 0-100 信心指數
}

/** 完整分析報告結構 */
export interface StockAnalysis {
  stockCode: string;
  stockName: string;
  analysisDate: string;
  report: string;         // Gemini 生成的完整 Markdown 報告
}

/** Telegram Update 訊息結構（簡化版） */
export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
  };
}

/** 環境變數型別 */
export interface EnvConfig {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_IDS: string;
  TELEGRAM_GROUP_ID?: string;
  GEMINI_API_KEY: string;
  CRON_SECRET: string;
  DEFAULT_STOCKS: string;
}

/** 推播目標 */
export type BroadcastTarget = {
  chatId: string;
  type: 'personal' | 'group';
};
