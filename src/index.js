// index.js
import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import { setupBotWebhook } from './bot_webhook.js'; // Import the new setup function
import { setInstagramCredentials } from './instagram_poster.js'; // Import for initial setup

// --- Configuration: Environment Variables ---
// These will be pulled from Railway's environment variables.
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const IG_BUSINESS_ACCOUNT_ID = process.env.IG_BUSINESS_ACCOUNT_ID;
const PORT = process.env.PORT || 3000;
const RAILWAY_PUBLIC_URL = process.env.RAILWAY_PUBLIC_URL;
const WEBHOOK_PATH = process.env.TELEGRAM_WEBHOOK_PATH; // The path where Telegram will send updates
const WEBHOOK_URL = `${RAILWAY_PUBLIC_URL}${WEBHOOK_PATH}`;

// --- Express App Initialization ---
const app = express();
app.use(express.json()); // Middleware to parse JSON request bodies from Telegram

// --- Telegram Bot Initialization ---
// Create a bot instance WITHOUT polling (as we're using webhooks)
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

// Set Instagram credentials for the poster module
setInstagramCredentials(FACEBOOK_ACCESS_TOKEN, IG_BUSINESS_ACCOUNT_ID);

// --- Set up Bot Webhook and Handlers ---
// Pass the Express app and bot instance to the bot_webhook module
setupBotWebhook(app, bot);

// --- Health Check / Root Endpoint ---
// A simple route to check if your server is running
app.get('/', (req, res) => {
    res.send('Telegram Instagram Reel Bot server is running! Webhook configured.');
});

// --- Start the Express Server ---
app.listen(PORT, () => {
    console.log(`Express server listening on port ${PORT}`);
    // console.log(`Attempting to set webhook for bot...`);
    // Set the webhook once the server is listening
    // bot.setWebHook(WEBHOOK_URL)
    //     .then(() => console.log(`Webhook set successfully to: ${WEBHOOK_URL}`))
    //     .catch(err => console.error(`Failed to set webhook: ${err.message}`));
});

