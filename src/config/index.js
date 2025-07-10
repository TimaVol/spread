import dotenv from 'dotenv';
dotenv.config();

export const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
export const TELEGRAM_AUTHORIZED_USER_ID = process.env.TELEGRAM_AUTHORIZED_USER_ID;
export const TELEGRAM_WEBHOOK_PATH = process.env.TELEGRAM_WEBHOOK_PATH || '/webhook';
export const PORT = process.env.PORT || 3000;
export const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
export const IG_BUSINESS_ACCOUNT_ID = process.env.IG_BUSINESS_ACCOUNT_ID;
export const PUBLIC_URL = process.env.PUBLIC_URL;