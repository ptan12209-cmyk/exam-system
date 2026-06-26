/**
 * Session sync helper — sends study session updates to the Next.js Web API.
 */

const axios = require('axios');
const { WEB_API_URL, DISCORD_SYNC_SECRET } = require('./constants');

async function syncSession(userId, status, durationSeconds, deafened, mutedSeconds, sharingScreen, cameraOn, sharingScreenSeconds, cameraSeconds) {
  try {
    const response = await axios.post(WEB_API_URL, {
      discord_id: userId,
      status: status,
      duration_seconds: durationSeconds,
      deafened: !!deafened,
      muted_seconds: mutedSeconds || 0,
      sharing_screen: !!sharingScreen,
      camera_on: !!cameraOn,
      sharing_screen_seconds: sharingScreenSeconds || 0,
      camera_seconds: cameraSeconds || 0,
      secret_token: DISCORD_SYNC_SECRET
    });
    console.log(`[SYNC] ${userId}: status=${status}, duration=${Math.round(durationSeconds / 60)}m, muted=${Math.round((mutedSeconds || 0) / 60)}m, screenShare=${!!sharingScreen} (${Math.round((sharingScreenSeconds || 0) / 60)}m), camera=${!!cameraOn} (${Math.round((cameraSeconds || 0) / 60)}m)`);
    return response.data;
  } catch (error) {
    console.error(`[SYNC ERROR] Failed to sync user ${userId}:`, error.response?.data || error.message);
  }
}

module.exports = { syncSession };
