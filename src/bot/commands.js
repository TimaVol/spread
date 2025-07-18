// src/bot/commands.js
import { TELEGRAM_AUTHORIZED_USER_ID } from '../config/index.js';

export function registerBotCommands(bot, messages, { getYouTubeAuthUrl }) {
  bot.onText(/^\/auth_youtube$/, async (msg) => {
    const chatId = msg.chat.id;
    if (parseInt(TELEGRAM_AUTHORIZED_USER_ID, 10) !== chatId) return;
    const { url } = getYouTubeAuthUrl();
    await bot.sendMessage(chatId, messages.youtubeAuth(url), { parse_mode: 'Markdown' });
  });
  // Add more command handlers here as needed
}