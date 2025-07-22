// js/db-utils.js
// Code Maniac - IndexedDB Utilities for Vivica Chat App

/**
 * @fileoverview This file provides utility functions for IndexedDB operations.
 * It sets up the database, handles schema upgrades, and provides basic CRUD operations.
 * We're using the 'idb' library for a more pleasant IndexedDB experience.
 */

import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@8.0.3/+esm';

// Database configuration
const DB_NAME = 'VivicaChatDB';
const DB_VERSION = 1; // Increment this version number when you change the schema
const STORES = {
    CONVERSATIONS: 'conversations', // Stores chat conversation metadata
    MESSAGES: 'messages',           // Stores individual chat messages  
    PERSONAS: 'personas',           // Stores AI persona personas
    MEMORY: 'memory'                // Stores long-term memory snippets
};

/**
 * Initializes the IndexedDB database.
 * This function handles database creation and schema upgrades.
 * @returns {Promise<IDBDatabase>} A promise that resolves with the database instance.
 */
// Track if initialization is in progress
let dbInitializationPromise = null;

export async function initDB() {
    // Return existing promise if initialization is already in progress
    if (dbInitializationPromise) {
        return dbInitializationPromise;
    }

    console.log('DB: Initializing IndexedDB...');
    dbInitializationPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
            console.log(`DB: Upgrading from version ${oldVersion} to ${newVersion}`);

            // Create all required object stores if they don't exist
            if (!db.objectStoreNames.contains(STORES.CONVERSATIONS)) {
                const convStore = db.createObjectStore(STORES.CONVERSATIONS, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                convStore.createIndex('timestamp', 'timestamp', { unique: false });
                convStore.createIndex('title', 'title', { unique: false });
                console.log(`DB: Object store '${STORES.CONVERSATIONS}' created.`);
            }

            if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
                const msgStore = db.createObjectStore(STORES.MESSAGES, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                msgStore.createIndex('conversationId', 'conversationId', { unique: false });
                msgStore.createIndex('timestamp', 'timestamp', { unique: false });
                console.log(`DB: Object store '${STORES.MESSAGES}' created.`);
            }

            if (!db.objectStoreNames.contains(STORES.PERSONAS)) {
                try {
                    const personaStore = db.createObjectStore(STORES.PERSONAS, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    personaStore.createIndex('name', 'name', { unique: true });
                    console.log(`DB: Object store '${STORES.PERSONAS}' created.`);
                } catch (error) {
                    console.error('Error creating personas store:', error);
                    throw error;
                }
            }

            if (!db.objectStoreNames.contains(STORES.MEMORY)) {
                const memoryStore = db.createObjectStore(STORES.MEMORY, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                memoryStore.createIndex('tags', 'tags', { multiEntry: true });
                memoryStore.createIndex('timestamp', 'timestamp', { unique: false });
                console.log(`DB: Object store '${STORES.MEMORY}' created.`);
            }

            // Add any future schema migrations here for new versions
            // Example for DB_VERSION 2:
            // if (oldVersion < 2) {
            //     if (db.objectStoreNames.contains(STORES.MESSAGES)) {
            //         const msgStore = transaction.objectStore(STORES.MESSAGES);
            //         if (!msgStore.indexNames.contains('sender')) {
            //             msgStore.createIndex('sender', 'sender', { unique: false });
            //             console.log("DB: Added 'sender' index to messages store.");
            //         }
            //     }
            // }
        },
        blocked() {
            console.warn('DB: Database upgrade blocked. Close all other tabs with this app.');
            alert('Database upgrade blocked. Please close all other tabs with this application.');
        },
        blocking() {
            console.warn('DB: New version ready, but old version is still open. Close all other tabs.');
        }
    });
}

/**
 * Adds a new item to an object store.
 * @param {string} storeName - The name of the object store.
 * @param {object} item - The item to add.
 * @returns {Promise<number>} A promise that resolves with the key of the added item.
 */
export async function add(storeName, item) {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const key = await store.add(item);
    await tx.done;
    console.log(`DB: Added item to ${storeName} with key ${key}`, item);
    return key;
}

/**
 * Retrieves an item by its key from an object store.
 * @param {string} storeName - The name of the object store.
 * @param {IDBValidKey} key - The key of the item to retrieve.
 * @returns {Promise<object | undefined>} A promise that resolves with the retrieved item, or undefined if not found.
 */
export async function get(storeName, key) {
    if (key === undefined || key === null) {
        console.warn(`DB: get called on ${storeName} with invalid key`, key);
        return undefined;
    }
    const db = await initDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const item = await store.get(key);
    await tx.done;
    console.log(`DB: Retrieved item from ${storeName} with key ${key}`, item);
    return item;
}

/**
 * Retrieves all items from an object store.
 * @param {string} storeName - The name of the object store.
 * @returns {Promise<object[]>} A promise that resolves with an array of all items.
 */
export async function getAll(storeName) {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const allItems = await store.getAll();
    await tx.done;
    console.log(`DB: Retrieved all items from ${storeName}`, allItems);
    return allItems;
}

/**
 * Updates an existing item in an object store.
 * @param {string} storeName - The name of the object store.
 * @param {object} item - The item to update (must contain the keyPath property).
 * @returns {Promise<void>} A promise that resolves when the update is complete.
 */
export async function update(storeName, item) {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    await store.put(item); // 'put' updates if exists, adds if not
    await tx.done;
    console.log(`DB: Updated item in ${storeName} with key ${item.id}`, item);
}

/**
 * Deletes an item by its key from an object store.
 * @param {string} storeName - The name of the object store.
 * @param {IDBValidKey} key - The key of the item to delete.
 * @returns {Promise<void>} A promise that resolves when the deletion is complete.
 */
export async function remove(storeName, key) {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    await store.delete(key);
    await tx.done;
    console.log(`DB: Removed item from ${storeName} with key ${key}`);
}

/**
 * Clears all items from a specific object store.
 * @param {string} storeName - The name of the object store to clear.
 * @returns {Promise<void>} A promise that resolves when the store is cleared.
 */
export async function clearStore(storeName) {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    await store.clear();
    await tx.done;
    console.log(`DB: Cleared all items from ${storeName}`);
}

/**
 * Clears all object stores in the database.
 * @returns {Promise<void>} A promise that resolves when all stores are cleared.
 */
export async function clearAllStores() {
    const db = await initDB();
    const tx = db.transaction(Object.values(STORES), 'readwrite');
    for (const storeName of Object.values(STORES)) {
        const store = tx.objectStore(storeName);
        await store.clear();
        console.log(`DB: Cleared store ${storeName}`);
    }
    await tx.done;
    console.log('DB: All stores cleared.');
}

/**
 * Retrieves items from an object store using an index.
 * @param {string} storeName - The name of the object store.
 * @param {string} indexName - The name of the index to use.
 * @param {IDBValidKey | IDBKeyRange} query - The key or key range to query.
 * @returns {Promise<object[]>} A promise that resolves with an array of matching items.
 */
export async function getByIndex(storeName, indexName, query) {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const items = await index.getAll(query);
    await tx.done;
    console.log(`DB: Retrieved items from ${storeName} by index ${indexName}`, items);
    return items;
}

// Export store names for easy access
export { STORES };
