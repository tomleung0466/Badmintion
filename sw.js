const CACHE_NAME = 'plus1-pwa-v49';
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/app-version.js',
    './js/display-name.js',
    './js/locales/zh-Hant.js',
    './js/locales/zh-Hans.js',
    './js/i18n.js',
    './js/font-size.js',
    './js/appearance.js',
    './js/overlay-transition.js',
    './js/pwa.js',
    './js/app.js',
    './js/matches.js',
    './js/communities.js',
    './js/pull-refresh.js',
    './js/image-preview.js',
    './js/profile-avatar-crop.js',
    './js/host-qr-crop.js',
    './manifest.webmanifest',
    './icons/icon.svg',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_ASSETS))
            .catch(err => console.warn('[+1 SW] precache failed:', err))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
                    return response;
                })
                .catch(() => caches.match('./index.html'))
        );
        return;
    }

    // JS 用 network-first，避免快取舊版 auth.js 導致 Firebase 連線失效
    const isScript = url.pathname.endsWith('.js') || url.pathname.includes('/js/');
    if (isScript) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response && response.status === 200 && response.type === 'basic') {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;
            return fetch(request).then(response => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const copy = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
                return response;
            });
        })
    );
});
