// Ensure you're using Node.js v18+ for native fetch support

const { IG_USER_ID, USER_ACCESS_TOKEN } = process.env;
const VIDEO_URL = 'https://videos.openai.com/...'; // must be HTTPS and public
const CAPTION = '🚀 New Reel posted!';

// Step 1: Create Media Container
async function createMediaContainer() {
  const url = `https://graph.facebook.com/v19.0/${IG_USER_ID}/media`;

  const params = new URLSearchParams({
    media_type: 'REELS',
    video_url: VIDEO_URL,
    caption: CAPTION,
    access_token: USER_ACCESS_TOKEN,
  });

  const response = await fetch(url, {
    method: 'POST',
    body: params,
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('❌ Error creating media container:', data);
    throw new Error(data.error.message);
  }

  console.log('✅ Media container created:', data);
  return data.id;
}

// Step 2: Publish the Reel
async function publishReel(containerId) {
  const url = `https://graph.facebook.com/v19.0/${IG_USER_ID}/media_publish`;

  const params = new URLSearchParams({
    creation_id: containerId,
    access_token: USER_ACCESS_TOKEN,
  });

  const response = await fetch(url, {
    method: 'POST',
    body: params,
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('❌ Error publishing reel:', data);
    throw new Error(data.error.message);
  }

  console.log('✅ Reel published:', data);
  return data;
}

// Run it
(async () => {
  try {
    const creationId = await createMediaContainer();
    await publishReel(creationId);
  } catch (err) {
    console.error('❌ Failed to post reel:', err.message);
  }
})();
