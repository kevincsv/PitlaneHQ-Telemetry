/* Pitlane HQ web app: opens fast and works offline. Every app file is asked from the server first (so a new version is
   seen at once, as before); when the network is slow (over 3 s) or gone, the last copy kept here answers instead. Only
   the app's own files are kept: never the account, sync or live answers. */
const CACHE = "pitlanehq-app-2";
const SHELL = ["/app", "/fonts.css", "/pitwall-games.js", "/pitwall-analysis.js", "/pitwall-aicoach.js", "/pitwall-i18n.js",
  "/pitwall-overlays.js", "/pitwall-overlays-settings.js", "/pitwall-ui-v1.js", "/pitwall-my-laps-v2.js", "/pitwall-model.js",
  "/pitwall-demo.js", "/pitwall-tour.js", "/manifest.webmanifest", "/icon-192.png", "/logo.svg"];
const APP_FILE = /^\/(|fonts\.css|pitwall-[a-z0-9-]+\.js|manifest\.webmanifest|favicon\.ico|favicon-32\.png|icon-\d+\.png|logo\.svg|whats-new\.json|app-news\.json)$/;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // the app page itself (/app, and "/" with the app's parameters) and its files; a visitor's "/" (the light landing) is
  // kept apart from it; everything else (account, community, live) goes straight to the network
  const isPage = req.mode === "navigate" && (url.pathname === "/" || url.pathname === "/app");
  if (!isPage && !APP_FILE.test(url.pathname)) return;
  if (url.pathname === "/" && url.searchParams.get("embed") === "1") return;
  const landing = url.pathname === "/" && [...url.searchParams.keys()].every((k) => /^(utm_[a-z]+|ref|fbclid|gclid|msclkid)$/.test(k));
  const key = isPage ? (landing ? "/" : "/app") : url.pathname;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const net = fetch(req).then((r) => { if (r && r.ok) cache.put(key, r.clone()).catch(() => {}); return r; });
    const kept = await cache.match(key);
    if (!kept) return net;
    // the network first; the kept copy after 3 s or when the network fails
    return Promise.race([net.catch(() => kept), new Promise((ok) => setTimeout(() => ok(kept), 3000))]);
  })());
});
