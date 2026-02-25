// Service Worker for YE-48 Class Management PWA
const CACHE_NAME = 'ye48-class-v6';

// Install event - simplified
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cache opened');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => {
      console.log('[SW] Activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - network only, no caching for now
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Let browser handle all requests normally
  // This avoids the cache.put() error
  event.respondWith(fetch(request));
});

// ============================================
// Firebase Cloud Messaging
// ============================================

// Import Firebase SDK
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase configuration
firebase.initializeApp({
    apiKey: "AIzaSyAHipj0-We5umz34g8ClOrJMC_eIZ34ZCc",
    authDomain: "class-management-259b0.firebaseapp.com",
    projectId: "class-management-259b0",
    storageBucket: "class-management-259b0.firebasestorage.app",
    messagingSenderId: "323469080053",
    appId: "1:323469080053:web:ff4f7efb380810caa49cbc"
});

// Get Firebase Messaging instance
const messaging = firebase.messaging();

// Handle background messages (when app is closed or in background)
messaging.onBackgroundMessage(function(payload) {
    console.log('[SW] Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'YE-48 Update';
    const notificationBody = payload.notification?.body || 'You have a new notice';
    
    // Show notification
    return self.registration.showNotification(notificationTitle, {
        body: notificationBody,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: 'ye-48-notice',
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: payload.data || { url: '/' }
    });
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event);
    event.notification.close();

    // Open the app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Focus existing window if open
            for (const client of clientList) {
                if (client.url.includes('class.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Open new window
            if (clients.openWindow) {
                return clients.openWindow('/class.html');
            }
        })
    );
});

// Push event handler (for when push notification is received)
self.addEventListener('push', (event) => {
    console.log('[SW] Push event received:', event);
    
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'YE-48 Class Update';
    const options = {
        body: data.body || 'New class update available',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        vibrate: [100, 50, 100],
        data: { url: data.url || '/' }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

console.log('[SW] Service Worker loaded with Firebase Messaging');
