// Daily Hisab service worker. It only ever touches Daily Hisab's own files,
// so it can never interfere with any other app on the same github.io address.
// After uploading a new index.html, change the number below (v1 -> v2).
const PREFIX = 'daily-hisab-';
const CACHE  = PREFIX + 'v2';
const ASSETS = [
  './',
  './index.html',
  './daily-hisab.webmanifest',
  './dh-icons/icon-192.png',
  './dh-icons/icon-512.png',
  './dh-icons/icon-maskable-512.png',
  './dh-icons/apple-touch-icon.png',
  './dh-icons/favicon-32.png'
];
const OWN = new Set(ASSETS.map(a => new URL(a, self.registration.scope).href));

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys()
      // remove only OLD Daily Hisab caches, never another app's caches
      .then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX) && k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', (e)=>{
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  url.search = ''; url.hash = '';
  if(!OWN.has(url.href)) return;          // not ours: let the browser handle it normally

  e.respondWith(
    caches.open(CACHE).then(async cache=>{
      const cached = await cache.match(url.href);
      const network = fetch(req).then(res=>{
        if(res && res.ok) cache.put(url.href, res.clone());
        return res;
      }).catch(()=>null);
      if(cached){ e.waitUntil(network); return cached; }
      const res = await network;
      return res || new Response('Offline', {status:503});
    })
  );
});
