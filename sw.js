const CACHE_NAME = 'lifep-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/todo.css',
  '/css/notes.css',
  '/css/calendar.css',
  '/css/profile.css',
  '/css/music.css',
  '/js/firebase.js',
  '/js/firebase-config.js',
  '/js/cloudinary-config.js',
  '/js/todo.js',
  '/js/notes.js',
  '/js/calendar.js',
  '/js/profile.js',
  '/js/music.js',
  '/js/games.js',
  '/js/gallery.js',
  '/css/games.css',
  '/css/gallery.css',
  '/favicon.svg',
  '/manifest.json',
  '/icons/icon.svg'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Handle skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response
        const responseToCache = response.clone();

        // Update cache with new response
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        // Fallback to cache if offline
        return caches.match(event.request);
      })
  );
});
