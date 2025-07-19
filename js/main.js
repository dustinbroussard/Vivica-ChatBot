// js/main.js
// Code Maniac - Core Application Logic for Vivica Chat App

/**
 * @fileoverview This is the main JavaScript file for the Vivica chat application.
 * It handles all UI interactions, integrates with IndexedDB storage,
 * manages API calls (simulated here), and orchestrates the overall application flow.
 */

import Storage from './storage-wrapper.js';
// Marked is loaded via CDN in index.html, available globally as 'marked'
import { sendToAndroidLog, isAndroidBridgeAvailable } from './android-bridge.js';
import { initVoiceMode, startListening, stopListening, toggleListening, speak, getIsListening, getIsSpeaking, updateVoiceModeConfig } from './voice-mode.js';
import { voiceAnimation } from './voice-animation.js';
import { createParser } from './eventsource-parser.js';

// --- Global Variables and Constants ---
const chatBody = document.getElementById('chat-body');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const conversationsList = document.getElementById('conversations-list');
const profileSelect = document.getElementById('profile-select');
const emptyState = document.getElementById('empty-state');
const typingIndicator = document.getElementById('typing-indicator');
const charCountSpan = document.getElementById('char-count');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const settingsModal = document.getElementById('settingsModal');
const openSettingsBtn = document.getElementById('open-settings');
const closeSettingsModalBtn = settingsModal.querySelector('.close-modal');
const saveSettingsBtn = document.getElementById('save-settings');
const cancelSettingsBtn = document.getElementById('cancel-settings');
const clearAllConversationsBtn = document.getElementById('clear-all-conversations');
const profilesModal = document.getElementById('profiles-modal');
const profilesBtn = document.getElementById('profiles-btn');
const closeProfilesModalBtn = profilesModal.querySelector('.close-modal');
const memoryModal = document.getElementById('memory-modal');
const memoryBtn = document.getElementById('memory-btn');
const renameModal = document.getElementById('rename-modal');
const closeRenameModalBtn = document.getElementById('close-rename');
const cancelRenameBtn = document.getElementById('cancel-rename');
const saveRenameBtn = document.getElementById('save-rename');
const conversationNameInput = document.getElementById('conversation-name');
const exportModal = document.getElementById('export-modal');
const closeExportModalBtn = document.getElementById('close-export');
const copyExportBtn = document.getElementById('copy-export');
const exportContentTextarea = document.getElementById('export-content');
const uploadBtn = document.getElementById('upload-btn');
const fileUploadInput = document.getElementById('file-upload');
const clearInputBtn = document.getElementById('clear-btn');
const voiceModeToggleBtn = document.getElementById('voice-mode-toggle-btn');
const themeSelect = document.getElementById('theme-select');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const currentThemeLabel = document.getElementById('current-theme-label');
const summarizeBtn = document.getElementById('summarize-save-btn');

// Mobile touch variables for sidebar swipe
let touchStartX = null;
let touchMoved = false;

// Profile form elements
const profileForm = document.getElementById('profile-form');
const profileIdInput = document.getElementById('profile-id');
const profileNameInput = document.getElementById('profile-name');
const profileModelSearchInput = document.getElementById('profile-model-search');
const profileModelDropdown = document.getElementById('profile-model-dropdown');
const profileModelInput = document.getElementById('profile-model'); // Hidden input for selected model ID
const profileModelSelectedSpan = document.getElementById('profile-model-selected');
const profileSystemPromptInput = document.getElementById('profile-system-prompt');
const profileTempInput = document.getElementById('profile-temp');
const profileTempValueSpan = document.getElementById('profile-temp-value');
const profileMaxTokensInput = document.getElementById('profile-max-tokens');
const profileMaxContextInput = document.getElementById('profile-max-context');
const saveProfileBtn = document.getElementById('save-profile-btn');
const cancelProfileBtn = document.getElementById('cancel-profile-btn');
const deleteProfileBtn = document.getElementById('delete-profile-btn');
const profilesListDiv = document.getElementById('profiles-list');
const model1Select = document.getElementById('model1-select');
const model1FreeFilter = document.getElementById('model1-free-filter');

let currentConversationId = null;
let currentProfileId = null; // ID of the currently active AI profile
let availableModels = []; // To store fetched AI models
let voiceModeActive = false;

function checkProfileFormValidity() {
    const valid = profileNameInput.value.trim() && profileSystemPromptInput.value.trim();
    saveProfileBtn.disabled = !valid;
}

// --- Utility Functions ---

/**
 * Displays a toast notification.
 * @param {string} message - The message to display.
 * @param {'success'|'error'|'info'} type - The type of toast.
 * @param {number} duration - How long the toast should be visible in ms.
 */
function showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toast-container') || (() => {
        const div = document.createElement('div');
        div.id = 'toast-container';
        document.body.appendChild(div);
        return div;
    })();

    const toast = document.createElement('div');
    toast.className = 'toast'; // Adding a class for styling
    toast.textContent = message;
    toastContainer.appendChild(toast);

    // Force reflow to enable transition
    void toast.offsetWidth;

    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

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
    if (currentProfileId) {
        memories = memories.filter(m => !m.profileId || m.profileId === currentProfileId);
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

function applyChatProfile(profile) {
    currentProfileId = profile.id;
}

function setActiveProfile(profile) {
    localStorage.setItem('activeProfileId', profile.id);
    window.currentProfile = profile;
    applyChatProfile(profile);
    updateVoiceModeConfig({
        model: profile.model,
        systemPrompt: profile.systemPrompt,
        temperature: profile.temperature,
        memoryMode: profile.memoryMode
    });
}

async function buildFullPrompt(userInput) {
    const profile = window.currentProfile || {};
    let memoryText = '';
    if (profile.memoryMode !== 'off') {
        const allMemory = await Storage.MemoryStorage.getAllMemories();
        const relevant = allMemory.filter(m =>
            (m.tags && (m.tags.includes('identity') || m.tags.includes('instruction') || m.tags.includes('personality'))) || m.pinned === true
        );
        memoryText = relevant.map(m => m.content).join('\n');
    }
    return `${profile.systemPrompt || ''}\n\n### Memory Context:\n${memoryText}\n\n### User Message:\n${userInput}`;
}

/**
 * Opens a modal.
 * @param {HTMLElement} modalElement - The modal DOM element.
 */
function openModal(modalElement) {
    modalElement.style.display = 'flex';
    modalElement.classList.add('show');
    // Add a class to body to prevent scrolling
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

function populateProfileDropdown(selectEl, profiles, activeId) {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    profiles.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        selectEl.appendChild(opt);
    });
    if (activeId) selectEl.value = activeId;
}

/**
 * Toggles the sidebar open/close state.
 */
function toggleSidebar() {
    sidebar.classList.toggle('open');
    document.querySelector('.main-container').classList.toggle('sidebar-open');
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
  toggleScrollButton();
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
function showTypingIndicator(show) {
    typingIndicator.style.display = show ? 'flex' : 'none';
    if (show) {
        scrollChatToBottom();
    }
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
        convItem.innerHTML = `<div class="conv-title">${conv.title || 'New Chat'}</div><div class="conv-snippet">${snippet}</div><div class="conv-time">${time}</div>`;

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
    currentProfileId = conversation?.profileId || null; // Set current profile based on conversation

    const messages = await Storage.MessageStorage.getMessagesByConversationId(conversationId);
    messages.forEach(msg => renderMessage(msg));

    scrollChatToBottom(false);
    toggleSidebar(); // Close sidebar on mobile after selection
}

/**
 * Starts a new conversation.
 */
async function startNewConversation() {
    debugLog('Starting new conversation...');
    const newConversation = {
        title: 'New Chat',
        timestamp: Date.now(),
        profileId: currentProfileId // Associate with current profile if any
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

        showTypingIndicator(true);
        const fullPrompt = await buildFullPrompt(content);
        await getAIResponse(fullPrompt);
    } catch (error) {
        debugLog(`Error sending message: ${error.message}`, 'error');
        showToast('Failed to send message.', 'error');
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

async function fetchWeather(apiKey, city = 'London') {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather fetch failed');
    const data = await res.json();
    return `${data.weather[0].description}, ${data.main.temp}°C`;
}

async function fetchRSSSummaries(urls) {
    const parser = new DOMParser();
    const summaries = [];
    for (const url of urls) {
        try {
            const resp = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
            const data = await resp.json();
            const doc = parser.parseFromString(data.contents, 'text/xml');
            const item = doc.querySelector('item');
            if (item) summaries.push(item.querySelector('title').textContent.trim());
        } catch (err) {
            console.error('RSS fetch error', err);
        }
    }
    return summaries.join('; ');
}

async function buildSystemPrompt(basePrompt) {
    let prompt = basePrompt || '';
    const settings = await Storage.SettingsStorage.getSettings();
    if (settings?.includeWeather && settings.weatherApiKey) {
        try {
            const weather = await fetchWeather(settings.weatherApiKey, settings.weatherLocation || 'London');
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

        if (!apiKey) {
            showToast('OpenRouter API Key is not set in settings.', 'error', 5000);
            debugLog('OpenRouter API Key missing.', 'error');
            return;
        }

        const profile = window.currentProfile || (currentProfileId ? await Storage.ProfileStorage.getProfile(currentProfileId) : null);

        // Use default values if no profile or profile values are missing
        const model = profile?.model || 'mistralai/mistral-7b-instruct'; // Default model
        const systemPrompt = '';
        const temperature = profile?.temperature !== undefined ? profile.temperature : 0.7;
        const maxTokens = profile?.maxTokens || 2000;
        const maxContext = profile?.maxContext || 20; // Number of previous messages to include

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


        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
                'HTTP-Referer': window.location.origin, // Important for OpenRouter
                'X-Title': 'Vivica Chat App' // Optional: for OpenRouter dashboard
            },
            body: JSON.stringify({
                model: model,
                messages: relevantMessages,
                temperature: temperature,
                max_tokens: maxTokens,
                stream: true // Request streaming response
            })
        });

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
        }
        debugLog('AI response fully streamed and saved.');
        if (voiceModeActive) {
            speak(currentContent).catch(err => debugLog('TTS error: ' + err, 'error'));
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
        showTypingIndicator(false);
        // Re-apply Prism.js highlighting after final content is rendered
        Prism.highlightAllUnder(chatBody);
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
    if (!currentConversationId) {
        showToast('No active conversation to summarize.', 'info');
        return;
    }

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

    const profile = window.currentProfile || (currentProfileId ? await Storage.ProfileStorage.getProfile(currentProfileId) : null);
    if (!profile) {
        showToast('No active profile found.', 'error');
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
            model: profile.model || 'mistralai/mistral-7b-instruct',
            messages: [{ role: 'system', content: summaryPrompt }, ...chatHistory],
            temperature: profile.temperature ?? 0.7,
            max_tokens: Math.min(profile.maxTokens || 500, 800),
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
        profileId: profile.id,
        timestamp: Date.now()
    });

    showToast('Conversation summarized and saved!', 'success');
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
        document.getElementById('api-key-1').value = settings.apiKey1 || '';
        document.getElementById('api-key-2').value = settings.apiKey2 || '';
        document.getElementById('api-key-3').value = settings.apiKey3 || '';
        document.getElementById('google-tts-key').value = settings.googleTtsKey || '';
        document.getElementById('weather-api-key').value = settings.weatherApiKey || '';
        document.getElementById('weather-location').value = settings.weatherLocation || '';
        document.getElementById('rss-feeds').value = settings.rssFeeds || '';
        document.getElementById('include-weather').checked = settings.includeWeather || false;
        document.getElementById('include-rss').checked = settings.includeRss || false;
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
    const settings = {
        apiKey1: document.getElementById('api-key-1').value,
        apiKey2: document.getElementById('api-key-2').value,
        apiKey3: document.getElementById('api-key-3').value,
        googleTtsKey: document.getElementById('google-tts-key').value,
        weatherApiKey: document.getElementById('weather-api-key').value,
        weatherLocation: document.getElementById('weather-location').value,
        rssFeeds: document.getElementById('rss-feeds').value,
        includeWeather: document.getElementById('include-weather').checked,
        includeRss: document.getElementById('include-rss').checked
    };
    if (themeSelect) {
        localStorage.setItem('colorTheme', themeSelect.value);
        const suffix = localStorage.getItem('theme') !== 'light' ? 'dark' : 'light';
        document.getElementById('logo-img').src = `images/logo-${themeSelect.value}${suffix}.png`;
        if (window.applyColorTheme) window.applyColorTheme();
        updateCurrentThemeLabel();
    }
    try {
        // Settings are stored in the 'memory' store with a fixed key
        await Storage.SettingsStorage.saveSettings(settings);
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
 * Opens the profiles modal.
 */
async function openProfilesModal() {
    debugLog('Opening profiles modal...');
    openModal(profilesModal);
    await renderProfilesList();
    await fetchOpenRouterModels();
    // Reset profile form when opening modal
    resetProfileForm();
}

/**
 * Fetches available AI models from OpenRouter.
 */
async function fetchOpenRouterModels() {
    debugLog('Fetching available AI models from OpenRouter...');
    try {
        const models = await fetchAvailableModels();
        availableModels = models;
        populateModelDropdown(availableModels);
        populateModelSelect(availableModels);
        if (profileModelInput.value) {
            model1Select.value = profileModelInput.value;
        }
    } catch (error) {
        debugLog(`Error fetching models: ${error.message}`, 'error');
        showToast('Failed to load AI models.', 'error');
    }
}

/**
 * Populates the model dropdown for profile editing.
 * @param {Array<object>} models - Array of model objects.
 */
function populateModelDropdown(models) {
    profileModelDropdown.innerHTML = '';
    models.forEach(model => {
        const item = document.createElement('div');
        item.classList.add('model-dropdown-item');
        const isFree = model.pricing?.prompt === 0;
        item.textContent = model.id + (isFree ? ' (Free)' : '');
        item.dataset.modelId = model.id;
        item.addEventListener('click', () => {
            profileModelInput.value = model.id;
            profileModelSelectedSpan.textContent = model.id;
            profileModelSelectedSpan.style.display = 'inline';
            profileModelSearchInput.value = model.id; // Update search input
            profileModelDropdown.style.display = 'none';
        });
        profileModelDropdown.appendChild(item);
    });
}

/**
 * Populates the model select element for profile editing.
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
 * Renders the list of AI profiles.
 */
async function renderProfilesList() {
    profilesListDiv.innerHTML = '';
    const profiles = await Storage.ProfileStorage.getAllProfiles();

    if (profiles.length === 0) {
        profilesListDiv.innerHTML = '<p style="text-align:center;color:var(--text-muted);">No AI profiles created yet.</p>';
        return;
    }

    profiles.forEach(profile => {
        const profileCard = document.createElement('div');
        profileCard.classList.add('custom-model-item');
        profileCard.innerHTML = `
            <div class="profile-info">
                <strong>${profile.name}</strong>
                <span class="model-name">${profile.modelName || profile.model}</span>
                ${profile.id === currentProfileId ? '<span class="active-profile-badge">Active</span>' : ''}
            </div>
            <div class="profile-actions">
                <button class="set-active-profile-btn" data-profile-id="${profile.id}" title="Set as Active"><i class="fas fa-check"></i></button>
                <button class="edit-profile-btn" data-profile-id="${profile.id}"><i class="fas fa-edit"></i></button>
                <button class="delete-profile-btn" data-profile-id="${profile.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;
        profilesListDiv.appendChild(profileCard);
    });

    // Add event listeners for edit, delete, and set-active buttons
    profilesListDiv.querySelectorAll('.edit-profile-btn').forEach(btn => {
        btn.addEventListener('click', (e) => editProfile(parseInt(e.currentTarget.dataset.profileId)));
    });
    profilesListDiv.querySelectorAll('.delete-profile-btn').forEach(btn => {
        btn.addEventListener('click', (e) => confirmAndDeleteProfile(parseInt(e.currentTarget.dataset.profileId)));
    });
    profilesListDiv.querySelectorAll('.set-active-profile-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            try {
                e.stopPropagation();
                const pid = parseInt(e.currentTarget.dataset.profileId);
                currentProfileId = pid;
                    
                // Update current conversation to use this profile if exists
                if (currentConversationId) {
                    const conv = await Storage.ConversationStorage.getConversation(currentConversationId);
                    if (conv) {
                        conv.profileId = currentProfileId;
                        await Storage.ConversationStorage.updateConversation(conv);
                    }
                }
                    
                // Get profile name from card
                const profileName = e.currentTarget.closest('.custom-model-item').querySelector('.profile-info strong').textContent;
                
                // Disable all set-active buttons during update
                profilesListDiv.querySelectorAll('.set-active-profile-btn').forEach(btn => {
                    btn.disabled = true;
                });
                    
                showToast(`Profile "${profileName}" activated!`, 'success');
                await renderProfilesList(); // Refresh badges
                    
                // Re-enable buttons after UI update
                document.querySelectorAll('.set-active-profile-btn').forEach(btn => {
                    btn.disabled = false;
                });
            } catch (error) {
                console.error('Error setting active profile:', error);
                showToast('Failed to activate profile', 'error');
            }
        });
    });
}

/**
 * Resets the profile form.
 */
function resetProfileForm() {
    profileIdInput.value = '';
    profileNameInput.value = '';
    profileModelSearchInput.value = '';
    profileModelInput.value = '';
    profileModelSelectedSpan.textContent = '';
    profileModelSelectedSpan.style.display = 'none';
    profileSystemPromptInput.value = '';
    profileTempInput.value = '0.7';
    profileTempValueSpan.textContent = '0.7';
    profileMaxTokensInput.value = '2000';
    profileMaxContextInput.value = '20';
    saveProfileBtn.textContent = 'Save Profile';
    saveProfileBtn.innerHTML = '<i class="fas fa-save"></i> Save Profile';
    deleteProfileBtn.style.display = 'none';
    profileModelDropdown.style.display = 'none'; // Hide dropdown
    model1Select.value = ''; // Reset select
    model1FreeFilter.checked = false; // Reset filter
    populateModelSelect(availableModels); // Repopulate select
    checkProfileFormValidity();
}

/**
 * Edits an existing profile.
 * @param {number} profileId - The ID of the profile to edit.
 */
async function editProfile(profileId) {
    debugLog(`Editing profile ID: ${profileId}`);
    const profile = await Storage.ProfileStorage.getProfile(profileId);
    if (profile) {
        profileIdInput.value = profile.id;
        profileNameInput.value = profile.name;
        profileModelInput.value = profile.model;
        profileModelSearchInput.value = profile.modelName || profile.model; // Show friendly name
        profileModelSelectedSpan.textContent = profile.modelName || profile.model;
        profileModelSelectedSpan.style.display = 'inline';
        profileSystemPromptInput.value = profile.systemPrompt;
        profileTempInput.value = profile.temperature;
        profileTempValueSpan.textContent = profile.temperature;
        profileMaxTokensInput.value = profile.maxTokens;
        profileMaxContextInput.value = profile.maxContext;
        saveProfileBtn.textContent = 'Update Profile';
        saveProfileBtn.innerHTML = '<i class="fas fa-save"></i> Update Profile';
        deleteProfileBtn.style.display = 'inline-block'; // Show delete button
        model1Select.value = profile.model; // Set the select value too
    }
    checkProfileFormValidity();
}

/**
 * Saves a new or updated AI profile.
 */
async function saveProfile(event) {
    event.preventDefault();
    debugLog('Saving profile...');
    const profile = {
        name: profileNameInput.value.trim(),
        model: profileModelInput.value.trim(),
        modelName: profileModelSelectedSpan.textContent.trim() || profileModelSearchInput.value.trim(),
        systemPrompt: profileSystemPromptInput.value.trim(),
        temperature: parseFloat(profileTempInput.value),
        maxTokens: parseInt(profileMaxTokensInput.value),
        maxContext: parseInt(profileMaxContextInput.value)
    };
    if (profileIdInput.value) {
        profile.id = parseInt(profileIdInput.value, 10);
    }

    if (!profile.name || !profile.systemPrompt) {
        showToast('Profile name and system prompt are required.', 'error');
        checkProfileFormValidity();
        return;
    }

    try {
        if (profile.id) {
            await Storage.ProfileStorage.updateProfile(profile);
            showToast('Profile updated!', 'success');
        } else {
            const newId = await Storage.ProfileStorage.addProfile(profile);
            profile.id = newId; // Assign the new ID
            showToast('Profile added!', 'success');
        }
        await renderProfilesList();
        resetProfileForm();
        // Set this new/updated profile as the current active one if no conversation is active
        if (!currentConversationId) { // Only set if no conversation is active
            currentProfileId = profile.id;
            // Optionally update the current conversation to use this profile
            // if (currentConversationId) {
            //     const conv = await Storage.ConversationStorage.getConversation(currentConversationId);
            //     if (conv) {
            //         conv.profileId = currentProfileId;
            //         await Storage.ConversationStorage.updateConversation(conv);
            //     }
            // }
        }
    } catch (error) {
        debugLog(`Error saving profile: ${error.message}`, 'error');
        showToast('Failed to save profile.', 'error');
    }
}

/**
 * Confirms and deletes an AI profile.
 * @param {number} profileId - The ID of the profile to delete.
 */
function confirmAndDeleteProfile(profileId) {
    Storage.ProfileStorage.getAllProfiles().then(list => {
        if (list.length <= 1) {
            showToast('Cannot delete the last remaining profile.', 'error');
            return;
        }
        const isConfirmed = window.confirm('Are you sure you want to delete this AI profile?');
        if (!isConfirmed) return;
        Storage.ProfileStorage.deleteProfile(profileId)
            .then(() => {
                showToast('Profile deleted!', 'success');
                renderProfilesList();
                resetProfileForm();
                if (currentProfileId === profileId) {
                    currentProfileId = null;
                }
            })
            .catch(error => {
                debugLog(`Error deleting profile: ${error.message}`, 'error');
                showToast('Failed to delete profile.', 'error');
            });
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
    debugLog('DOM Content Loaded. Initializing Vivica...');
    if (window.applyColorTheme) window.applyColorTheme();
    updateCurrentThemeLabel();
    sendBtn.disabled = true;
    if (charCountSpan) charCountSpan.textContent = '0w / 0c';
    addRippleEffects();
    enableAutoResize();
    adjustChatLayout();
    window.addEventListener('resize', adjustChatLayout);
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
        document.querySelector('.main-container').classList.remove('sidebar-open');
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

    const profiles = await Storage.ProfileStorage.getAllProfiles();
    let activeId = parseInt(localStorage.getItem('activeProfileId'), 10);
    if (!activeId && profiles.length) activeId = profiles[0].id;
    const activeProfile = activeId ? await Storage.ProfileStorage.getProfile(activeId) : profiles[0];
    if (activeProfile) setActiveProfile(activeProfile);
    populateProfileDropdown(profileSelect, profiles, activeProfile?.id);
    if (voiceAnimation.profileSelect) {
        populateProfileDropdown(voiceAnimation.profileSelect, profiles, activeProfile?.id);
        voiceAnimation.profileSelect.addEventListener('change', async (e) => {
            const p = await Storage.ProfileStorage.getProfile(parseInt(e.target.value));
            setActiveProfile(p);
            profileSelect.value = p.id;
            showToast(`Profile switched to ${p.name}`, 'info');
        });
    }
    profileSelect.addEventListener('change', async (e) => {
        const p = await Storage.ProfileStorage.getProfile(parseInt(e.target.value));
        setActiveProfile(p);
        if (voiceAnimation.profileSelect) voiceAnimation.profileSelect.value = p.id;
        showToast(`Profile switched to ${p.name}`, 'info');
    });

    // Initial render of conversations list
    await renderConversationsList();

    // Always show the welcome screen on startup
    emptyState.style.display = 'flex';

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
        useGoogleTTS: settings?.googleTtsKey ? true : false,
        googleApiKey: settings?.googleTtsKey || ''
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

    profilesBtn.addEventListener('click', openProfilesModal);
    closeProfilesModalBtn.addEventListener('click', () => closeModal(profilesModal));
    cancelProfileBtn.addEventListener('click', () => {
        resetProfileForm();
        closeModal(profilesModal);
    });
    profileForm.addEventListener('submit', saveProfile);
    deleteProfileBtn.addEventListener('click', (e) => confirmAndDeleteProfile(parseInt(profileIdInput.value)));

    profileNameInput.addEventListener('input', checkProfileFormValidity);
    profileSystemPromptInput.addEventListener('input', checkProfileFormValidity);

    profileTempInput.addEventListener('input', (e) => {
        profileTempValueSpan.textContent = parseFloat(e.target.value).toFixed(2);
    });

    // Model search and dropdown logic
    profileModelSearchInput.addEventListener('focus', () => {
        profileModelDropdown.style.display = 'block';
        // Filter dropdown based on current search input
        const searchTerm = profileModelSearchInput.value.toLowerCase();
        profileModelDropdown.querySelectorAll('.model-dropdown-item').forEach(item => {
            item.style.display = item.textContent.toLowerCase().includes(searchTerm) ? 'block' : 'none';
        });
    });
    profileModelSearchInput.addEventListener('input', () => {
        const searchTerm = profileModelSearchInput.value.toLowerCase();
        profileModelDropdown.querySelectorAll('.model-dropdown-item').forEach(item => {
            item.style.display = item.textContent.toLowerCase().includes(searchTerm) ? 'block' : 'none';
        });
    });
    // Hide dropdown when clicking outside (simple approach)
    document.addEventListener('click', (e) => {
        if (!profileModelSearchInput.contains(e.target) && !profileModelDropdown.contains(e.target)) {
            profileModelDropdown.style.display = 'none';
        }
    });

    // Model select and filter logic
    model1FreeFilter.addEventListener('change', () => populateModelSelect(availableModels));
    model1Select.addEventListener('change', (e) => {
        profileModelInput.value = e.target.value;
        const selectedOption = e.target.options[e.target.selectedIndex];
        profileModelSelectedSpan.textContent = selectedOption.textContent;
        profileModelSelectedSpan.style.display = 'inline';
        profileModelSearchInput.value = selectedOption.textContent;
    });

    memoryBtn.addEventListener('click', openMemoryModal);
    summarizeBtn.addEventListener('click', summarizeAndSaveConversation);

    closeRenameModalBtn.addEventListener('click', () => closeModal(renameModal));
    cancelRenameBtn.addEventListener('click', () => closeModal(renameModal));
    saveRenameBtn.addEventListener('click', saveConversationName);

    closeExportModalBtn.addEventListener('click', () => closeModal(exportModal));
    copyExportBtn.addEventListener('click', copyExportContent);
    summarizeBtn.addEventListener('click', summarizeAndSaveConversation);

    // File upload and clear input
    fileUploadInput.addEventListener('change', handleFileUpload);
    clearInputBtn.addEventListener('click', clearUserInput);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.show').forEach(m => closeModal(m));
        }
    });

    // Initial fetch of models for profile creation
    await fetchOpenRouterModels();
    checkProfileFormValidity();

    debugLog('Vivica initialization complete.');
});
