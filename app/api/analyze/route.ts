// ============================================
// Analyze Route — 手動查詢備用 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { analyzeStock } from '@/lib/gemini';
import { verifyApiToken, isValidStockCode, securityHeaders } from '@/lib/security';

export const runtime = 'edge';

/**
 * GET — 手動查詢股票分析
 * 使用方式：/api/analyze?stock=2330
 */
export async function GET(request: NextRequest) {
  // 驗證 API Token
  if (!verifyApiToken(request)) {
    return NextResponse.json(
      { error: '未授權' },
      { status: 401, headers: securityHeaders() }
    );
  }

  const url = new URL(request.url);
  const stockCode = url.searchParams.get('stock');

  if (!stockCode) {
    return NextResponse.json(
      { error: '請提供股票代碼', usage: '/api/analyze?stock=2330&api_key=...' },
      { status: 400, headers: securityHeaders() }
    );
  }

  if (!isValidStockCode(stockCode)) {
    return NextResponse.json(
      { error: '無效的股票代碼格式，請輸入 4-5 位數字' },
      { status: 400, headers: securityHeaders() }
    );
  }

  try {
    const analysis = await analyzeStock(stockCode);
    return NextResponse.json(
      { ok: true, data: analysis, timestamp: new Date().toISOString() },
      { headers: securityHeaders() }
    );
  } catch (error) {
    console.error('分析失敗:', error);
    return NextResponse.json(
      { ok: false, error: '分析失敗' },
      { status: 500, headers: securityHeaders() }
    );
  }
}
