// src/bot/messages.js
// Centralized user-facing messages and responses

export const messages = {
  unauthorized: (chatId) => `🚫 Access Denied: This bot is private. Your chat ID (${chatId}) is not authorized.`,
  sendVideoOrUrl: 'Please send a video file or a message in the following format:\n\nvideo_url: <YOUR_PUBLIC_VIDEO_URL>\ncaption: <YOUR_CAPTION_TEXT>',
  errorOccurred: (context, errMsg) => `❌ Error in ${context}: ${errMsg}`,
  cleanupError: (where, errMsg) => `⚠️ Cleanup error (${where}): ${errMsg}`,
  instagramCredentialsMissing: 'Instagram API credentials are not set.',
  instagramSuccess: (mediaId) => `🎉 Reel posted successfully! Media ID: ${mediaId}`,
  instagramFailed: '⚠️ Instagram failed to process the video.',
  youtubeAuth: (url) => `🔗 [Authorize this bot to upload YouTube Shorts](${url})\n\nAfter authorizing, paste the refresh token into your Railway environment as YOUTUBE_REFRESH_TOKEN.`,
  done: '✅ Done!',
  downloading: '⬇️ Downloading video from Telegram...',
  uploadingSupabase: '⬆️ Uploading video to Supabase Storage...',
  uploaded: '📤 Video uploaded. Posting to Instagram...',
  postingInstagram: '📦 Creating Instagram media container...',
  waitingInstagram: '⏳ Waiting for Instagram to process the video...',
  publishingInstagram: '✨ Publishing Reel to Instagram...',
  uploadingYouTube: '🚀 Uploading to YouTube Shorts...',
  cleaningUp: '🧹 Cleaning up...'
};