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
  cleaningUp: '🧹 Cleaning up...',
  welcome: `👋 *Welcome to the Instagram & YouTube Shorts Uploader Bot!*

Send a video file to upload it to both Instagram Reels and YouTube Shorts.

*Commands:*
/start - Show this message
/auth_youtube - Get YouTube authorization link

You can also send a message in this format:
video_url: <YOUR_PUBLIC_VIDEO_URL>
caption: <YOUR_CAPTION_TEXT>

_This bot is private and only works for the authorized user._`,
  help: `*Available Commands:*
/start - Show welcome and usage instructions
/help - Show this help message
/ping - Health check
/status - Show bot status (uptime, temp files, platform keys)
/cleanup - Manually clean up temp files (admin only)
/env - Show environment summary (admin only)
/auth_youtube - Get YouTube authorization link (admin only)
`,
  status: ({ uptime, tempFiles, tempSize, supabase, instagram, youtube }) =>
    `*Bot Status:*
Uptime: ${Math.floor(uptime)}s
Temp files: ${tempFiles} (${(tempSize / 1024 / 1024).toFixed(2)} MB)
Supabase: ${supabase}
Instagram: ${instagram}
YouTube: ${youtube}`,
  env: (env) =>
    `*Environment Variables:*
${Object.entries(env).map(([k, v]) => `${k}: \`${v}\``).join('\n')}`,
};