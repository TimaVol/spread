import TelegramBot from 'node-telegram-bot-api';
import { TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_PATH, TELEGRAM_AUTHORIZED_USER_ID } from '../config/index.js';
import { registerBotCommands } from '../bot/commands.js';
import { registerMessageHandlers } from '../bot/handlers.js';
import { messages } from '../bot/messages.js';
import { handleBotError } from '../utils/error_handler.js';
import { ensureTmpDirExists, getLocalVideoPath, deleteLocalFile } from '../utils/file_handler.js';
import { postReelToInstagram } from '../platforms/instagram.js';
import { getYouTubeAuthUrl, handleYouTubeCallback, uploadYouTubeShort } from '../platforms/youtube.js';

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

// Register bot commands for Telegram UI suggestions
bot.setMyCommands([
  { command: 'start', description: 'Show welcome and usage instructions' },
  { command: 'help', description: 'Show all available commands and their descriptions' },
  { command: 'ping', description: 'Health check (responds with "pong!")' },
  { command: 'status', description: 'Show bot status (uptime, temp files, platform keys)' },
  { command: 'cleanup', description: 'Manually clean up temp files (admin only)' },
  { command: 'env', description: 'Show environment summary (admin only)' },
  { command: 'auth_youtube', description: 'Get YouTube authorization link (admin only)' }
]).catch((err) => {
  console.error('[BotCommand] Failed to set commands:', err);
  handleBotError(err, { chatId: TELEGRAM_AUTHORIZED_USER_ID, bot, context: 'Telegram bot command setup' });
});

export function setupTelegramBotWebhook(app) {
  app.post(TELEGRAM_WEBHOOK_PATH, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
  // Register modular command and message handlers
  registerBotCommands(bot, messages, { postReelToInstagram, getYouTubeAuthUrl });
  registerMessageHandlers(bot, messages, { ensureTmpDirExists, getLocalVideoPath, deleteLocalFile }, handleBotError, { postReelToInstagram, uploadYouTubeShort });
}

export function setupYouTubeOAuthCallback(app) {
  app.get('/youtube-callback', async (req, res) => {
    const { code, state } = req.query;
    try {
      const tokens = await handleYouTubeCallback(code, state);
      res.send(`<h2>Success!</h2><p>Copy this refresh token to your Railway environment as <b>YOUTUBE_REFRESH_TOKEN</b>:</p><pre>${tokens.refresh_token}</pre>`);
    } catch (err) {
      res.status(400).send(`<h2>Error</h2><pre>${err.message}</pre>`);
    }
  });
}
