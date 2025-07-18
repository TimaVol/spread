// src/bot/handlers.js
import { TELEGRAM_BOT_TOKEN, TELEGRAM_AUTHORIZED_USER_ID } from '../config/index.js';
import { logger } from '../utils/logger.js';
import validateVideoFile from '../utils/video-validator.js';

// platforms: { postReelToInstagram, uploadYouTubeShort }
// fileHandler: { ensureTmpDirExists, getLocalVideoPath, deleteLocalFile, uploadToSupabase, deleteFromSupabase }
export function registerMessageHandlers(bot, messages, fileHandler, errorHandler, platforms) {
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
      const localPath = fileHandler.getLocalVideoPath(fileId);
      const sendMessage = (message) => bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      let publicUrl = null;
      try {
        await sendMessage(messages.downloading);
        const file = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file.file_path}`;
        const res = await fetch(fileUrl);
        const buffer = await res.arrayBuffer();
        await import('fs/promises').then(fs => fs.writeFile(localPath, Buffer.from(buffer)));
        // Validate video before upload
        await sendMessage('🔍 Validating video...');
        const validationResult = await validateVideoFile(localPath);
        if (!validationResult.isValid) {
          await sendMessage(`❌ Video validation failed: ${validationResult.message}\n${validationResult.issues ? validationResult.issues.join('\n') : ''}`);
          await fileHandler.deleteLocalFile(localPath);
          return;
        }
        await sendMessage('✅ Video validation passed.');
        await sendMessage(messages.uploadingSupabase);
        publicUrl = await fileHandler.uploadToSupabase(localPath, fileId);
        await sendMessage(messages.uploaded);
        await platforms.postReelToInstagram(publicUrl, '#anime', sendMessage);
        await sendMessage(messages.uploadingYouTube);
        await platforms.uploadYouTubeShort(Buffer.from(buffer), 'Check out this awesome short! #anime', 'Watch more amazing content! #anime', 'public', sendMessage);
        await sendMessage(messages.cleaningUp);
        await fileHandler.deleteLocalFile(localPath);
        await fileHandler.deleteFromSupabase(fileId);
        await sendMessage(messages.done);
      } catch (err) {
        await errorHandler(err, { chatId, bot, context: 'Video Upload Handler' });
        // Always attempt cleanup
        try { await fileHandler.deleteLocalFile(localPath); } catch (e) { await sendMessage(messages.cleanupError('local', e.message || e)); }
        if (publicUrl) { try { await fileHandler.deleteFromSupabase(fileId); } catch (e) { await sendMessage(messages.cleanupError('Supabase', e.message || e)); } }
      }
      return;
    }
  });
}
