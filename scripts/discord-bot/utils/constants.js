/**
 * Environment configuration constants.
 * Single source of truth for all env-based config used across the bot.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

module.exports = {
  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN || "YOUR_DISCORD_BOT_TOKEN",
  CLASS_VOICE_CHANNEL_ID: process.env.CLASS_VOICE_CHANNEL_ID || "",
  CLASS_TEXT_CHANNEL_ID: process.env.CLASS_TEXT_CHANNEL_ID || "",
  WEB_API_URL: process.env.WEB_API_URL || "http://localhost:3000/api/study-sessions/discord-sync",
  DISCORD_SYNC_SECRET: process.env.DISCORD_SYNC_SECRET || "discord_sync_secret_token_2026",
  BOT_API_PORT: parseInt(process.env.BOT_API_PORT || process.env.PORT || "8080", 10),

  AFK_VOICE_CHANNEL_ID: process.env.AFK_VOICE_CHANNEL_ID || "",
  AFK_DEAFEN_TIMEOUT_SECONDS: parseInt(process.env.AFK_DEAFEN_TIMEOUT_SECONDS || "600", 10),
  AFK_MUTE_TIMEOUT_SECONDS: parseInt(process.env.AFK_MUTE_TIMEOUT_SECONDS || "1800", 10),
  AFK_SCREENSHARE_TIMEOUT_SECONDS: parseInt(process.env.AFK_SCREENSHARE_TIMEOUT_SECONDS || "600", 10),
  CHECKIN_INTERVAL_SECONDS: parseInt(process.env.CHECKIN_INTERVAL_SECONDS || "2700", 10),
  AFK_REJOIN_COOLDOWN_SECONDS: parseInt(process.env.AFK_REJOIN_COOLDOWN_SECONDS || "300", 10),
  TEACHER_LOG_CHANNEL_ID: process.env.TEACHER_LOG_CHANNEL_ID || "",

  ANNOUNCE_CHANNEL_ID: process.env.ANNOUNCE_CHANNEL_ID || "",
  ARENA_CHANNEL_ID: process.env.ARENA_CHANNEL_ID || "",
  LIVE_CHANNEL_ID: process.env.LIVE_CHANNEL_ID || "",

  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",

  // Derived
  get BASE_URL() {
    return this.WEB_API_URL?.replace('/api/study-sessions/discord-sync', '') || 'https://luyende.id.vn';
  }
};
