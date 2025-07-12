import { GOOGLE_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } from '../config/index.js';
import validateVideoFile from '../utils/video-validator.js';
import { setTimeout } from 'timers/promises';

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/upload/youtube/v3';
const GOOGLE_OAUTH_URL = 'https://oauth2.googleapis.com/token';
const INITIAL_POLLING_DELAY = 30 * 1000;
const POLLING_INTERVAL = 20 * 1000;
const MAX_POLLING_ATTEMPTS = 5;

let accessToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const response = await fetch(GOOGLE_OAUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh Google access token: ${response.status}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000);
  
  return accessToken;
}

async function safeFetch(url, options = {}) {
  const token = await getAccessToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`YouTube API error! Status: ${response.status}, Details: ${errorData.error?.message || 'Unknown error'}`);
  }
  return response.json();
}

async function uploadVideoToYouTube(videoUrl, caption) {
  // Download video first
  const videoResponse = await fetch(videoUrl);
  const videoBuffer = await videoResponse.arrayBuffer();
  
  // Prepare metadata
  const metadata = {
    snippet: {
      title: caption || 'Video from Telegram Bot',
      description: caption || 'Video uploaded via Telegram Bot',
      tags: ['shorts', 'video'],
      categoryId: '22', // People & Blogs
    },
    status: {
      privacyStatus: 'public',
      selfDeclaredMadeForKids: false,
    },
  };

  // Create multipart upload
  const boundary = 'boundary_' + Math.random().toString(36).substring(2);
  const multipartBody = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: video/mp4',
    'Content-Transfer-Encoding: binary',
    '',
    Buffer.from(videoBuffer),
    `--${boundary}--`,
  ].join('\r\n');

  const uploadUrl = `${YOUTUBE_API_BASE_URL}/videos?uploadType=multipart&part=snippet,status`;
  
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': Buffer.byteLength(multipartBody),
    },
    body: multipartBody,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`YouTube upload failed: ${response.status}, Details: ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.id;
}

async function pollYouTubeStatus(videoId) {
  for (let i = 0; i < MAX_POLLING_ATTEMPTS; i++) {
    const response = await safeFetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=status,processingDetails`
    );

    const video = response.items[0];
    if (!video) {
      throw new Error('Video not found after upload');
    }

    const status = video.status.uploadStatus;
    if (status === 'processed') return true;
    if (status === 'failed') return false;
    
    await setTimeout(POLLING_INTERVAL);
  }
  return false;
}

export async function postToYouTubeShorts(videoUrl, caption, sendMessage) {
  if (!GOOGLE_API_KEY || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    await sendMessage('YouTube API credentials are not set.');
    return;
  }

  try {
    await sendMessage('🔍 Validating video for YouTube Shorts...');
    const validationResult = await validateVideoFile(videoUrl);
    if (!validationResult.isValid) {
      await sendMessage(`❌ YouTube video validation failed: ${validationResult.message}`);
      return;
    }

    await sendMessage('📦 Uploading video to YouTube...');
    const videoId = await uploadVideoToYouTube(videoUrl, caption);
    
    await sendMessage('⏳ Waiting for YouTube to process the video...');
    await setTimeout(INITIAL_POLLING_DELAY);
    
    const isProcessed = await pollYouTubeStatus(videoId);
    if (isProcessed) {
      const shortsUrl = `https://youtube.com/shorts/${videoId}`;
      await sendMessage(`🎉 Video posted to YouTube Shorts successfully!\n🔗 ${shortsUrl}`);
    } else {
      await sendMessage('⚠️ YouTube failed to process the video.');
    }
  } catch (error) {
    await sendMessage(`💥 Error posting to YouTube Shorts: ${error.message}`);
  }
}