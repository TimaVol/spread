import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY, CAPTION, GEMINI_MODEL } from '../config/index.js';
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

// Array of photo prompts for Nano Banana image generation
const photoPrompts = [
  "A beautiful anime girl in a magical forest, soft glowing lights, anime art style, high quality, detailed, vibrant colors, trending on artstation",
  "Anime landscape with cherry blossoms, serene mountain views, traditional Japanese aesthetic, soft pastel colors, digital art, beautiful sky",
  "Cute anime character with big expressive eyes, kawaii style, magical aura, colorful background, anime illustration, trending fan art",
  "Cyberpunk anime city scene, neon lights, futuristic technology, detailed architecture, anime style, night time, vibrant colors",
  "Fantasy anime girl with sword, action pose, dynamic lighting, detailed fantasy outfit, magical effects, anime character design, high quality",
  "Peaceful anime village at sunset, traditional Japanese houses, rice fields, mountains in background, warm colors, anime landscape art",
  "Anime girl in modern school uniform, indoor setting, soft lighting, detailed character, anime illustration style, beautiful composition"
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
      model: GEMINI_MODEL,
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

/**
 * Generate a prompt for anime photo generation with Nano Banana
 * @returns {Promise<string>} Generated photo prompt
 */
export async function generatePhotoPrompt() {
  try {
    if (!GEMINI_API_KEY) {
      logger.warn('GEMINI_API_KEY not set, using random anime photo prompt');
      return photoPrompts[Math.floor(Math.random() * photoPrompts.length)];
    }

    // Select a random base photo prompt for variety
    const randomPhotoPrompt = photoPrompts[Math.floor(Math.random() * photoPrompts.length)];
    
    // Use Gemini to enhance/generate variations of the prompt
    const enhancementPrompt = `Take this anime image prompt and enhance it with more vivid details, anime-specific artistic elements, and creative variations while keeping it under 300 characters: "${randomPhotoPrompt}"`;
    
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: enhancementPrompt,
    });
    
    let prompt = response.text.trim();
    
    // Ensure prompt doesn't exceed reasonable limits
    if (prompt.length > 500) {
      prompt = prompt.substring(0, 497) + '...';
    }
    
    logger.info('Generated photo prompt via Gemini', { promptLength: prompt.length });
    return prompt;
  } catch (error) {
    logger.error('Error generating photo prompt with Gemini, using base prompt', { error: error.message });
    return photoPrompts[Math.floor(Math.random() * photoPrompts.length)];
  }
}
