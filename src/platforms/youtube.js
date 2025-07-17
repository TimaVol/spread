import { google } from 'googleapis';
import crypto from 'crypto';
import { Readable } from 'stream';
import {
  YOUTUBE_CLIENT_ID,
  YOUTUBE_CLIENT_SECRET,
  YOUTUBE_REFRESH_TOKEN
} from '../config/index.js';

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
  console.log('[YouTube OAuth] YOUTUBE_CLIENT_ID:', YOUTUBE_CLIENT_ID);
  console.log('[YouTube OAuth] YOUTUBE_CLIENT_SECRET:', YOUTUBE_CLIENT_SECRET ? '***set***' : '***missing***');
  console.log('[YouTube OAuth] REDIRECT_URI:', REDIRECT_URI);
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
  // Validate state
  if (!oauthStates.has(state)) {
    throw new Error('Invalid or expired state parameter.');
  }
  oauthStates.delete(state);
  // Exchange code for tokens
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error('No refresh_token received. Ensure you grant all requested permissions and use prompt=consent.');
  }
  // Instruct user to update YOUTUBE_REFRESH_TOKEN
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

export async function uploadYouTubeShort(videoBuffer, title, description, privacyStatus = 'unlisted', sendMessage = null) {
  if (!YOUTUBE_REFRESH_TOKEN) throw new Error('YOUTUBE_REFRESH_TOKEN not set.');
  await oauth2Client.getAccessToken(); // Ensures token is fresh
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  const fullTitle = title.includes('#Shorts') ? title : `${title} #Shorts`;
  const fullDescription = description.includes('#Shorts') ? description : `${description}\n#Shorts`;
  try {
    if (sendMessage) await sendMessage('🚀 Uploading video to YouTube Shorts...');
    const res = await youtube.videos.insert({
      part: ['snippet', 'status'],
      notifySubscribers: false,
      requestBody: {
        snippet: {
          title: fullTitle,
          description: fullDescription,
          categoryId: '22', // People & Blogs
        },
        status: {
          privacyStatus,
          selfDeclaredMadeForKids: true,
        },
      },
      media: {
        mimeType: 'video/mp4',
        body: Readable.from(videoBuffer),
      },
    }, {
      // Progress callback
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
    if (sendMessage) await sendMessage(`❌ YouTube upload failed: ${err.message}`);
    throw err;
  }
}