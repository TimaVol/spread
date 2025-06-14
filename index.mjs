// index.js (for Railway deployment as a Web Service with API Key Security)
import express from "express";
import { setTimeout } from "timers/promises";

// --- Configuration: Environment Variables for Railway ---
// These will be pulled from Railway's environment variables
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const IG_BUSINESS_ACCOUNT_ID = process.env.IG_BUSINESS_ACCOUNT_ID;
const VIDEO_URL =
  process.env.VIDEO_URL ||
  "https://cdn.pixabay.com/video/2025/05/01/275983_large.mp4";
const CAPTION = process.env.CAPTION || "My awesome new Reel! #reels #instagram";

// --- SECURITY: API Key ---
// This must be a long, random string set as an environment variable in Railway
const REQUIRED_API_KEY = process.env.REEL_POST_API_KEY;

// --- API Endpoints ---
const GRAPH_API_BASE_URL = "https://graph.facebook.com/v23.0";

// --- Delays ---
const INITIAL_POLLING_DELAY = 30 * 1000;
const POLLING_INTERVAL = 20 * 1000;
const MAX_POLLING_ATTEMPTS = 30;

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
    throw new Error(
      `HTTP error! Status: ${response.status}, Details: ${
        errorData.message || "Unknown error"
      }`
    );
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
  console.log("Creating media container...");
  const params = new URLSearchParams({
    media_type: "REELS",
    video_url: videoUrl,
    caption: caption,
    access_token: ACCESS_TOKEN,
    share_to_feed: true,
  });
  const url = `${GRAPH_API_BASE_URL}/${IG_BUSINESS_ACCOUNT_ID}/media?${params.toString()}`;
  const data = await safeFetch(url, { method: "POST" });
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
        fields: "status_code",
        access_token: ACCESS_TOKEN,
      });
      const url = `${GRAPH_API_BASE_URL}/${containerId}?${params.toString()}`;
      const data = await safeFetch(url); // GET request by default
      const statusCode = data.status_code;
      console.log(
        `Container status: ${statusCode} (Attempt ${
          i + 1
        }/${MAX_POLLING_ATTEMPTS})`
      );

      if (statusCode === "FINISHED") {
        console.log("Media container finished processing successfully.");
        return true;
      } else if (statusCode === "ERROR" || statusCode === "EXPIRED") {
        console.error(`Media container failed with status: ${statusCode}`);
        console.error("Error details (if available):", data.error);
        return false;
      }
      await setTimeout(POLLING_INTERVAL);
    } catch (error) {
      console.error("Error polling media container status:", error.message);
      await setTimeout(POLLING_INTERVAL);
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
  const params = new URLSearchParams({
    creation_id: containerId,
    access_token: ACCESS_TOKEN,
  });
  const url = `${GRAPH_API_BASE_URL}/${IG_BUSINESS_ACCOUNT_ID}/media_publish?${params.toString()}`;
  const data = await safeFetch(url, { method: "POST" });
  const publishedMediaId = data.id;
  console.log(`Reel published successfully with ID: ${publishedMediaId}`);
  return publishedMediaId;
}

// Main logic to be called by the API endpoint
async function executeReelPost() {
  console.log("Attempting to post Instagram Reel...");
  if (
    !ACCESS_TOKEN ||
    ACCESS_TOKEN === "YOUR_LONG_LIVED_FACEBOOK_USER_ACCESS_TOKEN"
  ) {
    throw new Error(
      "FACEBOOK_ACCESS_TOKEN environment variable is not set or is a placeholder."
    );
  }
  if (
    !IG_BUSINESS_ACCOUNT_ID ||
    IG_BUSINESS_ACCOUNT_ID === "YOUR_INSTAGRAM_BUSINESS_ACCOUNT_ID"
  ) {
    throw new Error(
      "IG_BUSINESS_ACCOUNT_ID environment variable is not set or is a placeholder."
    );
  }
  if (!VIDEO_URL) {
    throw new Error("VIDEO_URL is not set or is a placeholder.");
  }

  try {
    const containerId = await createMediaContainer(VIDEO_URL, CAPTION);
    console.log(
      `Waiting for ${
        INITIAL_POLLING_DELAY / 1000
      } seconds before first status check...`
    );
    await setTimeout(INITIAL_POLLING_DELAY);

    const isFinished = await pollMediaContainerStatus(containerId);

    if (isFinished) {
      await publishMediaContainer(containerId);
      return "Reel posting process completed successfully!";
    } else {
      throw new Error(
        "Reel could not be published because the media container failed to process."
      );
    }
  } catch (error) {
    console.error("Error during reel posting process:", error.message);
    throw error;
  }
}

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware to check API Key
function verifyApiKey(req, res, next) {
  const apiKey = req.headers["x-api-key"]; // Expecting the API key in 'x-api-key' header

  if (!REQUIRED_API_KEY || REQUIRED_API_KEY === "YOUR_SECRET_API_KEY_HERE") {
    // This check is for development/setup. In production, this should always be set.
    console.error(
      "REQUIRED_API_KEY environment variable is not set in the server."
    );
    return res.status(500).send("Server API Key not configured.");
  }

  if (apiKey && apiKey === REQUIRED_API_KEY) {
    next(); // API Key is valid, proceed to the route handler
  } else {
    console.warn(
      `Unauthorized attempt to access /post-daily-reel. Provided API Key: ${apiKey}`
    );
    res.status(401).send("Unauthorized: Invalid or missing API Key.");
  }
}

// Apply the API key verification middleware to the specific route
app.get("/post-daily-reel", verifyApiKey, async (req, res) => {
  try {
    const result = await executeReelPost();
    res.status(200).send(result);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

app.get("/", (req, res) => {
  res.send(
    "Instagram Reel Poster Service is running. Access /post-daily-reel (with X-API-Key header) to trigger."
  );
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
