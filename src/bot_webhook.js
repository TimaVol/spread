// bot_webhook.js
import { processAndPostReel } from './instagram_poster.js'; // Import the processing logic

// --- Telegram Bot & Express Webhook Setup Function ---
/**
 * Sets up Telegram webhook endpoint and bot message handlers.
 * @param {object} app - The Express application instance.
 * @param {object} bot - The TelegramBot instance.
 */
export function setupBotWebhook(app, bot) {
    const WEBHOOK_PATH = process.env.TELEGRAM_WEBHOOK_PATH || '/webhook'; // Needs to match the path configured in index.js

    // --- Configuration: Environment Variables (accessed globally via process.env) ---
    // IMPORTANT: Make sure these are set in Railway's environment variables.
    const TELEGRAM_AUTHORIZED_USER_ID = process.env.TELEGRAM_AUTHORIZED_USER_ID;

    // --- Telegram Webhook Endpoint ---
    app.post(WEBHOOK_PATH, (req, res) => {
        // Process the update from Telegram
        bot.processUpdate(req.body);
        res.sendStatus(200); // Respond quickly to Telegram
    });

    // --- Telegram Bot Message Handlers ---

    // Generic handler for all messages to implement the access control
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;

        // --- SECURITY CHECK: Only allow messages from the authorized user ---
        // Convert the authorized ID to a number for strict comparison, as chat.id is a number
        const authorizedUserIdNum = parseInt(TELEGRAM_AUTHORIZED_USER_ID, 10);

        if (isNaN(authorizedUserIdNum) || authorizedUserIdNum !== chatId) {
            console.warn(`Unauthorized access attempt from Chat ID: ${chatId}. Message: "${text}"`);
            await bot.sendMessage(chatId, `🚫 Access Denied: I'm sorry, but this bot is configured for private use only. Your chat ID (${chatId}) is not authorized.`);
            return; // Stop processing the message
        }
        // --- END SECURITY CHECK ---


        // Ignore empty messages or the /start command which is handled separately
        if (!text || text.startsWith('/start')) {
            return;
        }

        // Use regular expressions to parse video URL and caption
        const videoUrlMatch = text.match(/video_url:\s*(https?:\/\/\S+)/i);
        const captionMatch = text.match(/caption:\s*([\s\S]*)/i);

        let videoUrl = videoUrlMatch ? videoUrlMatch[1].trim() : null;
        let caption = captionMatch ? captionMatch[1].trim() : '';

        if (videoUrl) {
            const sendMessageToChat = (message) => bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            await processAndPostReel(videoUrl, caption, sendMessageToChat);
        } else {
            bot.sendMessage(chatId, `I'm sorry, I couldn't understand that.
Please use the correct format:

\`\`\`
video_url: <YOUR_PUBLIC_VIDEO_URL>
caption: <YOUR_CAPTION_TEXT>
\`\`\`

Example:
\`\`\`
video_url: https://videos.pexels.com/video-files/32134525/13700774_1440_2560_25fps.mp4
caption: This is my new reel! #ai #bot #instagram
\`\`\`

Make sure the video URL is publicly accessible.
`, { parse_mode: 'Markdown' });
        }
    });

    // Handle the /start command (this will also be filtered by the general message handler now)
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        // This will only run if the security check above passes
        bot.sendMessage(chatId, `🎉 Welcome to the Instagram Reel Bot!
This bot uses webhooks for efficient operation.

To post a Reel, send me a message in the following format:

\`\`\`
video_url: <YOUR_PUBLIC_VIDEO_URL>
caption: <YOUR_CAPTION_TEXT>
\`\`\`

Example:
\`\`\`
video_url: https://videos.pexels.com/video-files/32134525/13700774_1440_2560_25fps.mp4
caption: This is my new reel! #ai #bot #instagram
\`\`\`

💡 **Important:**
- The \`video_url\` MUST be publicly accessible (e.g., from cloud storage).
- I DO NOT currently handle direct video file uploads.
- Make sure your \`FACEBOOK_ACCESS_TOKEN\` and \`IG_BUSINESS_ACCOUNT_ID\` are correctly set as environment variables on Railway.

Ready to post? Send me a Reel URL and caption!`, { parse_mode: 'Markdown' });
    });


    // Handle any errors that occur during webhook processing
    bot.on('webhook_error', (error) => {
        console.error(`Telegram webhook error: ${error.code} - ${error.message}`);
    });

    console.log('Telegram bot webhook handlers initialized.');
}
