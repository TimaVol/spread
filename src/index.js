// index.js
import express from 'express';
import { setupTelegramBotWebhook, setupYouTubeOAuthCallback } from './bots/telegramBot.js';
import { PORT, CRON_SECRET_TOKEN, TELEGRAM_AUTHORIZED_USER_ID, SUPABASE_BUCKET } from './config/index.js';
import { listQueuedMedia, deleteFromSupabase, ensureTmpDirExists, getLocalVideoPath, deleteLocalFile, detectMediaType } from './utils/file_handler.js';
import { postQueuedReelToInstagram, postQueuedPhotoToInstagram } from './platforms/instagram.js';
import { uploadQueuedYouTubeShort } from './platforms/youtube.js';
import { generateCaption } from './utils/caption-generator.js';
import { bot } from './bots/telegramBot.js';
import { logger } from './utils/logger.js';
import { handleBotError } from './utils/error_handler.js';
import fs from 'fs/promises';
import path from 'path';
import supabase from './config/supabase.js';
import { messages } from './bot/messages.js';

const sendMessage = (msg) => bot.sendMessage(TELEGRAM_AUTHORIZED_USER_ID, msg, { parse_mode: 'Markdown' });

const app = express();
app.use(express.json());

setupTelegramBotWebhook(app);
setupYouTubeOAuthCallback(app);

app.get('/', (req, res) => {
  res.send('Telegram Instagram Reel Bot server is running! Webhook configured.');
});

app.post('/process-queue', async (req, res) => {
  const token = req.header('X-Cron-Secret');
  if (token !== CRON_SECRET_TOKEN) {
    logger.warn('Unauthorized CRON attempt', { ip: req.ip });
    sendMessage('Unauthorized CRON attempt', { ip: req.ip });
    return res.status(403).send('Forbidden');
  }
  res.status(200).send('Processing started'); // Respond quickly to CRON
  try {
    const mediaInfo = await listQueuedMedia();
    if (!mediaInfo) {
      logger.info('No media to process in bucket.');
      sendMessage('No media to process in bucket.')
      return;
    }
    
    const filename = mediaInfo.filename;
    const mediaType = mediaInfo.mediaType;
    const tmpPath = path.join(process.cwd(), 'tmp', filename);
    await ensureTmpDirExists();
    
    // Download from Supabase Storage
    const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(filename);
    if (error) throw error;
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Generate AI caption
    const caption = await generateCaption();
    await sendMessage(`✨ Generated caption: "${caption}"`);
    
    // Get public URL
    const publicUrl = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filename).data.publicUrl;
    
    // Route based on media type
    if (mediaType === 'photo') {
      logger.info('Processing photo', { filename, mediaType });
      await sendMessage(`📸 Processing photo: ${filename}`);
      await postQueuedPhotoToInstagram(publicUrl, caption, sendMessage);
    } else if (mediaType === 'video') {
      logger.info('Processing video', { filename, mediaType });
      await sendMessage(`🎬 Processing video: ${filename}`);
      await postQueuedReelToInstagram(publicUrl, caption, sendMessage);
      // await uploadQueuedYouTubeShort(buffer, caption, caption, sendMessage);
    } else {
      logger.warn('Unknown media type', { filename, mediaType });
      await sendMessage(`⚠️ Unknown media type: ${mediaType}`);
      return;
    }
    
    // Delete from Supabase and tmp
    await deleteFromSupabase(filename);
    await deleteLocalFile(tmpPath);
    await sendMessage(messages.cleaningUp)
    await sendMessage(`✅ Media processed and posted to Instagram.`);
  } catch (err) {
    logger.error('Error in /process-queue:', err);
    await handleBotError(err, { context: '/process-queue', bot, chatId: TELEGRAM_AUTHORIZED_USER_ID });
    await sendMessage(`❌ Error processing media queue: ${err.message}`);
    // Do not delete from Supabase if failed
  }
});

app.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}`);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception thrown:', err);
});

