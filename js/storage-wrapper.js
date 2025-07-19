// js/storage-wrapper.js
// Code Maniac - Storage Abstraction Layer for Vivica Chat App

/**
 * @fileoverview This file provides a higher-level abstraction for interacting with IndexedDB.
 * It uses the db-utils.js functions to manage different types of application data,
 * making it easier to store and retrieve conversations, messages, profiles, and memory.
 */

import { initDB, add, get, getAll, update, remove, clearStore, STORES, getByIndex } from './db-utils.js';

// Ensure DB is initialized when this module loads
initDB().catch(error => console.error('StorageWrapper: Failed to initialize DB:', error));

/**
 * Manages conversation data.
 */
export const ConversationStorage = {
    /**
     * Adds a new conversation.
     * @param {object} conversation - The conversation object.
     * @returns {Promise<number>} The ID of the new conversation.
     */
    addConversation: async (conversation) => {
        try {
            // Ensure timestamp is always set for new conversations
            if (!conversation.timestamp) {
                conversation.timestamp = Date.now();
            }
            return await add(STORES.CONVERSATIONS, conversation);
        } catch (error) {
            console.error('ConversationStorage: Error adding conversation:', error);
            throw error;
        }
    },

    /**
     * Retrieves a conversation by its ID.
     * @param {number} id - The ID of the conversation.
     * @returns {Promise<object | undefined>} The conversation object.
     */
    getConversation: async (id) => {
        try {
            return await get(STORES.CONVERSATIONS, id);
        } catch (error) {
            console.error('ConversationStorage: Error getting conversation:', error);
            throw error;
        }
    },

    /**
     * Retrieves all conversations, sorted by timestamp.
     * @returns {Promise<object[]>} An array of conversation objects.
     */
    getAllConversations: async () => {
        try {
            const conversations = await getAll(STORES.CONVERSATIONS);
            // Sort by timestamp in descending order (most recent first)
            return conversations.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('ConversationStorage: Error getting all conversations:', error);
            throw error;
        }
    },

    /**
     * Updates an existing conversation.
     * @param {object} conversation - The conversation object with updated data (must include ID).
     * @returns {Promise<void>}
     */
    updateConversation: async (conversation) => {
        try {
            await update(STORES.CONVERSATIONS, conversation);
        } catch (error) {
            console.error('ConversationStorage: Error updating conversation:', error);
            throw error;
        }
    },

    /**
     * Deletes a conversation by its ID and all associated messages.
     * @param {number} id - The ID of the conversation to delete.
     * @returns {Promise<void>}
     */
    deleteConversation: async (id) => {
        try {
            await remove(STORES.CONVERSATIONS, id);
            // Also delete all messages associated with this conversation
            const messagesToDelete = await getByIndex(STORES.MESSAGES, 'conversationId', id);
            for (const msg of messagesToDelete) {
                await remove(STORES.MESSAGES, msg.id);
            }
            console.log(`ConversationStorage: Deleted conversation ${id} and its messages.`);
        } catch (error) {
            console.error('ConversationStorage: Error deleting conversation:', error);
            throw error;
        }
    },

    /**
     * Clears all conversations and their messages.
     * @returns {Promise<void>}
     */
    clearAllConversations: async () => {
        try {
            await clearStore(STORES.CONVERSATIONS);
            await clearStore(STORES.MESSAGES); // Clear all messages as well
            console.log('ConversationStorage: Cleared all conversations and messages.');
        } catch (error) {
            console.error('ConversationStorage: Error clearing all conversations:', error);
            throw error;
        }
    },

    searchConversations: async (query) => {
        const all = await ConversationStorage.getAllConversations();
        const q = query.toLowerCase();
        return all.filter(c => (c.title || '').toLowerCase().includes(q));
    }
};

/**
 * Manages message data.
 */
export const MessageStorage = {
    /**
     * Adds a new message.
     * @param {object} message - The message object.
     * @returns {Promise<number>} The ID of the new message.
     */
    addMessage: async (message) => {
        try {
            // Ensure timestamp is always set for new messages
            if (!message.timestamp) {
                message.timestamp = Date.now();
            }
            return await add(STORES.MESSAGES, message);
        } catch (error) {
            console.error('MessageStorage: Error adding message:', error);
            throw error;
        }
    },

    /**
     * Retrieves messages for a specific conversation, sorted by timestamp.
     * @param {number} conversationId - The ID of the conversation.
     * @returns {Promise<object[]>} An array of message objects.
     */
    getMessagesByConversationId: async (conversationId) => {
        try {
            const messages = await getByIndex(STORES.MESSAGES, 'conversationId', conversationId);
            // Sort by timestamp in ascending order (oldest first)
            return messages.sort((a, b) => a.timestamp - b.timestamp);
        } catch (error) {
            console.error('MessageStorage: Error getting messages by conversation ID:', error);
            throw error;
        }
    },

    /**
     * Deletes a specific message.
     * @param {number} id - The ID of the message to delete.
     * @returns {Promise<void>}
     */
    deleteMessage: async (id) => {
        try {
            await remove(STORES.MESSAGES, id);
        } catch (error) {
            console.error('MessageStorage: Error deleting message:', error);
            throw error;
        }
    },

    /**
     * Updates an existing message.
     * @param {object} message - The message object with updated data (must include ID).
     * @returns {Promise<void>}
     */
    updateMessage: async (message) => {
        try {
            await update(STORES.MESSAGES, message);
        } catch (error) {
            console.error('MessageStorage: Error updating message:', error);
            throw error;
        }
    },

    searchMessages: async (conversationId, query) => {
        const messages = await MessageStorage.getMessagesByConversationId(conversationId);
        const q = query.toLowerCase();
        return messages.filter(m => m.content.toLowerCase().includes(q));
    }
};

/**
 * Manages AI profile data.
 */
export const ProfileStorage = {
    /**
     * Adds a new AI profile.
     * @param {object} profile - The profile object.
     * @returns {Promise<number>} The ID of the new profile.
     */
    addProfile: async (profile) => {
        try {
            return await add(STORES.PROFILES, profile);
        } catch (error) {
            console.error('ProfileStorage: Error adding profile:', error);
            throw error;
        }
    },

    /**
     * Retrieves a profile by its ID.
     * @param {number} id - The ID of the profile.
     * @returns {Promise<object | undefined>} The profile object.
     */
    getProfile: async (id) => {
        try {
            return await get(STORES.PROFILES, id);
        } catch (error) {
            console.error('ProfileStorage: Error getting profile:', error);
            throw error;
        }
    },

    /**
     * Retrieves all profiles.
     * @returns {Promise<object[]>} An array of profile objects.
     */
    getAllProfiles: async () => {
        try {
            return await getAll(STORES.PROFILES);
        } catch (error) {
            console.error('ProfileStorage: Error getting all profiles:', error);
            throw error;
        }
    },

    /**
     * Updates an existing profile.
     * @param {object} profile - The profile object with updated data (must include ID).
     * @returns {Promise<void>}
     */
    updateProfile: async (profile) => {
        try {
            await update(STORES.PROFILES, profile);
        }
        catch (error) {
            console.error('ProfileStorage: Error updating profile:', error);
            throw error;
        }
    },

    /**
     * Deletes a profile by its ID.
     * @param {number} id - The ID of the profile to delete.
     * @returns {Promise<void>}
     */
    deleteProfile: async (id) => {
        try {
            await remove(STORES.PROFILES, id);
        } catch (error) {
            console.error('ProfileStorage: Error deleting profile:', error);
            throw error;
        }
    }
};

/**
 * Manages long-term memory data.
 */
export const MemoryStorage = {
    /**
     * Adds a new memory snippet.
     * @param {object} memory - The memory object.
     * @returns {Promise<number>} The ID of the new memory.
     */
    addMemory: async (memory) => {
        try {
            if (!memory.timestamp) {
                memory.timestamp = Date.now();
            }
            return await add(STORES.MEMORY, memory);
        } catch (error) {
            console.error('MemoryStorage: Error adding memory:', error);
            throw error;
        }
    },

    /**
     * Retrieves a memory by its ID.
     * @param {number} id - The ID of the memory.
     * @returns {Promise<object | undefined>} The memory object.
     */
    getMemory: async (id) => {
        try {
            return await get(STORES.MEMORY, id);
        } catch (error) {
            console.error('MemoryStorage: Error getting memory:', error);
            throw error;
        }
    },

    /**
     * Retrieves all memories, sorted by timestamp.
     * @returns {Promise<object[]>} An array of memory objects.
     */
    getAllMemories: async () => {
        try {
            const memories = await getAll(STORES.MEMORY);
            return memories.sort((a, b) => b.timestamp - a.timestamp); // Most recent first
        } catch (error) {
            console.error('MemoryStorage: Error getting all memories:', error);
            throw error;
        }
    },

    /**
     * Updates an existing memory.
     * @param {object} memory - The memory object with updated data (must include ID).
     * @returns {Promise<void>}
     */
    updateMemory: async (memory) => {
        try {
            await update(STORES.MEMORY, memory);
        } catch (error) {
            console.error('MemoryStorage: Error updating memory:', error);
            throw error;
        }
    },

    /**
     * Deletes a memory by its ID.
     * @param {number} id - The ID of the memory to delete.
     * @returns {Promise<void>}
     */
    deleteMemory: async (id) => {
        try {
            await remove(STORES.MEMORY, id);
        } catch (error) {
            console.error('MemoryStorage: Error deleting memory:', error);
            throw error;
        }
    },

    /**
     * Searches memories by tags.
     * @param {string[]} tags - An array of tags to search for.
     * @returns {Promise<object[]>} An array of matching memory objects.
     */
    searchMemoriesByTags: async (tags) => {
        try {
            // This is a simplified search. For a real-world app, you might need
            // more complex full-text search or a dedicated search index.
            const allMemories = await MemoryStorage.getAllMemories();
            return allMemories.filter(memory =>
                memory.tags && tags.some(tag => memory.tags.includes(tag))
            );
        } catch (error) {
            console.error('MemoryStorage: Error searching memories by tags:', error);
            throw error;
        }
    }
};

/**
 * Manages application settings (e.g., API keys).
 */
export const SettingsStorage = {
    // Settings will be stored as a single object with a fixed key
    SETTINGS_KEY: 'appSettings',

    /**
     * Saves application settings.
     * @param {object} settings - The settings object.
     * @returns {Promise<void>}
     */
    saveSettings: async (settings) => {
        try {
            // Use 'put' to either add or update the single settings object
            await update(STORES.MEMORY, { id: SettingsStorage.SETTINGS_KEY, ...settings });
            console.log('SettingsStorage: Settings saved.');
        } catch (error) {
            console.error('SettingsStorage: Error saving settings:', error);
            throw error;
        }
    },

    /**
     * Retrieves application settings.
     * @returns {Promise<object | undefined>} The settings object.
     */
    getSettings: async () => {
        try {
            const settings = await get(STORES.MEMORY, SettingsStorage.SETTINGS_KEY);
            return settings;
        } catch (error) {
            console.error('SettingsStorage: Error getting settings:', error);
            throw error;
        }
    }
};

// Export all storage managers for easy access
export default {
    ConversationStorage,
    MessageStorage,
    ProfileStorage,
    MemoryStorage,
    SettingsStorage
};

export { STORES } from './db-utils.js';
