/**
 * AI Utility - Handles requests to Google Gemini API via V98Store (OpenAI compatible endpoint).
 */
const fetch = require('node-fetch'); // Let's check if node-fetch is needed or if we can use standard fetch. Wait, Node 18+ has fetch natively! But in index.js we saw it uses native fetch. Let's use global fetch (standard in Node 18+) or fallback to axios or require('node-fetch') if needed. Wait, package.json had "axios" but not "node-fetch". Since Next.js 16.1 is in package.json, Node.js version must be 18+, which has global fetch natively. So we can use the native global `fetch`.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "sk-ewNhLj4fTcPUGWDstbRMibwnhjtZ5gB4q4CxMhEQ0gg5xZlx";
const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || "https://v98store.com";

/**
 * Ask Gemini API (via V98Store compatible completions endpoint)
 * @param {Array} messages - [{ role: 'user', content: '...' }, ...]
 * @param {string} systemPrompt - Prompt configuration
 * @param {number} [temperature=0.2] - Creativity parameter
 * @param {string} [model='gemini-2.0-flash'] - Model name
 * @returns {Promise<string>} Content response from AI
 */
async function askGemini(messages, systemPrompt = '', temperature = 0.2, model = 'gemini-2.0-flash') {
  try {
    const formattedMessages = [];
    
    if (systemPrompt) {
      formattedMessages.push({ role: 'system', content: systemPrompt });
    }
    
    formattedMessages.push(...messages);

    const response = await fetch(`${GEMINI_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GEMINI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[AI ERROR] V98 API response error:', errText);
      throw new Error(`API returned status ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('[AI ERROR] Failed to ask Gemini:', error.message);
    throw error;
  }
}

module.exports = {
  askGemini,
  GEMINI_API_KEY,
  GEMINI_BASE_URL
};
