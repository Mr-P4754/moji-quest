const CACHE_NAME = "kana-quest-v18";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./style.css?v=18",
  "./manifest.json",
  "./js/constants.js",
  "./js/constants.js?v=18",
  "./js/audio.js",
  "./js/audio.js?v=18",
  "./js/api.js",
  "./js/api.js?v=18",
  "./js/game.js",
  "./js/game.js?v=18",
  "./js/ui.js",
  "./js/ui.js?v=18",
  "./js/app.js",
  "./js/app.js?v=18",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Service Worker インストール時のキャッシュ登録
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ASSETS.map(asset => cache.add(asset))
      );
    })
  );
  self.skipWaiting();
});

// 古いキャッシュの削除とアクティベーション
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// オフライン完全対応のリクエストインターセプト（Network First & Offline Fallback）
self.addEventListener("fetch", event => {
  const isGoogleFonts = event.request.url.includes("fonts.googleapis.com") || event.request.url.includes("fonts.gstatic.com");
  const isSameOrigin = event.request.url.includes(self.location.origin);

  if (!isSameOrigin && !isGoogleFonts) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        // オフライン時はクエリ文字列を無視してキャッシュから検索
        const cachedResponse = await cache.match(event.request, { ignoreSearch: true });
        if (cachedResponse) {
          return cachedResponse;
        }

        // ナビゲーションリクエスト（画面遷移）の場合は index.html を返す
        if (event.request.mode === "navigate") {
          const indexResponse = await cache.match("./index.html");
          if (indexResponse) return indexResponse;
        }

        throw err;
      }
    })
  );
});
