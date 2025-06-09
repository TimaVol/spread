import TelegramBot from "node-telegram-bot-api";
import fs, {readFile} from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { IgApiClient, IgLoginTwoFactorRequiredError } from 'instagram-private-api';
import { promisify } from 'util';
import ffmpeg from 'fluent-ffmpeg';

const { TELEGRAM_TOKEN, IG_USERNAME, IG_PASSWORD } = process.env;
const readFileAsync = promisify(readFile);

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(TELEGRAM_TOKEN, {
  polling: true
});

// Get the current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const downloadsDir = path.join(__dirname, 'downloads');

if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir);
}

const waitingFor2FACode = new Map(); // To store chat IDs waiting for 2FA code

async function resizeVideo(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
          .outputOptions('-vf', 'scale=480:600') // Change dimensions as needed
          .on('end', () => {
              console.log('Video resized successfully.');
              resolve();
          })
          .on('error', (err) => {
              console.error('Error resizing video:', err);
              reject(err);
          })
          .save(outputPath);
  });
}

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  // Check if the message contains a video
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
          await uploadToInstagram(chatId, downloadPath, fileName);
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

const ig = new IgApiClient()

async function uploadToInstagram(chatId, videoPath, fileName) {
  const resizedVideoPath = './downloads/'+'resized_'+fileName
  try {
    ig.state.generateDevice(IG_USERNAME);
    await ig.account.login(IG_USERNAME, IG_PASSWORD);
    console.log('Logged in to Instagram');


    await resizeVideo(videoPath, resizedVideoPath);


    const videoBuffer = await readFileAsync(resizedVideoPath);
    const coverBuffer = await readFileAsync('./image3.jpeg');
    
    if (!videoBuffer || videoBuffer.byteLength === 0) {
      throw new Error('Video data is empty or could not be read');
    }

    const publishResult = await ig.publish.video({
      video: videoBuffer,
      coverImage: coverBuffer,
    });

    console.log('Video uploaded successfully to Instagram:', publishResult);
    bot.sendMessage(chatId, 'Video has been uploaded to Instagram!');
  } catch (error) {
    if (error instanceof IgLoginTwoFactorRequiredError) {
      const {two_factor_info} = error.response.body;
      waitingFor2FACode.set(chatId, {
        videoPath: resizedVideoPath,
        twoFactorInfo: two_factor_info,
      }); // Store the video path for later
      bot.sendMessage(chatId, 'Please enter the 2FA code sent to your device:');
    } else {
      console.error('Error uploading video to Instagram:', error);
      bot.sendMessage(chatId, 'Failed to upload video to Instagram.');
    }
  } finally {
    // Clean up the downloaded video file if needed
    if (!waitingFor2FACode.has(chatId)) {
      fs.unlink(videoPath, (err) => {
        if (err) console.error('Error deleting video file:', err);
      });

      fs.unlink(resizedVideoPath, (err) => {
        if (err) console.error('Error deleting resized video file:', err);
      })
    }
  }
}

// Listen for messages that could be 2FA codes
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const chatData = waitingFor2FACode.get(chatId);
  // console.log('chatData', chatData);
  if (!!chatData?.videoPath) {
        const twoFactorCode = msg.text; // Get the 2FA code from the message

        try {
            console.log('twoFactorIdentifier', chatData.twoFactorInfo.twoFactorIdentifier)
            console.log('twoFactorCode', twoFactorCode)
            await ig.account.twoFactorLogin({
              verificationCode: twoFactorCode,
              username: IG_USERNAME,
              twoFactorIdentifier: chatData.twoFactorInfo.two_factor_identifier,
              verificationMethod: 0,
            });
            console.log('Successfully logged in with 2FA');

            // Retry video upload after successful login
            await uploadVideoAfterLogin(chatId, chatData.videoPath);
            waitingFor2FACode.delete(chatId); // Remove the chat ID from the map
        } catch (error) {
            console.error('Error during 2FA login:', error);
            bot.sendMessage(chatId, 'Invalid 2FA code. Please try again.');
        }
  }
});

async function uploadVideoAfterLogin(chatId, videoPath) {
  const videoBuffer = fs.readFileSync(videoPath);
  const publishResult = await ig.publish.video({
    video: videoBuffer,
    caption: 'Your video caption here',
  });

  console.log('Video uploaded successfully to Instagram:', publishResult);
  bot.sendMessage(chatId, 'Video has been uploaded to Instagram!');
}