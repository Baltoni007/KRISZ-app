// KRISZ App service worker: offline működés és értesítések
importScripts("config.js?v=10");
const VERSION = "krisz-v10";
const SHELL = [
  "./", "index.html", "styles.css?v=10", "app.js?v=10", "config.js?v=10", "data.json", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/favicon-32.png", "icons/logo-mask.png",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Az adatbázis-kéréseket nem gyorsítótárazzuk; az app maga őrzi meg a legutóbbi adatokat.
  if (url.hostname.endsWith("supabase.co")) return;
  const isShell = url.origin === self.location.origin || url.hostname === "cdn.jsdelivr.net" || url.hostname.startsWith("fonts.");
  if (!isShell) return;
  // Hálózat előbb, hogy a frissítések azonnal megjelenjenek; offline a tárolt változat.
  e.respondWith(
    fetch(req).then((res) => {
      if (res && (res.ok || res.type === "opaque")) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then((m) => m || caches.match("index.html")))
  );
});

self.addEventListener("push", (e) => {
  let data = { title: "KRISZ", body: "", url: "./" };
  try { data = Object.assign(data, e.data.json()); } catch (err) { if (e.data) data.body = e.data.text(); }
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: "icons/icon-192.png",
    badge: "icons/favicon-32.png",
    data: { url: data.url }
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = new URL(e.notification.data && e.notification.data.url || "./", self.registration.scope).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if (c.url.startsWith(self.registration.scope)) { c.navigate(target); return c.focus(); } }
      return self.clients.openWindow(target);
    })
  );
});

// Ha a böngésző lecseréli a feliratkozást, az új címet csendben elmentjük, hogy az értesítések ne álljanak le.
self.addEventListener("pushsubscriptionchange", (e) => {
  const cfg = self.KRISZ_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.vapidPublicKey) return;
  const key = Uint8Array.from(atob(cfg.vapidPublicKey.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - cfg.vapidPublicKey.length % 4) % 4)), (c) => c.charCodeAt(0));
  e.waitUntil(
    self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }).then((sub) => {
      const j = sub.toJSON();
      return fetch(cfg.supabaseUrl + "/rest/v1/push_subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: cfg.supabaseKey, Authorization: "Bearer " + cfg.supabaseKey, Prefer: "resolution=ignore-duplicates" },
        body: JSON.stringify({ endpoint: j.endpoint, subscription: j })
      });
    })
  );
});
