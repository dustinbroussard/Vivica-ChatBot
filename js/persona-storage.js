// persona-storage.js
export const personaStorage = {
  KEY: 'personaList',

  async getActivePersona() {
    const id = localStorage.getItem('activePersonaId');
    if (!id) return null;
    const list = await this.getAll();
    return list.find(p => p.id === id) || null;
  },

  async getAll() {
    const raw = localStorage.getItem(this.KEY);
    try {
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Error parsing persona list:', e);
      return [];
    }
  },

  async save(persona) {
    const list = await this.getAll();
    const index = list.findIndex(p => p.id === persona.id);
    if (index !== -1) {
      list[index] = persona;
    } else {
      list.push(persona);
    }
    localStorage.setItem(this.KEY, JSON.stringify(list));
  },

  async delete(id) {
    const list = await this.getAll();
    const filtered = list.filter(p => p.id !== id);
    localStorage.setItem(this.KEY, JSON.stringify(filtered));
  }
};

