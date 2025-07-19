// memory-manager.js
// Vivica AI: Memory Manager Modal

import { MemoryStorage } from './storage-wrapper.js';
import { STORES } from './db-utils.js';

let memoryModal, formEl;

export function initMemoryManager() {
  memoryModal = document.getElementById('memory-modal');
  formEl = memoryModal.querySelector('form');

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const memoryChunks = buildMemoryChunksFromForm();
    for (const chunk of memoryChunks) {
      await MemoryStorage.addMemory(chunk);
    }
    closeModal();
  });

  document.getElementById('memory-reset-btn').addEventListener('click', resetForm);
  document.getElementById('memory-cancel-btn').addEventListener('click', closeModal);
  document.getElementById('memory-export-btn').addEventListener('click', exportMemory);
  document.getElementById('memory-import-btn').addEventListener('click', importMemory);
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
