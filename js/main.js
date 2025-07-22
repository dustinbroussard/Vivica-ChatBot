// js/main.js
// Rewritten core logic for Vivica Chat App
// This version focuses on basic chat functionality and leaves advanced features
// like voice mode or data export for future work.

import Storage, {
  ConversationStorage,
  MessageStorage,
  PersonaStorage,
  SettingsStorage
} from './storage-wrapper.js';
import { initPersonaUI } from './persona-ui.js';
import { initVoiceMode, speak } from './voice-mode.js';

function $(id) {
  return document.getElementById(id);
}

function showToast(message, type = "info", duration = 1800) {
  const container = document.getElementById("toast-container") || (() => {
    const div = document.createElement("div");
    div.id = "toast-container";
    div.style.position = "fixed";
    div.style.bottom = "32px";
    div.style.right = "32px";
    div.style.zIndex = "9999";
    div.style.display = "flex";
    div.style.flexDirection = "column-reverse";
    document.body.appendChild(div);
    return div;
  })();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  const dismiss = document.createElement("button");
  dismiss.innerHTML = "&times;";
  dismiss.className = "toast-dismiss";
  dismiss.onclick = () => toast.remove();
  toast.appendChild(dismiss);
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("fade-out");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, duration);
}
window.showToast = showToast;

class VivicaApp {
  constructor() {
    this.chatBody = $('chat-body');
    this.userInput = $('user-input');
    this.sendBtn = $('send-btn');
    this.conversationsList = $('conversations-list');
    this.newChatBtn = $('new-chat-btn-sidebar');
    this.typingIndicator = $('typing-indicator');
    this.currentConversationId = null;
    window.currentConversationId = null;
  }

  async init() {
    await initPersonaUI();
    await this.loadConversations();
    this.bindEvents();
    initVoiceMode({ onSpeechResult: t => { this.userInput.value = t; } });
  }

  bindEvents() {
    this.sendBtn?.addEventListener('click', () => this.handleSend());
    this.userInput?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });
    this.newChatBtn?.addEventListener('click', () => this.startNewConversation());
  }

  async loadConversations() {
    const conversations = await ConversationStorage.getAllConversations();
    this.conversationsList.innerHTML = '';
    conversations.forEach(c => this.renderConversationItem(c));
  }

  renderConversationItem(conversation) {
    const li = document.createElement('li');
    li.className = 'conversation-item';
    li.textContent = conversation.title || 'Untitled';
    li.dataset.id = conversation.id;
    li.addEventListener('click', () => this.openConversation(conversation.id));
    this.conversationsList.appendChild(li);
  }

  async openConversation(id) {
    this.currentConversationId = id;
    window.currentConversationId = id;
    this.chatBody.innerHTML = '';
    const messages = await MessageStorage.getMessagesByConversationId(id);
    messages.forEach(m => this.renderMessage(m));
  }

  renderMessage(msg) {
    const wrapper = document.createElement('div');
    wrapper.className = `message ${msg.sender}`;
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = msg.content;
    wrapper.appendChild(bubble);
    this.chatBody.appendChild(wrapper);
    this.chatBody.scrollTop = this.chatBody.scrollHeight;
  }

  async startNewConversation() {
    const conv = { title: 'New Conversation', timestamp: Date.now() };
    const id = await ConversationStorage.addConversation(conv);
    this.loadConversations();
    await this.openConversation(id);
  }

  async handleSend() {
    const content = this.userInput.value.trim();
    if (!content) return;
    if (!this.currentConversationId) await this.startNewConversation();
    const userMsg = {
      conversationId: this.currentConversationId,
      sender: 'user',
      content,
      timestamp: Date.now()
    };
    await MessageStorage.addMessage(userMsg);
    this.renderMessage(userMsg);
    this.userInput.value = '';
    this.showTyping(true);
    await this.fetchAIResponse(content);
    this.showTyping(false);
  }

  showTyping(show) {
    if (this.typingIndicator) {
      this.typingIndicator.style.display = show ? 'flex' : 'none';
    }
  }

  async fetchAIResponse(text) {
    const settings = await SettingsStorage.getSettings();
    const personaId = parseInt(localStorage.getItem('activePersonaId'), 10);
    const persona = personaId ? await PersonaStorage.getPersona(personaId) : null;
    const model = persona?.model || 'deepseek/deepseek-chat-v3-0324:free';
    const apiKey = settings?.apiKey1;
    if (!apiKey) {
      this.renderMessage({ sender: 'ai', content: 'API key missing.', conversationId: this.currentConversationId });
      return;
    }
    const history = await MessageStorage.getMessagesByConversationId(this.currentConversationId);
    const payload = {
      model,
      messages: history.slice(-20).map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.content })).concat({ role: 'user', content: text }),
      temperature: persona?.temperature ?? 0.7,
      max_tokens: persona?.maxTokens ?? 2000,
      stream: false
    };
    try {
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Vivica Chat App'
        },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error('API error');
      const data = await resp.json();
      const answer = data.choices?.[0]?.message?.content || 'No response';
      const aiMsg = {
        conversationId: this.currentConversationId,
        sender: 'ai',
        content: answer,
        timestamp: Date.now()
      };
      await MessageStorage.addMessage(aiMsg);
      this.renderMessage(aiMsg);
      speak(answer).catch(() => {});
    } catch (err) {
      this.renderMessage({ sender: 'ai', content: 'Error: ' + err.message, conversationId: this.currentConversationId });
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new VivicaApp();
  app.init();
});

