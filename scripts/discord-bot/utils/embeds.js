/**
 * Shared embed helpers — notifyTeacher + common embed factories.
 */

const { EmbedBuilder } = require('discord.js');
const { TEACHER_LOG_CHANNEL_ID } = require('./constants');

/**
 * Send a real-time violation/info embed to the teacher log channel.
 * @param {import('discord.js').Client} client
 * @param {string} title
 * @param {string} description
 * @param {number} color
 */
async function notifyTeacher(client, title, description, color = 0xF59E0B) {
  if (!TEACHER_LOG_CHANNEL_ID) return;
  try {
    const channel = client.channels.cache.get(TEACHER_LOG_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .setTimestamp()
      .setFooter({ text: 'ECODEx Learning System' });
    await channel.send({ embeds: [embed] });
  } catch (e) {
    console.error('[TEACHER LOG ERROR]', e.message);
  }
}

module.exports = { notifyTeacher };
