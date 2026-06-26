/**
 * Discord Bot - Real-time Voice Study Tracker
 * 
 * LEGACY ENTRY POINT — This file now delegates to the modular index.js.
 * All code has been split into:
 *   - commands/     — slash command handlers
 *   - handlers/     — event handlers (voice, buttons, modals)
 *   - utils/        — shared utilities (constants, supabase, sessions, sync, embeds)
 *   - expressServer.js — Express API server
 *   - realtimeSetup.js — Supabase Realtime subscriptions
 *   - index.js      — new modular entry point
 * 
 * Run using either:
 *   node scripts/discord-bot/tracker.js
 *   node scripts/discord-bot/index.js
 */

require('./index');
