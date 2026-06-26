/**
 * Modal submit handler — routes modal submissions to appropriate command handlers
 */
const taode = require('../commands/taode');

async function handleModalSubmit(interaction) {
  const customId = interaction.customId;

  // ── Taode Step 1: Exam info ──
  if (customId.startsWith('taode_step1_')) {
    return taode.handleStep1Submit(interaction);
  }

  // ── Taode Step 2: Add question ──
  if (customId.startsWith('taode_add_question_')) {
    return taode.handleAddQuestionSubmit(interaction);
  }
}

module.exports = { handleModalSubmit };
