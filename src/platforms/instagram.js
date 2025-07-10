import { IG_USERNAME, IG_PASSWORD } from '../config/index.js';
import { IgApiClient, IgLoginTwoFactorRequiredError } from 'instagram-private-api';
import fs, { readFile } from 'fs';
import { promisify } from 'util';
import ffmpeg from 'fluent-ffmpeg';

const readFileAsync = promisify(readFile);
const ig = new IgApiClient();

export async function resizeVideo(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions('-vf', 'scale=480:600')
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

export async function uploadToInstagram({ chatId, videoPath, fileName, bot, waitingFor2FACode }) {
  const resizedVideoPath = './downloads/' + 'resized_' + fileName;
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
      const { two_factor_info } = error.response.body;
      waitingFor2FACode.set(chatId, {
        videoPath: resizedVideoPath,
        twoFactorInfo: two_factor_info,
      });
      bot.sendMessage(chatId, 'Please enter the 2FA code sent to your device:');
    } else {
      console.error('Error uploading video to Instagram:', error);
      bot.sendMessage(chatId, 'Failed to upload video to Instagram.');
    }
  } finally {
    if (!waitingFor2FACode.has(chatId)) {
      fs.unlink(videoPath, (err) => {
        if (err) console.error('Error deleting video file:', err);
      });
      fs.unlink(resizedVideoPath, (err) => {
        if (err) console.error('Error deleting resized video file:', err);
      });
    }
  }
}

export async function uploadVideoAfterLogin(chatId, videoPath, bot) {
  const videoBuffer = fs.readFileSync(videoPath);
  const publishResult = await ig.publish.video({
    video: videoBuffer,
    caption: 'Your video caption here',
  });
  console.log('Video uploaded successfully to Instagram:', publishResult);
  bot.sendMessage(chatId, 'Video has been uploaded to Instagram!');
}

export { ig };