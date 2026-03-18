import { Bot, Context } from "grammy";
import logger from "../utils/logger";

let botInstance: Bot<Context> | null = null;

// Deduplication: xato xabarlari 60 soniya ichida bir marta
const recentAlerts = new Map<string, number>();
const DEDUP_WINDOW_MS = 60_000;

export function setAdminNotifierBot(bot: Bot<Context>): void {
  botInstance = bot;
}

export async function sendAdminAlert(
  message: string,
  error?: Error,
  context?: Record<string, unknown>
): Promise<void> {
  const adminId = process.env.ADMIN_TELEGRAM_ID ?? "752634550";
  const timestamp = new Date().toISOString();

  // Deduplication key
  const dedupKey = `${message}::${error?.message ?? ""}`;
  const lastSent = recentAlerts.get(dedupKey);
  if (lastSent && Date.now() - lastSent < DEDUP_WINDOW_MS) {
    logger.debug(
      { dedupKey, context },
      "Admin alert skipped (duplicate within 60s)"
    );
    return;
  }
  recentAlerts.set(dedupKey, Date.now());

  // Log darajasida yozish (har doim)
  logger.error(
    { context, error: error?.message, stack: error?.stack },
    message
  );

  // botInstance yo'q bo'lsa faqat log
  if (!botInstance) {
    logger.warn("adminNotifier: botInstance null, Telegram xabar yuborilmadi");
    return;
  }

  const contextStr = context ? JSON.stringify(context, null, 2) : "—";
  const errorMsg = error?.message ?? "—";

  const text =
    `🚨 Xato yuz berdi!\n` +
    `📍 ${contextStr}\n` +
    `💬 ${message}\n` +
    `❌ ${errorMsg}\n` +
    `🕐 ${timestamp}`;

  try {
    await botInstance.api.sendMessage(adminId, text);
  } catch (sendErr) {
    // Rekursiv loop yo'q — faqat logger ga yozamiz
    logger.error(
      { error: (sendErr as Error).message },
      "adminNotifier: Telegram xabar yuborishda xato"
    );
  }
}
