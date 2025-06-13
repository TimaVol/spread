import { setTimeout } from "timers/promises"; // For async delays

// --- Configuration ---
// IMPORTANT: Replace these placeholders with your actual values.
const { IG_BUSINESS_ACCOUNT_ID, FACEBOOK_ACCESS_TOKEN } = process.env;
const VIDEO_URL = "https://cdn.pixabay.com/video/2025/05/01/275983_large.mp4"; // Must be a publicly accessible URL (e.g., from a CDN)
const CAPTION = "My awesome new Reel! #reels #instagram";

// --- API Endpoints ---
const GRAPH_API_BASE_URL = "https://graph.facebook.com/v23.0"; // Use a recent stable version, e.g., v19.0, v20.0, etc.

/**
 * Creates a media container for an Instagram Reel.
 * This is the first step in posting a video.
 * @param {string} videoUrl - The public URL of the video file.
 * @param {string} caption - The caption for the reel.
 * @returns {Promise<string>} The ID of the created media container.
 */
async function createMediaContainer(videoUrl, caption) {
  console.log("Creating media container...");
  try {
    const params = new URLSearchParams({
      media_type: "REELS",
      video_url: videoUrl,
      caption: caption,
      access_token: FACEBOOK_ACCESS_TOKEN,
      share_to_feed: true,
      // You can optionally add 'thumb_offset' (in milliseconds) or 'cover_url' for the thumbnail
      // cover_url: 'https://www.example.com/reel-cover.jpg'
    });

    const response = await fetch(
      `${GRAPH_API_BASE_URL}/${IG_BUSINESS_ACCOUNT_ID}/media?${params.toString()}`,
      {
        method: "POST",
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `HTTP error! Status: ${response.status}, Details: ${JSON.stringify(
          errorData
        )}`
      );
    }

    const data = await response.json();
    const containerId = data.id;
    console.log(`Media container created with ID: ${containerId}`);
    return containerId;
  } catch (error) {
    console.error("Error creating media container:", error.message);
    throw new Error("Failed to create media container.");
  }
}

/**
 * Polls the status of a media container until it's finished processing.
 * @param {string} containerId - The ID of the media container.
 * @param {number} interval - Polling interval in milliseconds.
 * @param {number} maxAttempts - Maximum number of polling attempts.
 * @returns {Promise<boolean>} True if the container finished successfully, false otherwise.
 */
async function pollMediaContainerStatus(
  containerId,
  interval = 20000,
  maxAttempts = 3
) {
  console.log(`Polling status for container ${containerId}...`);
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const params = new URLSearchParams({
        fields: "status_code",
        access_token: FACEBOOK_ACCESS_TOKEN,
      });

      const response = await fetch(
        `${GRAPH_API_BASE_URL}/${containerId}?${params.toString()}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `HTTP error! Status: ${response.status}, Details: ${JSON.stringify(
            errorData
          )}`
        );
      }

      const data = await response.json();
      const statusCode = data.status_code;
      console.log(
        `Container status: ${statusCode} (Attempt ${i + 1}/${maxAttempts})`
      );

      if (statusCode === "FINISHED") {
        console.log("Media container finished processing successfully.");
        return true;
      } else if (statusCode === "ERROR" || statusCode === "EXPIRED") {
        console.error(`Media container failed with status: ${statusCode}`);
        console.error("Error details (if available):", data.error); // Look for more error details
        return false;
      }
      // If not finished, wait and try again
      await setTimeout(interval);
    } catch (error) {
      console.error("Error polling media container status:", error.message);
      // Don't re-throw immediately, try again unless it's a critical error
      await setTimeout(interval); // Wait before retrying
    }
  }
  console.error(
    "Max polling attempts reached. Media container did not finish processing in time."
  );
  return false;
}

/**
 * Publishes the media container as an Instagram Reel.
 * @param {string} containerId - The ID of the media container to publish.
 * @returns {Promise<string>} The ID of the published media.
 */
async function publishMediaContainer(containerId) {
  console.log("Publishing media container...");
  try {
    const params = new URLSearchParams({
      creation_id: containerId,
      access_token: FACEBOOK_ACCESS_TOKEN,
    });

    const response = await fetch(
      `${GRAPH_API_BASE_URL}/${IG_BUSINESS_ACCOUNT_ID}/media_publish?${params.toString()}`,
      {
        method: "POST",
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `HTTP error! Status: ${response.status}, Details: ${JSON.stringify(
          errorData
        )}`
      );
    }

    const data = await response.json();
    const publishedMediaId = data.id;
    console.log(`Reel published successfully with ID: ${publishedMediaId}`);
    return publishedMediaId;
  } catch (error) {
    console.error("Error publishing media container:", error.message);
    throw new Error("Failed to publish media container.");
  }
}

/**
 * Main function to post an Instagram Reel.
 * @param {string} videoUrl - The public URL of the video.
 * @param {string} caption - The caption for the reel.
 */
async function postReel(videoUrl, caption) {
  if (
    !FACEBOOK_ACCESS_TOKEN ||
    FACEBOOK_ACCESS_TOKEN === "YOUR_LONG_LIVED_FACEBOOK_USER_ACCESS_TOKEN"
  ) {
    console.error(
      "FACEBOOK_ACCESS_TOKEN is not set. Please update the script with your token."
    );
    return;
  }
  if (
    !IG_BUSINESS_ACCOUNT_ID ||
    IG_BUSINESS_ACCOUNT_ID === "YOUR_INSTAGRAM_BUSINESS_ACCOUNT_ID"
  ) {
    console.error(
      "IG_BUSINESS_ACCOUNT_ID is not set. Please update the script with your Instagram Business Account ID."
    );
    return;
  }
  if (!videoUrl) {
    console.error(
      "VIDEO_URL is not set or is a placeholder. Please update the script with your video URL."
    );
    return;
  }
  if (!caption) {
    console.warn("CAPTION is empty. Consider adding a caption for your reel.");
  }

  try {
    const containerId = await createMediaContainer(videoUrl, caption);
    const isFinished = await pollMediaContainerStatus(containerId);

    if (isFinished) {
      await publishMediaContainer(containerId);
      console.log("Reel posting process completed!");
    } else {
      console.error(
        "Reel could not be published because the media container failed to process."
      );
    }
  } catch (error) {
    console.error(
      "An error occurred during the reel posting process:",
      error.message
    );
  }
}

// --- Execute the script ---
// Call the main function to start the process
postReel(VIDEO_URL, CAPTION);
