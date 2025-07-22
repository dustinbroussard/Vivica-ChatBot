import { PersonaStorage } from './storage-wrapper.js';

export class PersonaController {
  constructor() {
    this.activePersonaId = localStorage.getItem('activePersonaId');
  }

  async getAllPersonas() {
    try {
      return await PersonaStorage.getAllPersonas();
    } catch (error) {
      console.error('Error fetching personas:', error);
      return []; // Return empty array as safe default
    }
  }

  async getPersona(id) {
    return await PersonaStorage.getPersona(id);
  }

  async createPersona(persona) {
    if (!persona.name || !persona.model || !persona.systemPrompt) {
      throw new Error('Please fill out all required fields.');
    }
    return await PersonaStorage.addPersona({
      id: crypto.randomUUID(),
      ...persona
    });
  }

  async updatePersona(persona) {
    if (!persona.id || !persona.name || !persona.model || !persona.systemPrompt) {
      throw new Error('Invalid persona data');
    }
    if (typeof persona.temperature !== 'number' || persona.temperature < 0 || persona.temperature > 2) {
      throw new Error('Temperature must be between 0 and 2');
    }
    if (typeof persona.maxTokens !== 'number' || persona.maxTokens < 256) {
      throw new Error('Max tokens must be at least 256');
    }
    return await PersonaStorage.addPersona(persona);
  }

  async deletePersona(id) {
    return await PersonaStorage.deletePersona(id);
  }

  async setActivePersona(id) {
    this.activePersonaId = id;
    localStorage.setItem('activePersonaId', id);
    return await this.getPersona(id);
  }
}
