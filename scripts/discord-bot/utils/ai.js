/**
 * AI Utility - Handles requests to Google Gemini API via V98Store (OpenAI compatible endpoint).
 */
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
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
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

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
