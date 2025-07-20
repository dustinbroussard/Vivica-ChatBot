// js/title-generator.js
// Vivica - AI-Powered Conversation Title Generator

import Storage from './storage-wrapper.js';

/**
 * Generates a clever conversation title using the active AI model.
 * Shows a spinner in the conversation list during generation.
 *
 * @param {number} conversationId
 * @param {object[]} messages - Full message history for the convo
 * @param {string} apiKey - OpenRouter API key
 * @param {string} model - Active AI model (e.g., gpt-4o)
 * @param {Function} renderConversationsList - Callback to refresh sidebar UI
 */
export async function generateAIConversationTitle(conversationId, messages, apiKey, model, renderConversationsList) {
  try {
    // Step 1: Show temporary spinner title
    await Storage.ConversationStorage.updateConversation({ id: conversationId, title: 'Naming...' });
    renderConversationsList();

    // Step 2: Build prompt from first few messages
    const shortHistory = messages.slice(0, 6).map(m => `${m.sender}: ${m.content}`).join('\n');

    const prompt = `You're Vivica, an AI assistant. Based on the following conversation so far, generate a short, clever title for it.\n\n${shortHistory}\n\nTitle:`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are Vivica, an AI assistant who names conversations based on their topic and tone.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    const json = await response.json();
    const title = json.choices?.[0]?.message?.content?.trim();

    if (title) {
      await Storage.ConversationStorage.updateConversation({ id: conversationId, title });
      renderConversationsList();
    } else {
      throw new Error('No title returned');
    }

  } catch (err) {
    console.warn('Vivica failed to name the conversation:', err);
    // Optionally reset title if it failed
    await Storage.ConversationStorage.updateConversation({ id: conversationId, title: 'New Chat' });
    renderConversationsList();
  }
}
