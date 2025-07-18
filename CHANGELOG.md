# Changelog

## v2.0.0 — Major Refactor & Robustness Upgrade

### Project Refactor & Improvements
- **Full modularization:**
  - Split logic into `src/bot/`, `src/platforms/`, `src/utils/`, and `src/config/`.
  - Each platform (Instagram, YouTube) has its own module with clear, high-level functions.
  - All Telegram bot commands and message handlers are modular.
- **Centralized error handling:**
  - All errors are logged and user-friendly messages are sent to Telegram.
  - Retry logic for transient API errors (Instagram, YouTube).
- **Input validation:**
  - All video uploads are validated before posting.
- **File management:**
  - All file download/upload/delete logic is in `utils/file_handler.js`.
  - Temporary files are stored in `tmp/` and cleaned up after use or via `/cleanup` command.
- **Consistent naming conventions:**
  - camelCase for functions/variables, PascalCase for classes, kebab-case for files.
- **Environment variable management:**
  - All secrets/configs loaded via `config/index.js`.
- **User-facing messages:**
  - All messages are centralized in `bot/messages.js` for easy updates/localization.
- **Advanced commands:**
  - `/help`, `/status`, `/cleanup`, `/env`, `/ping` added for admin and user convenience.
- **Documentation:**
  - README updated with new structure, usage, and environment variables.

### Project Structure Diagram
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

### Current State (for AI/Contributors)
- **Bot is robust, modular, and maintainable.**
- **All platform logic, error handling, and file management are separated and reusable.**
- **All user/admin commands are modular and easy to extend.**
- **Environment variables are required for all platform integrations.**
- **TikTok integration is not implemented.**
- **Testing and further platform expansion are easy to add.**

---

*This changelog and diagram are intended for onboarding new contributors and AI assistants. Please follow the structure and conventions for future changes.*