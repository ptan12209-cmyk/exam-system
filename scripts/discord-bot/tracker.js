/**
 * Discord Bot - Real-time Voice Study Tracker
 * Monitors voice state changes (join, leave, deafen, mute) and syncs status/duration to the Next.js Web API.
 * 
 * Dependencies:
 *   npm install discord.js axios dotenv
 * 
 * Run using:
 *   node scripts/discord-bot/tracker.js
 */

require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

// Configuration
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "YOUR_DISCORD_BOT_TOKEN";
const CLASS_VOICE_CHANNEL_ID = process.env.CLASS_VOICE_CHANNEL_ID || "YOUR_CLASS_VOICE_CHANNEL_ID";
const WEB_API_URL = process.env.WEB_API_URL || "http://localhost:3000/api/study-sessions/discord-sync";
const DISCORD_SYNC_SECRET = process.env.DISCORD_SYNC_SECRET || "discord_sync_secret_token_2026";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// Map to store active study sessions:
// userId -> { joinedAt: timestamp, durationOffset: seconds, lastSyncedAt: timestamp, deafened: boolean }
const activeSessions = new Map();

// Helper to send sync update to Next.js API
async function syncSession(userId, status, durationSeconds, deafened) {
  try {
    const response = await axios.post(WEB_API_URL, {
      discord_id: userId,
      status: status,
      duration_seconds: durationSeconds,
      deafened: deafened,
      secret_token: DISCORD_SYNC_SECRET
    });
    console.log(`[SYNC SUCCESS] User ${userId}: status=${status}, duration=${Math.round(durationSeconds / 60)}m, deafened=${deafened}`);
    return response.data;
  } catch (error) {
    console.error(`[SYNC ERROR] Failed to sync user ${userId}:`, error.response?.data || error.message);
  }
}

client.once('ready', () => {
  console.log(`=============================================`);
  console.log(`Discord voice tracker bot is logged in as ${client.user.tag}`);
  console.log(`Target voice channel ID: ${CLASS_VOICE_CHANNEL_ID}`);
  console.log(`API Target URL: ${WEB_API_URL}`);
  console.log(`=============================================`);
});

// Event listener: voiceStateUpdate
client.on('voiceStateUpdate', async (oldState, newState) => {
  const userId = newState.id;
  const username = newState.member.user.username;
  const isDeafened = newState.selfDeaf || newState.serverDeaf;

  // Case 1: Joined the classroom voice channel
  if (newState.channelId === CLASS_VOICE_CHANNEL_ID && oldState.channelId !== CLASS_VOICE_CHANNEL_ID) {
    console.log(`[JOIN] ${username} entered the classroom.`);
    activeSessions.set(userId, {
      joinedAt: Date.now(),
      durationOffset: 0,
      lastSyncedAt: Date.now(),
      deafened: isDeafened
    });

    const status = isDeafened ? 'discord_afk' : 'discord_class';
    await syncSession(userId, status, 0, isDeafened);
  }

  // Case 2: Left the classroom voice channel
  else if (oldState.channelId === CLASS_VOICE_CHANNEL_ID && newState.channelId !== CLASS_VOICE_CHANNEL_ID) {
    console.log(`[LEAVE] ${username} left the classroom.`);
    const session = activeSessions.get(userId);
    if (session) {
      // Calculate final duration
      let finalDuration = session.durationOffset;
      if (!session.deafened) {
        finalDuration += Math.floor((Date.now() - session.joinedAt) / 1000);
      }
      activeSessions.delete(userId);

      // Sync offline state and final duration
      await syncSession(userId, 'offline', finalDuration, false);
    }
  }

  // Case 3: Status change (Mute/Deafen) while in the channel
  else if (newState.channelId === CLASS_VOICE_CHANNEL_ID && oldState.channelId === CLASS_VOICE_CHANNEL_ID) {
    const session = activeSessions.get(userId);
    if (session) {
      const oldDeafened = session.deafened;
      if (oldDeafened !== isDeafened) {
        console.log(`[STATUS CHANGE] ${username} deafen status changed: ${oldDeafened} -> ${isDeafened}`);
        
        // Update accumulated time before toggling
        if (!oldDeafened) {
          session.durationOffset += Math.floor((Date.now() - session.joinedAt) / 1000);
        }
        
        session.joinedAt = Date.now();
        session.deafened = isDeafened;
        
        const status = isDeafened ? 'discord_afk' : 'discord_class';
        await syncSession(userId, status, session.durationOffset, isDeafened);
      }
    }
  }
});

// Periodic timer (every 30 seconds) to tick accumulated active time and push updates
setInterval(async () => {
  const now = Date.now();
  for (const [userId, session] of activeSessions.entries()) {
    // If not deafened, calculate accumulated time
    let currentDuration = session.durationOffset;
    if (!session.deafened) {
      currentDuration += Math.floor((now - session.joinedAt) / 1000);
    }

    const status = session.deafened ? 'discord_afk' : 'discord_class';
    
    // Sync to Next.js API
    await syncSession(userId, status, currentDuration, session.deafened);
    session.lastSyncedAt = now;
  }
}, 30000);

client.login(DISCORD_BOT_TOKEN);
