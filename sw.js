// Service Worker for YE-48 Class Management PWA
const CACHE_NAME = 'ye48-class-v2';
const STATIC_CACHE = 'ye48-static-v2';
const DYNAMIC_CACHE = 'ye48-dynamic-v2';

// Assets to cache immediately on install - use absolute paths for Vercel compatibility
const STATIC_ASSETS = [
  '/',
  '/class.html',
  '/manifest.json',
  '/sw.js',
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%238B5CF6" rx="20" width="100" height="100"/><text x="50" y="65" font-size="50" text-anchor="middle" fill="white">🎓</text></svg>',
  'https://api.fontshare.com/v2/css?f[]=satoshi@900&f[]=inter@400,500,600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://unpkg.com/aos@2.3.1/dist/aos.css'
];

// Install event - cache static assets with fallback
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        // Try to cache all assets, but continue even if some fail
        return cache.addAll(STATIC_ASSETS)
          .then(() => console.log('[Service Worker] All assets cached'))
          .catch((err) => {
            console.log('[Service Worker] Some assets failed to cache, trying individually:', err);
            return cacheAssetsSequentially(cache);
          });
      })
      .then(() => self.skipWaiting())
      .catch((err) => console.log('[Service Worker] Cache install failed:', err))
  );
});

// Helper to cache assets one by one (fallback)
async function cacheAssetsSequentially(cache) {
  const results = [];
  for (const asset of STATIC_ASSETS) {
    try {
      await cache.add(asset);
      console.log('[Service Worker] Cached:', asset);
      results.push(asset);
    } catch (e) {
      console.log('[Service Worker] Failed to cache:', asset, e);
    }
  }
  return results;
}

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
            .map((key) => {
              console.log('[Service Worker] Removing old cache:', key);
              return caches.delete(key);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - implement caching strategies with better error handling
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) return;

  // Use network-first for HTML pages (class.html), cache-first for static assets
  if (url.pathname.includes('.html') || url.pathname.endsWith('/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache-first strategy for static assets
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Network-first strategy for API calls
  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Stale-while-revalidate for dynamic content
  event.respondWith(staleWhileRevalidate(request));
});

// Check if request is for static assets
function isStaticAsset(pathname) {
  const staticExtensions = ['.html', '.css', '.js', '.json', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2'];
  return staticExtensions.some((ext) => pathname.endsWith(ext)) || 
         pathname.includes('/static/') || 
         pathname.includes('/fonts/');
}

// Check if request is API call
function isApiRequest(url) {
  return url.hostname.includes('supabase') || 
         url.hostname.includes('telegram') ||
         url.pathname.includes('/api/');
}

// Cache-first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(JSON.stringify({ error: 'Offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        const cache = caches.open(DYNAMIC_CACHE);
        cache.then((c) => c.put(request, networkResponse.clone()));
      }
      return networkResponse;
    })
    .catch(() => null);

  return cachedResponse || fetchPromise || new Response('Offline', { status: 503 });
}

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'YE-48 Class Update';
  const options = {
    body: data.body || 'New class update available',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%238B5CF6" rx="20" width="100" height="100"/><text x="50" y="65" font-size="50" text-anchor="middle" fill="white">🎓</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%238B5CF6" rx="20" width="100" height="100"/><text x="50" y="65" font-size="50" text-anchor="middle" fill="white">🎓</text></svg>',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/class.html',
      dateOfArrival: Date.now()
    },
    actions: [
      { action: 'view', title: 'View' },
      { action: 'close', title: 'Close' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/class.html')
    );
  }
});

// Handle background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notices') {
    event.waitUntil(syncNotices());
  }
  if (event.tag === 'sync-routine') {
    event.waitUntil(syncRoutine());
  }
});

async function syncNotices() {
  // Background sync for notices
  console.log('[Service Worker] Syncing notices...');
}

async function syncRoutine() {
  // Background sync for routine
  console.log('[Service Worker] Syncing routine...');
}
