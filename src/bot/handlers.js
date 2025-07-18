// src/bot/handlers.js
import { TELEGRAM_BOT_TOKEN, TELEGRAM_AUTHORIZED_USER_ID } from '../config/index.js';
import { logger } from '../utils/logger.js';

// platforms: { postReelToInstagram, uploadYouTubeShort }
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
        await sendMessage(messages.uploadingSupabase);
        // TODO: Move uploadToSupabase to file_handler.js and use here
        // publicUrl = await uploadToSupabase(localPath, fileId);
        // await sendMessage(messages.uploaded);
        // await platforms.postReelToInstagram(publicUrl, '#anime', sendMessage);
        // await sendMessage(messages.uploadingYouTube);
        // await platforms.uploadYouTubeShort(Buffer.from(buffer), 'Check out this awesome short! #anime', 'Watch more amazing content! #anime', 'public', sendMessage);
        // await sendMessage(messages.cleaningUp);
        // await fileHandler.deleteLocalFile(localPath);
        // await deleteFromSupabase(fileId);
        // await sendMessage(messages.done);
        await sendMessage('✅ Video downloaded and saved locally (demo, upload logic not yet modularized).');
      } catch (err) {
        await errorHandler(err, { chatId, bot, context: 'Video Upload Handler' });
        // Always attempt cleanup
        try { await fileHandler.deleteLocalFile(localPath); } catch (e) { await sendMessage(messages.cleanupError('local', e.message || e)); }
        // if (publicUrl) { try { await deleteFromSupabase(fileId); } catch (e) { await sendMessage(messages.cleanupError('Supabase', e.message || e)); } }
      }
      return;
    }

    // Only allow messages with video_url and caption
    const videoUrlMatch = text && text.match(/video_url:\s*(https?:\/\/\S+)/i);
    const captionMatch = text && text.match(/caption:\s*([\s\S]*)/i);
    let videoUrl = videoUrlMatch ? videoUrlMatch[1].trim() : null;
    let caption = captionMatch ? captionMatch[1].trim() : '';
    if (videoUrl) {
      const sendMessage = (message) => bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      await platforms.postReelToInstagram(videoUrl, '#anime', sendMessage);
    } else {
      bot.sendMessage(chatId, messages.sendVideoOrUrl);
    }
  });
}