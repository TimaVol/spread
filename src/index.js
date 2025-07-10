// index.js
import express from 'express';
import { setupTelegramBotWebhook } from './bots/telegramBot.js';
import { PORT } from './config/index.js';

const app = express();
app.use(express.json());

setupTelegramBotWebhook(app);

app.get('/', (req, res) => {
  res.send('Telegram Instagram Reel Bot server is running! Webhook configured.');
});

app.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}`);
});

