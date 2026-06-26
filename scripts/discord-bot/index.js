/**
 * ExamHub Discord Bot — Modular Entry Point
 * 
 * This is the main entry point for the bot. It:
 * 1. Creates the Discord client
 * 2. Loads all commands from the commands/ directory
 * 3. Registers slash commands on ready
 * 4. Routes interactions to the correct handler
 * 5. Starts the Express API server
 * 6. Sets up Supabase Realtime subscriptions
 * 7. Registers voice state handlers and periodic timer
 */

const { Client, GatewayIntentBits, REST, Routes, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Load config (also loads .env)
const { DISCORD_BOT_TOKEN } = require('./utils/constants');
const supabase = require('./utils/supabase');

// Create client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ── Load Commands ──
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
    console.log(`[COMMANDS] Loaded command: /${command.data.name}`);
  }
}

// ── Bot Ready ──
client.once('ready', async () => {
  console.log(`=============================================`);
  console.log(`Discord bot is logged in as ${client.user.tag}`);
  console.log(`Loaded ${client.commands.size} commands`);
  console.log(`=============================================`);

  // Register slash commands globally
  try {
    const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);
    const commandsJSON = client.commands.map(cmd => cmd.data.toJSON());

    await rest.put(Routes.applicationCommands(client.user.id), { body: commandsJSON });
    console.log(`[COMMANDS] Registered ${commandsJSON.length} slash commands globally.`);

    // Clean up duplicate guild-level commands
    for (const guild of client.guilds.cache.values()) {
      await rest.put(Routes.applicationGuildCommands(client.user.id, guild.id), { body: [] }).catch(() => null);
      console.log(`[COMMANDS] Cleaned up guild-level commands for: ${guild.name} (${guild.id})`);
    }
  } catch (err) {
    console.error('[COMMANDS ERROR]', err.message);
  }

  // Setup Supabase Realtime subscriptions
  if (supabase) {
    const { setupRealtimeSubscriptions } = require('./realtimeSetup');
    setupRealtimeSubscriptions(client);
    console.log('[SUPABASE] Connected to Realtime Database.');
  } else {
    console.warn('[SUPABASE] Warning: Supabase client is not configured.');
  }

  // Start daily challenge scheduler
  try {
    const { startDailyScheduler } = require('./commands/daily');
    startDailyScheduler(client);
    console.log('[SCHEDULER] Daily challenge scheduler started.');
  } catch (e) {
    console.error('[SCHEDULER ERROR] Failed to start daily challenge scheduler:', e.message);
  }

  // Start timetable scheduler
  try {
    const { startTimetableScheduler } = require('./handlers/timetableScheduler');
    startTimetableScheduler(client);
  } catch (e) {
    console.error('[SCHEDULER ERROR] Failed to start timetable scheduler:', e.message);
  }
});

// ── Interaction Router ──
const { handleButtonInteraction, handleSelectMenuInteraction } = require('./handlers/interactions');
const { handleModalSubmit } = require('./handlers/modals');

// Import botstatus for command counting
const botstatusCmd = client.commands?.get('botstatus');

client.on('interactionCreate', async (interaction) => {
  // Slash commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // Increment command counter
    try {
      const bs = require('./commands/botstatus');
      if (bs.incrementCommandCount) bs.incrementCommandCount();
    } catch (e) { /* ignore */ }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`[CMD ERROR] /${interaction.commandName}:`, error);
      const reply = { content: '❌ Có lỗi xảy ra khi thực hiện lệnh này.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply).catch(() => null);
      } else {
        await interaction.reply(reply).catch(() => null);
      }
    }
    return;
  }

  // Button interactions
  if (interaction.isButton()) {
    try {
      await handleButtonInteraction(interaction);
    } catch (error) {
      console.error('[BUTTON ERROR]', error);
    }
    return;
  }

  // Select menu interactions
  if (interaction.isStringSelectMenu()) {
    try {
      await handleSelectMenuInteraction(interaction);
    } catch (error) {
      console.error('[SELECT MENU ERROR]', error);
    }
    return;
  }

  // Modal submit interactions
  if (interaction.isModalSubmit()) {
    try {
      await handleModalSubmit(interaction);
    } catch (error) {
      console.error('[MODAL ERROR]', error);
    }
    return;
  }
});

// ── Message Router (Thread follow-ups) ──
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Check if inside hoibai AI Tutor thread
  if (message.channel.isThread() && message.channel.name.startsWith('🤖 hoibai-')) {
    try {
      const { handleThreadFollowUp } = require('./handlers/messages');
      await handleThreadFollowUp(message);
    } catch (err) {
      console.error('[THREAD MESSAGE ERROR]', err.message);
    }
  }
});

// ── Voice State & Periodic Timer ──
const { registerVoiceStateHandler, startPeriodicTimer } = require('./handlers/voiceState');
registerVoiceStateHandler(client);
startPeriodicTimer(client);

// ── Express API Server ──
const { startExpressServer } = require('./expressServer');
startExpressServer(client);

// ── Login ──
client.login(DISCORD_BOT_TOKEN);
