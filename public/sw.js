// sw.js - Service Worker for offline functionality
const CACHE_NAME = 'estate-app-v2'; // バージョンを上げる
const urlsToCache = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/storage.js',
    './js/dashboard.js',
    './js/inventory.js',
    './js/sales.js',
    './js/transactions.js',
    './js/reports.js',
    './js/export.js',
    './js/notifications.js',
    './js/calendar.js',
    './js/effects.js',
    './js/yearly.js',
    './js/goals.js',
    './js/memos.js',
    './js/todos.js',
    './manifest.json'
];

// インストール
self.addEventListener('install', event => {
    // 待機をスキップしてすぐにアクティブ化
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// フェッチ
self.addEventListener('fetch', event => {
    // POSTリクエストやAPIリクエストはキャッシュしない
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Netlify Functionsへのリクエストはキャッシュしない
    if (event.request.url.includes('/.netlify/functions/')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // キャッシュがあればそれを返す
                if (response) {
                    return response;
                }
                
                // なければネットワークから取得
                return fetch(event.request).then(response => {
                    // 正常なレスポンスでない場合はそのまま返す
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // GETリクエストのみキャッシュに保存
                    if (event.request.method === 'GET') {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                    }
                    
                    return response;
                });
            })
            .catch(() => {
                // オフライン時のフォールバック
                return caches.match('./index.html');
            })
    );
});

// アクティベート
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // すぐに新しいService Workerを有効化
            return self.clients.claim();
        })
    );
});

// バックグラウンド同期
self.addEventListener('sync', event => {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    // 将来的にサーバーとの同期処理を実装
    console.log('Background sync triggered');
}