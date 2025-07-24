// src/bot/handlers.js
import { TELEGRAM_BOT_TOKEN, TELEGRAM_AUTHORIZED_USER_ID } from '../config/index.js';
import { logger } from '../utils/logger.js';

// fileHandler: { ensureTmpDirExists, getLocalVideoPath, deleteLocalFile, uploadToSupabase, deleteFromSupabase }
export function registerMessageHandlers(bot, messages, fileHandler, errorHandler) {
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const video = msg.video || msg.document;
    const authorizedUserIdNum = parseInt(TELEGRAM_AUTHORIZED_USER_ID, 10);

    if (isNaN(authorizedUserIdNum) || authorizedUserIdNum !== chatId) {
      logger.warn(`Unauthorized access attempt from Chat ID: ${chatId}. Message: "${text}"`);
      await bot.sendMessage(chatId, messages.unauthorized(chatId));
      return;
    }

    // Handle video upload to both IG and YouTube Shorts
    if (video) {
      const fileId = video.file_id;
      await fileHandler.ensureTmpDirExists();
      // Generate unique filename for Supabase Storage
      const uniqueFilename = `${fileId}.mp4`;
      const sendMessage = (message) => bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      try {
        await sendMessage(messages.downloading);
        const file = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file.file_path}`;
        const res = await fetch(fileUrl);
        const buffer = await res.arrayBuffer();

        await sendMessage(messages.uploadingSupabase);
        // Upload to Supabase
        await fileHandler.uploadToSupabase(buffer, uniqueFilename);

        // Send message
        await sendMessage(messages.queued);
      } catch (err) {
        await errorHandler(err, { chatId, bot, context: 'Video Queue Handler' });
      }
      return;
    }
  });
}
