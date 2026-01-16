import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY, CAPTION } from '../config/index.js';
import { logger } from './logger.js';

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});

// Array of prompt templates for variety
const captionPrompts = [
  "Generate a catchy, engaging caption for an anime edit video suitable for Instagram Reels and TikTok. Keep it under 150 characters. Include relevant emojis and hashtags.",
  "Create a trendy caption for an anime edit that would go viral on social media. Make it witty and engaging. Under 150 characters with emojis.",
  "Write a cool caption for an anime compilation video. Should be short, punchy, and include relevant anime hashtags. Maximum 150 characters.",
  "Generate a caption for an anime reel that catches attention. Include trending anime references and emojis. Under 150 characters.",
  "Create an engaging caption for an anime video edit. Make it mysterious or exciting to hook viewers. Keep it under 150 characters with hashtags."
];

/**
 * Generate a random AI caption for reels
 * @returns {Promise<string>} Generated caption or fallback
 */
export async function generateCaption() {
  try {
    if (!GEMINI_API_KEY) {
      logger.warn('GEMINI_API_KEY not set, using default caption');
      return CAPTION;
    }

    // Select a random prompt for variety
    const randomPrompt = captionPrompts[Math.floor(Math.random() * captionPrompts.length)];
    
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: randomPrompt,
    });
    
    let caption = response.text.trim();
    
    // Ensure caption doesn't exceed platform limits
    if (caption.length > 300) {
      caption = caption.substring(0, 297) + '...';
    }
    
    logger.info('Generated caption via Gemini', { captionLength: caption.length });
    return caption;
  } catch (error) {
    logger.error('Error generating caption with Gemini, falling back to default', { error: error.message });
    return CAPTION;
  }
}
