import { PersonaStorage } from './storage-wrapper.js';

export class PersonaController {
  constructor() {
    this.activePersonaId = localStorage.getItem('activePersonaId');
  }

  async getAllPersonas() {
    return await PersonaStorage.getAllPersonas();
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
