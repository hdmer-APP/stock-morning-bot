// ============================================
// Telegram Webhook — 雙向互動 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { analyzeStock, analyzeMultipleStocks } from '@/lib/gemini';
import { sendMessage } from '@/lib/telegram';
import { WELCOME_MESSAGE, HELP_MESSAGE, UNKNOWN_INPUT_MESSAGE } from '@/lib/prompt';
import { verifyWebhookSecret, isValidStockCode, securityHeaders } from '@/lib/security';
import type { TelegramUpdate } from '@/types';

export const runtime = 'edge';

/**
 * 從使用者輸入中解析股票代碼
 * 支援：
 * - 純數字：2330
 * - 多代碼：2330 2317
 * - 自然語言：幫我看 6505、分析 2330
 */
function parseStockCodes(text: string): string[] {
  // 移除 slash 指令前綴
  const cleanText = text.replace(/^\/\w+\s*/, '').trim();

  // 匹配 4-5 位數字的股票代碼，過濾無效格式
  const rawCodes = cleanText.match(/\b(\d{4,5})\b/g) ?? [];
  const codes = rawCodes.filter(isValidStockCode);

  if (codes.length > 0) {
    // 去重複，最多 3 支（防止濫用）
    return [...new Set(codes)].slice(0, 3);
  }

  return [];
}

/**
 * 處理 Telegram Webhook POST 請求
 */
export async function POST(request: NextRequest) {
  // 驗證來源為 Telegram
  if (!verifyWebhookSecret(request)) {
    return new NextResponse(null, { status: 403, headers: securityHeaders() });
  }

  try {
    const update: TelegramUpdate = await request.json();
    const message = update.message;

    if (!message?.text || !message.chat) {
      return NextResponse.json({ ok: true });
    }

    const chatId = String(message.chat.id);
    const text = message.text.trim();

    // 處理 Slash 指令
    if (text === '/start') {
      await sendMessage(chatId, WELCOME_MESSAGE);
      return NextResponse.json({ ok: true });
    }

    if (text === '/help') {
      await sendMessage(chatId, HELP_MESSAGE);
      return NextResponse.json({ ok: true });
    }

    // 解析股票代碼
    const stockCodes = parseStockCodes(text);

    if (stockCodes.length === 0) {
      await sendMessage(chatId, UNKNOWN_INPUT_MESSAGE);
      return NextResponse.json({ ok: true });
    }

    // 發送「分析中」提示
    const loadingText = stockCodes.length === 1
      ? `🔍 正在分析 **${stockCodes[0]}**，請稍候...`
      : `🔍 正在分析 ${stockCodes.map(c => `**${c}**`).join('、')}，請稍候...`;
    await sendMessage(chatId, loadingText);

    // 執行分析並回覆
    if (stockCodes.length === 1) {
      const analysis = await analyzeStock(stockCodes[0]);
      await sendMessage(chatId, analysis.report);
    } else {
      const analyses = await analyzeMultipleStocks(stockCodes);
      for (const analysis of analyses) {
        await sendMessage(chatId, analysis.report);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook 處理錯誤:', error);
    return NextResponse.json({ ok: true }, { headers: securityHeaders() });
  }
}

/**
 * GET — 用於 Webhook 驗證
 */
export async function GET() {
  return NextResponse.json(
    { status: 'ok', message: 'Webhook is running' },
    { headers: securityHeaders() }
  );
}
