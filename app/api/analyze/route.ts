// ============================================
// Analyze Route — 手動查詢備用 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { analyzeStock } from '@/lib/gemini';

export const runtime = 'edge';

/**
 * GET — 手動查詢股票分析
 * 使用方式：/api/analyze?stock=2330
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const stockCode = url.searchParams.get('stock');

  if (!stockCode) {
    return NextResponse.json(
      {
        error: '請提供股票代碼',
        usage: '/api/analyze?stock=2330',
      },
      { status: 400 }
    );
  }

  // 驗證股票代碼格式（4-5 位數字）
  if (!/^\d{4,5}$/.test(stockCode)) {
    return NextResponse.json(
      {
        error: '無效的股票代碼格式',
        message: '請輸入 4-5 位數字的台股代碼',
      },
      { status: 400 }
    );
  }

  try {
    const analysis = await analyzeStock(stockCode);

    return NextResponse.json({
      ok: true,
      data: analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('分析失敗:', error);
    return NextResponse.json(
      {
        ok: false,
        error: '分析失敗',
        message: error instanceof Error ? error.message : '未知錯誤',
      },
      { status: 500 }
    );
  }
}
