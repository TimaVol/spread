// src/bot/messages.js
// Centralized user-facing messages and responses

export const messages = {
  unauthorized: (chatId) => `🚫 Access Denied: This bot is private. Your chat ID (${chatId}) is not authorized.`,
  errorOccurred: (context, errMsg) => `❌ Error in ${context}: ${errMsg}`,
  cleanupError: (where, errMsg) => `⚠️ Cleanup error (${where}): ${errMsg}`,
  instagramCredentialsMissing: 'Instagram API credentials are not set.',
  instagramSuccess: (mediaId) => `🎉 Reel posted successfully! Media ID: ${mediaId}`,
  instagramFailed: '⚠️ Instagram failed to process the video.',
  youtubeAuth: (url) => `🔗 [Authorize this bot to upload YouTube Shorts](${url})\n\nAfter authorizing, paste the refresh token into your Railway environment as YOUTUBE_REFRESH_TOKEN\\.`,
  done: '✅ Done!',
  downloading: '⬇️ Downloading video from Telegram...',
  uploadingSupabase: '⬆️ Uploading video to Supabase Storage...',
  uploaded: '📤 Video uploaded. Posting to Instagram...',
  postingInstagram: '📦 Creating Instagram media container...',
  waitingInstagram: '⏳ Waiting for Instagram to process the video...',
  publishingInstagram: '✨ Publishing Reel to Instagram...',
  uploadingYouTube: '🚀 Uploading to YouTube Shorts...',
  cleaningUp: '🧹 Cleaning up...',
  welcome: `👋 *Welcome to the Instagram & YouTube Shorts Uploader Bot\\!\*\n\nSend a video file to upload it to both Instagram Reels and YouTube Shorts\\.\n\n*Commands:*\n\`/start\` Show this message\n\`/auth_youtube\` Get YouTube authorization link\n\n_This bot is private and only works for the authorized user\\._`,
  help: `*Available Commands:*\n\`/start\` Show welcome and usage instructions\n\`/help\` Show this help message\n\`/ping\` Health check\n\`/status\` Show bot status \\(uptime, temp files, platform keys\\)\n\`/videos\` Show number of videos in Supabase bucket\n\`/cleanup\` Manually clean up temp files \\(admin only\\)\n\`/env\` Show environment summary \\(admin only\\)\n\`/auth_youtube\` Get YouTube authorization link \\(admin only\\)`,
  status: ({ uptime, tempFiles, tempSize, supabase, instagram, youtube }) =>
    `*Bot Status:*
Uptime: ${Math.floor(uptime)}s
Temp files: ${tempFiles} \\(${(tempSize / 1024 / 1024).toFixed(2)} MB\\)
Supabase: ${supabase}
Instagram: ${instagram}
YouTube: ${youtube}`,
  env: (env) =>
    `*Environment Variables:*
${Object.entries(env).map(([k, v]) => `${k}: \`${v}\``).join('\n')}`,
  videos: (count) => `📊 *Videos in Supabase Bucket:* ${count}`,
  videosError: (error) => `❌ *Error retrieving video count:* ${error}`,
  videoValidationFailedContinue: '🚀 Video validation failed. But continuing to upload to Instagram and YouTube Shorts',
  videoValidationPassed: '✅ Video validation passed.',
  queued: '📥 Video received and added to the queue. It will be processed soon!',
  generatingPhotoPrompt: '🎨 Generating anime photo prompt...',
  generatingPhoto: '✨ Generating photo with Nano Banana...',
  photoReady: '📸 Photo generated! What would you like to do?',
  photoSaved: '💾 Photo saved to Supabase! It will be posted to Instagram soon.',
  photoAborted: '❌ Photo generation cancelled.',
  photoRegenerating: '🔄 Regenerating photo...',
  photoGenerationError: '❌ Failed to generate photo. Please try again.',
};
