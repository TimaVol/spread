import { TIKTOK_ACCESS_TOKEN, TIKTOK_OPEN_ID } from '../config/index.js';
import validateVideoFile from '../utils/video-validator.js';
import { setTimeout } from 'timers/promises';

const TIKTOK_API_BASE_URL = 'https://open.tiktokapis.com/v2';
const INITIAL_POLLING_DELAY = 30 * 1000;
const POLLING_INTERVAL = 20 * 1000;
const MAX_POLLING_ATTEMPTS = 5;

async function safeFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${TIKTOK_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`TikTok API error! Status: ${response.status}, Details: ${errorData.message || 'Unknown error'}`);
  }
  return response.json();
}

async function uploadVideoToTikTok(videoUrl, caption) {
  // Step 1: Initialize video upload
  const initResponse = await safeFetch(`${TIKTOK_API_BASE_URL}/video/init/`, {
    method: 'POST',
    body: JSON.stringify({
      post_info: {
        title: caption || 'Video from Telegram Bot',
        privacy_level: 'public',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 0,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: 0, // Will be set after download
        chunk_size: 0,
        total_chunk_count: 1,
      },
    }),
  });

  const uploadUrl = initResponse.data.upload_url;
  const videoId = initResponse.data.video_id;

  // Step 2: Download video and get its size
  const videoResponse = await fetch(videoUrl);
  const videoBuffer = await videoResponse.arrayBuffer();
  const videoSize = videoBuffer.byteLength;

  // Step 3: Upload video content
  await safeFetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': videoSize.toString(),
    },
    body: videoBuffer,
  });

  // Step 4: Create post
  const createResponse = await safeFetch(`${TIKTOK_API_BASE_URL}/video/create/`, {
    method: 'POST',
    body: JSON.stringify({
      video_id: videoId,
      post_info: {
        title: caption || 'Video from Telegram Bot',
        privacy_level: 'public',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 0,
      },
    }),
  });

  return createResponse.data.publish_id;
}

async function pollTikTokStatus(publishId) {
  for (let i = 0; i < MAX_POLLING_ATTEMPTS; i++) {
    const response = await safeFetch(`${TIKTOK_API_BASE_URL}/video/query/`, {
      method: 'POST',
      body: JSON.stringify({
        fields: ['publish_id', 'status'],
        publish_ids: [publishId],
      }),
    });

    const status = response.data.videos[0]?.status;
    if (status === 'PUBLISHED') return true;
    if (status === 'FAILED') return false;
    
    await setTimeout(POLLING_INTERVAL);
  }
  return false;
}

export async function postToTikTok(videoUrl, caption, sendMessage) {
  if (!TIKTOK_ACCESS_TOKEN || !TIKTOK_OPEN_ID) {
    await sendMessage('TikTok API credentials are not set.');
    return;
  }

  try {
    await sendMessage('🔍 Validating video for TikTok...');
    const validationResult = await validateVideoFile(videoUrl);
    if (!validationResult.isValid) {
      await sendMessage(`❌ TikTok video validation failed: ${validationResult.message}`);
      return;
    }

    await sendMessage('📦 Uploading video to TikTok...');
    const publishId = await uploadVideoToTikTok(videoUrl, caption);
    
    await sendMessage('⏳ Waiting for TikTok to process the video...');
    await setTimeout(INITIAL_POLLING_DELAY);
    
    const isPublished = await pollTikTokStatus(publishId);
    if (isPublished) {
      await sendMessage(`🎉 Video posted to TikTok successfully! Publish ID: ${publishId}`);
    } else {
      await sendMessage('⚠️ TikTok failed to publish the video.');
    }
  } catch (error) {
    await sendMessage(`💥 Error posting to TikTok: ${error.message}`);
  }
}