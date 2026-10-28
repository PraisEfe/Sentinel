const OWNER_KEY = "sentinel_push_owner";
const workerPath = "/push-sw.js";
let job = Promise.resolve();
const serial = (action) => {
  const next = job.catch(() => {}).then(action);
  job = next.catch(() => {});
  return next;
};
export function pushSupport() {
  return window.isSecureContext && typeof window.Notification !== "undefined" && !!navigator.serviceWorker && typeof window.PushManager !== "undefined";
}
async function registration() {
  const current = await navigator.serviceWorker.getRegistration("/");
  const script = current?.active?.scriptURL || current?.waiting?.scriptURL || current?.installing?.scriptURL;
  return script && new URL(script).pathname === workerPath ? current : null;
}
export async function devicePushEnabled(api, userId) {
  if (!pushSupport() || Notification.permission !== "granted" || localStorage.getItem(OWNER_KEY) !== userId) return false;
  const worker = await registration();
  const subscription = await worker?.pushManager.getSubscription();
  if (!subscription) return false;
  const result = await api("/push/subscriptions");
  if (!Array.isArray(result?.data)) throw Error("We couldn’t check this device. Please try again.");
  return result.data.some((item) => item.endpoint === subscription.endpoint && !item.revoked_at && item.user_id === userId);
}
function decodeKey(key) {
  try {
    const raw = atob(key.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(raw, (character) => character.charCodeAt(0));
    if (bytes.length !== 65 || bytes[0] !== 4) throw Error();
    return bytes;
  } catch { throw Error("Notifications aren’t available right now. Please try again later."); }
}
export function enableDevicePush(api, userId, isCurrent) {
  if (!pushSupport()) return Promise.reject(Error("Use a supported browser on HTTPS to enable notifications."));
  // Invoke directly from the click, before network or service-worker awaits.
  const permission = Notification.permission === "granted" ? Promise.resolve("granted") : Notification.requestPermission();
  return permission.then((granted) => {
    if (granted !== "granted") throw Error("Notifications are blocked. Allow them in your browser’s site settings to continue.");
    return serial(async () => {
      const check = () => { if (!isCurrent()) throw Error("Your account changed. Please try again."); };
      check();
      const key = await api("/push/public-key");
      const applicationServerKey = decodeKey(key.public_key);
      check();
      let worker = await registration();
      if (!worker) worker = await navigator.serviceWorker.register(workerPath, { scope: "/", updateViaCache: "none" });
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Error("Notifications are taking too long to start. Please try again.")), 15000);
        navigator.serviceWorker.ready.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
      });
      check();
      let subscription = await worker.pushManager.getSubscription();
      if (subscription && localStorage.getItem(OWNER_KEY) !== userId) {
        // A browser subscription must never be silently shared across accounts.
        if (!await subscription.unsubscribe()) throw Error("We couldn’t prepare this device. Please try again.");
        subscription = null;
      }
      let created = false;
      try {
        if (!subscription) {
          subscription = await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
          created = true;
        }
        check();
        const value = subscription.toJSON();
        if (!value.endpoint || !value.keys?.p256dh || !value.keys?.auth) throw Error("We couldn’t register this browser. Please try again.");
        const existing = await api("/push/subscriptions");
        if (!Array.isArray(existing?.data)) throw Error("We couldn’t check this device. Please try again.");
        if (!existing.data.some((item) => item.endpoint === subscription.endpoint && !item.revoked_at && item.user_id === userId && item.p256dh === value.keys.p256dh && item.auth === value.keys.auth)) {
          check();
          const saved = await api("/push/subscriptions", { method: "POST", body: {
            endpoint: value.endpoint, p256dh: value.keys.p256dh, auth: value.keys.auth,
            device_name: "Sentinel web browser",
          } });
          if (!saved.data?.id || saved.data.endpoint !== value.endpoint || saved.data.user_id !== userId || saved.data.revoked_at)
            throw Error("We couldn’t confirm this device’s registration. Please try again.");
        }
        check();
        localStorage.setItem(OWNER_KEY, userId);
      } catch (error) {
        if (created) await subscription?.unsubscribe().catch(() => {});
        throw error;
      }
      // Keep the registration if this final preference update fails, so retry can
      // finish enabling delivery without creating a second subscription.
      await api("/settings/notifications", { method: "PATCH", body: { channel_web_push: true } });
      check();
    });
  });
}
export function disableDevicePush(api, userId) {
  return serial(async () => {
    if (!pushSupport()) return { cleanupFailed: false };
    const worker = await registration();
    const subscription = await worker?.pushManager.getSubscription();
    if (!subscription) { localStorage.removeItem(OWNER_KEY); return { cleanupFailed: false }; }
    if (localStorage.getItem(OWNER_KEY) !== userId) return { cleanupFailed: false };
    // Stop local delivery first, even when the network is unavailable.
    if (!await subscription.unsubscribe()) throw Error("We couldn’t stop notifications on this device. Please try again.");
    localStorage.removeItem(OWNER_KEY);
    let cleanupFailed = false;
    try {
      const result = await api("/push/subscriptions");
      if (!Array.isArray(result?.data)) throw Error();
      for (const item of result.data.filter((item) => item.endpoint === subscription.endpoint && item.user_id === userId && !item.revoked_at))
        await api(`/push/subscriptions/${encodeURIComponent(item.id)}`, { method: "DELETE" });
    } catch { cleanupFailed = true; }
    return { cleanupFailed };
  });
}
export function stopLocalPush(userId) {
  return serial(async () => {
    if (!pushSupport() || localStorage.getItem(OWNER_KEY) !== userId) return;
    const worker = await registration();
    const subscription = await worker?.pushManager.getSubscription();
    if (localStorage.getItem(OWNER_KEY) !== userId) return;
    if (subscription && !await subscription.unsubscribe()) throw Error("Could not stop device notifications.");
    localStorage.removeItem(OWNER_KEY);
    if (worker) for (const notification of await worker.getNotifications()) notification.close();
  });
}
