# 股票晨間分析系統 — PROJECT_CONTEXT.md

---

## 🔖 快速啟動區

**上次停在**：專案初始化完成，git init + 初次 commit，等待 GitHub Personal Access Token 以完成 push

**最新測試結果**：尚未執行（Build 狀態待確認）

**下一步表格**：

| 優先 | 任務 | 狀態 |
|------|------|------|
| 🔴 | git push 到 GitHub (hdmer-APP/stock-morning-bot) | 等待 PAT |
| 🔴 | 部署至 Vercel | 待辦 |
| 🟡 | 設定 Vercel 環境變數 | 待辦 |
| 🟡 | 設定 Telegram Webhook URL | 待辦 |
| 🟢 | 測試 /webhook 端點 | 待辦 |
| 🟢 | 測試 /cron 端點 | 待辦 |

**已知問題**：無

---

## 專案簡介

台股晨間分析 Bot，每日平日 08:30（台北時間）自動推播 AI 分析報告至 Telegram。

- **前端框架**：Next.js 16 (App Router) + TypeScript
- **AI 引擎**：Google Gemini 2.0 Flash（含 Google Search Grounding）
- **推播渠道**：Telegram Bot API
- **部署平台**：Vercel（Edge Runtime）
- **排程觸發**：Vercel Cron（UTC 00:30 = 台北 08:30，週一至週五）

---

## 目錄結構

```
stock-morning-bot/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts   # 手動分析 API
│   │   ├── cron/route.ts      # Vercel Cron 觸發端點
│   │   └── webhook/route.ts   # Telegram Webhook 端點
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx               # 狀態頁（簡單 UI）
├── lib/
│   ├── gemini.ts              # Gemini AI 分析邏輯
│   ├── prompt.ts              # Prompt 模板
│   └── telegram.ts            # Telegram 發送邏輯
├── types/
│   └── index.ts               # 型別定義
├── public/                    # 靜態資源
├── .env.example               # 環境變數範本
├── vercel.json                # Vercel Cron 設定
└── PROJECT_CONTEXT.md         # 本檔案
```

---

## 關鍵模組說明

### `lib/gemini.ts`
- `analyzeStock(stockCode)` — 呼叫 Gemini 2.0 Flash 分析單支股票，啟用 Google Search Grounding 取得即時數據
- `analyzeMultipleStocks(stockCodes[])` — 批次分析，失敗個別補錯誤訊息
- 台北時間日期計算（`getTaipeiDate()`）

### `lib/telegram.ts`
- `sendMessage(chatId, text)` — 發送 Markdown 訊息，超過 4000 字元自動分段；Markdown 解析失敗自動 fallback 純文字
- `broadcastReport(report)` — 廣播至所有推播目標（個人 + 群組）
- `getBroadcastTargets()` — 從環境變數讀取目標清單

### `lib/prompt.ts`
- Gemini 分析用 Prompt 模板
- Telegram Bot 回應文字（WELCOME_MESSAGE、HELP_MESSAGE、UNKNOWN_INPUT_MESSAGE）

### `app/api/webhook/route.ts`
- 接收 Telegram Webhook，解析使用者輸入的股票代碼（4-5 位數字）
- 支援：`/start`、`/help`、純股票代碼、自然語言（最多同時查 5 支）
- 回 200 避免 Telegram 重試

### `app/api/cron/route.ts`
- Vercel Cron 觸發（Authorization: Bearer CRON_SECRET）
- 也支援 `?secret=` query param（本機測試用）
- 分析 `DEFAULT_STOCKS` 環境變數中的股票清單

---

## 環境變數

參考 `.env.example`：

| 變數名 | 說明 | 必填 |
|--------|------|------|
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token | ✅ |
| `TELEGRAM_CHAT_IDS` | 個人推播 Chat ID（逗號分隔） | ✅ |
| `TELEGRAM_GROUP_ID` | 群組推播 Chat ID | ❌ |
| `GEMINI_API_KEY` | Google Gemini API Key | ✅ |
| `CRON_SECRET` | Cron 驗證密鑰 | ✅ |
| `DEFAULT_STOCKS` | 預設股票清單（逗號分隔） | ✅ |

---

## 部署流程（Vercel）

1. `git push` 至 GitHub
2. Vercel 連接 GitHub repo 自動部署
3. 在 Vercel Dashboard 設定環境變數
4. 設定 Telegram Webhook：
   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<YOUR_DOMAIN>/api/webhook
   ```
5. Vercel Cron 設定已在 `vercel.json` 中定義（`30 0 * * 1-5`）

---

## 編碼規範

- **語言**：繁體中文（UI、註解）；英文（變數、函式名）
- **Runtime**：全部使用 `edge` runtime（Vercel Edge Functions）
- **型別**：嚴格 TypeScript，型別定義集中在 `types/index.ts`

---

## 更新紀錄

| 日期 | 說明 |
|------|------|
| 2026-03-20 | 專案初始化，git init，建立 PROJECT_CONTEXT.md 與 .claudeignore |
