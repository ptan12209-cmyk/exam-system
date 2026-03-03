// ExamHub Service Worker v4 - Fixed aggressive caching
const CACHE_VERSION = 'examhub-v4';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Only cache truly static assets (manifests, icons)
const PRECACHE_ASSETS = [
    '/manifest.json',
    '/offline.html',
];

// Cache size limits
const CACHE_LIMITS = {
    dynamic: 30,
    images: 30,
};

// Install event - precache minimal assets + force activate immediately
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => cache.addAll(PRECACHE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up ALL old caches aggressively
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name.startsWith('examhub-') && !name.startsWith(CACHE_VERSION))
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Helper: Limit cache size
async function limitCacheSize(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
        await cache.delete(keys[0]);
        return limitCacheSize(cacheName, maxItems);
    }
}

// Fetch strategies
const strategies = {
    // Network first - for dynamic content
    networkFirst: async (request, cacheName) => {
        try {
            const response = await fetch(request);
            if (response.ok) {
                const cache = await caches.open(cacheName);
                cache.put(request, response.clone());
                limitCacheSize(cacheName, CACHE_LIMITS.dynamic);
            }
            return response;
        } catch (error) {
            const cached = await caches.match(request);
            return cached || caches.match('/offline.html');
        }
    },

    // Stale while revalidate - for images only
    staleWhileRevalidate: async (request, cacheName) => {
        const cached = await caches.match(request);

        const fetchPromise = fetch(request).then((response) => {
            if (response.ok) {
                const responseToCache = response.clone();
                caches.open(cacheName).then((cache) => {
                    cache.put(request, responseToCache);
                    limitCacheSize(cacheName, CACHE_LIMITS.images);
                });
            }
            return response;
        }).catch(() => cached);

        return cached || fetchPromise;
    },
};

// Fetch event handler
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip non-http/https requests
    if (!url.protocol.startsWith('http')) return;

    // Skip API requests - always network
    if (url.pathname.startsWith('/api')) return;

    // Skip Supabase requests
    if (url.hostname.includes('supabase')) return;

    // Skip exam taking and arena - require fresh data
    if (url.pathname.includes('/take') || url.pathname.includes('/arena')) return;

    // Images only - stale while revalidate
    if (request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico)$/i)) {
        event.respondWith(strategies.staleWhileRevalidate(request, IMAGE_CACHE));
        return;
    }

    // EVERYTHING ELSE (JS, CSS, HTML, fonts) - Network First
    // This ensures users always get the latest code after deploy
    event.respondWith(strategies.networkFirst(request, DYNAMIC_CACHE));
});

// Push notification handler
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const { title, body, icon, url } = data;

    event.waitUntil(
        self.registration.showNotification(title || 'ExamHub', {
            body: body || 'Bạn có thông báo mới',
            icon: icon || '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            vibrate: [200, 100, 200],
            data: { url },
            actions: [
                { action: 'open', title: 'Mở' },
                { action: 'close', title: 'Đóng' },
            ],
        })
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') return;

    const url = event.notification.data?.url || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

// Background sync for offline submissions
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-submissions') {
        event.waitUntil(syncOfflineSubmissions());
    }
});

async function syncOfflineSubmissions() {
    console.log('[SW] Background sync triggered');
}
