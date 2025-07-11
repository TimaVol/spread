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