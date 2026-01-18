// ExamHub Service Worker v2 - Enhanced PWA Support
const CACHE_VERSION = 'examhub-v3';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Static assets to precache
const PRECACHE_ASSETS = [
    '/',
    '/login',
    '/register',
    '/student/dashboard',
    '/manifest.json',
    '/offline.html',
];

// Cache size limits
const CACHE_LIMITS = {
    dynamic: 50,
    images: 30,
};

// Install event - precache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => cache.addAll(PRECACHE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
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

    // Cache first - for static assets
    cacheFirst: async (request, cacheName) => {
        const cached = await caches.match(request);
        if (cached) return cached;

        try {
            const response = await fetch(request);
            if (response.ok) {
                const cache = await caches.open(cacheName);
                cache.put(request, response.clone());
            }
            return response;
        } catch (error) {
            return caches.match('/offline.html');
        }
    },

    // Stale while revalidate - for images
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

    // Skip non-http/https requests (e.g. chrome-extension://)
    if (!url.protocol.startsWith('http')) return;

    // Skip API requests - always network
    if (url.pathname.startsWith('/api')) return;

    // Skip Supabase requests
    if (url.hostname.includes('supabase')) return;

    // Skip exam taking and arena - require fresh data
    if (url.pathname.includes('/take') || url.pathname.includes('/arena')) return;

    // Images - stale while revalidate
    if (request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico)$/i)) {
        event.respondWith(strategies.staleWhileRevalidate(request, IMAGE_CACHE));
        return;
    }

    // Static assets - cache first
    if (url.pathname.match(/\.(js|css|woff2?|ttf|eot)$/i) || PRECACHE_ASSETS.includes(url.pathname)) {
        event.respondWith(strategies.cacheFirst(request, STATIC_CACHE));
        return;
    }

    // HTML pages - network first
    if (request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(strategies.networkFirst(request, DYNAMIC_CACHE));
        return;
    }

    // Default - network first
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
            // Focus existing window if open
            for (const client of clientList) {
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }
            // Open new window
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
    // This would sync any offline exam submissions when back online
    // Implementation depends on IndexedDB storage of pending submissions
    console.log('[SW] Background sync triggered');
}
