import { processAndPostReel } from '../platforms/instagram.js';
import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import { TELEGRAM_TOKEN, TELEGRAM_AUTHORIZED_USER_ID, TELEGRAM_WEBHOOK_PATH, PORT, PUBLIC_URL } from '../config/index.js';

const bot = new TelegramBot(TELEGRAM_TOKEN, { webHook: true });
const app = express();
app.use(express.json());

app.post(TELEGRAM_WEBHOOK_PATH, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const authorizedUserIdNum = parseInt(TELEGRAM_AUTHORIZED_USER_ID, 10);
    if (isNaN(authorizedUserIdNum) || authorizedUserIdNum !== chatId) {
        await bot.sendMessage(chatId, `🚫 Access Denied: This bot is configured for private use only.`);
        return;
    }
    if (!text || text.startsWith('/start')) return;
    const videoUrlMatch = text.match(/video_url:\s*(https?:\/\/\S+)/i);
    const captionMatch = text.match(/caption:\s*([\s\S]*)/i);
    let videoUrl = videoUrlMatch ? videoUrlMatch[1].trim() : null;
    let caption = captionMatch ? captionMatch[1].trim() : '';
    if (videoUrl) {
        const sendMessageToChat = (message) => bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        await processAndPostReel(videoUrl, caption, sendMessageToChat);
    } else {
        bot.sendMessage(chatId, `I'm sorry, I couldn't understand that.\nPlease use the correct format:\n\n\`\`\`\nvideo_url: <YOUR_PUBLIC_VIDEO_URL>\ncaption: <YOUR_CAPTION_TEXT>\n\`\`\`\n\nExample:\n\`\`\`\nvideo_url: https://videos.pexels.com/video-files/32134525/13700774_1440_2560_25fps.mp4\ncaption: This is my new reel! #ai #bot #instagram\n\`\`\`\n\nMake sure the video URL is publicly accessible.`, { parse_mode: 'Markdown' });
    }
});

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `🎉 Welcome to the Instagram Reel Bot!\nThis bot uses webhooks for efficient operation.\n\nTo post a Reel, send me a message in the following format:\n\n\`\`\`\nvideo_url: <YOUR_PUBLIC_VIDEO_URL>\ncaption: <YOUR_CAPTION_TEXT>\n\`\`\`\n\nExample:\n\`\`\`\nvideo_url: https://videos.pexels.com/video-files/32134525/13700774_1440_2560_25fps.mp4\ncaption: This is my new reel! #ai #bot #instagram\n\`\`\`\n\n💡 **Important:**\n- The \`video_url\` MUST be publicly accessible (e.g., from cloud storage).\n- I DO NOT currently handle direct video file uploads.\n- Make sure your \`FACEBOOK_ACCESS_TOKEN\` and \`IG_BUSINESS_ACCOUNT_ID\` are correctly set as environment variables.\n\nReady to post? Send me a Reel URL and caption!`, { parse_mode: 'Markdown' });
});

bot.on('webhook_error', (error) => {
    console.error(`Telegram webhook error: ${error.code} - ${error.message}`);
});

app.listen(PORT, () => {
    bot.setWebHook(`${PUBLIC_URL}${TELEGRAM_WEBHOOK_PATH}`);
    console.log(`Telegram bot server running on port ${PORT}`);
});