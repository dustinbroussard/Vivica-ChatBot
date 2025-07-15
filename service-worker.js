// service-worker.js
// Code Maniac - Service Worker for Vivica Chat App (PWA)

/**
 * @fileoverview This file implements a Service Worker for the Vivica chat application.
 * It enables offline capabilities, caching of static assets, and potentially
 * push notifications (though push is not implemented in this basic version).
 *
 * IMPORTANT:
 * 1. This file must be placed in the root directory of your application
 * to control the entire scope.
 * 2. Cache names should be versioned to allow for easy updates.
 * 3. Consider a 'cache-first, then network' strategy for assets.
 */

const CACHE_NAME = 'vivica-cache-v1'; // Increment this version on every update
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/main.js',
    '/js/db-utils.js',
    '/js/storage-wrapper.js',
    '/js/android-bridge.js',
    '/js/theme-toggle.js',
    '/images/logo.png',
    '/images/logo2.png',
    // External libraries that are critical for offline use
    'https://cdn.jsdelivr.net/npm/idb@7/build/umd.js',
    'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.min.js', // If sql.js is critical
    'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-okaidia.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

/**
 * Event listener for the 'install' event.
 * This is where we pre-cache static assets.
 */
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching essential assets:', ASSETS_TO_CACHE);
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch((error) => {
                console.error('[Service Worker] Caching failed:', error);
            })
    );
    self.skipWaiting(); // Forces the waiting service worker to become the active service worker
});

/**
 * Event listener for the 'activate' event.
 * This is where we clean up old caches.
 */
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName.startsWith('vivica-cache-') && cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[Service Worker] Activation complete. Claiming clients...');
            return self.clients.claim(); // Take control of un-controlled clients
        })
    );
});

/**
 * Event listener for the 'fetch' event.
 * This handles network requests and serves cached content when available.
 */
self.addEventListener('fetch', (event) => {
    // Only cache GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Check if the request is for an external URL that we want to cache
    const url = new URL(event.request.url);
    const isExternalAsset = ASSETS_TO_CACHE.includes(event.request.url) ||
                            ASSETS_TO_CACHE.some(assetUrl => url.href.startsWith(assetUrl));

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Return cached response if found
            if (cachedResponse) {
                console.log('[Service Worker] Serving from cache:', event.request.url);
                return cachedResponse;
            }

            // If not in cache, fetch from network
            console.log('[Service Worker] Fetching from network:', event.request.url);
            return fetch(event.request)
                .then((response) => {
                    // Check if we received a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // If it's an asset we want to cache, clone the response and cache it
                    if (isExternalAsset || ASSETS_TO_CACHE.includes(event.request.url)) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                            console.log('[Service Worker] Cached new asset:', event.request.url);
                        });
                    }
                    return response;
                })
                .catch((error) => {
                    console.error('[Service Worker] Fetch failed:', event.request.url, error);
                    // You could serve an offline page here if the request fails
                    // return caches.match('/offline.html');
                    return new Response('<h1>Offline</h1><p>Please check your internet connection.</p>', {
                        headers: { 'Content-Type': 'text/html' }
                    });
                });
        })
    );
});

/**
 * Event listener for the 'message' event.
 * Useful for communication between the main app and the service worker.
 */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
        console.log('[Service Worker] Skip waiting command received.');
    }
});
