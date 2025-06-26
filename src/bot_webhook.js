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

    // --- Telegram Webhook Endpoint ---
    // This is the endpoint Telegram will send updates to
    app.post(WEBHOOK_PATH, (req, res) => {
        // Process the update from Telegram
        bot.processUpdate(req.body);

        // IMPORTANT: Telegram expects a 200 OK response quickly.
        // This acknowledges receipt of the update.
        res.sendStatus(200);
    });

    // --- Telegram Bot Message Handlers ---

    // Handle the /start command
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
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

    // Handle text messages for video URL and caption
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;

        // Ignore empty messages or the /start command which is handled separately
        if (!text || text.startsWith('/start')) {
            return;
        }

        // Use regular expressions to parse video URL and caption
        const videoUrlMatch = text.match(/video_url:\s*(https?:\/\/\S+)/i);
        // Use [\s\S]* to match any character including newlines for the caption
        const captionMatch = text.match(/caption:\s*([\s\S]*)/i);

        let videoUrl = videoUrlMatch ? videoUrlMatch[1].trim() : null;
        let caption = captionMatch ? captionMatch[1].trim() : '';

        if (videoUrl) {
            // Define a partial function to send messages back to this specific chat
            // This allows `instagram_poster.js` to send messages without knowing `chatId` directly
            const sendMessageToChat = (message) => bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

            // Call the Instagram posting logic from instagram_poster.js
            await processAndPostReel(videoUrl, caption, sendMessageToChat);
        } else {
            // If the format doesn't match, provide instructions
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

    // Handle any errors that occur during webhook processing
    bot.on('webhook_error', (error) => {
        console.error(`Telegram webhook error: ${error.code} - ${error.message}`);
    });

    console.log('Telegram bot webhook handlers initialized.');
}
