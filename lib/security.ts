// ============================================
// 資安防護層
// ============================================

/**
 * 驗證 Telegram Webhook 密鑰
 * Telegram 在 header X-Telegram-Bot-Api-Secret-Token 帶入設定的密鑰
 */
export function verifyWebhookSecret(request: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return true; // 未設定則略過（開發模式）

  const headerToken = request.headers.get('x-telegram-bot-api-secret-token');
  if (!headerToken) return false;

  // 使用固定時間比較，防止 timing attack
  return timingSafeEqual(headerToken, secret);
}

/**
 * 驗證 API 請求的授權 Token
 * 支援 Authorization: Bearer <token> 或 ?api_key=<token>
 */
export function verifyApiToken(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  // Header 驗證
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return timingSafeEqual(authHeader.slice(7), secret);
  }

  // Query param 驗證
  const url = new URL(request.url);
  const token = url.searchParams.get('api_key');
  if (token) return timingSafeEqual(token, secret);

  return false;
}

/**
 * 驗證股票代碼格式（4-5 位數字）
 */
export function isValidStockCode(code: string): boolean {
  return /^\d{4,5}$/.test(code);
}

/**
 * 清理字串，防止 HTML 注入
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 固定時間字串比較（防 timing attack）
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * 標準安全 Response Headers
 */
export function securityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
  };
}
