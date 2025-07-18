# Instagram & YouTube Shorts Uploader Bot

A robust, modular Telegram bot for uploading videos to Instagram Reels and YouTube Shorts. Built with Node.js, Express, and node-telegram-bot-api. Hosted on Railway.

## Features
- Upload a video file via Telegram to post to both Instagram Reels and YouTube Shorts
- Validate videos for platform requirements
- Centralized error handling and user-friendly messages
- Modular, maintainable codebase
- Private bot (only works for the authorized user)

## Usage
1. Start the bot with `/start` to see instructions.
2. Send a video file to upload it to both platforms.
4. Use `/auth_youtube` to get the YouTube authorization link (admin only).

## Available Commands
- `/start` — Show welcome and usage instructions
- `/help` — Show all available commands and their descriptions
- `/ping` — Health check (responds with "pong!")
- `/status` — Show bot status (uptime, temp files, platform keys)
- `/cleanup` — Manually clean up temp files (admin only)
- `/env` — Show environment summary (admin only)
- `/auth_youtube` — Get YouTube authorization link (admin only)

## Project Structure
```
src/
  index.js                # Main entry point (Express app)
  bot/
    commands.js           # Telegram bot commands
    handlers.js           # Telegram message handlers
    messages.js           # Centralized user-facing messages
  platforms/
    instagram.js          # Instagram API logic
    youtube.js            # YouTube API logic
    tiktok.js             # (stub)
  utils/
    file_handler.js       # File download/upload/delete logic
    error_handler.js      # Centralized error handling
    logger.js             # Logging utility
    video-validator.js    # Video validation logic
  config/
    index.js              # Loads environment variables

tmp/                      # Temporary file storage
```

## Environment Variables
Set these in Railway or your local `.env`:
- `TELEGRAM_BOT_TOKEN` — Telegram bot token
- `TELEGRAM_AUTHORIZED_USER_ID` — Your Telegram user ID
- `TELEGRAM_WEBHOOK_PATH` — Webhook path (default: `/webhook`)
- `FACEBOOK_ACCESS_TOKEN` — Instagram Graph API token
- `IG_BUSINESS_ACCOUNT_ID` — Instagram business account ID
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
- `SUPABASE_BUCKET` — Supabase storage bucket name
- `YOUTUBE_CLIENT_ID` — YouTube OAuth client ID
- `YOUTUBE_CLIENT_SECRET` — YouTube OAuth client secret
- `YOUTUBE_REFRESH_TOKEN` — YouTube OAuth refresh token

## Running Locally
1. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```
2. Create a `.env` file with the required variables.
3. Start the server:
   ```bash
   node src/index.js
   ```

## Notes
- Temporary files are stored in the `tmp/` directory and cleaned up after use.
- Only the authorized user (set by `TELEGRAM_AUTHORIZED_USER_ID`) can use the bot.
- TikTok integration is not implemented.

---

*Refactored for modularity, robustness, and maintainability.*
