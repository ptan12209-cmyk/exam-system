/**
 * /botstatus — Xem trạng thái sức khỏe bot (Admin only)
 * Phase A4: Bot Health Monitor
 */
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { activeSessions } = require('../utils/sessions');

// Track bot start time at module load
const botStartTime = Date.now();
let commandCount = 0;

function incrementCommandCount() { commandCount++; }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('botstatus')
    .setDescription('Xem trạng thái sức khỏe và hiệu năng của bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  incrementCommandCount,

  async execute(interaction) {
    const client = interaction.client;
    const uptime = Date.now() - botStartTime;
    const uptimeStr = formatUptime(uptime);
    const memUsage = process.memoryUsage();
    const heapMB = (memUsage.heapUsed / 1024 / 1024).toFixed(1);
    const rssMB = (memUsage.rss / 1024 / 1024).toFixed(1);
    const latency = client.ws.ping;

    // Latency health indicator
    let healthIcon = '🟢';
    if (latency > 300) healthIcon = '🟡';
    if (latency > 500) healthIcon = '🔴';

    const embed = new EmbedBuilder()
      .setColor(latency > 500 ? 0xEF4444 : latency > 300 ? 0xF59E0B : 0x10B981)
      .setTitle('🤖 Bot Health Dashboard')
      .addFields(
        { name: '⏱️ Uptime', value: uptimeStr, inline: true },
        { name: `${healthIcon} Latency`, value: `${latency}ms`, inline: true },
        { name: '🎤 Voice Sessions', value: `${activeSessions.size} active`, inline: true },
        { name: '🌐 Servers', value: `${client.guilds.cache.size}`, inline: true },
        { name: '📊 Commands Run', value: `${commandCount}`, inline: true },
        { name: '💾 Memory', value: `Heap: ${heapMB}MB / RSS: ${rssMB}MB`, inline: true },
        { name: '🤖 Bot User', value: client.user?.tag || 'Unknown', inline: true },
        { name: '📡 Discord.js', value: require('discord.js').version, inline: true },
        { name: '🟢 Node.js', value: process.version, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'ECODEx Bot Health Monitor' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  return parts.join(' ');
}
