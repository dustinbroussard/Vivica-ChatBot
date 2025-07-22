// js/persona-ui.js

import Storage, { PersonaStorage } from './storage-wrapper.js';

let activePersonaId = null;

// DOM elements
const personaModal = document.getElementById('personaModal');
const personaListContainer = document.getElementById('personaList');
const createPersonaBtn = document.getElementById('createPersonaBtn');
const personaForm = document.getElementById('personaForm');
const personaEditorModal = document.getElementById('personaEditorModal');
let editingPersonaId = null;

export function initPersonaUI() {
  activePersonaId = localStorage.getItem('activePersonaId');
  loadPersonas();

  createPersonaBtn?.addEventListener('click', () => openPersonaEditor());

  // Close buttons
  document.querySelectorAll('.close-modal, .cancelBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      personaModal.classList.add('hidden');
      personaEditorModal.classList.add('hidden');
    });
  });

  // Save form
  personaForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const persona = {
      id: editingPersonaId || crypto.randomUUID(),
      name: document.getElementById('personaName').value,
      model: document.getElementById('modelSelect').value,
      prompt: document.getElementById('systemPrompt').value,
      temp: parseFloat(document.getElementById('temperature').value),
      tokens: parseInt(document.getElementById('maxTokens').value)
    };

    await PersonaStorage.addPersona(persona);
    personaEditorModal.classList.add('hidden');
    await loadPersonas();
  });

  const tempSlider = document.getElementById('temperature');
  tempSlider?.addEventListener('input', () => {
    document.getElementById('tempVal').textContent = tempSlider.value;
  });
}

export async function loadPersonas() {
  const personas = await PersonaStorage.getAllPersonas();
  personaListContainer.innerHTML = '';

  personas.forEach(persona => {
    const template = document.getElementById('personaCardTemplate').content.cloneNode(true);

    template.querySelector('.persona-name').textContent = persona.name;
    template.querySelector('.persona-model').textContent = persona.model;
    template.querySelector('.persona-prompt-preview').textContent = persona.prompt.slice(0, 80) + '...';
    template.querySelector('.temp').textContent = persona.temp;
    template.querySelector('.tokens').textContent = persona.tokens;

    const radio = template.querySelector('input[type="radio"]');
    radio.checked = persona.id === activePersonaId;
    radio.onclick = () => setActivePersona(persona.id);

    template.querySelector('.editPersonaBtn').onclick = () => openPersonaEditor(persona);
    template.querySelector('.deletePersonaBtn').onclick = () => deletePersona(persona.id);

    personaListContainer.appendChild(template);
  });
}

export async function setActivePersona(id) {
  activePersonaId = id;
  localStorage.setItem('activePersonaId', id);
  await loadPersonas();
  
  // Update the UI badge
  const badge = document.getElementById('activePersonaBadge');
  if (badge) {
    const persona = await PersonaStorage.getPersona(id);
    badge.textContent = persona ? `👤 ${persona.name} ⏷` : '👤 Select Persona ⏷';
  }

  // Update current conversation's persona if one is active
  if (window.currentConversationId) {
    const convo = await Storage.ConversationStorage.getConversation(window.currentConversationId);
    if (convo) {
      convo.personaId = id;
      await Storage.ConversationStorage.updateConversation(convo);
    }
  }
}

export function openPersonaEditor(persona = null) {
  personaEditorModal.classList.remove('hidden');
  editingPersonaId = persona?.id || null;

  document.getElementById('personaName').value = persona?.name || '';
  document.querySelector('#personaEditorModal .modal-header h2').textContent =
  persona ? 'Edit Persona' : 'Create Persona';
  document.getElementById('modelSelect').value = persona?.model || '';
  document.getElementById('systemPrompt').value = persona?.prompt || '';
  document.getElementById('temperature').value = persona?.temp ?? 0.7;
  document.getElementById('tempVal').textContent = persona?.temp ?? 0.7;
  document.getElementById('maxTokens').value = persona?.tokens ?? 2000;
}

export async function deletePersona(id) {
  if (confirm('Delete this persona?')) {
    await PersonaStorage.deletePersona(id);
    await loadPersonas();
  }
}

