import TelegramBot from 'node-telegram-bot-api';
import { postReelToInstagram } from '../platforms/instagram.js';
import { TELEGRAM_BOT_TOKEN, TELEGRAM_AUTHORIZED_USER_ID, TELEGRAM_WEBHOOK_PATH } from '../config/index.js';

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

export function setupTelegramBotWebhook(app) {
  app.post(TELEGRAM_WEBHOOK_PATH, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    const authorizedUserIdNum = parseInt(TELEGRAM_AUTHORIZED_USER_ID, 10);

    if (isNaN(authorizedUserIdNum) || authorizedUserIdNum !== chatId) {
      console.warn(`Unauthorized access attempt from Chat ID: ${chatId}. Message: "${text}"`);
      await bot.sendMessage(chatId, `🚫 Access Denied: I'm sorry, but this bot is configured for private use only. Your chat ID (${chatId}) is not authorized.`);
      return; // Stop processing the message
    }

    // Only allow messages with video_url and caption
    const videoUrlMatch = text && text.match(/video_url:\s*(https?:\/\/\S+)/i);
    const captionMatch = text && text.match(/caption:\s*([\s\S]*)/i);
    let videoUrl = videoUrlMatch ? videoUrlMatch[1].trim() : null;
    let caption = captionMatch ? captionMatch[1].trim() : '';
    if (videoUrl) {
      const sendMessage = (message) => bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      await postReelToInstagram(videoUrl, caption, sendMessage);
    } else {
      bot.sendMessage(chatId, 'Please send a message in the following format:\n\nvideo_url: <YOUR_PUBLIC_VIDEO_URL>\ncaption: <YOUR_CAPTION_TEXT>');
    }
  });
}
