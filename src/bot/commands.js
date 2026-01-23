// src/bot/commands.js
import { TELEGRAM_AUTHORIZED_USER_ID } from '../config/index.js';
import fs from 'fs/promises';
import path from 'path';
import { SUPABASE_URL, SUPABASE_BUCKET, FACEBOOK_ACCESS_TOKEN, IG_BUSINESS_ACCOUNT_ID, YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN } from '../config/index.js';
import { handleBotError } from '../utils/error_handler.js';
import supabase from '../config/supabase.js';

const TMP_DIR = path.join(process.cwd(), 'tmp');

function mask(str) {
  if (!str) return 'NOT SET';
  return str.length > 6 ? str.slice(0, 2) + '***' + str.slice(-2) : '***';
}

export function registerBotCommands(bot, messages, { getYouTubeAuthUrl }) {
  bot.onText(/^\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      if (parseInt(TELEGRAM_AUTHORIZED_USER_ID, 10) !== chatId) {
        await bot.sendMessage(chatId, messages.unauthorized(chatId));
        return;
      }
      await bot.sendMessage(chatId, messages.welcome, { parse_mode: 'MarkdownV2' });
    } catch (err) {
      await handleBotError(err, { chatId, bot, context: '/start' });
    }
  });

  bot.onText(/^\/help$/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      if (parseInt(TELEGRAM_AUTHORIZED_USER_ID, 10) !== chatId) {
        await bot.sendMessage(chatId, messages.unauthorized(chatId));
        return;
      }
      await bot.sendMessage(chatId, messages.help, { parse_mode: 'MarkdownV2' });
    } catch (err) {
      await handleBotError(err, { chatId, bot, context: '/help' });
    }
  });

  bot.onText(/^\/ping$/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      if (parseInt(TELEGRAM_AUTHORIZED_USER_ID, 10) !== chatId) {
        await bot.sendMessage(chatId, messages.unauthorized(chatId));
        return;
      }
      await bot.sendMessage(chatId, 'pong!');
    } catch (err) {
      await handleBotError(err, { chatId: msg.chat.id, bot, context: '/ping' });
    }
  });

  bot.onText(/^\/status$/, async (msg) => {
    const chatId = msg.chat.id;
    let tempFiles = [];
    let tempSize = 0;
    try {
      if (parseInt(TELEGRAM_AUTHORIZED_USER_ID, 10) !== chatId) {
        await bot.sendMessage(chatId, messages.unauthorized(chatId));
        return;
      }
      tempFiles = await fs.readdir(TMP_DIR);
      for (const file of tempFiles) {
        const stat = await fs.stat(path.join(TMP_DIR, file));
        tempSize += stat.size;
      }
      const statusMsg = messages.status({
        uptime: process.uptime(),
        tempFiles: tempFiles.length,
        tempSize,
        supabase: SUPABASE_URL ? '✅' : '❌',
        instagram: FACEBOOK_ACCESS_TOKEN && IG_BUSINESS_ACCOUNT_ID ? '✅' : '❌',
        youtube: YOUTUBE_CLIENT_ID && YOUTUBE_CLIENT_SECRET && YOUTUBE_REFRESH_TOKEN ? '✅' : '❌',
      });
      await bot.sendMessage(chatId, statusMsg, { parse_mode: 'MarkdownV2' });
    } catch (err) {
      await handleBotError(err, { chatId, bot, context: '/status' });
    }
  });

  bot.onText(/^\/cleanup$/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      if (parseInt(TELEGRAM_AUTHORIZED_USER_ID, 10) !== chatId) {
        await bot.sendMessage(chatId, messages.unauthorized(chatId));
        return;
      }
      let deleted = 0;
      const files = await fs.readdir(TMP_DIR);
      for (const file of files) {
        await fs.unlink(path.join(TMP_DIR, file));
        deleted++;
      }
      await bot.sendMessage(chatId, `🧹 Cleanup complete. Deleted ${deleted} files from tmp/.`);
    } catch (err) {
      await handleBotError(err, { chatId, bot, context: '/cleanup' });
    }
  });

  bot.onText(/^\/env$/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      if (parseInt(TELEGRAM_AUTHORIZED_USER_ID, 10) !== chatId) {
        await bot.sendMessage(chatId, messages.unauthorized(chatId));
        return;
      }
      const envMsg = messages.env({
        TELEGRAM_BOT_TOKEN: mask(process.env.TELEGRAM_BOT_TOKEN),
        TELEGRAM_AUTHORIZED_USER_ID: process.env.TELEGRAM_AUTHORIZED_USER_ID,
        TELEGRAM_WEBHOOK_PATH: process.env.TELEGRAM_WEBHOOK_PATH,
        FACEBOOK_ACCESS_TOKEN: mask(process.env.FACEBOOK_ACCESS_TOKEN),
        IG_BUSINESS_ACCOUNT_ID: process.env.IG_BUSINESS_ACCOUNT_ID,
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_BUCKET: process.env.SUPABASE_BUCKET,
        SUPABASE_SERVICE_ROLE_KEY: mask(process.env.SUPABASE_SERVICE_ROLE_KEY),
        YOUTUBE_CLIENT_ID: mask(process.env.YOUTUBE_CLIENT_ID),
        YOUTUBE_CLIENT_SECRET: mask(process.env.YOUTUBE_CLIENT_SECRET),
        YOUTUBE_REFRESH_TOKEN: mask(process.env.YOUTUBE_REFRESH_TOKEN),
      });
      await bot.sendMessage(chatId, envMsg, { parse_mode: 'MarkdownV2' });
    } catch (err) {
      await handleBotError(err, { chatId, bot, context: '/env' });
    }
  });

  bot.onText(/^\/auth_youtube$/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      if (parseInt(TELEGRAM_AUTHORIZED_USER_ID, 10) !== chatId) {
        await bot.sendMessage(chatId, messages.unauthorized(chatId));
        return;
      }
      const { url } = getYouTubeAuthUrl();
      await bot.sendMessage(chatId, messages.youtubeAuth(url), { parse_mode: 'MarkdownV2' });
    } catch (err) {
      await handleBotError(err, { chatId, bot, context: '/auth_youtube' });
    }
  });

  bot.onText(/^\/videos$/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      if (parseInt(TELEGRAM_AUTHORIZED_USER_ID, 10) !== chatId) {
        await bot.sendMessage(chatId, messages.unauthorized(chatId));
        return;
      }

      // List all files in the Supabase bucket
      const { data, error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .list('', {
          limit: 1000, // Adjust based on your needs
          offset: 0
        });

      if (error) {
        await bot.sendMessage(chatId, messages.videosError(error.message), { parse_mode: 'MarkdownV2' });
        return;
      }

      // Count video files (common video extensions)
      const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v'];
      const videoCount = data.filter(file => {
        const extension = path.extname(file.name).toLowerCase();
        return videoExtensions.includes(extension);
      }).length;

      await bot.sendMessage(chatId, messages.videos(videoCount), { parse_mode: 'MarkdownV2' });
    } catch (err) {
      await handleBotError(err, { chatId, bot, context: '/videos' });
    }
  });

  bot.onText(/^\/generate$/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      if (parseInt(TELEGRAM_AUTHORIZED_USER_ID, 10) !== chatId) {
        await bot.sendMessage(chatId, messages.unauthorized(chatId));
        return;
      }
      
      // Trigger photo generation handler
      // This will be handled by the registerPhotoGenerationHandlers function
      await bot.emit('generatePhoto', { chatId });
    } catch (err) {
      await handleBotError(err, { chatId, bot, context: '/generate' });
    }
  });

  // Add more command handlers here as needed
}
