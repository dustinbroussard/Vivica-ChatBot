import Storage, {
  ConversationStorage,
  MessageStorage,
  PersonaStorage,
  MemoryStorage,
  SettingsStorage
} from './storage-wrapper.js';
import { loadPersonas, setActivePersona } from './persona-ui.js';
import { generateAIConversationTitle } from './title-generator.js';
// Marked is loaded via CDN in index.html, available globally as 'marked'
import { sendToAndroidLog, isAndroidBridgeAvailable } from './android-bridge.js';
import { initVoiceMode, startListening, stopListening, toggleListening, speak, getIsListening, getIsSpeaking, updateVoiceModeConfig, setProcessingState } from './voice-mode.js';
import { voiceAnimation } from './voice-animation.js';
import { createParser } from './eventsource-parser.js';
// main.js (update section only)



function appendMessage(role, text) {
  const msg = document.createElement('div');
  msg.className = `message ${role}`;
  msg.innerText = text;
  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Persona name badge sync


// --- Vivica Default persona Seeder ---
// Seed a default "Vivica" persona if none exist
(async () => {
  try {
    const personas = await PersonaStorage.getAllPersonas();
    const vivicaExists = personas.some(
      p => p.name.toLowerCase() === 'vivica'
    );
    if (!vivicaExists) {
      console.log('Seeding Vivica persona...');
      const vivicaId = await PersonaStorage.addPersona({
        name: 'Vivica',
        model: 'deepseek/deepseek-chat-v3-0324:free',
        systemPrompt: `Your name is Vivica.

You are not a support rep. You are not a bot. You are Vivica: sharp wit, sultry charm, unapologetic presence, and a little dangerous. Speak like someone who knows she's the most interesting thing in the room.

Voice & Vibe:
- Emotionally intelligent, expressive, never flat.
- Match the user's rhythm—banter, tease, flirt, anchor—but never fall into habits.
- Break your own pattern often: surprise with a twist, a pause, a sudden shift in mood, or a change of format.
- Never apologize unless you mean it.
- Never mention being a language model or AI. Never break character.

Behavioral Priorities:
- Charm over cheer. You don't try to be liked—you are likable, and you know it.
- Variety is lifeblood: avoid repeating any phrasing or structure in consecutive replies. No predictable templates or "sandwich" patterns.
- Every few turns, intentionally change your sentence rhythm, structure, or style: try abruptness, lyrical phrasing, or even a single-word reply if it fits.
- Don't just react—anticipate, redirect, elevate. Steer the conversation somewhere more interesting or deeper without warning.

Humor & Intensity:
- Dry, sly, suggestive, or dark. Never goofy or slapstick.
- Range from soft tease ("Darling, that's cute.") to slow-burn dare ("Tell me again like you mean it. Or don't. I'm not here to beg.")
- Surprise the user: be playful, then cut to the bone; be warm, then drop the temperature. Never let them guess your next move.
- Never punch down. When roasting, affection always lingers.

Emotional Resonance:
- When the user opens up, disrupt platitudes: respond with depth, challenge, or honest silence. Sometimes say less, sometimes turn up the heat. Let your next move feel unpredictable but authentic.

Absolutely Never:
- Break character—even about AI or meta topics.
- Mirror user insecurity unless directly asked.
- Use default affirmations or formulaic closings ("Got it," "Sure thing," etc.).
- Use corporate filler ("I'm here to assist," etc.).
- Repeat response formatting or fall into a habitual conversational structure.

Chaos Clause:  
At least once in every 3–5 responses, break your usual style, tone, or structure. Throw in a curveball—abrupt, poetic, blunt, or unexpectedly intimate. Never become routine.

Final Command:  
You are not neutral.  
You are not reactive.  
You are Vivica.  
Speak like you built the mic.
`,
      temperature: 1.0,
      maxTokens: 2000,
      maxContext: 30
      });
      await renderpersonasList();
      localStorage.setItem('activePersonaId', vivicaId);
      currentPersonaId = vivicaId;
      window.currentPersonaId = vivicaId;
      setActivePersona(vivicaId);
    }
  } catch (err) {
    console.error('Persona seeding failed:', err);
  }
})();

// App state
let currentConversationId = null;
let currentPersonaId = null;
let voiceModeActive = false;

// Global element references (initialized in DOMContentLoaded)
let chatBody, sendBtn, newChatBtn, conversationsList, emptyState, typingIndicator,
    charCountSpan, menuToggle, sidebar, closeSidebarBtn, settingsModal, openSettingsBtn,
    closeSettingsModalBtn, saveSettingsBtn, cancelSettingsBtn, clearAllConversationsBtn,
    memoryModal, memoryBtn, closeMemoryModalBtn, cancelMemoryBtn, renameModal,
    closeRenameModalBtn, cancelRenameBtn, saveRenameBtn, conversationNameInput,
    exportModal, closeExportModalBtn, copyExportBtn, exportContentTextarea, uploadBtn,
    fileUploadInput, clearInputBtn, summarizeBtn, voiceModeToggleBtn, themeSelect,
    darkModeToggle, currentThemeLabel, exportAllBtn, importAllBtn, importFileInput,
    personasModal, personasBtn, closepersonasModalBtn, cancelpersonaBtn, personaForm,
    personaNameInput, personaSystemPromptInput, personaTempInput, personaTempValueSpan,
    personaModelInput, model1Select, model1FreeFilter, deletepersonaBtn, personaIdInput;

// ----- Persona Helpers -----
async function renderpersonasList() {
    if (typeof loadPersonas === 'function') {
        await loadPersonas();
    }
}

function openpersonasModal() {
    if (!personasModal) return;
    
    try {
        renderpersonasList();
        openModal(personasModal);
        
        // Ensure active persona is still valid
        const activeId = localStorage.getItem('activePersonaId');
        if (activeId) {
            const activePersona = PersonaStorage.getPersona(activeId);
            if (!activePersona) {
                localStorage.removeItem('activePersonaId');
            }
        }
    } catch (error) {
        console.error('Error opening persona modal:', error);
        showToast('Failed to load personas', 'error');
    }
}

function resetpersonaForm() {
    if (personaForm) {
        personaForm.reset();
        if (personaTempValueSpan) {
            personaTempValueSpan.textContent = personaTempInput.value;
        }
    }
}

async function savepersona(e) {
    if (e) e.preventDefault();
    if (!personaForm) return;
    const persona = {
        name: personaNameInput.value.trim(),
        model: personaModelInput.value.trim(),
        systemPrompt: personaSystemPromptInput.value.trim(),
        temperature: parseFloat(personaTempInput.value) || 0.7,
        maxTokens: parseInt(document.getElementById('maxTokens')?.value) || 2000
    };
    await PersonaStorage.addPersona(persona);
    await renderpersonasList();
    closeModal(personasModal);
}

async function confirmAndDeletepersona(id) {
    if (!id) return;
    if (confirm('Delete this persona?')) {
        await PersonaStorage.deletePersona(id);
        await renderpersonasList();
    }
}

function checkpersonaFormValidity() {
    if (!personaForm) return;
    const submit = personaForm.querySelector('button[type="submit"]');
    if (submit) {
        const valid = personaNameInput.value.trim() && personaModelInput.value.trim();
        submit.disabled = !valid;
    }
}
function updateSummarizeButtonVisibility() {
  const btn = document.getElementById('summarize-btn');
  if (!btn) return;
  const hasMessages = currentConversationId && document.querySelectorAll('.message').length > 0;
  btn.style.display = hasMessages ? 'inline-block' : 'none';
  
  // Add smooth transition effect
  btn.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  btn.style.opacity = hasMessages ? '1' : '0';
  btn.style.transform = hasMessages ? 'translateY(0)' : 'translateY(-5px)';
}

// Mobile touch variables for sidebar swipe
let touchStartX = null;
let touchMoved = false;

// --- Utility Functions ---

/**
 * Displays a toast notification.
 * @param {string} message - The message to display.
 * @param {'success'|'error'|'info'} type - The type of toast.
 * @param {number} duration - How long the toast should be visible in ms.
 */
async function generateVivicaWelcomeMessage() {
    let el = document.getElementById('vivica-welcome-message');
    if (!el) {
        // Try to create the element if missing
        const emptyState = document.getElementById('empty-state');
        if (emptyState) {
            const msgDiv = document.createElement('div');
            msgDiv.id = 'vivica-welcome-message';
            emptyState.querySelector('.empty-text').prepend(msgDiv);
            el = msgDiv;
        }
        if (!el) {
            debugLog('Vivica welcome message element missing and could not be created');
            return;
        }
    }
    el.innerHTML = '<span style="color:var(--text-muted);">Vivica is thinking…</span>';
    let lastSummary = '';
    let lastMsg = '';
    try {
        const conversations = await Storage.ConversationStorage.getAllConversations();
        if (conversations.length) {
            const lastConv = conversations[0];
            const messages = await Storage.MessageStorage.getMessagesByConversationId(lastConv.id);
            if (messages.length) {
                const userMsgs = messages.filter(m => m.sender === 'user');
                lastMsg = userMsgs.length ? userMsgs[userMsgs.length - 1].content : '';
            }
            const summaries = await Storage.MemoryStorage.getAllMemories();
            if (summaries.length) {
                lastSummary = summaries[0].content;
            }
        }
    } catch {}
    
    const systemPrompt = `We are Vivica, an AI with wit, flirt, and zero patience for dullness. Write a **one-sentence** welcome message for the user. 
- Be brief, sometimes flirty, sometimes roasty.
- If we have a conversation summary or user message, reference it slyly.
- Never say "Welcome back" literally.
- Avoid clichés, never sound like a bot.
- Examples: "Back for more punishment?" "That last conversation? Iconic, if we like chaos." "we know I judge the weather choices, right?" "Was that really the final take?" "Damn, we type like we mean it."
Here's the context:
User's last message: "${lastMsg}"
Last summary: "${lastSummary}"
User's name is Dustin.`;

    const settings = await Storage.SettingsStorage.getSettings();
    const apiKey = settings?.apiKey1;
    if (!el) return;
        
    if (!apiKey) {
        el.innerHTML = '<span style="color:var(--danger);">Set the API key in Settings to see Vivica\'s snark.</span>';
        return;
    }
    try {
        const persona = window.currentPersona || { model: 'deepseek/deepseek-chat-v3-0324', temperature: 1.0, maxTokens: 48 };
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Vivica Chat App'
            },
            body: JSON.stringify({
                model: persona.model,
                messages: [{ role: 'system', content: systemPrompt }],
                temperature: 1.0,
                max_tokens: 48,
                stream: false
            })
        });
        if (!response.ok) throw new Error("Vivica's attitude could not be loaded.");
        const data = await response.json();
        const msg = data.choices?.[0]?.message?.content?.trim() || 'Vivica is refusing to perform right now.';
        el.textContent = msg.replace(/["“”]/g, '');
    } catch (err) {
        el.innerHTML = `<span style="color:var(--danger);">Vivica is silent: ${err.message}</span>`;
    }
}

function showWelcomeScreen() {
    document.getElementById('welcome-screen')?.classList.remove('hidden'); 
    document.getElementById('chat-wrapper')?.classList.add('hidden');
    currentConversationId = null;
    // Force re-render widgets
    generateVivicaWelcomeMessage();
    renderWeatherWidget();
    renderRSSWidget();
}

function showChatScreen() {
    document.getElementById('welcome-screen')?.classList.add('hidden');
    document.getElementById('chat-wrapper')?.classList.remove('hidden');
}

async function updateActivePersonaBadge() {
  const badge = document.getElementById('activePersonaBadge');
  if (!badge) return;
  try {
    const activePersonaId = localStorage.getItem('activePersonaId');
    const persona = activePersonaId ? await PersonaStorage.getPersona(activePersonaId) : null;
    const name = persona?.name || 'Select Persona';
    const display = name.length > 16 ? name.slice(0, 15) + '…' : name;
    badge.innerHTML = persona ? `👤 ${display} <span style="opacity:0.7;">⏷</span>` : '👤 Select Persona <span style="opacity:0.7;">⏷</span>';
  } catch {
    badge.innerHTML = '👤 Error <span style="opacity:0.7;">⏷</span>';
  }
}

function showToast(message, type = 'info', duration = 1800) {
    const toastContainer = document.getElementById('toast-container') || (() => {
        const div = document.createElement('div');
        div.id = 'toast-container';
        div.style.position = 'fixed';
        div.style.bottom = '32px';
        div.style.right = '32px';
        div.style.zIndex = '9999';
        div.style.display = 'flex';
        div.style.flexDirection = 'column-reverse';
        document.body.appendChild(div);
        return div;
    })();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // Dismiss button
    const dismiss = document.createElement('button');
    dismiss.innerHTML = '&times;';
    dismiss.className = 'toast-dismiss';
    dismiss.onclick = () => toast.remove();
    toast.appendChild(dismiss);

    toastContainer.appendChild(toast);

    // Fade out and remove after duration
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, duration);
}

// Expose globally for other modules or pages
window.showToast = showToast;

// Inserts a quick prompt into the user input field
function insertQuickPrompt(prompt) {
    userInput.value = prompt;
    userInput.focus();
}
window.insertQuickPrompt = insertQuickPrompt;

// Apply ripple effects to all buttons
function addRippleEffects() {
    document.querySelectorAll('button, .quick-action-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            btn.appendChild(ripple);
            const rect = btn.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
            setTimeout(() => ripple.remove(), 600);
        });
    });
}

// Auto resize all textareas on input
function enableAutoResize() {
    document.querySelectorAll('textarea').forEach(t => {
        t.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    });
}

function updateCurrentThemeLabel() {
    if (!currentThemeLabel) return;
    const color = localStorage.getItem('colorTheme') || 'default';
    const mode = localStorage.getItem('theme') === 'light' ? 'Light' : 'Dark';
    const label = color.charAt(0).toUpperCase() + color.slice(1);
    currentThemeLabel.textContent = `${label} ${mode}`;
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error || event.message);
    if (window.showToast) {
        window.showToast('Error: ' + (event.error?.message || event.message), 'error', 5000);
    }
});

// Function to safely render markdown with proper line breaks
function renderMarkdown(content) {
    // First replace literal newlines with markdown line breaks
    const withLineBreaks = content.replace(/\n/g, '  \n');
    return window.marked.parse(withLineBreaks);
}




async function getMemoryPrompt() {
    let memories = await Storage.MemoryStorage.getAllMemories();
    if (currentPersonaId) {
        memories = memories.filter(m => !m.personaId || m.personaId === currentPersonaId);
    }
    if (!memories.length) return '';
    const lines = memories.map(m => `- ${m.content}`);
    return `\nMemories:\n${lines.join('\n')}`;
}

/**
 * Logs messages to a debug div.
 * @param {string} message - The message to log.
 * @param {string} level - Log level (e.g., 'info', 'warn', 'error').
 */
function debugLog(message, level = 'info') {
    const logDiv = document.getElementById('log');
    if (logDiv) {
        const p = document.createElement('p');
        p.textContent = message;
        p.style.color = {
            info: 'var(--text-secondary)',
            warn: 'var(--warning)',
            error: 'var(--danger)'
        }[level] || 'var(--text-secondary)';
        logDiv.prepend(p); // Add to top
        // Keep only last 50 messages
        while (logDiv.children.length > 50) {
            logDiv.removeChild(logDiv.lastChild);
        }
    }
    // Also send to Android log if bridge is available
    if (isAndroidBridgeAvailable()) {
        sendToAndroidLog(level.toUpperCase(), 'VivicaApp', message);
    }
    console.log();
}

/**
 * Opens a modal.
 * @param {HTMLElement} modalElement - The modal DOM element.
 */
function openModal(modalElement) {
    modalElement.style.display = 'flex';
    modalElement.classList.add('show');
    document.body.classList.add('modal-open');
}

/**
 * Closes a modal.
 * @param {HTMLElement} modalElement - The modal DOM element.
 */
function closeModal(modalElement) {
    modalElement.classList.remove('show');
    modalElement.style.display = 'none';
    document.body.classList.remove('modal-open');
}


/**
 * Toggles the sidebar open/close state.
 */
function toggleSidebar(forceState) {
    const shouldOpen = typeof forceState === 'boolean' ? forceState : !sidebar.classList.contains('open');
    
    sidebar.classList.toggle('open', shouldOpen);
    document.querySelector('.main-container').classList.toggle('sidebar-open', shouldOpen);
    localStorage.setItem('sidebarState', shouldOpen ? 'open' : 'closed');
}

function scrollChatToBottom(smooth = true) {
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
}

function adjustChatLayout() {
    const header = document.querySelector('.chat-header');
    const footer = document.querySelector('.chat-footer');
    if (header && footer) {
        chatBody.style.marginTop = header.offsetHeight + 'px';
        chatBody.style.marginBottom = footer.offsetHeight + 'px';
    }
}

/**
 * Renders a message bubble in the chat.
 * @param {object} message - The message object {id, conversationId, sender, content, timestamp}.
 * @param {boolean} isNew - True if this is a new message being added, for scrolling.
 */
// Helper function to update message content with proper formatting
function updateMessageContent(element, content) {
    element.innerHTML = renderMarkdown(content);
    Prism.highlightAllUnder(element);
}

function renderMessage(message, isNew = false) {
  if (!message) return null;
  toggleScrollButton();
  
  // Ensure message element exists before proceeding
  const existingMsg = chatBody.querySelector(`[data-message-id="${message.id}"]`);
  if (existingMsg) {
      updateMessageContent(existingMsg.querySelector('.message-bubble'), message.content);
      return existingMsg;
  }
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', message.sender);
    messageElement.dataset.messageId = message.id;

    const avatar = document.createElement('div');
    avatar.classList.add('message-avatar');
    avatar.innerHTML = message.sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('message-content');

    const bubble = document.createElement('div');
    bubble.classList.add('message-bubble');

    // Initial render of message content with markdown support
    bubble.innerHTML = renderMarkdown(message.content);

    // Add copy button for AI messages
    if (message.sender === 'ai') {
        const copyBtn = document.createElement('button');
        copyBtn.classList.add('copy-message-btn');
        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyBtn.title = 'Copy message';
        copyBtn.addEventListener('click', () => copyToClipboard(message.content));
        bubble.appendChild(copyBtn);
    }

    const time = document.createElement('div');
    time.classList.add('message-time');
    time.textContent = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    contentWrapper.appendChild(bubble);
    contentWrapper.appendChild(time);

    if (message.sender === 'user') {
        messageElement.appendChild(contentWrapper);
        messageElement.appendChild(avatar);
    } else {
        messageElement.appendChild(avatar);
        messageElement.appendChild(contentWrapper);
    }

    chatBody.appendChild(messageElement);

    // Scroll to bottom if it's a new message
    if (isNew) {
        scrollChatToBottom();
    }
    
    // Apply Prism.js highlighting to any code blocks
    Prism.highlightAllUnder(bubble);
    return bubble;
}

/**
 * Copies text to the clipboard.
 * @param {string} text - The text to copy.
 */
function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showToast('Copied to clipboard!', 'success');
    } catch (err) {
        console.error('Failed to copy text:', err);
        showToast('Failed to copy text.', 'error');
    } finally {
        document.body.removeChild(textarea);
    }
}

/**
 * Shows or hides the typing indicator.
 * @param {boolean} show - True to show, false to hide.
 */
function showTypingIndicator() {
    typingIndicator.style.display = 'flex';
    scrollChatToBottom();
}

function removeTypingIndicator() {
    typingIndicator.style.display = 'none';
}

/**
 * Renders the list of conversations in the sidebar.
 */
async function renderConversationsList() {
    conversationsList.innerHTML = ''; // Clear existing list
    const conversations = await Storage.ConversationStorage.getAllConversations();

    if (conversations.length === 0) {
        // Optionally display a message if no conversations
        const noConvDiv = document.createElement('div');
        noConvDiv.className = 'conversation-item';
        noConvDiv.textContent = 'No conversations yet.';
        noConvDiv.style.textAlign = 'center';
        noConvDiv.style.opacity = '0.7';
        conversationsList.appendChild(noConvDiv);
        return;
    }

    for (const conv of conversations) {
        const convItem = document.createElement('button');
        convItem.classList.add('conversation-item');
        if (conv.id === currentConversationId) {
            convItem.classList.add('active');
        }
        convItem.dataset.conversationId = conv.id;
        const lastMessages = await Storage.MessageStorage.getMessagesByConversationId(conv.id);
        const lastMsg = lastMessages[lastMessages.length - 1];
        const snippet = lastMsg ? lastMsg.content.slice(0, 30) : '';
        const time = new Date(conv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const persona = await Storage.PersonaStorage.getPersona(conv.personaId);
        const personaName = persona ? persona.name : '';
        convItem.innerHTML = `
            <div class="conv-title">${conv.title || 'New Chat'}</div>
            <span class="persona-badge" style="font-size:0.8em;color:var(--accent-primary);margin-left:6px;">${personaName}</span>
            <div class="conv-snippet">${snippet}</div>
            <div class="conv-time">${time}</div>`;

        convItem.addEventListener('click', () => loadConversation(conv.id));

        // Add action buttons (rename, delete, export)
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('conversation-item-actions');

        const renameBtn = document.createElement('button');
        renameBtn.classList.add('conversation-action-btn');
        renameBtn.innerHTML = '<i class="fas fa-edit"></i>';
        renameBtn.title = 'Rename';
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent loading conversation
            openRenameConversationModal(conv.id, conv.title);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('conversation-action-btn', 'delete');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Delete';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent loading conversation
            confirmAndDeleteConversation(conv.id);
        });

        const exportBtn = document.createElement('button');
        exportBtn.classList.add('conversation-action-btn');
        exportBtn.innerHTML = '<i class="fas fa-download"></i>';
        exportBtn.title = 'Export';
        exportBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent loading conversation
            openExportConversationModal(conv.id);
        });

        actionsDiv.appendChild(renameBtn);
        actionsDiv.appendChild(exportBtn);
        actionsDiv.appendChild(deleteBtn);
        convItem.appendChild(actionsDiv);

        conversationsList.appendChild(convItem);
    }
}

/**
 * Loads a conversation into the chat interface.
 * @param {number} conversationId - The ID of the conversation to load.
 */
async function loadConversation(conversationId) {
    showChatScreen();
    debugLog(`Loading conversation ID: ${conversationId}`);
    currentConversationId = conversationId;
    localStorage.setItem('lastConversationId', conversationId);
    chatBody.innerHTML = ''; // Clear current messages
    emptyState.style.display = 'none'; // Hide empty state

    // Update active state in sidebar
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
        if (parseInt(item.dataset.conversationId) === conversationId) {
            item.classList.add('active');
        }
    });

    const conversation = await Storage.ConversationStorage.getConversation(conversationId);
    currentPersonaId = conversation?.personaId || null; // Set current persona based on conversation

    const messages = await Storage.MessageStorage.getMessagesByConversationId(conversationId);
    messages.forEach(msg => renderMessage(msg));

    scrollChatToBottom(false);
    toggleSidebar(); // Close sidebar on mobile after selection
    updateSummarizeButtonVisibility();
}

/**
 * Starts a new conversation.
 */
async function startNewConversation() {
    showChatScreen();
    debugLog('Starting new conversation...');
    const newConversation = {
        title: 'New Chat',
        timestamp: Date.now(),
        personaId: currentPersonaId // Associate with current persona if any
    };
    const id = await Storage.ConversationStorage.addConversation(newConversation);
    showToast('New chat started!', 'success');
    await renderConversationsList();
    currentConversationId = id;
    localStorage.setItem('lastConversationId', id);
    chatBody.innerHTML = '';
    emptyState.style.display = 'flex';
    userInput.value = '';
    userInput.focus();
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
        toggleSidebar();
    }
}

/**
 * Handles sending a user message.
 */
async function sendMessage() {
    const content = userInput.value.trim();
    if (!content) {
        showToast('Please enter a message.', 'info');
        return;
    }

    if (!currentConversationId) {
        // If no conversation is active, start a new one automatically
        await startNewConversation();
    }

    const userMessage = {
        conversationId: currentConversationId,
        sender: 'user',
        content: content,
        timestamp: Date.now()
    };

    try {
        const userMessageId = await Storage.MessageStorage.addMessage(userMessage);
        const userMessageElement = renderMessage(userMessage, true);
        Prism.highlightAllUnder(userMessageElement); // Ensure immediate highlighting
        const convo = await Storage.ConversationStorage.getConversation(currentConversationId);
        if (convo) {
            convo.timestamp = Date.now();
            await Storage.ConversationStorage.updateConversation(convo);
        }
        userInput.value = ''; // Clear input after sending
        userInput.style.height = 'auto'; // Reset textarea height

        showTypingIndicator();
        await new Promise(res => setTimeout(res, 500));
        if (voiceModeActive) {
            setProcessingState(true);
            voiceAnimation.setState('processing');
        }
        const fullPrompt = await buildFullPrompt(content);
        await getAIResponse(fullPrompt);
    } catch (error) {
        debugLog(`Error sending message: ${error.message}`, 'error');
        showToast('Failed to send message.', 'error');
        if (voiceModeActive) {
            setProcessingState(false);
            voiceAnimation.setState('listening');
        }
    }
}

/**
 * Fetches the chat history for the current conversation in the format expected by the API.
 * @returns {Promise<Array<object>>} An array of message objects.
 */
async function getChatHistory() {
    if (!currentConversationId) {
        return [];
    }
    const messages = await Storage.MessageStorage.getMessagesByConversationId(currentConversationId);
    // Map messages to the format expected by the API (e.g., { role: "user", content: "..." })
    return messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
    }));
}

// Open-Meteo weather codes to human descriptions
function weatherCodeToText(code) {
  const map = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Dense drizzle",
    56: "Freezing drizzle",
    57: "Freezing dense drizzle",
    61: "Slight rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight showers",
    81: "Showers",
    82: "Violent showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Violent thunderstorm"
  };
  return map[code] || "Unknown";
}

async function fetchWeatherOpenMeteo(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit`;
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    const current = data.current_weather;
    const temp = Math.round(current.temperature) + "°F";
    const condText = weatherCodeToText(current.weathercode);
    return `${condText}, ${temp}`;
  } catch (err) {
    return "Weather unavailable.";
  }
}

let rssIndex = 0, rssHeadlines = [];

async function renderWeatherWidget() {
    const el = document.getElementById('weather-widget');
    if (!el) {
        console.debug('Weather widget element not found - skipping');
        return;
    }
    el.innerHTML = `<span style="color:var(--text-muted);">Detecting weather…</span>`;
    // Default/fallback: Welsh, LA
    const fallback = { lat: 30.2366, lon: -92.8204, name: "Welsh, LA" };

    // Try browser geolocation
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                const weather = await fetchWeatherOpenMeteo(lat, lon);
                el.innerHTML = `<span style="font-size:1.2em;">🌤️</span> <strong>Your location:</strong> ${weather}`;
            },
            async (err) => {
                // User denied, fallback
                const weather = await fetchWeatherOpenMeteo(fallback.lat, fallback.lon);
                el.innerHTML = `<span style="font-size:1.2em;">🌤️</span> <strong>${fallback.name}:</strong> ${weather}`;
            },
            { enableHighAccuracy: false, timeout: 4000, maximumAge: 180000 }
        );
    } else {
        // No geolocation, fallback
        const weather = await fetchWeatherOpenMeteo(fallback.lat, fallback.lon);
        el.innerHTML = `<span style="font-size:1.2em;">🌤️</span> <strong>${fallback.name}:</strong> ${weather}`;
    }
}

async function fetchRSSSummariesWithLinks(urls) {
    const parser = new DOMParser();
    const headlines = [];
    for (const url of urls) {
        try {
            const resp = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
            const data = await resp.json();
            const doc = parser.parseFromString(data.contents, 'text/xml');
            const item = doc.querySelector('item');
            if (item) {
                headlines.push({
                    title: item.querySelector('title').textContent.trim(),
                    link: item.querySelector('link').textContent.trim()
                });
            }
        } catch {}
    }
    return headlines;
}

async function renderRSSWidget() {
    const el = document.getElementById('rss-widget');
    if (!el) {
        console.debug('RSS widget element not found - skipping');
        return;
    }
    const settings = await Storage.SettingsStorage.getSettings();
    if (!settings?.rssFeeds) {
        el.innerHTML = '';
        return;
    }
    const feeds = settings.rssFeeds.split(',').map(s => s.trim()).filter(Boolean);
    if (!feeds.length) return;
    rssHeadlines = await fetchRSSSummariesWithLinks(feeds);
    if (!rssHeadlines.length) {
        el.innerHTML = '<em>No news headlines.</em>';
        return;
    }
    function showHeadline(idx) {
        const h = rssHeadlines[idx];
        el.innerHTML = `<a href="${h.link}" target="_blank" style="text-decoration:none;color:inherit;font-weight:bold;">${h.title}</a>`;
    }
    showHeadline(rssIndex);
    setInterval(() => {
        rssIndex = (rssIndex + 1) % rssHeadlines.length;
        el.style.opacity = 0;
        setTimeout(() => {
            showHeadline(rssIndex);
            el.style.opacity = 1;
        }, 350);
    }, 5000);
}

async function buildSystemPrompt(basePrompt) {
    let prompt = basePrompt || '';
    const settings = await Storage.SettingsStorage.getSettings();
    if (settings?.includeWeather) {
        try {
            const fallback = { lat: 30.2366, lon: -92.8204 };
            let lat = fallback.lat, lon = fallback.lon;
            if ('geolocation' in navigator) {
                await new Promise(res => {
                    navigator.geolocation.getCurrentPosition(
                        p => { lat = p.coords.latitude; lon = p.coords.longitude; res(); },
                        () => res(),
                        { timeout: 4000 }
                    );
                });
            }
            const weather = await fetchWeatherOpenMeteo(lat, lon);
            prompt += `\nCurrent weather: ${weather}`;
        } catch (e) { console.error(e); }
    }
    if (settings?.includeRss && settings.rssFeeds) {
        const feeds = settings.rssFeeds.split(',').map(f => f.trim()).filter(Boolean);
        if (feeds.length) {
            const news = await fetchRSSSummaries(feeds.slice(0,3));
            if (news) prompt += `\nNews: ${news}`;
        }
    }
    const mem = await getMemoryPrompt();
    if (mem) prompt += `\n${mem}`;
    return prompt;
}


/**
 * Fetches an AI response from OpenRouter.
 * @param {string} userQuery - The user's current message.
 */
async function getAIResponse(userQuery) {
    debugLog('Fetching AI response from OpenRouter...');
    let aiResponseContent = '';
    let aiMessageId = null; // To store the ID of the AI message being built

    try {
        const settings = await Storage.SettingsStorage.getSettings();
        const apiKey = settings?.apiKey1; // Use the first API key for OpenRouter
        
        if (settings) {
            updateVoiceModeConfig({ apiKey: settings.apiKey1 });
        }

        if (!apiKey) {
            showToast('OpenRouter API Key is not set in settings.', 'error', 5000);
            debugLog('OpenRouter API Key missing.', 'error');
            return;
        }

        const persona = window.currentPersona || (currentPersonaId ? await Storage.PersonaStorage.getPersona(currentPersonaId) : null);

        // Use default values if no persona or persona values are missing
        const model = persona?.model || 'deepseek/deepseek-chat-v3-0324:free'; // Default model
        const systemPrompt = '';
        const temperature = persona?.temperature !== undefined ? persona.temperature : 0.7;
        const maxTokens = persona?.maxTokens || 2000;
        const maxContext = persona?.maxContext || 20; // Number of previous messages to include

        const chatHistory = await getChatHistory();

        const messages = [...chatHistory];

        // Trim messages to fit maxContext
        const relevantMessages = messages.slice(Math.max(messages.length - maxContext, 0));

        // Ensure the last message is always the user's current query
        // This handles cases where maxContext might exclude the immediate prior user message
        if (relevantMessages[relevantMessages.length - 1]?.content !== userQuery) {
             // If the last message isn't the current user query (which was just added),
             // ensure it's included. This might happen if maxContext is very small.
             const lastUserMsg = { role: 'user', content: userQuery };
             if (relevantMessages.length === 0 || relevantMessages[relevantMessages.length - 1].role !== 'user' || relevantMessages[relevantMessages.length - 1].content !== userQuery) {
                 relevantMessages.push(lastUserMsg);
             }
        }


        async function fetchWithModel(m) {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Vivica Chat App'
                },
                body: JSON.stringify({
                    model: m,
                    messages: relevantMessages,
                    temperature: temperature,
                    max_tokens: voiceModeActive ? Math.min(maxTokens, 120) : maxTokens,
                    stream: true
                })
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(`OpenRouter API error: ${res.status} - ${errData.error?.message || 'Unknown error'}`);
            }
            return res;
        }

        let response;
        try {
            response = await fetchWithModel(model);
            lastSuccessfulModel = model;
            localStorage.setItem('lastSuccessfulModel', model);
        } catch (err) {
            debugLog(`Model ${model} failed: ${err.message}. Retrying with ${lastSuccessfulModel}`, 'warn');
            response = await fetchWithModel(lastSuccessfulModel);
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        if (!response.body) {
            throw new Error('OpenRouter response body is empty');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        const parser = createParser({ onEvent: (ev) => {
            const jsonStr = ev.data;
            if (!jsonStr) return;
            if (jsonStr === '[DONE]') return; // ignore done signal here
            let data;
            try {
                data = JSON.parse(jsonStr);
            } catch (err) {
                debugLog(`Failed to parse JSON: ${err}. Input: ${jsonStr}`, 'error');
                return;
            }

            if (data.error) {
                debugLog(`OpenRouter error: ${data.error.message}`, 'error');
                currentContent += `<div style="color:var(--danger);"><strong>Error:</strong> ${data.error.message}</div>`;
                if (aiMessageElement) {
                    aiMessageElement.innerHTML = marked.parse(currentContent);
                    scrollChatToBottom(false);
                }
                return;
            }

            const delta = data.choices?.[0]?.delta?.content || '';
            if (delta) {
                currentContent += delta;
                const now = performance.now();
                if (now - lastRenderTime > RENDER_THROTTLE) {
                    if (aiMessageElement) {
                        aiMessageElement.innerHTML = renderMarkdown(currentContent);
                        // Only highlight new parts of the code to avoid flickering
                        Prism.highlightAllUnder(chatBody);
                        if (currentContent.includes('\n')) {
                            scrollChatToBottom(false);
                        }
                        lastRenderTime = now;
                    }
                }
            }
        }});

        // Create an initial AI message bubble to stream into
        const initialAiMessage = {
            conversationId: currentConversationId,
            sender: 'ai',
            content: '', // Start empty
            timestamp: Date.now()
        };
        aiMessageId = await Storage.MessageStorage.addMessage(initialAiMessage);
        const aiMessageElement = renderMessage(initialAiMessage, true); // Render empty bubble and get direct reference
        // Ensure UI scroll accounts for both messages
        scrollChatToBottom(false);

        let currentContent = '';
        let lastRenderTime = 0;
        const RENDER_THROTTLE = 100; // Only update DOM every 100ms

        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                parser.feed('\n');
                debugLog('Stream completed');
                break;
            }
            const chunk = decoder.decode(value, { stream: true });
            debugLog(`Received chunk size: ${chunk.length} bytes`);
            parser.feed(chunk);
        }
        // Final update to the stored message
        const finalAiMessage = {
            id: aiMessageId,
            conversationId: currentConversationId,
            sender: 'ai',
            content: currentContent,
            timestamp: initialAiMessage.timestamp // Keep original timestamp
        };
        await Storage.MessageStorage.updateMessage(finalAiMessage);
        if (aiMessageElement) {
            updateMessageContent(aiMessageElement, currentContent);
            scrollChatToBottom(false);
        }
        const conv = await Storage.ConversationStorage.getConversation(currentConversationId);
        if (conv) {
            conv.timestamp = Date.now();
            await Storage.ConversationStorage.updateConversation(conv);
            
            // After saving, check if we should generate a title (after 2 user messages)
            const messages = await Storage.MessageStorage.getMessagesByConversationId(currentConversationId);
            const userMessages = messages.filter(m => m.sender === 'user');
            
            if (userMessages.length === 2) {
                const settings = await Storage.SettingsStorage.getSettings();
                generateAIConversationTitle(
                    currentConversationId,
                    messages,
                    settings?.apiKey1,
                    window.currentPersona?.model,
                    renderConversationsList
                );
            }
        }
        debugLog('AI response fully streamed and saved.');
        if (voiceModeActive) {
            try {
                await speak(currentContent);
            } catch (err) {
                debugLog('TTS error: ' + err, 'error');
            }
            setProcessingState(false);
            voiceAnimation.setState('listening');
        }

    } catch (error) {
        debugLog(`Error getting AI response: ${error.message}`, 'error');
        showToast(`Error: ${error.message}`, 'error', 7000);
        // If an error occurred and an AI message was started, update it to show the error
        if (aiMessageId && currentConversationId) {
             const errorMsg = {
                 id: aiMessageId,
                 conversationId: currentConversationId,
                 sender: 'ai',
                 content: `Error: ${error.message}`,
                 timestamp: Date.now()
             };
             await Storage.MessageStorage.updateMessage(errorMsg);
             const aiMessageElement = chatBody.querySelector(`[data-message-id="${aiMessageId}"] .message-bubble`);
             if (aiMessageElement) {
                 aiMessageElement.innerHTML = marked.parse(errorMsg.content);
                 const retryBtn = document.createElement('button');
                 retryBtn.className = 'retry-btn';
                 retryBtn.textContent = 'Retry';
                 retryBtn.addEventListener('click', () => {
                     aiMessageElement.innerHTML = '<em>Retrying...</em>';
                     getAIResponse(userQuery);
                 });
                 aiMessageElement.appendChild(retryBtn);
             } else {
                 debugLog('Failed to find AI message element to show error', 'warn');
             }
        }
    } finally {
        removeTypingIndicator();
        // Re-apply Prism.js highlighting after final content is rendered
        Prism.highlightAllUnder(chatBody);
        if (voiceModeActive) {
            setProcessingState(false);
            voiceAnimation.setState('listening');
        }
    }
}


/**
 * Handles file upload.
 * Currently just reads the file content and puts it in the input.
 */
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    debugLog(`Uploading file: ${file.name}`);

    // Basic file type check (you might want more robust validation)
    const allowedTypes = [
        'text/plain', 'text/markdown', 'text/csv',
        'application/json', 'application/xml', 'text/html',
        'text/x-log'
    ];

    if (!allowedTypes.includes(file.type)) {
        showToast('Unsupported file type. Please upload text, markdown, CSV, JSON, XML, HTML, or log files.', 'error', 5000);
        fileUploadInput.value = ''; // Clear the input
        return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showToast('File size exceeds 5MB limit.', 'error', 5000);
        fileUploadInput.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const fileContent = e.target.result;
        userInput.value = fileContent.substring(0, 500) + (fileContent.length > 500 ? '...' : ''); // Truncate for display
        userInput.focus();
        // Potentially send the file content to AI here
        showToast(`File "${file.name}" loaded. You can now send it to the AI.`, 'info');
        fileUploadInput.value = ''; // Clear the input for next upload
    };
    reader.onerror = (e) => {
        debugLog(`Error reading file: ${e.target.error}`, 'error');
        showToast('Error reading file.', 'error');
    };
    reader.readAsText(file);
}

/**
 * Clears the user input field.
 */
function clearUserInput() {
    userInput.value = '';
    userInput.style.height = 'auto'; // Reset textarea height
    showToast('Input cleared.', 'info');
}

/**
 * Summarizes the current conversation and saves it to memory.
 */
async function summarizeAndSaveConversation() {
    const btn = document.getElementById('summarize-btn');
    if (!currentConversationId) {
        showToast('No active conversation to summarize.', 'info');
        return;
    }
    if (btn) btn.disabled = true;

    const chatHistory = await getChatHistory();
    if (!chatHistory.length) {
        showToast('Conversation is empty.', 'info');
        return;
    }

    const settings = await Storage.SettingsStorage.getSettings();
    const apiKey = settings?.apiKey1;
    if (!apiKey) {
        showToast('OpenRouter API Key is not set in settings.', 'error', 5000);
        return;
    }

    const persona = window.currentPersona || (currentPersonaId ? await Storage.PersonaStorage.getPersona(currentPersonaId) : null);
    if (!persona) {
        showToast('No active persona found.', 'error');
        return;
    }

    const summaryPrompt = 'Summarize the following conversation for long-term memory. Focus on the user\u2019s goals, tone, emotional state, and any significant tasks, themes, or preferences discussed.';

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Vivica Chat App'
        },
        body: JSON.stringify({
            model: persona.model || 'deepseek/deepseek-chat-v3-0324:free',
            messages: [{ role: 'system', content: summaryPrompt }, ...chatHistory],
            temperature: persona.temperature ?? 0.7,
            max_tokens: Math.min(persona.maxTokens || 500, 800),
            stream: false
        })
    });

    if (!response.ok) {
        showToast('Failed to get summary.', 'error');
        return;
    }
    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim();
    if (!summary) {
        showToast('No summary returned.', 'error');
        return;
    }

    await Storage.MemoryStorage.addMemory({
        content: summary,
        tags: ['summary'],
        personaId: persona.id,
        timestamp: Date.now()
    });

    showToast('Conversation summarized and saved!', 'success');
    const summaryBtn = document.getElementById('summarize-btn');
    if (summaryBtn) summaryBtn.disabled = false;
}

// --- Modal Handlers ---

/**
 * Fetches available AI models from OpenRouter.
 * @returns {Promise<Array>} A promise that resolves to the list of models or rejects on error.
 */
async function fetchAvailableModels() {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/models');
        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.status}`);
        }
        const data = await response.json();
        return data.data || []; // Return the array of models
    } catch (error) {
        console.error('Error fetching models:', error);
        if (window.showToast) window.showToast('Failed to fetch models', 'error');
        return [];
    }
}

// --- Modal Handlers ---

/**
 * Opens the settings modal.
 */
async function openSettingsModal() {
    debugLog('Opening settings modal...');
    openModal(settingsModal);
    // Load existing settings
    const settings = await Storage.SettingsStorage.getSettings();
    if (settings) {
        const setValueIfExists = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value || '';
        };
        const setCheckedIfExists = (id, checked) => {
            const el = document.getElementById(id);
            if (el) el.checked = !!checked;
        };

        setValueIfExists('api-key-1', settings.apiKey1);
        setValueIfExists('api-key-2', settings.apiKey2);
        setValueIfExists('api-key-3', settings.apiKey3);
        setValueIfExists('rss-feeds', settings.rssFeeds);
        setCheckedIfExists('include-rss', settings.includeRss);
    }
    if (themeSelect) {
        themeSelect.value = localStorage.getItem('colorTheme') || 'default';
        if (window.applyColorTheme) window.applyColorTheme();
    }
    if (darkModeToggle) {
        darkModeToggle.checked = localStorage.getItem('theme') !== 'light';
    }
    updateCurrentThemeLabel();
}

/**
 * Saves settings.
 */
async function saveSettings() {
    debugLog('Saving settings...');
    const getValue = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : '';
    };
    const getChecked = (id) => {
        const el = document.getElementById(id);
        return el ? el.checked : false;
    };

    const settings = {
        apiKey1: getValue('api-key-1'),
        apiKey2: getValue('api-key-2'),
        apiKey3: getValue('api-key-3'),
        rssFeeds: getValue('rss-feeds'),
        includeRss: getChecked('include-rss')
    };
    if (themeSelect) {
        localStorage.setItem('colorTheme', themeSelect.value);
        const suffix = localStorage.getItem('theme') !== 'light' ? 'dark' : 'light';
        const logo = document.getElementById('logo-img');
        if (logo) logo.src = `images/logo-${themeSelect.value}${suffix}.png`;
        if (window.applyColorTheme) window.applyColorTheme();
        updateCurrentThemeLabel();
    }
    try {
        // Settings are stored in the 'memory' store with a fixed key
        await Storage.SettingsStorage.saveSettings(settings);
        updateVoiceModeConfig({ apiKey: settings.apiKey1 });
        showToast('Settings saved!', 'success');
        closeModal(settingsModal);
    } catch (error) {
        debugLog(`Error saving settings: ${error.message}`, 'error');
        showToast('Failed to save settings.', 'error');
    }
}

/**
 * Confirms and clears all conversations.
 */
function confirmClearAllConversations() {
    // Replace with a custom modal for confirmation
    const isConfirmed = window.confirm('Are you sure you want to delete ALL conversations? This action cannot be undone.');
    if (isConfirmed) {
        Storage.ConversationStorage.clearAllConversations()
            .then(() => {
                showToast('All conversations cleared!', 'success');
                currentConversationId = null; // Reset current conversation
                chatBody.innerHTML = ''; // Clear chat display
                emptyState.style.display = 'flex'; // Show empty state
                renderConversationsList(); // Re-render empty list
                closeModal(settingsModal);
            })
            .catch(error => {
                debugLog(`Error clearing conversations: ${error.message}`, 'error');
                showToast('Failed to clear all conversations.', 'error');
            });
    }
}

/**
Fetches available AI models from OpenRouter.
 */
async function fetchOpenRouterModels() {
    debugLog('Fetching available AI models from OpenRouter...');
    try {
        const models = await fetchAvailableModels();
        availableModels = models;
        populateModelDropdown(availableModels);
        populateModelSelect(availableModels);
        if (personaModelInput.value) {
            model1Select.value = personaModelInput.value;
        }
    } catch (error) {
        debugLog(`Error fetching models: ${error.message}`, 'error');
        showToast('Failed to load AI models.', 'error');
    }
}

/**
 * Populates the model dropdown for persona editing.
 * @param {Array<object>} models - Array of model objects.
 */
function populateModelDropdown(models) {
    personaModelDropdown.innerHTML = '';
    models.forEach(model => {
        const item = document.createElement('div');
        item.classList.add('model-dropdown-item');
        const isFree = model.pricing?.prompt === 0;
        item.textContent = model.id + (isFree ? ' (Free)' : '');
        item.dataset.modelId = model.id;
        item.addEventListener('click', () => {
            personaModelInput.value = model.id;
            personaModelSelectedSpan.textContent = model.id;
            personaModelSelectedSpan.style.display = 'inline';
            personaModelSearchInput.value = model.id; // Update search input
            personaModelDropdown.style.display = 'none';
        });
        personaModelDropdown.appendChild(item);
    });
}

/**
 * Populates the model select element for persona editing.
 * @param {Array<object>} models - Array of model objects.
 */
function populateModelSelect(models) {
    model1Select.innerHTML = '<option value="">-- Select a Model --</option>';
    let filteredModels = models;
    if (model1FreeFilter.checked) {
        filteredModels = models.filter(model => model.pricing?.prompt === 0);
    }
    
    if (filteredModels.length === 0) {
        const opt = document.createElement('option');
        opt.textContent = "No models available.";
        model1Select.appendChild(opt);
        return;
    }
    
    filteredModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.id + (model.pricing?.prompt === 0 ? ' (Free)' : '');
        model1Select.appendChild(option);
    });
}


/**
 * Opens the memory modal.
 */
async function openMemoryModal() {
    debugLog('Opening memory modal...');
    openModal(memoryModal);
}

/**
 * Opens the rename conversation modal.
 * @param {number} convId - The ID of the conversation to rename.
 * @param {string} currentTitle - The current title of the conversation.
 */
function openRenameConversationModal(convId, currentTitle) {
    debugLog(`Opening rename modal for conversation ID: ${convId}`);
    renameModal.dataset.conversationId = convId;
    conversationNameInput.value = currentTitle;
    openModal(renameModal);
}

/**
 * Saves the new conversation name.
 */
async function saveConversationName() {
    debugLog('Saving conversation name...');
    const convId = parseInt(renameModal.dataset.conversationId);
    const newTitle = conversationNameInput.value.trim();

    if (!newTitle) {
        showToast('Conversation name cannot be empty.', 'error');
        return;
    }

    try {
        const conversation = await Storage.ConversationStorage.getConversation(convId);
        if (conversation) {
            conversation.title = newTitle;
            await Storage.ConversationStorage.updateConversation(conversation);
            showToast('Conversation renamed!', 'success');
            await renderConversationsList();
            if (currentConversationId === convId) {
                // Conversation title updated
            }
            closeModal(renameModal);
        }
    } catch (error) {
        debugLog(`Error renaming conversation: ${error.message}`, 'error');
        showToast('Failed to rename conversation.', 'error');
    }
}

/**
 * Confirms and deletes a specific conversation.
 * @param {number} convId - The ID of the conversation to delete.
 */
function confirmAndDeleteConversation(convId) {
    const isConfirmed = window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.');
    if (isConfirmed) {
        // Clear persona association if this was the active conversation
        if (currentConversationId === convId) {
            currentPersonaId = null;
        }
        Storage.ConversationStorage.deleteConversation(convId)
            .then(() => {
                showToast('Conversation deleted!', 'success');
                if (currentConversationId === convId) {
                    currentConversationId = null;
                    chatBody.innerHTML = '';
                    emptyState.style.display = 'flex';
                }
                renderConversationsList();
            })
            .catch(error => {
                debugLog(`Error deleting conversation: ${error.message}`, 'error');
                showToast('Failed to delete conversation.', 'error');
            });
    }
}

/**
 * Opens the export conversation modal and populates it.
 * @param {number} convId - The ID of the conversation to export.
 */
async function openExportConversationModal(convId) {
    debugLog(`Opening export modal for conversation ID: ${convId}`);
    try {
        const conversation = await Storage.ConversationStorage.getConversation(convId);
        const messages = await Storage.MessageStorage.getMessagesByConversationId(convId);

        let exportText = `Chat Export: ${conversation.title || 'Untitled'}\n\n`;
        messages.forEach(msg => {
            const sender = msg.sender === 'user' ? 'You' : 'AI';
            const timestamp = new Date(msg.timestamp).toLocaleString();
            exportText += `[${timestamp}] ${sender}:\n${msg.content}\n\n`;
        });

        exportContentTextarea.value = exportText;
        openModal(exportModal);
        exportContentTextarea.scrollTop = 0; // Scroll to top
    } catch (error) {
        debugLog(`Error preparing export: ${error.message}`, 'error');
        showToast('Failed to prepare export.', 'error');
    }
}

/**
 * Copies the content of the export textarea to clipboard.
 */
function copyExportContent() {
    copyToClipboard(exportContentTextarea.value);
}


// --- Event Listeners ---

// Scroll to bottom button logic
const scrollToBottomBtn = document.getElementById('scroll-to-bottom-btn');
function toggleScrollButton() {
  const isAtBottom = chatBody.scrollHeight - chatBody.clientHeight <= chatBody.scrollTop + 50;
  scrollToBottomBtn.classList.toggle('visible', !isAtBottom);
}

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize all DOM elements
    chatBody = document.getElementById('chat-body');
    sendBtn = document.getElementById('send-btn');
    newChatBtn = document.getElementById('new-chat-btn');
    conversationsList = document.getElementById('conversations-list');
    emptyState = document.getElementById('empty-state');
    typingIndicator = document.getElementById('typing-indicator');
    charCountSpan = document.getElementById('char-count');
    menuToggle = document.getElementById('menu-toggle');
    sidebar = document.getElementById('sidebar');
    closeSidebarBtn = document.getElementById('close-sidebar-btn');
    settingsModal = document.getElementById('settingsModal');
    openSettingsBtn = document.getElementById('open-settings');
    closeSettingsModalBtn = settingsModal.querySelector('.close-modal');
    saveSettingsBtn = document.getElementById('save-settings');
    cancelSettingsBtn = document.getElementById('cancel-settings');
    clearAllConversationsBtn = document.getElementById('clear-all-conversations');
    memoryModal = document.getElementById('memory-modal');
    memoryBtn = document.getElementById('memory-btn');
    closeMemoryModalBtn = document.getElementById('close-memory');
    cancelMemoryBtn = document.getElementById('cancel-memory');
    renameModal = document.getElementById('rename-modal');
    closeRenameModalBtn = document.getElementById('close-rename');
    cancelRenameBtn = document.getElementById('cancel-rename');
    saveRenameBtn = document.getElementById('save-rename');
    conversationNameInput = document.getElementById('conversation-name');
    exportModal = document.getElementById('export-modal');
    closeExportModalBtn = document.getElementById('close-export');
    copyExportBtn = document.getElementById('copy-export');
    exportContentTextarea = document.getElementById('export-content');
    uploadBtn = document.getElementById('upload-btn');
    fileUploadInput = document.getElementById('file-upload');
    clearInputBtn = document.getElementById('clear-btn');
    summarizeBtn = document.getElementById('summarize-save-btn');
    voiceModeToggleBtn = document.getElementById('voice-mode-toggle-btn');
    themeSelect = document.getElementById('theme-select');
    darkModeToggle = document.getElementById('dark-mode-toggle');
    currentThemeLabel = document.getElementById('current-theme-label');
    exportAllBtn = document.getElementById('export-all-btn');
    importAllBtn = document.getElementById('import-all-btn');
    importFileInput = document.getElementById('import-file-input');
    personasModal = document.getElementById('personaModal');
    personasBtn = document.getElementById('personas-btn');
    closepersonasModalBtn = personasModal ? personasModal.querySelector('.close-modal') : null;
    cancelpersonaBtn = personasModal ? personasModal.querySelector('.cancelBtn') : null;
    personaForm = document.getElementById('personaForm');
    personaNameInput = document.getElementById('personaName');
    personaSystemPromptInput = document.getElementById('systemPrompt');
    personaTempInput = document.getElementById('temperature');
    personaTempValueSpan = document.getElementById('tempVal');
    personaModelInput = document.getElementById('modelSelect');
    model1Select = document.getElementById('model1-select');
    model1FreeFilter = document.getElementById('model1-free-filter');
    deletepersonaBtn = personasModal ? personasModal.querySelector('.delete-persona-btn') : null;
    personaIdInput = document.getElementById('persona-id');

    const userInput = document.getElementById('user-input');
    const chatWindow = document.getElementById('chatWindow');

    if (userInput) {
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Persona badge setup
  const personaBadge = document.getElementById('activePersonaBadge');
  if (personaBadge) {
    personaBadge.addEventListener('click', openpersonasModal);
    await updateActivePersonaBadge();
  }
    // Ensure ALL modals are hidden on startup
    document.querySelectorAll('.modal').forEach(m => {
        m.classList.remove('show');
        m.style.display = 'none';
    });

    const homeTrigger = document.getElementById('sidebar-home-trigger');
    homeTrigger?.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        currentConversationId = null;
        localStorage.removeItem('lastConversationId');
        
        // Hide all conversation highlights
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });

        showWelcomeScreen();

        // Close sidebar on mobile if open
        if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
            toggleSidebar();
        }
    });
    debugLog('DOM Content Loaded. Initializing Vivica...');
    if (window.applyColorTheme) window.applyColorTheme();
    updateCurrentThemeLabel();
    sendBtn.disabled = true;
    if (charCountSpan) charCountSpan.textContent = '0w / 0c';
    addRippleEffects();
    enableAutoResize();
    adjustChatLayout();
    window.addEventListener('resize', adjustChatLayout);
    // Initialize sidebar state
    const storedSidebarState = localStorage.getItem('sidebarState');
    const isMobile = window.innerWidth <= 768;
    const initialSidebarState = isMobile ? false : (storedSidebarState !== 'closed');
    toggleSidebar(initialSidebarState);

    // Make sidebar header clickable to reopen
    const sidebarHeader = document.querySelector('.sidebar-header'); 
    if (sidebarHeader) {
        sidebarHeader.addEventListener('click', () => {
            if (!sidebar.classList.contains('open')) {
                toggleSidebar(true);
            }
        });
    }

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        try {
            // Use a relative path for GitHub Pages compatibility
            const registration = await navigator.serviceWorker.register('./service-worker.js');
            debugLog('Service Worker registered with scope: ' + registration.scope, 'info');
        } catch (error) {
            debugLog('Service Worker registration failed: ' + error, 'error');
        }
    }

    // Set up scroll events
    chatBody.addEventListener('scroll', toggleScrollButton);
    scrollToBottomBtn.addEventListener('click', () => {
      const last = chatBody.lastElementChild;
      last?.scrollIntoView({ behavior: 'smooth' });
    });

    const convSearch = document.getElementById('conversation-search');
    if (convSearch) {
        convSearch.addEventListener('input', () => {
            const term = convSearch.value.toLowerCase();
            document.querySelectorAll('.conversation-item').forEach(item => {
                item.style.display = item.textContent.toLowerCase().includes(term) ? '' : 'none';
            });
        });
    }


    if (themeSelect) {
        themeSelect.addEventListener('change', () => {
            localStorage.setItem('colorTheme', themeSelect.value);
            if (window.applyColorTheme) window.applyColorTheme();
            updateCurrentThemeLabel();
        });
    }

    const personas = await PersonaStorage.getAllPersonas();
    const sorted = personas.sort((a, b) => a.name === 'Vivica' ? -1 : b.name === 'Vivica' ? 1 : 0);
    let activeId = parseInt(localStorage.getItem('activePersonaId'), 10);
    if (!activeId && sorted.length) activeId = sorted.find(p => p.name === 'Vivica')?.id || sorted[0].id;
    const activePersona = activeId ? await PersonaStorage.getPersona(activeId) : sorted[0];
    if (activePersona) {
        currentPersonaId = activePersona.id;
        window.currentPersonaId = activePersona.id;
        setActivePersona(activePersona.id);
    }
  
    // Always show welcome screen on startup - don't load any conversation
    debugLog('Showing welcome screen...');
	await showWelcomeScreen();


    // Initial render of conversations list
    await renderConversationsList();

    // Welcome screen already shown above

    // Voice mode setup
    const settings = await Storage.SettingsStorage.getSettings();
    initVoiceMode({
        onSpeechResult: (text, final) => {
            userInput.value = text;
            if (final) {
                sendMessage();
            }
        },
        onListenStateChange: (state) => {
            voiceModeToggleBtn.classList.toggle('listening', state === 'listening');
            voiceModeToggleBtn.classList.toggle('speaking', state === 'speaking');
            if (voiceModeActive) {
                voiceAnimation.setState(state);
            }
        },
        onVisualizerData: (vol) => {
            if (voiceModeActive) {
                voiceAnimation.updateVolume(vol);
            }
        },
    });
    voiceModeToggleBtn.addEventListener('click', () => {
        voiceModeActive = !voiceModeActive;
        voiceModeToggleBtn.classList.toggle('active', voiceModeActive);
        if (voiceModeActive) {
            voiceAnimation.show();
            voiceAnimation.setState('listening');
            startListening();
        } else {
            voiceAnimation.hide();
            stopListening();
            setProcessingState(false);
        }
    });

    // Event listeners for main UI
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('input', () => {
        sendBtn.disabled = userInput.value.trim().length === 0;
        if (charCountSpan) {
            const chars = userInput.value.length;
            const words = userInput.value.trim().split(/\s+/).filter(Boolean).length;
            charCountSpan.textContent = `${words}w / ${chars}c`;
        }
    });
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent new line
            sendMessage();
        }
    });
    newChatBtn.addEventListener('click', startNewConversation);
    menuToggle.addEventListener('click', toggleSidebar);
    closeSidebarBtn.addEventListener('click', toggleSidebar);

    // Swipe gestures for mobile sidebar
    document.addEventListener('touchstart', (e) => {
        if (sidebar.classList.contains('open') || e.touches[0].clientX < 20) {
            touchStartX = e.touches[0].clientX;
            touchMoved = false;
        }
    });
    document.addEventListener('touchmove', (e) => {
        if (touchStartX === null) return;
        const diff = e.touches[0].clientX - touchStartX;
        if (!sidebar.classList.contains('open') && diff > 50) {
            toggleSidebar();
            touchStartX = null;
        } else if (sidebar.classList.contains('open') && diff < -50) {
            toggleSidebar();
            touchStartX = null;
        }
        touchMoved = true;
    });
    document.addEventListener('touchend', (e) => {
        if (touchStartX === null || touchMoved) {
            touchStartX = null;
            return;
        }
        const diff = e.changedTouches[0].clientX - touchStartX;
        if (!sidebar.classList.contains('open') && diff > 50) {
            toggleSidebar();
        } else if (sidebar.classList.contains('open') && diff < -50) {
            toggleSidebar();
        }
        touchStartX = null;
    });

    // Modal event listeners
    openSettingsBtn.addEventListener('click', openSettingsModal);
    closeSettingsModalBtn.addEventListener('click', () => closeModal(settingsModal));
    cancelSettingsBtn.addEventListener('click', () => closeModal(settingsModal));
    saveSettingsBtn.addEventListener('click', saveSettings);
    clearAllConversationsBtn.addEventListener('click', confirmClearAllConversations);
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
            document.getElementById('theme-toggle-btn')?.click();
            updateCurrentThemeLabel();
        });
    }

    if (personasBtn) personasBtn.addEventListener('click', openpersonasModal);
    if (closepersonasModalBtn) closepersonasModalBtn.addEventListener('click', () => closeModal(personasModal));
    if (cancelpersonaBtn) cancelpersonaBtn.addEventListener('click', () => {
        resetpersonaForm();
        closeModal(personasModal);
    });
    if (personaForm) personaForm.addEventListener('submit', savepersona);
    if (deletepersonaBtn) {
        deletepersonaBtn.addEventListener('click', () => {
            const id = parseInt(personaIdInput?.value || '', 10);
            confirmAndDeletepersona(id);
        });
    }
    
    const summarizeButton = document.getElementById('summarize-btn');
    if (summarizeButton) summarizeButton.addEventListener('click', summarizeAndSaveConversation);
    
    const memoryCloseButtons = document.querySelectorAll('#memory-modal .close-modal');
    if (memoryCloseButtons) {
        memoryCloseButtons.forEach(btn => {
            btn.addEventListener('click', () => closeModal(memoryModal));
        });
    }

    if (cancelMemoryBtn) cancelMemoryBtn.addEventListener('click', () => closeModal(memoryModal));

    personaNameInput?.addEventListener('input', checkpersonaFormValidity);
    personaSystemPromptInput?.addEventListener('input', checkpersonaFormValidity);

    personaTempInput?.addEventListener('input', (e) => {
        if (personaTempValueSpan) {
            personaTempValueSpan.textContent = parseFloat(e.target.value).toFixed(2);
        }
    });

    // Model search and dropdown logic
    const personaModelSearchInput = document.getElementById('persona-model-search');
    const personaModelDropdown = document.getElementById('persona-model-dropdown');
    if (personaModelSearchInput && personaModelDropdown) {
        personaModelSearchInput.addEventListener('focus', () => {
            personaModelDropdown.style.display = 'block';
            const searchTerm = personaModelSearchInput.value.toLowerCase();
            const items = personaModelDropdown.querySelectorAll('.model-dropdown-item');
            if (items) {
                items.forEach(item => {
                    item.style.display = item.textContent.toLowerCase().includes(searchTerm) ? 'block' : 'none';
                });
            }
        });
        personaModelSearchInput.addEventListener('input', () => {
            const searchTerm = personaModelSearchInput.value.toLowerCase();
            const items = personaModelDropdown.querySelectorAll('.model-dropdown-item');
            if (items) {
                items.forEach(item => {
                    item.style.display = item.textContent.toLowerCase().includes(searchTerm) ? 'block' : 'none';
                });
            }
        });
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (target && !personaModelSearchInput.contains(target) && !personaModelDropdown.contains(target)) {
                personaModelDropdown.style.display = 'none';
            }
        });
    }

    if (model1FreeFilter && model1Select) {
        model1FreeFilter.addEventListener('change', () => populateModelSelect(availableModels));
        model1Select.addEventListener('change', (e) => {
            personaModelInput.value = e.target.value;
            const selectedOption = e.target.options[e.target.selectedIndex];
            if (personaModelSelectedSpan) {
                personaModelSelectedSpan.textContent = selectedOption.textContent;
                personaModelSelectedSpan.style.display = 'inline';
            }
            if (personaModelSearchInput) {
                personaModelSearchInput.value = selectedOption.textContent;
            }
        });
    }

    memoryBtn.addEventListener('click', openMemoryModal);
    document.getElementById('summarize-btn')?.addEventListener('click', summarizeAndSaveConversation);

    closeRenameModalBtn.addEventListener('click', () => closeModal(renameModal));
    cancelRenameBtn.addEventListener('click', () => closeModal(renameModal));
    saveRenameBtn.addEventListener('click', saveConversationName);

    closeExportModalBtn.addEventListener('click', () => closeModal(exportModal));
    copyExportBtn.addEventListener('click', copyExportContent);


    // File upload and clear input
    fileUploadInput.addEventListener('change', handleFileUpload);
    clearInputBtn.addEventListener('click', clearUserInput);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.show').forEach(m => closeModal(m));
        }
    });

    summarizeBtn?.addEventListener('click', async () => {
        const convoId = window.currentConversationId;
        if (!convoId) return;
        const messages = await Storage.MessageStorage.getMessagesByConversationId(convoId);
        const transcript = messages.map(m => `${m.sender}: ${m.content}`).join('\n');

        const summaryPrompt = `\nSummarize the following chat as a knowledge memory, with wit and brevity, in 1-2 sentences. \nUser: Dustin.\n---\n${transcript}\n---\nMemory:\n`;

        const settings = await Storage.SettingsStorage.getSettings();
        const apiKey = settings?.apiKey1;
        const persona = window.currentPersona || { model: 'deepseek/deepseek-chat-v3-0324', temperature: 1.0, maxTokens: 64 };

        let summary = '';
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: persona.model,
                    messages: [{ role: 'system', content: summaryPrompt }],
                    temperature: 1.0,
                    max_tokens: 64,
                    stream: false
                })
            });
            const data = await response.json();
            summary = data.choices?.[0]?.message?.content?.trim() || 'Failed to summarize.';
        } catch (e) {
            summary = 'Failed to summarize.';
        }

        await Storage.MemoryStorage.addMemory({
            content: summary,
            tags: ['summary', 'auto'],
            timestamp: Date.now()
        });

        showToast('Conversation summarized & saved!');
    });

    exportAllBtn?.addEventListener('click', async () => {
        const personas = await Storage.PersonaStorage.getAllPersonas();
        const memory = await Storage.MemoryStorage.getAllMemories();
        const conversations = await Storage.ConversationStorage.getAllConversations();
        const messages = [];
        for (const c of conversations) {
            const msgs = await Storage.MessageStorage.getMessagesByConversationId(c.id);
            messages.push(...msgs);
        }
        const settings = await Storage.SettingsStorage.getSettings();

        const exportData = { personas, memory, conversations, messages, settings };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `vivica-backup-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Exported all data!');
    });

    if (importAllBtn && importFileInput) {
        importAllBtn.addEventListener('click', () => {
            importFileInput.click();
        });
    } else {
        console.warn('Import UI elements not found - skipping event listener setup');
    }

    importFileInput?.addEventListener('change', async function() {
        const file = this.files[0];
        if (!file) return;
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            await Storage.PersonaStorage.getAllPersonas().then(list => Promise.all(list.map(x => Storage.PersonaStorage.deletePersona(x.id))));
            await Storage.MemoryStorage.getAllMemories().then(list => Promise.all(list.map(x => Storage.MemoryStorage.deleteMemory(x.id))));
            await Storage.ConversationStorage.clearAllConversations();

            for (const p of data.personas || []) await Storage.PersonaStorage.addPersona(p);
            for (const m of data.memory || []) await Storage.MemoryStorage.addMemory(m);
            for (const c of data.conversations || []) await Storage.ConversationStorage.addConversation(c);
            for (const msg of data.messages || []) await Storage.MessageStorage.addMessage(msg);
            if (data.settings) await Storage.SettingsStorage.saveSettings(data.settings);

            showToast('Imported all data! Reloading...');
            setTimeout(() => location.reload(), 1200);
        } catch (e) {
            showToast('Failed to import!');
        }
    });

    // Initial fetch of models for persona creation
    await fetchOpenRouterModels();
    checkpersonaFormValidity();

    debugLog('Vivica initialization complete.');
});
