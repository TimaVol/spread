import TelegramBot from 'node-telegram-bot-api';
import { postReelToInstagram } from '../platforms/instagram.js';
import { postToAllPlatforms, postToSpecificPlatform } from '../platforms/multi-platform.js';
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

function parsePlatforms(text) {
  const platformMatch = text.match(/platforms?:\s*([\w\s,]+)/i);
  if (platformMatch) {
    const platforms = platformMatch[1].toLowerCase().split(/[,\s]+/).filter(p => p);
    const validPlatforms = ['instagram', 'tiktok', 'youtube'];
    return platforms.filter(p => validPlatforms.includes(p));
  }
  return ['instagram', 'tiktok', 'youtube']; // Default to all platforms
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

    // Handle commands
    if (text && text.startsWith('/')) {
      const command = text.toLowerCase();
      
      if (command === '/help' || command === '/start') {
        const helpMessage = `🤖 **Multi-Platform Social Media Bot**

**Commands:**
• Send a video file to post to all platforms
• Use text commands to specify platforms

**Text Format:**
\`\`\`
video_url: <YOUR_VIDEO_URL>
caption: <YOUR_CAPTION>
platforms: instagram, tiktok, youtube
\`\`\`

**Platform Options:**
• \`instagram\` - Instagram Reels
• \`tiktok\` - TikTok
• \`youtube\` - YouTube Shorts

**Examples:**
• \`/all\` - Post to all platforms (default)
• \`/instagram\` - Post only to Instagram
• \`/tiktok\` - Post only to TikTok
• \`/youtube\` - Post only to YouTube

**Supported Platforms:** Instagram Reels, TikTok, YouTube Shorts`;
        
        await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
        return;
      }

      if (command === '/all') {
        await bot.sendMessage(chatId, '📋 Please send a video file to post to all platforms (Instagram, TikTok, YouTube)');
        return;
      }

      if (['/instagram', '/tiktok', '/youtube'].includes(command)) {
        const platform = command.substring(1);
        await bot.sendMessage(chatId, `📋 Please send a video file to post to ${platform}`);
        return;
      }
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
        
        const caption = msg.caption || '';
        const platforms = parsePlatforms(msg.caption || '');
        
        if (platforms.length === 1) {
          // Post to single platform
          await sendMessage(`📤 Video uploaded. Posting to ${platforms[0]}...`);
          await postToSpecificPlatform(publicUrl, caption, sendMessage, platforms[0]);
        } else {
          // Post to multiple platforms
          await sendMessage(`📤 Video uploaded. Posting to ${platforms.join(', ')}...`);
          await postToAllPlatforms(publicUrl, caption, sendMessage, platforms);
        }
        
        await sendMessage('🧹 Cleaning up...');
        await fs.unlink(localPath);
        await deleteFromSupabase(fileId);
        await sendMessage('✅ Done!');
      } catch (err) {
        await bot.sendMessage(chatId, `❌ Error: ${err.message}`);
      }
      return;
    }

    // Handle text-based video posting
    if (text) {
      const videoUrlMatch = text.match(/video_url:\s*(https?:\/\/\S+)/i);
      const captionMatch = text.match(/caption:\s*([\s\S]*?)(?=\nplatforms:|$)/i);
      const platforms = parsePlatforms(text);
      
      let videoUrl = videoUrlMatch ? videoUrlMatch[1].trim() : null;
      let caption = captionMatch ? captionMatch[1].trim() : '';
      
      if (videoUrl) {
        const sendMessage = (message) => bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        
        if (platforms.length === 1) {
          await sendMessage(`📤 Posting to ${platforms[0]}...`);
          await postToSpecificPlatform(videoUrl, caption, sendMessage, platforms[0]);
        } else {
          await sendMessage(`📤 Posting to ${platforms.join(', ')}...`);
          await postToAllPlatforms(videoUrl, caption, sendMessage, platforms);
        }
      } else {
        const helpMessage = `📝 **Please use one of these formats:**

**1. Send a video file** (with optional caption and platforms)

**2. Text format:**
\`\`\`
video_url: <YOUR_PUBLIC_VIDEO_URL>
caption: <YOUR_CAPTION_TEXT>
platforms: instagram, tiktok, youtube
\`\`\`

**3. Commands:**
• \`/help\` - Show this help
• \`/all\` - Post to all platforms
• \`/instagram\` - Post only to Instagram
• \`/tiktok\` - Post only to TikTok
• \`/youtube\` - Post only to YouTube`;
        
        await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
      }
    }
  });
}
