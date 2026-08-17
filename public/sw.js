/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Service Worker for BookMyNai PWA
 * Handles offline caching, push notifications, and app shell
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `bookmynai-${CACHE_VERSION}`;
const RUNTIME_CACHE = `bookmynai-runtime-${CACHE_VERSION}`;
const API_CACHE = `bookmynai-api-${CACHE_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json',
];

// API routes that should not be cached
const NO_CACHE_ROUTES = [
  '/api/auth/',
  '/api/bookings/',
  '/api/payments/',
  '/api/notifications/',
];

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(STATIC_ASSETS);
      // Force service worker to activate
      (self as any).skipWaiting();
    })()
  );
});

/**
 * Activate event - cleanup old caches
 */
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME && name !== RUNTIME_CACHE && name !== API_CACHE) {
            return caches.delete(name);
          }
        })
      );
      // Take control of all open pages
      (self as any).clients.claim();
    })()
  );
});

/**
 * Fetch event - implement cache strategy
 */
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip non-HTTPS and non-HTTP requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle API requests differently (no caching for sensitive data)
  if (url.pathname.startsWith('/api/')) {
    const shouldNotCache = NO_CACHE_ROUTES.some((route) => url.pathname.startsWith(route));

    if (shouldNotCache) {
      // Network first for sensitive API calls
      event.respondWith(
        fetch(request)
          .then((response) => response)
          .catch(() => {
            // Return offline response for critical APIs
            return new Response(
              JSON.stringify({
                success: false,
                error: { code: 'OFFLINE', message: 'You are offline. Please reconnect.' },
              }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          })
      );
      return;
    }

    // Cache public APIs
    event.respondWith(
      caches.open(API_CACHE).then((cache) =>
        fetch(request)
          .then((response) => {
            if (response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cache.match(request) || new Response('Offline', { status: 503 }))
      )
    );
    return;
  }

  // Handle static assets (cache first)
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Cache successful responses
        const responseToCache = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      });
    })
  );
});

/**
 * Push notification event
 */
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) {
    return;
  }

  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'BookMyNai notification',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/icon-192x192.png',
      tag: data.tag || 'notification',
      requireInteraction: data.requireInteraction || false,
      data: data.data || {},
    };

    event.waitUntil(self.registration.showNotification(data.title || 'BookMyNai', options));
  } catch (error) {
    console.error('Error handling push notification:', error);
  }
});

/**
 * Notification click event
 */
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    (async () => {
      const clients = await (self as any).clients.matchAll({ type: 'window', includeUncontrolled: true });

      // Check if app is already open
      for (const client of clients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return (client as any).focus();
        }
      }

      // Open new window if not already open
      if ((self as any).clients.openWindow) {
        return (self as any).clients.openWindow(urlToOpen);
      }
    })()
  );
});

/**
 * Notification close event
 */
self.addEventListener('notificationclose', (event: NotificationEvent) => {
  event.notification.close();
});
