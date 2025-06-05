// キャッシュ名
const CACHE_NAME = 'estate-app-v1';

// キャッシュするファイル
const urlsToCache = [
  '/',
  '/css/style.css',
  '/js/app.js',
  '/js/storage.js',
  '/js/dashboard.js',
  '/js/inventory.js',
  '/js/sales.js',
  '/js/transactions.js',
  '/js/reports.js',
  '/js/export.js',
  '/js/notifications.js',
  '/js/calendar.js',
  '/js/effects.js',
  '/js/yearly.js',
  '/js/goals.js',
  '/js/memos.js',
  '/js/todos.js'
];

// インストール時
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// フェッチ時
self.addEventListener('fetch', event => {
  // POSTリクエストやAPIリクエストはキャッシュしない
  if (event.request.method !== 'GET' || event.request.url.includes('/.netlify/functions/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュがあればそれを返す、なければネットワークから取得
        return response || fetch(event.request).then(fetchResponse => {
          // GETリクエストのみキャッシュに追加
          if (event.request.method === 'GET' && !event.request.url.includes('/.netlify/functions/')) {
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, fetchResponse.clone());
              return fetchResponse;
            });
          }
          return fetchResponse;
        });
      })
  );
});

// アクティベート時
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});