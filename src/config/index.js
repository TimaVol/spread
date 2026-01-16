import dotenv from 'dotenv';
dotenv.config();

export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const TELEGRAM_AUTHORIZED_USER_ID = process.env.TELEGRAM_AUTHORIZED_USER_ID;
export const TELEGRAM_WEBHOOK_PATH = process.env.TELEGRAM_WEBHOOK_PATH || '/webhook';
export const PORT = process.env.PORT || 3000;
export const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
export const IG_BUSINESS_ACCOUNT_ID = process.env.IG_BUSINESS_ACCOUNT_ID;
export const SUPABASE_URL = process.env.SUPABASE_URL;
export const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
export const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
export const YOUTUBE_REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN;
export const CRON_SECRET_TOKEN = process.env.CRON_SECRET_TOKEN;
export const CAPTION = process.env.CAPTION || 'Here is the #anime edit';
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
