// instagram_poster.js
import { setTimeout } from "timers/promises";
import ffmpeg from 'fluent-ffmpeg';

// --- Configuration: Environment Variables (will be passed from main bot logic) ---
// These are placeholders; actual values come from process.env in the main bot.
let FACEBOOK_ACCESS_TOKEN = '';
let IG_BUSINESS_ACCOUNT_ID = '';

// --- API Endpoints ---
const GRAPH_API_BASE_URL = "https://graph.facebook.com/v23.0";

// --- Delays for Instagram API Polling ---
const INITIAL_POLLING_DELAY = 30 * 1000; // 30 seconds initial delay before first poll
const POLLING_INTERVAL = 20 * 1000; // 20 seconds between subsequent polls
const MAX_POLLING_ATTEMPTS = 30; // Max attempts for Instagram media container processing

/**
 * Sets the necessary Instagram API credentials for this module.
 * This function should be called once from the main bot logic.
 * @param {string} fbAccessToken - The Facebook Access Token.
 * @param {string} igBusinessId - The Instagram Business Account ID.
 */
export function setInstagramCredentials(fbAccessToken, igBusinessId) {
    FACEBOOK_ACCESS_TOKEN = fbAccessToken;
    IG_BUSINESS_ACCOUNT_ID = igBusinessId;
    console.log('Instagram credentials set for instagram_poster module.');
}

/**
 * Helper to perform fetch requests and handle common error patterns.
 * @param {string} url - The URL to fetch.
 * @param {object} options - Fetch options (method, headers, body, etc.).
 * @returns {Promise<object>} The JSON response data.
 */
async function safeFetch(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        const errorData = await response.json();
        console.error(`Fetch error details: ${JSON.stringify(errorData)}`);
        throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorData.message || 'Unknown error'}`);
    }
    return response.json();
}

/**
 * Creates a media container for an Instagram Reel.
 * @param {string} videoUrl - The public URL of the video file.
 * @param {string} caption - The caption for the reel.
 * @returns {Promise<string>} The ID of the created media container.
 */
async function createMediaContainer(videoUrl, caption) {
    console.log('Creating media container...');
    const params = new URLSearchParams({
        media_type: 'REELS',
        video_url: videoUrl,
        caption: caption,
        access_token: FACEBOOK_ACCESS_TOKEN,
        share_to_feed: true, // Typically, you want Reels to appear in the feed
    });
    const url = `${GRAPH_API_BASE_URL}/${IG_BUSINESS_ACCOUNT_ID}/media?${params.toString()}`;
    const data = await safeFetch(url, { method: 'POST' });
    const containerId = data.id;
    console.log(`Media container created with ID: ${containerId}`);
    return containerId;
}

/**
 * Polls the status of a media container until it's finished processing.
 * @param {string} containerId - The ID of the media container.
 * @returns {Promise<boolean>} True if the container finished successfully, false otherwise.
 */
async function pollMediaContainerStatus(containerId) {
    console.log(`Polling status for container ${containerId}...`);
    for (let i = 0; i < MAX_POLLING_ATTEMPTS; i++) {
        try {
            const params = new URLSearchParams({
                fields: 'status_code',
                access_token: FACEBOOK_ACCESS_TOKEN,
            });
            const url = `${GRAPH_API_BASE_URL}/${containerId}?${params.toString()}`;
            const data = await safeFetch(url); // GET request by default
            const statusCode = data.status_code;
            console.log(`Container status: ${statusCode} (Attempt ${i + 1}/${MAX_POLLING_ATTEMPTS})`);

            if (statusCode === 'FINISHED') {
                console.log('Media container finished processing successfully.');
                return true;
            } else if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
                console.error(`Media container failed with status: ${statusCode}`);
                // Attempt to get more error details if available
                const errorDetails = data.error || 'No specific error details provided by Instagram.';
                console.error('Instagram API Error Details:', errorDetails);
                return false;
            }
            console.log(`Container is still processing. Waiting for ${POLLING_INTERVAL / 1000} seconds before next check...`);
            await setTimeout(POLLING_INTERVAL);
        } catch (error) {
            console.error('Error polling media container status:', error.message);
            await setTimeout(POLLING_INTERVAL); // Wait even on error to avoid hammering
        }
    }
    console.error('Max polling attempts reached. Media container did not finish processing in time.');
    return false;
}

/**
 * Publishes the media container as an Instagram Reel.
 * @param {string} containerId - The ID of the media container to publish.
 * @returns {Promise<string>} The ID of the published media.
 */
async function publishMediaContainer(containerId) {
    console.log('Publishing media container...');
    const params = new URLSearchParams({
        creation_id: containerId,
        access_token: FACEBOOK_ACCESS_TOKEN,
    });
    const url = `${GRAPH_API_BASE_URL}/${IG_BUSINESS_ACCOUNT_ID}/media_publish?${params.toString()}`;
    const data = await safeFetch(url, { method: 'POST' });
    const publishedMediaId = data.id;
    console.log(`Reel published successfully with ID: ${publishedMediaId}`);
    return publishedMediaId;
}

/**
 * Validates a video URL against Instagram Reels specifications using FFmpeg.
 * FFmpeg will stream directly from the URL for analysis.
 * @param {string} videoUrl - The URL of the video file.
 * @returns {Promise<object>} An object indicating validity and any issues.
 */
async function validateVideoFile(videoUrl) {
    console.log(`Validating video from URL: ${videoUrl}`);
    return new Promise((resolve) => {
        ffmpeg.ffprobe(videoUrl, (err, metadata) => {
            if (err) {
                console.error("FFmpeg probe error (could not read video metadata):", err.message);
                return resolve({ isValid: false, message: "Could not probe video file or URL is inaccessible. Ensure it's a valid, public URL." });
            }

            const videoStream = metadata.streams.find(s => s.codec_type === 'video');
            const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
            const format = metadata.format;

            const issues = [];

            // --- Comprehensive Video Specification Checks (based on Meta's docs) ---
            // Container: MOV or MP4 (MPEG-4 Part 14), no edit lists, moov atom at the front of the file.
            if (!format.format_name || (!format.format_name.includes('mp4') && !format.format_name.includes('mov'))) {
                issues.push(`Invalid container format: ${format.format_name}. Expected MP4 or MOV.`);
            }

            if (!videoStream) {
                issues.push("No video stream found.");
            } else {
                const width = videoStream.width;
                const height = videoStream.height;
                const duration = parseFloat(videoStream.duration);
                // eval is used for 'avg_frame_rate' as it sometimes comes as a fraction string (e.g., "30000/1001")
                const avgFrameRate = parseFloat(eval(videoStream.avg_frame_rate));
                const codecName = videoStream.codec_name;
                const bitRate = parseInt(videoStream.bit_rate);

                // Aspect Ratio (9:16 recommended, allow some tolerance for common variations)
                const aspectRatio = width / height;
                const minAllowedAspectRatio = 0.01; // 0.01:1 (very thin)
                const maxAllowedAspectRatio = 10;   // 10:1 (very wide)
                const recommendedAspectRatio = 9 / 16; // 0.5625

                if (aspectRatio < minAllowedAspectRatio || aspectRatio > maxAllowedAspectRatio) {
                    issues.push(`Aspect ratio ${aspectRatio.toFixed(2)} (${width}x${height}) is outside allowed range (0.01:1 to 10:1).`);
                }
                // Strongly recommend 9:16 vertical
                if (width > height && Math.abs(aspectRatio - (16/9)) > 0.05) { // If clearly horizontal and not close to 16:9
                    issues.push(`Video is horizontal (${width}x${height}). Instagram Reels strongly recommends vertical (9:16) to avoid cropping/blank space.`);
                } else if (width < height && Math.abs(aspectRatio - recommendedAspectRatio) > 0.05) { // If vertical but not 9:16
                     issues.push(`Video is vertical (${width}x${height}) but aspect ratio ${aspectRatio.toFixed(2)} is not close to recommended 9:16.`);
                }


                // Resolution Check (min 720p vertical, recommended 1080x1920)
                if (width < 540 || height < 960) {
                    issues.push(`Resolution (${width}x${height}) is below minimum 540x960 pixels.`);
                }
                if (width < 720 || height < 1280) { // Added a warning for below typical HD vertical
                    console.warn(`Video resolution (${width}x${height}) is below recommended 1080x1920, consider higher quality.`);
                }


                // Duration Check (API limit 90 seconds)
                const maxDurationSeconds = 90;
                const minDurationSeconds = 3;
                if (duration === undefined || duration > maxDurationSeconds) {
                    issues.push(`Video duration (${duration ? duration.toFixed(2) + 's' : 'unknown'}) exceeds max ${maxDurationSeconds}s for Reels API.`);
                } else if (duration < minDurationSeconds) {
                    issues.push(`Video duration (${duration.toFixed(2)}s) is too short (min ${minDurationSeconds}s).`);
                }

                // Frame Rate Check (24 to 60 FPS)
                if (avgFrameRate < 24 || avgFrameRate > 60) {
                    issues.push(`Frame rate (${avgFrameRate.toFixed(2)} FPS) is outside recommended 24-60 FPS.`);
                }

                // Codec Check
                if (!codecName || (!codecName.includes('h264') && !codecName.includes('hevc'))) {
                    issues.push(`Video codec (${codecName}) is not recommended (H264 or HEVC).`);
                }

                // Bitrate Check (5Mbps = 5,000,000 bps)
                const maxVideoBitrate = 5 * 1000 * 1000; // 5 Mbps
                if (bitRate > maxVideoBitrate) {
                    issues.push(`Video bitrate (${(bitRate / 1000000).toFixed(2)} Mbps) exceeds recommended 5 Mbps.`);
                }
            }

            if (!audioStream) {
                // No audio is technically allowed, but it's often a warning or preference
                console.warn("No audio stream found in video. Reels can be posted without audio.");
                // If it's the *only* issue, we might consider it valid but warn.
            } else {
                const audioCodecName = audioStream.codec_name;
                const sampleRate = parseInt(audioStream.sample_rate);
                const audioChannels = audioStream.channels;
                const audioBitRate = parseInt(audioStream.bit_rate);

                // Audio codec: AAC
                if (!audioCodecName || audioCodecName !== 'aac') {
                    issues.push(`Audio codec (${audioCodecName}) is not recommended (AAC).`);
                }
                // Sample rate: 48kHz maximum
                if (sampleRate > 48000) {
                    issues.push(`Audio sample rate (${sampleRate}Hz) exceeds recommended 48kHz.`);
                }
                // Channels: Mono or Stereo (1 or 2 channels)
                if (audioChannels > 2) {
                    issues.push(`Audio channels (${audioChannels}) exceed recommended 1 or 2.`);
                }
                // Audio bitrate (128kbps = 128,000 bps)
                const maxAudioBitrate = 128 * 1000;
                if (audioBitRate > maxAudioBitrate) {
                    issues.push(`Audio bitrate (${(audioBitRate / 1000).toFixed(2)} kbps) exceeds recommended 128 kbps.`);
                }
            }

            // File size: 100MB maximum (some sources say 1GB for API, but 100MB is safer)
            const fileSize = format.size; // in bytes
            const maxFileSize = 100 * 1024 * 1024; // 100 MB for API uploads
            if (fileSize && fileSize > maxFileSize) {
                issues.push(`Estimated file size (${(fileSize / (1024 * 1024)).toFixed(2)}MB) exceeds max 100MB for API.`);
            } else if (!fileSize) {
                console.warn("Could not determine file size from video metadata. Cannot check against 100MB limit.");
            }


            // Decide validity: If only issue is missing audio, and no other issues, consider valid.
            const hasCriticalIssues = issues.filter(issue => issue !== "No audio stream found.").length > 0;

            if (hasCriticalIssues) {
                resolve({ isValid: false, message: "Video validation failed.", issues: issues });
            } else {
                resolve({ isValid: true, message: "Video seems to meet Instagram Reel requirements.", issues: issues });
            }
        });
    });
}

/**
 * Main function to post an Instagram Reel.
 * This function is called directly by the bot.
 * @param {string} videoUrl - The public URL of the video.
 * @param {string} caption - The caption for the Reel.
 * @param {function} sendMessage - Callback to send messages back to the Telegram chat.
 */
export async function processAndPostReel(videoUrl, caption, sendMessage) {
    await sendMessage(`Received video URL: \`${videoUrl}\`\nCaption: \`${caption || 'No caption'}\`\n\nStarting Instagram Reel posting process...`);

    // Validate credentials within this module, after they've been set
    if (!FACEBOOK_ACCESS_TOKEN || FACEBOOK_ACCESS_TOKEN === 'YOUR_LONG_LIVED_FACEBOOK_USER_ACCESS_TOKEN') {
        await sendMessage('❌ Error: `FACEBOOK_ACCESS_TOKEN` environment variable is not set or is a placeholder. Please configure it in Railway.');
        console.error('FACEBOOK_ACCESS_TOKEN environment variable is not set or is a placeholder.');
        return;
    }
    if (!IG_BUSINESS_ACCOUNT_ID || IG_BUSINESS_ACCOUNT_ID === 'YOUR_INSTAGRAM_BUSINESS_ACCOUNT_ID') {
        await sendMessage('❌ Error: `IG_BUSINESS_ACCOUNT_ID` environment variable is not set or is a placeholder. Please configure it in Railway.');
        console.error('IG_BUSINESS_ACCOUNT_ID environment variable is not set or is a placeholder.');
        return;
    }
    if (!videoUrl) {
        await sendMessage('❌ Error: No video URL provided. Please ensure your message contains `video_url: <YOUR_PUBLIC_VIDEO_URL>`.');
        console.error('No video URL provided.');
        return;
    }

    try {
        await sendMessage('🔍 Validating video against Instagram Reels specifications...');
        const validationResult = await validateVideoFile(videoUrl);

        if (!validationResult.isValid) {
            await sendMessage(`❌ Video pre-validation failed: ${validationResult.message}`);
            if (validationResult.issues && validationResult.issues.length > 0) {
                await sendMessage(`Details:\n- ${validationResult.issues.join('\n- ')}`);
            }
            console.error("Video pre-validation failed. Issues found:", validationResult.issues);
            return;
        }
        // If there were warnings (like missing audio but otherwise valid), inform the user
        if (validationResult.issues && validationResult.issues.length > 0) {
             await sendMessage(`✅ Video passed pre-validation checks, but with warnings:\n- ${validationResult.issues.join('\n- ')}`);
        } else {
            await sendMessage('✅ Video passed all pre-validation checks.');
        }


        await sendMessage('📦 Creating Instagram media container...');
        const containerId = await createMediaContainer(videoUrl, caption);
        await sendMessage(`Container created with ID: \`${containerId}\`. Waiting for Instagram to process... This may take a few minutes.`);

        await sendMessage(`⏳ Waiting for ${
        INITIAL_POLLING_DELAY / 1000
        } seconds before first status check...`);
        await setTimeout(INITIAL_POLLING_DELAY); // Initial delay before first status check

        // Poll the media container status until it's finished or fails
        await sendMessage(`🔄 Polling media container status every ${POLLING_INTERVAL / 1000} seconds...`);
        const isFinished = await pollMediaContainerStatus(containerId);

        if (isFinished) {
            await sendMessage('✨ Publishing Reel to Instagram...');
            const publishedMediaId = await publishMediaContainer(containerId);
            await sendMessage(`🎉 Reel posting process completed successfully! Published ID: \`${publishedMediaId}\`\n\nCheck your Instagram account!`);
        } else {
            await sendMessage('⚠️ Reel could not be published because the media container failed to process on Instagram\'s side. Check your Instagram Business Account for more details.');
            console.error('Media container processing failed on Instagram side.');
        }
    } catch (error) {
        await sendMessage(`💥 An error occurred during the reel posting process: ${error.message}`);
        console.error('An error occurred during the reel posting process:', error.message);
    }
}
