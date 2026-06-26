/**
 * Shared in-memory session state for voice tracking.
 * Contains activeSessions, activeCheckins, afkCooldowns maps and helper functions.
 */

const { AFK_REJOIN_COOLDOWN_SECONDS } = require('./constants');

// userId -> { joinedAt, durationOffset, lastSyncedAt, deafened, deafenedSince, muted, mutedSince, mutedDuration, sharingScreen, sharingScreenSince, sharingScreenDuration, cameraOn, cameraSince, cameraDuration, screenShareReminderSent, joinTime, noScreenshareSince, lastCheckinTime, deafenWarningLevel, muteWarningLevel, screenshareWarningLevel }
const activeSessions = new Map();

// userId -> { messageId, timeoutId, triggeredAt }
const activeCheckins = new Map();

// userId -> cooldownExpiresAt (timestamp)
const afkCooldowns = new Map();

// In-memory exam draft sessions for /taode modal flow
// userId -> { title, subject, duration, description, questions: [] }
const examDraftSessions = new Map();

function setAfkCooldown(userId) {
  afkCooldowns.set(userId, Date.now() + AFK_REJOIN_COOLDOWN_SECONDS * 1000);
}

function getMutedDuration(session) {
  let total = session.mutedDuration || 0;
  if (session.muted && session.mutedSince) {
    total += Math.floor((Date.now() - session.mutedSince) / 1000);
  }
  return total;
}

function getSharingScreenDuration(session) {
  let total = session.sharingScreenDuration || 0;
  if (session.sharingScreen && session.sharingScreenSince) {
    total += Math.floor((Date.now() - session.sharingScreenSince) / 1000);
  }
  return total;
}

function getCameraDuration(session) {
  let total = session.cameraDuration || 0;
  if (session.cameraOn && session.cameraSince) {
    total += Math.floor((Date.now() - session.cameraSince) / 1000);
  }
  return total;
}

module.exports = {
  activeSessions,
  activeCheckins,
  afkCooldowns,
  examDraftSessions,
  setAfkCooldown,
  getMutedDuration,
  getSharingScreenDuration,
  getCameraDuration
};
