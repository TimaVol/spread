import { google } from 'googleapis';
import crypto from 'crypto';
import { Readable } from 'stream';
import {
  YOUTUBE_CLIENT_ID,
  YOUTUBE_CLIENT_SECRET,
  YOUTUBE_REFRESH_TOKEN
} from '../config/index.js';
import { handleBotError } from '../utils/error_handler.js';

// In-memory state store for OAuth (for single-user bot)
const oauthStates = new Map();

const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || 'https://your-railway-app-url/youtube-callback';
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl',
];

const oauth2Client = new google.auth.OAuth2(
  YOUTUBE_CLIENT_ID,
  YOUTUBE_CLIENT_SECRET,
  REDIRECT_URI
);

if (YOUTUBE_REFRESH_TOKEN) {
  oauth2Client.setCredentials({ refresh_token: YOUTUBE_REFRESH_TOKEN });
}

export function getYouTubeAuthUrl() {
  const state = crypto.randomBytes(16).toString('hex');
  oauthStates.set(state, Date.now());
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
    prompt: 'consent',
  });
  console.log('[YouTube OAuth] Generated Auth URL:', url);
  return { url, state };
}

export async function handleYouTubeCallback(code, state) {
  if (!oauthStates.has(state)) {
    throw new Error('Invalid or expired state parameter.');
  }
  oauthStates.delete(state);
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error('No refresh_token received. Ensure you grant all requested permissions and use prompt=consent.');
  }
  return {
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
    expiry_date: tokens.expiry_date,
  };
}

export async function refreshYouTubeAccessToken() {
  if (!YOUTUBE_REFRESH_TOKEN) throw new Error('YOUTUBE_REFRESH_TOKEN not set.');
  oauth2Client.setCredentials({ refresh_token: YOUTUBE_REFRESH_TOKEN });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials.access_token;
}

function isTransientError(err) {
  return /429|timeout|network|temporarily unavailable/i.test(err.message);
}

export async function uploadYouTubeShort(videoBuffer, title, description, privacyStatus = 'unlisted', sendMessage = null, attempt = 1) {
  if (!YOUTUBE_REFRESH_TOKEN) throw new Error('YOUTUBE_REFRESH_TOKEN not set.');
  await oauth2Client.getAccessToken();
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  let fullTitle = title.includes('#Shorts') ? title : `${title} #Shorts`;
  let fullDescription = description.includes('#Shorts') ? description : `${description}\n#Shorts`;
  fullTitle = (fullTitle && fullTitle.trim()) ? fullTitle.trim() : 'My YouTube Short #anime';
  if (!fullTitle) fullTitle = 'My YouTube Short #anime';
  if (!fullDescription) fullDescription = '#anime';
  try {
    if (sendMessage) await sendMessage('🚀 Uploading video to YouTube Shorts...');
    const res = await youtube.videos.insert({
      part: ['snippet', 'status'],
      notifySubscribers: false,
      requestBody: {
        snippet: {
          title: fullTitle,
          description: fullDescription,
          categoryId: '22',
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        mimeType: 'video/mp4',
        body: Readable.from(videoBuffer),
      },
    }, {
      onUploadProgress: evt => {
        if (sendMessage) {
          const percent = Math.round((evt.bytesRead / (videoBuffer.length || 1)) * 100);
          sendMessage(`Uploading: ${percent}%`);
        }
      }
    });
    if (sendMessage) await sendMessage(`✅ Uploaded! Video ID: ${res.data.id}\nhttps://youtube.com/shorts/${res.data.id}`);
    return res.data;
  } catch (err) {
    if (isTransientError(err) && attempt < 3) {
      if (sendMessage) await sendMessage(`YouTube upload failed (attempt ${attempt}), retrying...`);
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      return uploadYouTubeShort(videoBuffer, title, description, privacyStatus, sendMessage, attempt + 1);
    }
    if (sendMessage) await sendMessage(`❌ YouTube upload failed: ${err.message}`);
    await handleBotError(err, { context: 'YouTube API', bot: null, chatId: null });
    throw err;
  }
}
