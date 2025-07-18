// src/utils/error_handler.js
import { logger } from './logger.js';

/**
 * Centralized error handler for the Telegram bot.
 * Logs error, sends user-friendly message, and can notify developer if needed.
 * @param {Error} error
 * @param {object} options { chatId, bot, context, notifyDev }
 */
export async function handleBotError(error, { chatId, bot, context = '', notifyDev = false }) {
  logger.error(`[${context}]`, error);
  if (bot && chatId) {
    const userMessage = `❌ ${context ? context + ': ' : ''}${error.message || error}`;
    await bot.sendMessage(chatId, userMessage);
  }
  // Optionally notify developer (e.g., via Telegram channel or email)
  if (notifyDev) {
    // TODO: Implement developer notification (e.g., send to admin chat)
  }
}