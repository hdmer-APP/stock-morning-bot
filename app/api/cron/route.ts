// ============================================
// Cron Route — 每日定時推播
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { analyzeMultipleStocks } from '@/lib/gemini';
import { broadcastReport } from '@/lib/telegram';

export const runtime = 'edge';

/**
 * 驗證 Cron Secret
 */
function verifyCronSecret(request: NextRequest): boolean {
  // Vercel Cron 會帶 Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    if (token === process.env.CRON_SECRET) {
      return true;
    }
  }

  // 也支援 query parameter（本機測試用）
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  if (secret === process.env.CRON_SECRET) {
    return true;
  }

  return false;
}

/**
 * GET — 每日定時推播（由 Vercel Cron 觸發）
 * 排程：30 0 * * 1-5（UTC 00:30 = 台北 08:30，週一至週五）
 */
export async function GET(request: NextRequest) {
  // 驗證密鑰
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: '未授權存取' },
      { status: 401 }
    );
  }

  try {
    // 取得預設股票清單
    const defaultStocks = process.env.DEFAULT_STOCKS?.split(',').map(s => s.trim()).filter(Boolean) || ['2330'];

    console.log(`🕐 Cron 觸發：分析 ${defaultStocks.join(', ')}`);

    // 分析所有預設股票
    const analyses = await analyzeMultipleStocks(defaultStocks);

    // 廣播每份報告
    const results = [];
    for (const analysis of analyses) {
      const result = await broadcastReport(analysis.report);
      results.push({
        stock: analysis.stockCode,
        ...result,
      });
    }

    console.log('✅ Cron 推播完成:', results);

    return NextResponse.json({
      ok: true,
      message: '晨間報告推播完成',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Cron 執行失敗:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Cron 執行失敗',
        message: error instanceof Error ? error.message : '未知錯誤',
      },
      { status: 500 }
    );
  }
}
