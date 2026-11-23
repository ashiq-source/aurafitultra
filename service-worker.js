const CACHE='aurafit-ultra-v10-bundled-android';
const CORE=['./','./aurafit-ultra.html','./aurafit-ultra.css','./bundles/aurafit-cloud.js','./bundles/aurafit-gemini.js','./bundles/aurafit-android.js','./bundles/aurafit-ultra-app.js','./aurafit-phase5.js','./aurafit-phase6.js','./aurafit-phase7.js','./aurafit-phase8.js','./aurafit-config.js','./aurafit-cloud.js','./aurafit-android.js','./aurafit-android.css','./aurafit-ultra-data-layer.js','./manifest.webmanifest','./icons/icon.svg'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(CORE);await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
  const u=new URL(event.request.url);if(u.origin!==self.location.origin||u.pathname.startsWith('/api/'))return;
  if(event.request.method!=='GET')return;
  event.respondWith((async()=>{const cached=await caches.match(event.request);if(cached)return cached;try{const live=await fetch(event.request);if(live.ok&&event.request.destination!=='document'){const c=await caches.open(CACHE);c.put(event.request,live.clone());}return live;}catch{if(event.request.mode==='navigate')return (await caches.match('./aurafit-ultra.html'))||Response.error();return cached||Response.error();}})());
});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{const wins=await clients.matchAll({type:'window',includeUncontrolled:true});for(const w of wins){if('focus'in w){await w.focus();return;}}if(clients.openWindow)await clients.openWindow('./aurafit-ultra.html');})());});
