// ============================================
// 股票晨間分析系統 — Gemini AI 分析邏輯
// ============================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateAnalysisPrompt } from './prompt';
import type { StockAnalysis } from '@/types';

// 初始化 Gemini
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 環境變數未設定');
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * 取得台北時間的今日日期字串
 */
function getTaipeiDate(): string {
  const now = new Date();
  const taipeiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  const year = taipeiTime.getFullYear();
  const month = String(taipeiTime.getMonth() + 1).padStart(2, '0');
  const day = String(taipeiTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 取得台北時間的上一個交易日日期字串（跳過週末）
 */
function getYesterdayTradingDate(): string {
  const now = new Date();
  const taipeiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  taipeiTime.setDate(taipeiTime.getDate() - 1);
  // 週日 → 往回到週五
  if (taipeiTime.getDay() === 0) taipeiTime.setDate(taipeiTime.getDate() - 2);
  // 週六 → 往回到週五
  else if (taipeiTime.getDay() === 6) taipeiTime.setDate(taipeiTime.getDate() - 1);
  const year = taipeiTime.getFullYear();
  const month = String(taipeiTime.getMonth() + 1).padStart(2, '0');
  const day = String(taipeiTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 使用 Gemini 分析單支股票
 * @param stockCode - 台股代碼，例如 "2330"
 * @returns StockAnalysis 分析結果
 */
export async function analyzeStock(stockCode: string): Promise<StockAnalysis> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
      temperature: 0.1,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 4096,
    },
  });

  const currentDate = getTaipeiDate();
  const yesterdayDate = getYesterdayTradingDate();
  const prompt = generateAnalysisPrompt(stockCode, currentDate, yesterdayDate);

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      // 啟用 Google Search grounding 以取得最新數據
      tools: [{ googleSearch: {} } as any],  // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    const response = result.response;
    const report = response.text();

    return {
      stockCode,
      stockName: stockCode, // Gemini 回覆中會包含股票名稱
      analysisDate: currentDate,
      report,
    };
  } catch (error) {
    console.error(`分析股票 ${stockCode} 失敗:`, error);
    throw new Error(`分析股票 ${stockCode} 時發生錯誤，請稍後再試。`);
  }
}

/**
 * 批次分析多支股票
 * @param stockCodes - 股票代碼陣列
 * @returns 分析結果陣列
 */
export async function analyzeMultipleStocks(stockCodes: string[]): Promise<StockAnalysis[]> {
  const results: StockAnalysis[] = [];

  for (const code of stockCodes) {
    try {
      const analysis = await analyzeStock(code);
      results.push(analysis);
    } catch (error) {
      console.error(`股票 ${code} 分析失敗:`, error);
      results.push({
        stockCode: code,
        stockName: code,
        analysisDate: getTaipeiDate(),
        report: `❌ 股票 ${code} 分析失敗，請稍後再試。`,
      });
    }
  }

  return results;
}
