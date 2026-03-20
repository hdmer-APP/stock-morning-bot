// ============================================
// 股票晨間分析系統 — Telegram 發送邏輯
// ============================================

import type { BroadcastTarget } from '@/types';

const TELEGRAM_API = 'https://api.telegram.org/bot';

/**
 * 取得 Bot Token
 */
function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN 環境變數未設定');
  }
  return token;
}

/**
 * 發送訊息至指定 Telegram chat
 * @param chatId - 聊天 ID（個人或群組）
 * @param text - 訊息內容（支援 Markdown）
 */
export async function sendMessage(chatId: string, text: string): Promise<boolean> {
  const token = getBotToken();

  // Telegram 限制每則訊息最長 4096 字元，超過需要分段
  const chunks = splitMessage(text, 4000);

  for (const chunk of chunks) {
    try {
      const response = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk,
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`發送訊息失敗 (chatId: ${chatId}):`, error);

        // 如果 Markdown 解析失敗，嘗試用純文字重發
        if (error?.description?.includes('parse')) {
          await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: chunk,
              disable_web_page_preview: true,
            }),
          });
        }
        return false;
      }
    } catch (error) {
      console.error(`發送訊息發生錯誤 (chatId: ${chatId}):`, error);
      return false;
    }
  }

  return true;
}

/**
 * 取得所有推播目標（個人 + 群組）
 */
export function getBroadcastTargets(): BroadcastTarget[] {
  const targets: BroadcastTarget[] = [];

  // 個人推播
  const personalIds = process.env.TELEGRAM_CHAT_IDS?.split(',').filter(Boolean) || [];
  for (const id of personalIds) {
    targets.push({ chatId: id.trim(), type: 'personal' });
  }

  // 群組推播
  const groupId = process.env.TELEGRAM_GROUP_ID;
  if (groupId) {
    targets.push({ chatId: groupId.trim(), type: 'group' });
  }

  return targets;
}

/**
 * 廣播報告至所有目標（Gemini 只分析一次，迴圈發送）
 * @param report - 分析報告文字
 */
export async function broadcastReport(report: string): Promise<{ success: number; failed: number }> {
  const targets = getBroadcastTargets();
  let success = 0;
  let failed = 0;

  for (const target of targets) {
    const ok = await sendMessage(target.chatId, report);
    if (ok) {
      success++;
      console.log(`✅ 已發送至 ${target.type} (${target.chatId})`);
    } else {
      failed++;
      console.error(`❌ 發送失敗 ${target.type} (${target.chatId})`);
    }
  }

  return { success, failed };
}

/**
 * 將長訊息分段（Telegram 每則上限 4096 字元）
 */
function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // 盡量在換行處分割
    let splitIndex = remaining.lastIndexOf('\n', maxLength);
    if (splitIndex === -1 || splitIndex < maxLength * 0.5) {
      splitIndex = maxLength;
    }

    chunks.push(remaining.substring(0, splitIndex));
    remaining = remaining.substring(splitIndex).trimStart();
  }

  return chunks;
}
