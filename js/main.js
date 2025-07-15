// js/main.js
// Code Maniac - Core Application Logic for Vivica Chat App

/**
 * @fileoverview This is the main JavaScript file for the Vivica chat application.
 * It handles all UI interactions, integrates with IndexedDB storage,
 * manages API calls (simulated here), and orchestrates the overall application flow.
 */

import Storage from './storage-wrapper.js';
import { sendToAndroidLog, isAndroidBridgeAvailable } from './android-bridge.js';
import { openDB } from './db-utils.js';
import { initVoiceMode, startListening, stopListening, toggleListening, speak, getIsListening, getIsSpeaking, updateVoiceModeConfig } from './voice-mode.js';
import { initVoiceMode, startListening, stopListening, toggleListening, speak, getIsListening, getIsSpeaking, updateVoiceModeConfig } from './voice-mode.js';

// --- Global Variables and Constants ---
const chatBody = document.getElementById('chat-body');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const conversationsList = document.getElementById('conversations-list');
const currentConversationTitle = document.getElementById('current-conversation-title');
const emptyState = document.getElementById('empty-state');
const typingIndicator = document.getElementById('typing-indicator');
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
const closeMemoryModalBtn = memoryModal.querySelector('.close-modal');
const saveMemoryBtn = document.getElementById('save-memory-btn');
const cancelMemoryBtn = document.getElementById('cancel-memory');
const memoryContentInput = document.getElementById('memory-content');
const memoryTagsInput = document.getElementById('memory-tags');
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
    toast.className = ;
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

/**
 * Logs messages to a debug div.
 * @param {string} message - The message to log.
 * @param {string} level - Log level (e.g., 'info', 'warn', 'error').
 */
function debugLog(message, level = 'info') {
    const logDiv = document.getElementById('log');
    if (logDiv) {
        const p = document.createElement('p');
        p.textContent = ;
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
    modalElement.style.display = 'block';
    // Add a class to body to prevent scrolling
    document.body.classList.add('modal-open');
}

/**
 * Closes a modal.
 * @param {HTMLElement} modalElement - The modal DOM element.
 */
function closeModal(modalElement) {
    modalElement.style.display = 'none';
    document.body.classList.remove('modal-open');
}

/**
 * Toggles the sidebar open/close state.
 */
function toggleSidebar() {
    sidebar.classList.toggle('open');
    document.querySelector('.main-container').classList.toggle('sidebar-open');
}

/**
 * Renders a message bubble in the chat.
 * @param {object} message - The message object {id, conversationId, sender, content, timestamp}.
 * @param {boolean} isNew - True if this is a new message being added, for scrolling.
 */
function renderMessage(message, isNew = false) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', message.sender);
    messageElement.dataset.messageId = message.id;

    const avatar = document.createElement('div');
    avatar.classList.add('message-avatar');
    avatar.textContent = message.sender === 'user' ? 'You' : 'AI';

    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('message-content');

    const bubble = document.createElement('div');
    bubble.classList.add('message-bubble');

    // Use marked.js for Markdown rendering
    bubble.innerHTML = marked.parse(message.content);

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
        chatBody.scrollTop = chatBody.scrollHeight;
    }
    
    // Apply Prism.js highlighting to any code blocks
    Prism.highlightAllUnder(bubble);
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
        chatBody.scrollTop = chatBody.scrollHeight; // Scroll to bottom when AI starts typing
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

    conversations.forEach(conv => {
        const convItem = document.createElement('button');
        convItem.classList.add('conversation-item');
        if (conv.id === currentConversationId) {
            convItem.classList.add('active');
        }
        convItem.dataset.conversationId = conv.id;
        convItem.textContent = conv.title || ; // Default title

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
    });
}

/**
 * Loads a conversation into the chat interface.
 * @param {number} conversationId - The ID of the conversation to load.
 */
async function loadConversation(conversationId) {
    debugLog();
    currentConversationId = conversationId;
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
    currentConversationTitle.textContent = conversation?.title || ;
    currentProfileId = conversation?.profileId || null; // Set current profile based on conversation

    const messages = await Storage.MessageStorage.getMessagesByConversationId(conversationId);
    messages.forEach(msg => renderMessage(msg));

    chatBody.scrollTop = chatBody.scrollHeight; // Scroll to bottom
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
    await loadConversation(id);
    userInput.value = ''; // Clear input field
    userInput.focus();
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
        await Storage.MessageStorage.addMessage(userMessage);
        renderMessage(userMessage, true);
        userInput.value = ''; // Clear input after sending
        userInput.style.height = 'auto'; // Reset textarea height

        showTypingIndicator(true);
        // Call the real AI response function
        await getAIResponse(content);
    } catch (error) {
        debugLog(, 'error');
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

        let profile = null;
        if (currentProfileId) {
            profile = await Storage.ProfileStorage.getProfile(currentProfileId);
        }

        // Use default values if no profile or profile values are missing
        const model = profile?.model || 'mistralai/mistral-7b-instruct'; // Default model
        const systemPrompt = profile?.systemPrompt || 'You are a helpful AI assistant.';
        const temperature = profile?.temperature !== undefined ? profile.temperature : 0.7;
        const maxTokens = profile?.maxTokens || 2000;
        const maxContext = profile?.maxContext || 20; // Number of previous messages to include

        const chatHistory = await getChatHistory();

        // Add system prompt to the beginning of the messages if it exists
        const messages = [{ role: 'system', content: systemPrompt }, ...chatHistory];

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
                'Authorization': ,
                'Content-Type': 'application/json',
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
            throw new Error();
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        // Create an initial AI message bubble to stream into
        const initialAiMessage = {
            conversationId: currentConversationId,
            sender: 'ai',
            content: '', // Start empty
            timestamp: Date.now()
        };
        aiMessageId = await Storage.MessageStorage.addMessage(initialAiMessage);
        renderMessage(initialAiMessage, true); // Render empty bubble

        // Get the DOM element for the AI message to update its content directly
        const aiMessageElement = chatBody.querySelector(`[data-message-id="${aiMessageId}"] .message-bubble`);
        let currentContent = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process each line, as chunks might contain multiple lines or partial lines
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep the last (possibly incomplete) line in the buffer

            for (const line of lines) {
                if (line.trim() === '') continue;
                if (line.startsWith('data:')) {
                    const jsonStr = line.substring(5).trim();
                    if (jsonStr === '[DONE]') {
                        debugLog('OpenRouter stream done.');
                        break;
                    }
                    try {
                        const data = JSON.parse(jsonStr);
                        const delta = data.choices[0]?.delta?.content || '';
                        if (delta) {
                            currentContent += delta;
                            // Update the content in the DOM
                            aiMessageElement.innerHTML = marked.parse(currentContent);
                            // Keep scrolling to bottom as content arrives
                            chatBody.scrollTop = chatBody.scrollHeight;
                        }
                    } catch (parseError) {
                        debugLog(`Error parsing JSON from stream: ${parseError.message}. Line: ${jsonStr}`, 'error');
                    }
                }
            }
        }

        // Final update to the stored message
        const finalAiMessage = {
            id: aiMessageId,
            conversationId: currentConversationId,
            sender: 'ai',
            content: currentContent,
            timestamp: initialAiMessage.timestamp // Keep original timestamp
        };
        await Storage.MessageStorage.update(finalAiMessage); // Use update directly from db-utils
        debugLog('AI response fully streamed and saved.');

    } catch (error) {
        debugLog(, 'error');
        showToast(, 'error', 7000);
        // If an error occurred and an AI message was started, update it to show the error
        if (aiMessageId && currentConversationId) {
             const errorMsg = {
                 id: aiMessageId,
                 conversationId: currentConversationId,
                 sender: 'ai',
                 content: ,
                 timestamp: Date.now()
             };
             await Storage.MessageStorage.update(errorMsg);
             const aiMessageElement = chatBody.querySelector(`[data-message-id="${aiMessageId}"] .message-bubble`);
             if (aiMessageElement) {
                 aiMessageElement.innerHTML = marked.parse(errorMsg.content);
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

    debugLog();

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
        userInput.value = ; // Truncate for display
        userInput.focus();
        // Potentially send the file content to AI here
        showToast(, 'info');
        fileUploadInput.value = ''; // Clear the input for next upload
    };
    reader.onerror = (e) => {
        debugLog(, 'error');
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
    }
}

/**
 * Saves settings.
 */
async function saveSettings() {
    debugLog('Saving settings...');
    const settings = {
        apiKey1: document.getElementById('api-key-1').value,
        apiKey2: document.getElementById('api-key-2').value,
        apiKey3: document.getElementById('api-key-3').value
    };
    try {
        // Settings are stored in the 'memory' store with a fixed key
        await Storage.SettingsStorage.saveSettings(settings);
        showToast('Settings saved!', 'success');
        closeModal(settingsModal);
    } catch (error) {
        debugLog(, 'error');
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
                currentConversationTitle.textContent = 'Vivica'; // Reset header title
                closeModal(settingsModal);
            })
            .catch(error => {
                debugLog(, 'error');
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
    await fetchAvailableModels();
    // Reset profile form when opening modal
    resetProfileForm();
}

/**
 * Fetches available AI models (simulated).
 */
async function fetchAvailableModels() {
    debugLog('Fetching available AI models...');
    // Simulate API call to get models
    availableModels = [
        { id: 'google/gemini-pro', name: 'Google Gemini Pro', free: true }, // Changed to a free model for default
        { id: 'mistralai/mistral-7b-instruct', name: 'Mistral 7B Instruct', free: true },
        { id: 'mistralai/mixtral-8x7b-instruct', name: 'Mixtral 8x7B Instruct', free: true },
        { id: 'openai/gpt-3.5-turbo', name: 'OpenAI GPT-3.5 Turbo', free: false },
        { id: 'openai/gpt-4o', name: 'OpenAI GPT-4o', free: false },
        { id: 'anthropic/claude-3-opus', name: 'Anthropic Claude 3 Opus', free: false },
        { id: 'anthropic/claude-3-sonnet', name: 'Anthropic Claude 3 Sonnet', free: false },
        { id: 'meta-llama/llama-3-8b-instruct', name: 'Llama 3 8B Instruct', free: true },
        { id: 'nousresearch/nous-hermes-2-mixtral-8x7b-dpo', name: 'Nous Hermes 2 Mixtral', free: true }
    ];

    populateModelDropdown(availableModels);
    populateModelSelect(availableModels);
    model1Select.value = profileModelInput.value; // Set selected value if editing
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
        item.textContent = model.name + (model.free ? ' (Free)' : '');
        item.dataset.modelId = model.id;
        item.addEventListener('click', () => {
            profileModelInput.value = model.id;
            profileModelSelectedSpan.textContent = model.name;
            profileModelSelectedSpan.style.display = 'inline';
            profileModelSearchInput.value = model.name; // Update search input
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
        filteredModels = models.filter(model => model.free);
    }
    filteredModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name + (model.free ? ' (Free)' : '');
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
        profileCard.innerHTML = ;
        profilesListDiv.appendChild(profileCard);
    });

    // Add event listeners for edit and delete buttons
    profilesListDiv.querySelectorAll('.edit-profile-btn').forEach(btn => {
        btn.addEventListener('click', (e) => editProfile(parseInt(e.currentTarget.dataset.profileId)));
    });
    profilesListDiv.querySelectorAll('.delete-profile-btn').forEach(btn => {
        btn.addEventListener('click', (e) => confirmAndDeleteProfile(parseInt(e.currentTarget.dataset.profileId)));
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
}

/**
 * Edits an existing profile.
 * @param {number} profileId - The ID of the profile to edit.
 */
async function editProfile(profileId) {
    debugLog();
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
}

/**
 * Saves a new or updated AI profile.
 */
async function saveProfile(event) {
    event.preventDefault();
    debugLog('Saving profile...');
    const profile = {
        id: profileIdInput.value ? parseInt(profileIdInput.value) : undefined,
        name: profileNameInput.value.trim(),
        model: profileModelInput.value.trim(), // Use the hidden input for model ID
        modelName: profileModelSelectedSpan.textContent.trim() || profileModelSearchInput.value.trim(), // Store friendly name
        systemPrompt: profileSystemPromptInput.value.trim(),
        temperature: parseFloat(profileTempInput.value),
        maxTokens: parseInt(profileMaxTokensInput.value),
        maxContext: parseInt(profileMaxContextInput.value)
    };

    if (!profile.name || !profile.model) {
        showToast('Profile name and AI model are required.', 'error');
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
        debugLog(, 'error');
        showToast('Failed to save profile.', 'error');
    }
}

/**
 * Confirms and deletes an AI profile.
 * @param {number} profileId - The ID of the profile to delete.
 */
function confirmAndDeleteProfile(profileId) {
    const isConfirmed = window.confirm('Are you sure you want to delete this AI profile?');
    if (isConfirmed) {
        Storage.ProfileStorage.deleteProfile(profileId)
            .then(() => {
                showToast('Profile deleted!', 'success');
                renderProfilesList();
                resetProfileForm(); // Reset form if deleted profile was being edited
                if (currentProfileId === profileId) {
                    currentProfileId = null; // Clear active profile if deleted
                }
            })
            .catch(error => {
                debugLog(, 'error');
                showToast('Failed to delete profile.', 'error');
            });
    }
}

/**
 * Opens the memory modal.
 */
async function openMemoryModal() {
    debugLog('Opening memory modal...');
    openModal(memoryModal);
    // Load existing memory (optional, for editing)
    // For now, just a simple editor. You'd list memories here.
    memoryContentInput.value = '';
    memoryTagsInput.value = '';
}

/**
 * Saves memory content.
 */
async function saveMemory() {
    debugLog('Saving memory...');
    const content = memoryContentInput.value.trim();
    const tags = memoryTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

    if (!content) {
        showToast('Memory content cannot be empty.', 'error');
        return;
    }

    const memory = {
        content: content,
        tags: tags,
        timestamp: Date.now()
    };

    try {
        await Storage.MemoryStorage.addMemory(memory);
        showToast('Memory saved!', 'success');
        closeModal(memoryModal);
        // Optionally, re-render a memory list if you had one
    } catch (error) {
        debugLog(, 'error');
        showToast('Failed to save memory.', 'error');
    }
}

/**
 * Opens the rename conversation modal.
 * @param {number} convId - The ID of the conversation to rename.
 * @param {string} currentTitle - The current title of the conversation.
 */
function openRenameConversationModal(convId, currentTitle) {
    debugLog();
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
                currentConversationTitle.textContent = newTitle;
            }
            closeModal(renameModal);
        }
    } catch (error) {
        debugLog(, 'error');
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
                    currentConversationTitle.textContent = 'Vivica';
                }
                renderConversationsList();
            })
            .catch(error => {
                debugLog(, 'error');
                showToast('Failed to delete conversation.', 'error');
            });
    }
}

/**
 * Opens the export conversation modal and populates it.
 * @param {number} convId - The ID of the conversation to export.
 */
async function openExportConversationModal(convId) {
    debugLog();
    try {
        const conversation = await Storage.ConversationStorage.getConversation(convId);
        const messages = await Storage.MessageStorage.getMessagesByConversationId(convId);

        let exportText = Chat ;
        messages.forEach(msg => {
            const sender = msg.sender === 'user' ? 'You' : 'AI';
            const timestamp = new Date(msg.timestamp).toLocaleString();
            exportText += ;
        });

        exportContentTextarea.value = exportText;
        openModal(exportModal);
        exportContentTextarea.scrollTop = 0; // Scroll to top
    } catch (error) {
        debugLog(, 'error');
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

document.addEventListener('DOMContentLoaded', async () => {
    debugLog('DOM Content Loaded. Initializing Vivica...');

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            debugLog('Service Worker registered with scope: ' + registration.scope, 'info');
        } catch (error) {
            debugLog('Service Worker registration failed: ' + error, 'error');
        }
    }

    // Initial render of conversations list
    await renderConversationsList();

    // Load the most recent conversation or show empty state
    const allConversations = await Storage.ConversationStorage.getAllConversations();
    if (allConversations.length > 0) {
        // Load the first (most recent) conversation
        await loadConversation(allConversations[0].id);
    } else {
        emptyState.style.display = 'flex'; // Ensure empty state is visible
    }

    // Event listeners for main UI
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent new line
            sendMessage();
        }
    });
    newChatBtn.addEventListener('click', startNewConversation);
    menuToggle.addEventListener('click', toggleSidebar);
    closeSidebarBtn.addEventListener('click', toggleSidebar);

    // Modal event listeners
    openSettingsBtn.addEventListener('click', openSettingsModal);
    closeSettingsModalBtn.addEventListener('click', () => closeModal(settingsModal));
    cancelSettingsBtn.addEventListener('click', () => closeModal(settingsModal));
    saveSettingsBtn.addEventListener('click', saveSettings);
    clearAllConversationsBtn.addEventListener('click', confirmClearAllConversations);

    profilesBtn.addEventListener('click', openProfilesModal);
    closeProfilesModalBtn.addEventListener('click', () => closeModal(profilesModal));
    cancelProfileBtn.addEventListener('click', resetProfileForm); // Reset form on cancel
    profileForm.addEventListener('submit', saveProfile);
    deleteProfileBtn.addEventListener('click', (e) => confirmAndDeleteProfile(parseInt(profileIdInput.value)));

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
    closeMemoryModalBtn.addEventListener('click', () => closeModal(memoryModal));
    cancelMemoryBtn.addEventListener('click', () => closeModal(memoryModal));
    saveMemoryBtn.addEventListener('click', saveMemory);

    closeRenameModalBtn.addEventListener('click', () => closeModal(renameModal));
    cancelRenameBtn.addEventListener('click', () => closeModal(renameModal));
    saveRenameBtn.addEventListener('click', saveConversationName);

    closeExportModalBtn.addEventListener('click', () => closeModal(exportModal));
    copyExportBtn.addEventListener('click', copyExportContent);

    // File upload and clear input
    fileUploadInput.addEventListener('change', handleFileUpload);
    clearInputBtn.addEventListener('click', clearUserInput);

    // Initial fetch of models for profile creation
    await fetchAvailableModels();

    debugLog('Vivica initialization complete.');
});
