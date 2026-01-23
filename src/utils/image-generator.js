import { NANOBANANA_API_KEY, NANOBANANA_CALLBACK_URL } from '../config/index.js';
import { logger } from './logger.js';
import { setTimeout } from 'timers/promises';

const NANOBANANA_API_BASE = 'https://api.nanobananaapi.ai/api/v1/nanobanana';
const POLL_INTERVAL = 5000; // 5 seconds
const MAX_POLL_ATTEMPTS = 120; // 10 minutes max wait

/**
 * Submit image generation task to Nano Banana API
 * @param {string} prompt - The image generation prompt
 * @returns {Promise<string>} Task ID
 */
async function submitGenerationTask(prompt) {
  try {
    if (!NANOBANANA_API_KEY) {
      throw new Error('NANOBANANA_API_KEY not set');
    }

    if (!NANOBANANA_CALLBACK_URL) {
      throw new Error('NANOBANANA_CALLBACK_URL not set');
    }

    logger.info('Submitting image generation task to Nano Banana', { prompt: prompt.substring(0, 100) });

    const response = await fetch(`${NANOBANANA_API_BASE}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NANOBANANA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        numImages: 1,
        image_size: "16:9",
        callBackUrl: NANOBANANA_CALLBACK_URL,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Nano Banana API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    const data = await response.json();
    if (data.code !== 200 || !data.data?.taskId) {
      throw new Error(`Failed to submit task: ${data.message || 'No task ID returned'}`);
    }

    logger.info('Task submitted to Nano Banana', { taskId: data.data.taskId });
    return data.data.taskId;
  } catch (error) {
    logger.error('Error submitting task to Nano Banana', { error: error.message });
    throw error;
  }
}

/**
 * Poll task status until completion
 * @param {string} taskId - The task ID from submission
 * @returns {Promise<string>} Image URL when complete
 */
async function pollTaskStatus(taskId) {
  try {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      const response = await fetch(`${NANOBANANA_API_BASE}/record-info?taskId=${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${NANOBANANA_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Nano Banana API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }

      const data = await response.json();
      if (data.code !== 200) {
        throw new Error(`Failed to get task status: ${data.msg || 'Unknown error'}`);
      }

      const taskData = data.data;
      
      // Status: 0=GENERATING, 1=SUCCESS, 2=CREATE_TASK_FAILED, 3=GENERATE_FAILED
      if (taskData.successFlag === 1) {
        const imageUrl = taskData.response?.resultImageUrl;
        if (!imageUrl) {
          throw new Error('No image URL in successful response');
        }
        logger.info('Image generation completed', { taskId, imageUrl: imageUrl.substring(0, 50) });
        return imageUrl;
      }

      if (taskData.successFlag === 2 || taskData.successFlag === 3) {
        throw new Error(`Image generation failed: ${taskData.errorMessage || 'Unknown error'}`);
      }

      logger.debug('Task still generating, polling again...', { taskId, attempt: attempt + 1 });
      await setTimeout(POLL_INTERVAL);
    }

    throw new Error('Image generation timeout: max polling attempts exceeded');
  } catch (error) {
    logger.error('Error polling task status', { error: error.message });
    throw error;
  }
}

/**
 * Download image from URL and return as Buffer
 * @param {string} imageUrl - The image URL to download
 * @returns {Promise<Buffer>} Image data as Buffer
 */
async function downloadImage(imageUrl) {
  try {
    logger.info('Downloading generated image', { url: imageUrl.substring(0, 50) });
    
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    logger.info('Image downloaded successfully', { size: buffer.byteLength });
    
    return Buffer.from(buffer);
  } catch (error) {
    logger.error('Error downloading image', { error: error.message });
    throw error;
  }
}

/**
 * Generate an image using Nano Banana API from a prompt
 * Returns task ID immediately - image will be delivered via webhook callback
 * @param {string} prompt - The image generation prompt
 * @returns {Promise<string>} Task ID for tracking
 */
export async function generatePhotoBanano(prompt) {
  try {
    // Submit task and return immediately
    // Image will be delivered via webhook when ready
    const taskId = await submitGenerationTask(prompt);
    return taskId;
  } catch (error) {
    logger.error('Error generating image with Nano Banana', { error: error.message });
    throw error;
  }
}
/**
 * Retry logic for image generation with exponential backoff
 * @param {string} prompt - The image generation prompt
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @returns {Promise<string>} Task ID (image delivered via webhook)
 */
export async function generatePhotoWithRetry(prompt, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await generatePhotoBanano(prompt);
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error;
      }
      const delay = Math.pow(2, attempt) * 1000;
      logger.warn(`Retrying image generation after ${delay}ms`, { attempt: attempt + 1, maxRetries, error: error.message });
      await setTimeout(delay);
    }
  }
}

/**
 * Exported for webhook handler - download image from URL
 * @param {string} imageUrl - Direct image URL from Nano Banana callback
 * @returns {Promise<Buffer>} Downloaded image as Buffer
 */
export async function getCompletedImage(imageUrl) {
  try {
    return await downloadImage(imageUrl);
  } catch (error) {
    logger.error('Error getting completed image', { url: imageUrl.substring(0, 50), error: error.message });
    throw error;
  }
}
