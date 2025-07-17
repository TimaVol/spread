# spread

## Project Purpose
A script/app to help automate posting videos to social networks. Currently supports:
- Telegram bot for receiving video links
- Posting videos to Instagram Reels (YouTube Shorts and TikTok coming soon)

## Structure
```
src/
  bots/           # Bot integrations (Telegram, etc.)
  platforms/      # Social network posting logic (Instagram, TikTok, YouTube)
  utils/          # Utilities (video validation, logging, etc.)
  config/         # Centralized configuration and env loading
  index.js        # App entry point
old/              # Legacy code
```

## Getting Started
- Configure your environment variables in a `.env` file (see `src/config/index.js` for required vars)
- Run the app with `npm start` or `pnpm start`

## YouTube Shorts Integration

### Environment Variables
Add the following to your Railway or local `.env`:
- `YOUTUBE_CLIENT_ID` (from Google Cloud Console)
- `YOUTUBE_CLIENT_SECRET` (from Google Cloud Console)
- `YOUTUBE_REFRESH_TOKEN` (obtained after OAuth flow)
- `YOUTUBE_REDIRECT_URI` (should match the /youtube-callback endpoint, e.g., `https://<your-railway-app-url>/youtube-callback`)

### Initial OAuth Setup
1. Start the bot server.
2. In Telegram, send `/auth_youtube` to the bot. Click the link to authorize.
3. After authorizing, copy the `refresh_token` shown in the browser and add it to your Railway environment as `YOUTUBE_REFRESH_TOKEN`.
4. Restart the bot after updating the environment variable.

### Usage
- To upload a YouTube Short, send `/ytshort <caption>` with a video attached to the bot.
- The bot will upload the video as a YouTube Short to your connected channel.

### Notes
- Only the authorized user (by TELEGRAM_AUTHORIZED_USER_ID) can use these commands.
- The video must be under 60 seconds and vertical for Shorts eligibility.
- The bot will automatically add `#Shorts` to the title/description if not present.