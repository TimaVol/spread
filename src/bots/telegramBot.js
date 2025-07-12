import TelegramBot from 'node-telegram-bot-api';
import { postReelToInstagram } from '../platforms/instagram.js';
import { TELEGRAM_BOT_TOKEN, TELEGRAM_AUTHORIZED_USER_ID, TELEGRAM_WEBHOOK_PATH } from '../config/index.js';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET } from '../config/index.js';
import fs from 'fs/promises';
import path from 'path';

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const PROJECT_TMP_DIR = path.join(process.cwd(), 'tmp');

function getLocalVideoPath(fileId) {
  return path.join(PROJECT_TMP_DIR, `${fileId}.mp4`);
}

async function ensureTmpDirExists() {
  try {
    await fs.mkdir(PROJECT_TMP_DIR, { recursive: true });
  } catch (err) {
    // Ignore if already exists
  }
}

async function uploadToSupabase(localPath, fileId) {
  const fileBuffer = await fs.readFile(localPath);
  const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).upload(`${fileId}.mp4`, fileBuffer, { upsert: true, contentType: 'video/mp4' });
  if (error) throw error;
  return supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(`${fileId}.mp4`).data.publicUrl;
}

async function deleteFromSupabase(fileId) {
  await supabase.storage.from(SUPABASE_BUCKET).remove([`${fileId}.mp4`]);
}

export function setupTelegramBotWebhook(app) {
  app.post(TELEGRAM_WEBHOOK_PATH, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const video = msg.video || msg.document;
    const authorizedUserIdNum = parseInt(TELEGRAM_AUTHORIZED_USER_ID, 10);

    if (isNaN(authorizedUserIdNum) || authorizedUserIdNum !== chatId) {
      console.warn(`Unauthorized access attempt from Chat ID: ${chatId}. Message: "${text}"`);
      await bot.sendMessage(chatId, `🚫 Access Denied: I'm sorry, but this bot is configured for private use only. Your chat ID (${chatId}) is not authorized.`);
      return;
    }

    // Handle video upload
    if (video) {
      const fileId = video.file_id;
      await ensureTmpDirExists();
      const localPath = getLocalVideoPath(fileId);
      const sendMessage = (message) => bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      try {
        await sendMessage('⬇️ Downloading video from Telegram...');
        const file = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file.file_path}`;
        const res = await fetch(fileUrl);
        const buffer = await res.arrayBuffer();
        await fs.writeFile(localPath, Buffer.from(buffer));
        await sendMessage('⬆️ Uploading video to Supabase Storage...');
        const publicUrl = await uploadToSupabase(localPath, fileId);
        await sendMessage('📤 Video uploaded. Posting to Instagram...');
        const caption = msg.caption || '';
        await postReelToInstagram(publicUrl, caption, sendMessage);
        await sendMessage('🧹 Cleaning up...');
        await fs.unlink(localPath);
        await deleteFromSupabase(fileId);
        await sendMessage('✅ Done!');
      } catch (err) {
        await bot.sendMessage(chatId, `❌ Error: ${err.message}`);
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
      await postReelToInstagram(videoUrl, caption, sendMessage);
    } else {
      bot.sendMessage(chatId, 'Please send a video file or a message in the following format:\n\nvideo_url: <YOUR_PUBLIC_VIDEO_URL>\ncaption: <YOUR_CAPTION_TEXT>');
    }
  });
}
