// Daily Hisab service worker: makes the app open instantly and work offline.
// When you upload a new index.html, change the version number below (v1 -> v2)
// so phones drop the old copy.
const CACHE = 'hisab-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

// Show the saved copy immediately, and refresh it in the background for next time.
self.addEventListener('fetch', (e)=>{
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;

  e.respondWith(
    caches.open(CACHE).then(async cache=>{
      const cached = await cache.match(req, {ignoreSearch:true});
      const network = fetch(req).then(res=>{
        if(res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(()=>null);
      if(cached){ e.waitUntil(network); return cached; }
      const res = await network;
      if(res) return res;
      if(req.mode === 'navigate') return cache.match('./index.html');
      return new Response('Offline', {status:503});
    })
  );
});
