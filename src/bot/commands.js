// src/bot/commands.js
import { TELEGRAM_AUTHORIZED_USER_ID } from '../config/index.js';
import fs from 'fs/promises';
import path from 'path';
import { SUPABASE_URL, SUPABASE_BUCKET, FACEBOOK_ACCESS_TOKEN, IG_BUSINESS_ACCOUNT_ID, YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN } from '../config/index.js';

const TMP_DIR = path.join(process.cwd(), 'tmp');

function mask(str) {
  if (!str) return 'NOT SET';
  return str.length > 6 ? str.slice(0, 2) + '***' + str.slice(-2) : '***';
}

export function registerBotCommands(bot, messages, { getYouTubeAuthUrl }) {
  bot.onText(/^\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    if (parseInt(TELEGRAM_AUTHORIZED_USER_ID, 10) !== chatId) return;
    await bot.sendMessage(chatId, messages.welcome, { parse_mode: 'Markdown' });
  });

  bot.onText(/^\/help$/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, messages.help, { parse_mode: 'Markdown' });
  });

  bot.onText(/^\/ping$/, async (msg) => {
    await bot.sendMessage(msg.chat.id, 'pong!');
  });

  bot.onText(/^\/status$/, async (msg) => {
    const chatId = msg.chat.id;
    let tempFiles = [];
    let tempSize = 0;
    try {
      tempFiles = await fs.readdir(TMP_DIR);
      for (const file of tempFiles) {
        const stat = await fs.stat(path.join(TMP_DIR, file));
        tempSize += stat.size;
      }
    } catch {}
    const statusMsg = messages.status({
      uptime: process.uptime(),
      tempFiles: tempFiles.length,
      tempSize,
      supabase: SUPABASE_URL ? '✅' : '❌',
      instagram: FACEBOOK_ACCESS_TOKEN && IG_BUSINESS_ACCOUNT_ID ? '✅' : '❌',
      youtube: YOUTUBE_CLIENT_ID && YOUTUBE_CLIENT_SECRET && YOUTUBE_REFRESH_TOKEN ? '✅' : '❌',
    });
    await bot.sendMessage(chatId, statusMsg, { parse_mode: 'Markdown' });
  });

  bot.onText(/^\/cleanup$/, async (msg) => {
    const chatId = msg.chat.id;
    if (parseInt(TELEGRAM_AUTHORIZED_USER_ID, 10) !== chatId) {
      await bot.sendMessage(chatId, '🚫 Only the admin can use this command.');
      return;
    }
    let deleted = 0;
    try {
      const files = await fs.readdir(TMP_DIR);
      for (const file of files) {
        await fs.unlink(path.join(TMP_DIR, file));
        deleted++;
      }
    } catch {}
    await bot.sendMessage(chatId, `🧹 Cleanup complete. Deleted ${deleted} files from tmp/.`);
  });

  bot.onText(/^\/env$/, async (msg) => {
    const chatId = msg.chat.id;
    if (parseInt(TELEGRAM_AUTHORIZED_USER_ID, 10) !== chatId) {
      await bot.sendMessage(chatId, '🚫 Only the admin can use this command.');
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
    await bot.sendMessage(chatId, envMsg, { parse_mode: 'Markdown' });
  });

  bot.onText(/^\/auth_youtube$/, async (msg) => {
    const chatId = msg.chat.id;
    if (parseInt(TELEGRAM_AUTHORIZED_USER_ID, 10) !== chatId) return;
    const { url } = getYouTubeAuthUrl();
    await bot.sendMessage(chatId, messages.youtubeAuth(url), { parse_mode: 'Markdown' });
  });
  // Add more command handlers here as needed
}