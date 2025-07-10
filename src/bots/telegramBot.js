import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { uploadToInstagram, uploadVideoAfterLogin, ig } from '../platforms/instagram.js';
import { TELEGRAM_TOKEN } from '../config/index.js';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const downloadsDir = path.join(__dirname, '../../downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir);
}

const waitingFor2FACode = new Map();
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  if (msg.video) {
    const fileId = msg.video.file_id;
    try {
      const file = await bot.getFile(fileId);
      const filePath = file.file_path;
      const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`;
      const fileName = path.basename(filePath);
      const downloadPath = path.join(downloadsDir, fileName);
      const fileStream = fs.createWriteStream(downloadPath);
      https.get(fileUrl, (response) => {
        response.pipe(fileStream);
        fileStream.on('finish', async () => {
          fileStream.close();
          await uploadToInstagram({ chatId, videoPath: downloadPath, fileName, bot, waitingFor2FACode });
        });
      }).on('error', (err) => {
        fs.unlink(downloadPath, () => {});
        console.error('Error downloading the file:', err);
        bot.sendMessage(chatId, 'Failed to save the video.');
      });
    } catch (err) {
      console.error('Error getting file:', err);
      bot.sendMessage(chatId, 'Failed to retrieve the video file.');
    }
  } else {
    bot.sendMessage(chatId, 'Received your message');
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const chatData = waitingFor2FACode.get(chatId);
  if (!!chatData?.videoPath) {
    const twoFactorCode = msg.text;
    try {
      await ig.account.twoFactorLogin({
        verificationCode: twoFactorCode,
        username: process.env.IG_USERNAME,
        twoFactorIdentifier: chatData.twoFactorInfo.two_factor_identifier,
        verificationMethod: 0,
      });
      await uploadVideoAfterLogin(chatId, chatData.videoPath, bot);
      waitingFor2FACode.delete(chatId);
    } catch (error) {
      console.error('Error during 2FA login:', error);
      bot.sendMessage(chatId, 'Invalid 2FA code. Please try again.');
    }
  }
});

// Express app for webhook compatibility (optional, not used in polling mode)
const app = express();
app.use(express.json());
app.post('/webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}`);
});