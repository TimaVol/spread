import TelegramBot from 'node-telegram-bot-api';
import { postReelToInstagram } from '../platforms/instagram.js';
import { TELEGRAM_TOKEN } from '../config/index.js';

const bot = new TelegramBot(TELEGRAM_TOKEN, { webHook: true });

export function setupTelegramBotWebhook(app) {
  app.post('/webhook', (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
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