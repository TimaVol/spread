// index.js
import express from 'express';
import { setupTelegramBotWebhook } from './bots/telegramBot.js';
import { setupYouTubeOAuthCallback } from './bots/telegramBot.js';
import { PORT } from './config/index.js';
import { logger } from './utils/logger.js';

const app = express();
app.use(express.json());

setupTelegramBotWebhook(app);
setupYouTubeOAuthCallback(app);

app.get('/', (req, res) => {
  res.send('Telegram Instagram Reel Bot server is running! Webhook configured.');
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

