import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY } from '../config/index.js';
import { logger } from './logger.js';

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});

/**
 * Generate an image using Nano Banana (gemini-2.5-flash-image) from a prompt
 * @param {string} prompt - The image generation prompt
 * @returns {Promise<Buffer>} Generated image as Buffer
 */
export async function generatePhotoBanano(prompt) {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not set');
    }

    logger.info('Generating image with Nano Banana', { prompt: prompt.substring(0, 100) });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
    });

    // Extract image data from response
    if (!response.candidates || !response.candidates[0] || !response.candidates[0].content) {
      throw new Error('No image data in response');
    }

    const parts = response.candidates[0].content.parts;
    let imageData = null;

    for (const part of parts) {
      if (part.inlineData) {
        imageData = part.inlineData.data;
        break;
      }
    }

    if (!imageData) {
      throw new Error('No image data found in response parts');
    }

    // Convert base64 to Buffer
    const buffer = Buffer.from(imageData, 'base64');
    logger.info('Image generated successfully', { size: buffer.length });
    
    return buffer;
  } catch (error) {
    logger.error('Error generating image with Nano Banana', { error: error.message });
    throw error;
  }
}

/**
 * Retry logic for image generation with exponential backoff
 * @param {string} prompt - The image generation prompt
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @returns {Promise<Buffer>} Generated image as Buffer
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
      logger.warn(`Retrying image generation after ${delay}ms`, { attempt: attempt + 1, maxRetries });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
