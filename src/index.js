// index.js
import express from 'express';
import { setupTelegramBotWebhook, setupYouTubeOAuthCallback } from './bots/telegramBot.js';
import { PORT, CRON_SECRET_TOKEN, TELEGRAM_AUTHORIZED_USER_ID, SUPABASE_BUCKET } from './config/index.js';
import { listQueuedVideos, deleteFromSupabase, ensureTmpDirExists, getLocalVideoPath, deleteLocalFile } from './utils/file_handler.js';
import { postQueuedReelToInstagram } from './platforms/instagram.js';
import { uploadQueuedYouTubeShort } from './platforms/youtube.js';
import { bot } from './bots/telegramBot.js';
import { logger } from './utils/logger.js';
import { handleBotError } from './utils/error_handler.js';
import fs from 'fs/promises';
import path from 'path';
import supabase from './config/supabase.js';

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
    return res.status(403).send('Forbidden');
  }
  res.status(200).send('Processing started'); // Respond quickly to CRON
  try {
    const videos = await listQueuedVideos();
    if (!videos || videos.length === 0) {
      logger.info('No videos to process in bucket.');
      return;
    }
    // Get the oldest video
    const video = videos[0];
    logger.info('video', video);
    const filename = video.name;
    const tmpPath = path.join(process.cwd(), 'tmp', filename);
    await ensureTmpDirExists();
    // Download from Supabase Storage
    const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(filename);
    if (error) throw error;
    const arrayBuffer = await data.arrayBuffer();
    await fs.writeFile(tmpPath, Buffer.from(arrayBuffer));
    // Post to Instagram
    const sendMessage = (msg) => bot.sendMessage(TELEGRAM_AUTHORIZED_USER_ID, msg, { parse_mode: 'Markdown' });
    await postQueuedReelToInstagram(supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filename).data.publicUrl, sendMessage);
    // Post to YouTube Shorts
    await uploadQueuedYouTubeShort(Buffer.from(arrayBuffer), sendMessage);
    // Delete from Supabase and tmp
    await deleteFromSupabase(filename);
    await deleteLocalFile(tmpPath);
    await sendMessage(`✅ Video processed and posted to Instagram and YouTube. Filename: ${filename}`);
  } catch (err) {
    logger.error('Error in /process-queue:', err);
    await handleBotError(err, { context: '/process-queue', bot, chatId: TELEGRAM_AUTHORIZED_USER_ID });
    await bot.sendMessage(TELEGRAM_AUTHORIZED_USER_ID, `❌ Error processing video queue: ${err.message}`);
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

