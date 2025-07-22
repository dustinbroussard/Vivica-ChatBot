// js/persona-ui.js

import { PersonaController } from './persona-controller.js';
import Storage from './storage-wrapper.js';

const personaController = new PersonaController();

// DOM elements
const personaModal = document.getElementById('personaModal');
const personaListContainer = document.getElementById('personaList');
const createPersonaBtn = document.getElementById('createPersonaBtn');
const personaForm = document.getElementById('personaForm');
const personaEditorModal = document.getElementById('personaEditorModal');
let editingPersonaId = null;

export function initPersonaUI() {
  loadPersonas();

  createPersonaBtn?.addEventListener('click', () => {
    openPersonaEditor();
    personaForm.reset();
    document.getElementById('tempVal').textContent = '0.7';
  });

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
      name: document.getElementById('personaName').value,
      model: document.getElementById('modelSelect').value,
      systemPrompt: document.getElementById('systemPrompt').value,
      temperature: parseFloat(document.getElementById('temperature').value),
      maxTokens: parseInt(document.getElementById('maxTokens').value)
    };

    try {
      if (editingPersonaId) {
        persona.id = editingPersonaId;
        await personaController.updatePersona(persona);
      } else {
        await personaController.createPersona(persona);
      }
      personaEditorModal.classList.add('hidden');
      await loadPersonas();
    } catch (error) {
      alert(error.message);
    }
  });

  const tempSlider = document.getElementById('temperature');
  // Populate model dropdown (static or dynamic)
  const modelSelect = document.getElementById('modelSelect');
  if (modelSelect && modelSelect.children.length <= 1) {
    const defaultModels = [
      'gpt-4o', 'deepseek-chat', 'llama-3-70b-instruct', 'qwen/qwen-2.5-72b-instruct', 'openrouter/cypher-alpha'
    ];
    for (const model of defaultModels) {
      const opt = document.createElement('option');
      opt.value = model;
      opt.textContent = model;
      modelSelect.appendChild(opt);
    }
  }

  // Slider updates label live
  tempSlider?.addEventListener('input', () => {
    document.getElementById('tempVal').textContent = tempSlider.value;
  });
}

export async function loadPersonas() {
  const personas = await personaController.getAllPersonas();
  personaListContainer.innerHTML = '';

  personas.forEach(persona => {
    const template = document.getElementById('personaCardTemplate').content.cloneNode(true);

    template.querySelector('.persona-name').textContent = persona.name;
    template.querySelector('.persona-model').textContent = persona.model;
    template.querySelector('.persona-prompt-preview').textContent = (persona.systemPrompt || '').slice(0, 80) + '...';
    template.querySelector('.temp').textContent = persona.temperature;
    template.querySelector('.tokens').textContent = persona.maxTokens;

    const radio = template.querySelector('input[type="radio"]');
    radio.checked = persona.id === personaController.activePersonaId;
    radio.addEventListener('click', () => {
      personaController.activePersonaId = persona.id;
      localStorage.setItem('activePersonaId', persona.id);
    });
    radio.onclick = () => setActivePersona(persona.id);

    template.querySelector('.editPersonaBtn').onclick = () => openPersonaEditor(persona);
    template.querySelector('.deletePersonaBtn').onclick = () => deletePersona(persona.id);

    personaListContainer.appendChild(template);
  });
}

export async function setActivePersona(id) {
  const persona = await personaController.setActivePersona(id);
  await loadPersonas();
  
  // Update the UI badge
  const badge = document.getElementById('activePersonaBadge');
  if (badge) {
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
  document.getElementById('systemPrompt').value = persona?.systemPrompt || '';
  document.getElementById('temperature').value = persona?.temperature ?? 0.7;
  document.getElementById('tempVal').textContent = persona?.temperature ?? 0.7;
  document.getElementById('maxTokens').value = persona?.maxTokens ?? 2000;
}

export async function deletePersona(id) {
  if (confirm('Delete this persona?')) {
    await personaController.deletePersona(id);
    await loadPersonas();
  }
}

