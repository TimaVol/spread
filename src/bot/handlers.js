// src/bot/handlers.js
import { TELEGRAM_BOT_TOKEN, TELEGRAM_AUTHORIZED_USER_ID } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { generatePhotoPrompt } from '../utils/caption-generator.js';
import { generatePhotoWithRetry } from '../utils/image-generator.js';

// fileHandler: { ensureTmpDirExists, getLocalVideoPath, deleteLocalFile, uploadToSupabase, deleteFromSupabase }
export function registerMessageHandlers(bot, messages, fileHandler, errorHandler) {
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const video = msg.video || msg.document;
    const authorizedUserIdNum = parseInt(TELEGRAM_AUTHORIZED_USER_ID, 10);

    if (isNaN(authorizedUserIdNum) || authorizedUserIdNum !== chatId) {
      logger.warn(`Unauthorized access attempt from Chat ID: ${chatId}. Message: "${text}"`);
      await bot.sendMessage(chatId, messages.unauthorized(chatId));
      return;
    }

    // Handle video upload to both IG and YouTube Shorts
    if (video) {
      const fileId = video.file_id;
      await fileHandler.ensureTmpDirExists();
      // Generate unique filename for Supabase Storage
      const uniqueFilename = `${fileId}.mp4`;
      const sendMessage = (message) => bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      try {
        await sendMessage(messages.downloading);
        const file = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file.file_path}`;
        const res = await fetch(fileUrl);
        const buffer = await res.arrayBuffer();

        await sendMessage(messages.uploadingSupabase);
        // Upload to Supabase
        await fileHandler.uploadToSupabase(buffer, uniqueFilename);

        // Send message
        await sendMessage(messages.queued);
      } catch (err) {
        await errorHandler(err, { chatId, bot, context: 'Video Queue Handler' });
      }
      return;
    }
  });
}

/**
 * Register photo generation handlers
 * @param {object} bot - Telegram bot instance
 * @param {object} messages - Messages object
 * @param {object} fileHandler - File handler object
 * @param {function} errorHandler - Error handler function
 */
export function registerPhotoGenerationHandlers(bot, messages, fileHandler, errorHandler) {
  // Handle /generate command trigger
  bot.on('generatePhoto', async (data) => {
    const { chatId } = data;
    await handleGeneratePhoto(bot, chatId, messages, fileHandler, errorHandler);
  });

  // Handle callback button presses
  bot.on('callback_query', async (query) => {
    const { id: queryId, from, data, message } = query;
    const chatId = from.id;
    const messageId = message.message_id;
    const [action, generationId] = data.split('_');

    try {
      if (parseInt(TELEGRAM_AUTHORIZED_USER_ID, 10) !== chatId) {
        await bot.answerCallbackQuery(queryId, { text: 'Unauthorized', show_alert: true });
        return;
      }

      switch (action) {
        case 'regenerate':
          await bot.answerCallbackQuery(queryId);
          await bot.editMessageText(messages.photoRegenerating, {
            chat_id: chatId,
            message_id: messageId,
          });
          await handleGeneratePhoto(bot, chatId, messages, fileHandler, errorHandler);
          break;

        case 'save':
          await bot.answerCallbackQuery(queryId);
          if (!message.photo || message.photo.length === 0) {
            await bot.sendMessage(chatId, messages.photoGenerationError);
            return;
          }
          await handleSavePhoto(bot, chatId, message, messages, fileHandler, errorHandler);
          break;

        case 'abort':
          await bot.answerCallbackQuery(queryId);
          await bot.editMessageText(messages.photoAborted, {
            chat_id: chatId,
            message_id: messageId,
          });
          break;

        default:
          await bot.answerCallbackQuery(queryId);
      }
    } catch (err) {
      await errorHandler(err, { chatId, bot, context: 'Photo callback handler' });
    }
  });
}

/**
 * Handle photo generation flow
 */
async function handleGeneratePhoto(bot, chatId, messages, fileHandler, errorHandler) {
  try {
    const sendMessage = (message) => bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

    // Step 1: Generate photo prompt
    await sendMessage(messages.generatingPhotoPrompt);
    const photoPrompt = await generatePhotoPrompt();
    logger.info('Generated photo prompt', { chatId, promptLength: photoPrompt.length });

    // Step 2: Generate image with Nano Banana
    await sendMessage(messages.generatingPhoto);
    const imageBuffer = await generatePhotoWithRetry(photoPrompt);
    logger.info('Generated image', { chatId, imageSize: imageBuffer.length });

    // Step 3: Send image with action buttons
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔄 Regenerate', callback_data: 'regenerate_' + Date.now() },
          { text: '💾 Save', callback_data: 'save_' + Date.now() },
        ],
        [
          { text: '❌ Abort', callback_data: 'abort_' + Date.now() },
        ],
      ],
    };

    await bot.sendPhoto(chatId, imageBuffer, {
      caption: messages.photoReady,
      reply_markup: keyboard,
    });
  } catch (err) {
    await errorHandler(err, { chatId, bot, context: 'Photo Generation' });
  }
}

/**
 * Handle saving photo to Supabase
 */
async function handleSavePhoto(bot, chatId, message, messages, fileHandler, errorHandler) {
  try {
    if (!message.photo || message.photo.length === 0) {
      await bot.sendMessage(chatId, messages.photoGenerationError);
      return;
    }

    // Get the highest resolution photo
    const photo = message.photo[message.photo.length - 1];
    const fileId = photo.file_id;
    const uniqueFilename = `${fileId}.png`;

    const sendMessage = (message) => bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

    // Download photo from Telegram
    await sendMessage('📥 Downloading photo...');
    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    const res = await fetch(fileUrl);
    const buffer = await res.arrayBuffer();

    // Upload to Supabase
    await sendMessage('⬆️ Uploading to Supabase...');
    await fileHandler.uploadPhotoToSupabase(buffer, uniqueFilename, 'photo');

    await sendMessage(messages.photoSaved);
    logger.info('Photo saved to Supabase', { chatId, filename: uniqueFilename });
  } catch (err) {
    await errorHandler(err, { chatId, bot, context: 'Save Photo' });
  }
}
