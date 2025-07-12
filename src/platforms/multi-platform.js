import { postReelToInstagram } from './instagram.js';
import { postToTikTok } from './tiktok.js';
import { postToYouTubeShorts } from './youtube.js';

export async function postToAllPlatforms(videoUrl, caption, sendMessage, platforms = ['instagram', 'tiktok', 'youtube']) {
  const results = {
    instagram: { success: false, error: null },
    tiktok: { success: false, error: null },
    youtube: { success: false, error: null },
  };

  await sendMessage(`🚀 Starting multi-platform posting to: ${platforms.join(', ')}`);

  // Post to Instagram
  if (platforms.includes('instagram')) {
    try {
      await sendMessage('📸 Posting to Instagram Reels...');
      await postReelToInstagram(videoUrl, caption, sendMessage);
      results.instagram.success = true;
    } catch (error) {
      results.instagram.error = error.message;
      await sendMessage(`❌ Instagram failed: ${error.message}`);
    }
  }

  // Post to TikTok
  if (platforms.includes('tiktok')) {
    try {
      await sendMessage('🎵 Posting to TikTok...');
      await postToTikTok(videoUrl, caption, sendMessage);
      results.tiktok.success = true;
    } catch (error) {
      results.tiktok.error = error.message;
      await sendMessage(`❌ TikTok failed: ${error.message}`);
    }
  }

  // Post to YouTube Shorts
  if (platforms.includes('youtube')) {
    try {
      await sendMessage('📺 Posting to YouTube Shorts...');
      await postToYouTubeShorts(videoUrl, caption, sendMessage);
      results.youtube.success = true;
    } catch (error) {
      results.youtube.error = error.message;
      await sendMessage(`❌ YouTube failed: ${error.message}`);
    }
  }

  // Generate summary
  const successfulPlatforms = Object.entries(results)
    .filter(([platform, result]) => result.success)
    .map(([platform]) => platform);

  const failedPlatforms = Object.entries(results)
    .filter(([platform, result]) => !result.success && result.error)
    .map(([platform, result]) => `${platform} (${result.error})`);

  let summary = '📊 **Posting Summary:**\n\n';
  
  if (successfulPlatforms.length > 0) {
    summary += `✅ **Successful:** ${successfulPlatforms.join(', ')}\n\n`;
  }
  
  if (failedPlatforms.length > 0) {
    summary += `❌ **Failed:** ${failedPlatforms.join(', ')}\n\n`;
  }

  summary += `🎯 **Success Rate:** ${successfulPlatforms.length}/${platforms.length} platforms`;

  await sendMessage(summary);

  return results;
}

export async function postToSpecificPlatform(videoUrl, caption, sendMessage, platform) {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return await postReelToInstagram(videoUrl, caption, sendMessage);
    case 'tiktok':
      return await postToTikTok(videoUrl, caption, sendMessage);
    case 'youtube':
      return await postToYouTubeShorts(videoUrl, caption, sendMessage);
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}