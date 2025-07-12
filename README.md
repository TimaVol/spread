# Spread - Multi-Platform Social Media Bot

## Project Purpose
A powerful automation script/app to help post videos to multiple social media platforms simultaneously. Currently supports:
- **Instagram Reels** - Via Facebook Graph API
- **TikTok** - Via TikTok for Business API
- **YouTube Shorts** - Via YouTube Data API v3
- **Telegram Bot** - For receiving and managing video uploads

## Features
- 🚀 **Multi-platform posting** - Post to Instagram, TikTok, and YouTube simultaneously
- 📱 **Telegram Bot Interface** - Easy video upload and management
- 🔧 **Flexible Platform Selection** - Choose which platforms to post to
- 📊 **Posting Summary** - Get detailed results for each platform
- 🛡️ **Error Handling** - Robust error handling and retry mechanisms
- 📁 **Cloud Storage** - Uses Supabase for temporary video storage

## Structure
```
src/
  bots/           # Bot integrations (Telegram)
  platforms/      # Social network posting logic
    instagram.js  # Instagram Reels posting
    tiktok.js     # TikTok posting
    youtube.js    # YouTube Shorts posting
    multi-platform.js # Multi-platform coordination
  utils/          # Utilities (video validation, logging, etc.)
  config/         # Centralized configuration and env loading
  index.js        # App entry point
```

## Setup Instructions

### 1. Environment Variables
Create a `.env` file with the following variables:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_AUTHORIZED_USER_ID=your_user_id
TELEGRAM_WEBHOOK_PATH=/webhook

# Instagram/Facebook API
FACEBOOK_ACCESS_TOKEN=your_facebook_access_token
IG_BUSINESS_ACCOUNT_ID=your_instagram_business_account_id

# TikTok API
TIKTOK_ACCESS_TOKEN=your_tiktok_access_token
TIKTOK_OPEN_ID=your_tiktok_open_id

# YouTube API
GOOGLE_API_KEY=your_google_api_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token

# Supabase Storage
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_BUCKET=your_bucket_name
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server
PORT=3000
```

### 2. API Setup

#### Instagram/Facebook
1. Create a Facebook App
2. Get a Business Account ID
3. Generate a long-lived access token
4. Enable Instagram Basic Display API

#### TikTok
1. Create a TikTok for Business account
2. Register your app
3. Get access token and open ID
4. Enable video upload permissions

#### YouTube
1. Create a Google Cloud Project
2. Enable YouTube Data API v3
3. Create OAuth 2.0 credentials
4. Get refresh token for your account

#### Supabase
1. Create a Supabase project
2. Create a storage bucket
3. Get API keys and service role key

### 3. Installation
```bash
npm install
# or
pnpm install
```

### 4. Running the App
```bash
# Production
npm start

# Development (with auto-restart)
npm run dev
```

## Usage

### Telegram Bot Commands
- `/help` or `/start` - Show help message
- `/all` - Post to all platforms (default)
- `/instagram` - Post only to Instagram
- `/tiktok` - Post only to TikTok
- `/youtube` - Post only to YouTube

### Video Upload Methods

#### 1. Send Video File
Simply send a video file to the bot with an optional caption:
```
Your video caption here
platforms: instagram, tiktok, youtube
```

#### 2. Text Format
Send a message with video URL:
```
video_url: https://example.com/video.mp4
caption: Your video caption
platforms: instagram, tiktok, youtube
```

### Platform Options
- `instagram` - Instagram Reels
- `tiktok` - TikTok
- `youtube` - YouTube Shorts

## API Requirements

### Instagram Reels
- Facebook Business Account
- Instagram Business Account
- Facebook Graph API access
- Video format: MP4, max 250MB, 15-90 seconds

### TikTok
- TikTok for Business account
- Video format: MP4, max 287.6MB, 3-600 seconds
- Aspect ratio: 9:16, 1:1, or 16:9

### YouTube Shorts
- YouTube channel
- YouTube Data API v3 access
- Video format: MP4, max 256GB
- Recommended: 9:16 aspect ratio for Shorts

## Error Handling
The bot provides detailed error messages and posting summaries:
- ✅ Successful platforms
- ❌ Failed platforms with error details
- 🎯 Success rate statistics

## Security
- Only authorized Telegram users can use the bot
- All API credentials are stored securely in environment variables
- Temporary files are automatically cleaned up
- Videos are stored temporarily in Supabase and deleted after posting

## Contributing
Feel free to submit issues and enhancement requests!