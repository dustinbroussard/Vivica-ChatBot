// memory-manager.js
// Vivica AI: Memory Manager Modal

import { MemoryStorage } from './storage-wrapper.js';
import { STORES } from './db-utils.js';

let memoryModal, formEl;

export function initMemoryManager() {
  memoryModal = document.getElementById('memory-modal');
  if (!memoryModal) {
    console.error('Memory modal element not found');
    return;
  }

  formEl = memoryModal.querySelector('form');
  if (!formEl) {
    console.error('Memory form element not found');
    return;
  }

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const memoryChunks = buildMemoryChunksFromForm();
    for (const chunk of memoryChunks) {
      await MemoryStorage.addMemory(chunk);
    }
    closeModal();
  });

  const addListener = (id, fn) => {
    const el = document.getElementById(id);
    el?.addEventListener('click', fn);
  };

  addListener('memory-reset-btn', resetForm);
  addListener('memory-cancel-btn', closeModal);
  addListener('memory-export-btn', exportMemory);
  addListener('memory-import-btn', importMemory);
  addListener('memory-close-btn', closeModal);

  // Optional: close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && memoryModal.classList.contains('show')) closeModal();
  });
}

function buildMemoryChunksFromForm() {
  const formData = new FormData(formEl);
  const now = Date.now();

  const chunks = [];

  const identityFields = ['name', 'pronouns', 'occupation', 'location'];
  const personalityFields = ['tone', 'style', 'hobbies'];

  identityFields.forEach(field => {
    const value = formData.get(field);
    if (value) chunks.push({ content: `${field}: ${value}`, tags: ['identity'], timestamp: now });
  });

  personalityFields.forEach(field => {
    const value = formData.get(field);
    if (value) chunks.push({ content: `${field}: ${value}`, tags: ['personality'], timestamp: now });
  });

  const instructions = formData.get('instructions');
  if (instructions) chunks.push({ content: instructions, tags: ['instruction'], timestamp: now });

  const systemNotes = formData.get('systemNotes');
  if (systemNotes) chunks.push({ content: systemNotes, tags: ['system'], timestamp: now });

  const rawTags = formData.get('tags') || '';
  const tags = rawTags.split(',').map(t => t.trim()).filter(Boolean);
  if (tags.length) {
    chunks.forEach(chunk => {
      chunk.tags = [...new Set([...chunk.tags, ...tags])];
    });
  }

  return chunks;
}

function resetForm() {
  formEl.reset();
}

function closeModal() {
  memoryModal.classList.remove('show');
  memoryModal.style.display = 'none';
  document.body.classList.remove('modal-open');
}

async function exportMemory() {
  const memory = await MemoryStorage.getAllMemories();
  const blob = new Blob([JSON.stringify(memory, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vivica-memory-export.json';
  a.click();
  URL.revokeObjectURL(url);
}

async function importMemory() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = async () => {
    const file = input.files[0];
    const text = await file.text();
    const data = JSON.parse(text);
    for (const entry of data) {
      await MemoryStorage.addMemory(entry);
    }
    alert('Memory imported!');
  };
  input.click();
}
