/* Push only: no API caching, account tokens, or third-party navigation. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    if (!await self.registration.pushManager.getSubscription()) return;
    // Do not expose incoming article/search content on a shared lock screen.
    await self.registration.showNotification("Sentinel", {
      body: "New updates are ready. Open Sentinel to view them.",
      icon: "/sentinel.svg", badge: "/sentinel.svg", tag: "sentinel-updates",
    });
  })());
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const target = new URL("/alerts", self.location.origin).href;
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) {
      const client = await existing.navigate(target);
      return (client || existing).focus();
    }
    return self.clients.openWindow(target);
  })());
});
