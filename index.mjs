// index.js (for Railway Cron Job - direct execution)
import { setTimeout } from "timers/promises";

// --- Configuration: Environment Variables for Railway Cron Job ---
// These will be pulled from Railway's environment variables,
// which you will configure directly on the Cron Job service.
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const IG_BUSINESS_ACCOUNT_ID = process.env.IG_BUSINESS_ACCOUNT_ID;
const VIDEO_URL = process.env.VIDEO_URL || "https://cdn.pixabay.com/video/2025/05/01/275983_large.mp4"; // Provide a default or ensure it's always set
const CAPTION = process.env.CAPTION || "My awesome new Reel! #reels #instagram #nodejs #automation";

// --- API Endpoints ---
const GRAPH_API_BASE_URL = "https://graph.facebook.com/v23.0";

// --- Delays ---
const INITIAL_POLLING_DELAY = 30 * 1000; // 30 seconds initial delay before first poll
const POLLING_INTERVAL = 20 * 1000; // 20 seconds between subsequent polls
const MAX_POLLING_ATTEMPTS = 3; // Increased max attempts to account for longer videos

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
        access_token: ACCESS_TOKEN,
        share_to_feed: true,
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
                access_token: ACCESS_TOKEN,
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
                console.error('Error details (if available):', data.error);
                return false;
            }
            await setTimeout(POLLING_INTERVAL);
        } catch (error) {
            console.error('Error polling media container status:', error.message);
            await setTimeout(POLLING_INTERVAL);
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
        access_token: ACCESS_TOKEN,
    });
    const url = `${GRAPH_API_BASE_URL}/${IG_BUSINESS_ACCOUNT_ID}/media_publish?${params.toString()}`;
    const data = await safeFetch(url, { method: 'POST' });
    const publishedMediaId = data.id;
    console.log(`Reel published successfully with ID: ${publishedMediaId}`);
    return publishedMediaId;
}

/**
 * Main function to post an Instagram Reel.
 * This function is called directly by the cron job.
 */
async function postReel() {
    console.log('Cron job triggered: Attempting to post Instagram Reel...');

    // Validate environment variables
    if (!ACCESS_TOKEN || ACCESS_TOKEN === 'YOUR_LONG_LIVED_FACEBOOK_USER_ACCESS_TOKEN') {
        console.error('FACEBOOK_ACCESS_TOKEN environment variable is not set or is a placeholder.');
        throw new Error('Missing FACEBOOK_ACCESS_TOKEN.');
    }
    if (!IG_BUSINESS_ACCOUNT_ID || IG_BUSINESS_ACCOUNT_ID === 'YOUR_INSTAGRAM_BUSINESS_ACCOUNT_ID') {
        console.error('IG_BUSINESS_ACCOUNT_ID environment variable is not set or is a placeholder.');
        throw new Error('Missing IG_BUSINESS_ACCOUNT_ID.');
    }
    if (!VIDEO_URL) {
        console.error('VIDEO_URL environment variable is not set or is a placeholder.');
        throw new Error('Missing VIDEO_URL.');
    }
    if (!CAPTION) {
        console.warn('CAPTION is empty. Consider adding a caption for your reel.');
    }

    try {
        const containerId = await createMediaContainer(VIDEO_URL, CAPTION);
        console.log(`Waiting for ${INITIAL_POLLING_DELAY / 1000} seconds before first status check...`);
        await setTimeout(INITIAL_POLLING_DELAY);

        const isFinished = await pollMediaContainerStatus(containerId);

        if (isFinished) {
            await publishMediaContainer(containerId);
            console.log('Reel posting process completed successfully!');
        } else {
            console.error('Reel could not be published because the media container failed to process.');
            throw new Error('Media container processing failed.');
        }
    } catch (error) {
        console.error('An error occurred during the reel posting process:', error.message);
        // Railway cron jobs will report failure if the script exits with an error.
        process.exit(1); // Indicate failure to the cron runner
    }
}

// Directly execute the postReel function when the script is run
postReel();
