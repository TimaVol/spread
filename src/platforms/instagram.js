import { FACEBOOK_ACCESS_TOKEN, IG_BUSINESS_ACCOUNT_ID, CAPTION } from '../config/index.js';
import validateVideoFile from '../utils/video-validator.js';
import { setTimeout } from 'timers/promises';
import { handleBotError } from '../utils/error_handler.js';

const GRAPH_API_BASE_URL = 'https://graph.facebook.com/v23.0';
const INITIAL_POLLING_DELAY = 30 * 1000;
const POLLING_INTERVAL = 20 * 1000;
const MAX_POLLING_ATTEMPTS = 3;
const MAX_RETRIES = 3;

async function safeFetch(url, options = {}, attempt = 1) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorData.message || 'Unknown error'}`);
    }
    return response.json();
  } catch (err) {
    if (attempt < MAX_RETRIES && isTransientError(err)) {
      await setTimeout(1000 * Math.pow(2, attempt)); // Exponential backoff
      return safeFetch(url, options, attempt + 1);
    }
    throw err;
  }
}

function isTransientError(err) {
  // Basic check for network or rate limit errors
  return /429|timeout|network|temporarily unavailable/i.test(err.message);
}

async function createMediaContainer(videoUrl, caption) {
  const params = new URLSearchParams({
    media_type: 'REELS',
    video_url: videoUrl,
    caption: caption,
    access_token: FACEBOOK_ACCESS_TOKEN,
    share_to_feed: true,
  });
  const url = `${GRAPH_API_BASE_URL}/${IG_BUSINESS_ACCOUNT_ID}/media?${params.toString()}`;
  const data = await safeFetch(url, { method: 'POST' });
  return data.id;
}

async function pollMediaContainerStatus(containerId) {
  for (let i = 0; i < MAX_POLLING_ATTEMPTS; i++) {
    const params = new URLSearchParams({
      fields: 'status_code',
      access_token: FACEBOOK_ACCESS_TOKEN,
    });
    const url = `${GRAPH_API_BASE_URL}/${containerId}?${params.toString()}`;
    const data = await safeFetch(url);
    const statusCode = data.status_code;
    if (statusCode === 'FINISHED') return true;
    if (statusCode === 'ERROR' || statusCode === 'EXPIRED') return false;
    await setTimeout(POLLING_INTERVAL);
  }
  return false;
}

async function publishMediaContainer(containerId) {
  const params = new URLSearchParams({
    creation_id: containerId,
    access_token: FACEBOOK_ACCESS_TOKEN,
  });
  const url = `${GRAPH_API_BASE_URL}/${IG_BUSINESS_ACCOUNT_ID}/media_publish?${params.toString()}`;
  const data = await safeFetch(url, { method: 'POST' });
  return data.id;
}

export async function postReelToInstagram(videoUrl, caption, sendMessage) {
  if (!FACEBOOK_ACCESS_TOKEN || !IG_BUSINESS_ACCOUNT_ID) {
    await sendMessage('Instagram API credentials are not set.');
    return;
  }
  try {
    // Optionally validate video URL (if public URL)
    // const validationResult = await validateVideoFile(videoUrl);
    // if (!validationResult.isValid) {
    //   await sendMessage(`❌ Video validation failed: ${validationResult.message}\n${validationResult.issues ? validationResult.issues.join('\n') : ''}`);
    //   return;
    // }
    await sendMessage('📦 Creating Instagram media container...');
    const containerId = await createMediaContainer(videoUrl, caption);
    await sendMessage('⏳ Waiting for Instagram to process the video...');
    await setTimeout(INITIAL_POLLING_DELAY);
    const isFinished = await pollMediaContainerStatus(containerId);
    if (isFinished) {
      await sendMessage('✨ Publishing Reel to Instagram...');
      const publishedMediaId = await publishMediaContainer(containerId);
      await sendMessage(`🎉 Reel posted successfully! Media ID: ${publishedMediaId}`);
    } else {
      await sendMessage('⚠️ Instagram failed to process the video.');
    }
  } catch (error) {
    await handleBotError(error, { context: 'Instagram API', bot: null, chatId: null });
    await sendMessage(`💥 Error posting to Instagram: ${error.message}`);
  }
}

export async function postQueuedReelToInstagram(videoUrl, sendMessage) {
  return postReelToInstagram(videoUrl, CAPTION, sendMessage);
}
