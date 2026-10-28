import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { request, workspacePath } from "../../lib/api";
import { pushSupport, devicePushEnabled, enableDevicePush, disableDevicePush } from "../../lib/push";

function currentRequest() {
  const { session, workspaceId, authVersion, user } = useAppStore.getState();
  const isCurrent = () => {
    const current = useAppStore.getState();
    return current.authVersion === authVersion && current.workspaceId === workspaceId && current.user?.id === user?.id;
  };
  return { userId: user?.id, isCurrent, api: (path, options = {}) => {
    if (!isCurrent() || !session) throw Error("Your account changed. Please try again.");
    return request(path.startsWith("/push/") ? path : workspacePath(workspaceId, path), { ...options, token: session.token });
  } };
}
export default function BrowserPushSettings({ onChange, deliveryEnabled }) {
  const userId = useAppStore((state) => state.user?.id);
  const workspaceId = useAppStore((state) => state.workspaceId);
  const [registered, setRegistered] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const supported = pushSupport();
  useEffect(() => {
    let active = true;
    const context = currentRequest();
    devicePushEnabled(context.api, context.userId).then((enabled) => { if (active) setRegistered(enabled); })
      .catch(() => { if (active) setError("We couldn’t check this device. You can try enabling notifications again."); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [userId, workspaceId]);
  async function action(disable) {
    if (busy) return;
    const context = currentRequest();
    setBusy(true); setError(""); setMessage("");
    try {
      if (disable) {
        const result = await disableDevicePush(context.api, context.userId);
        if (!context.isCurrent()) return;
        setRegistered(false);
        setMessage(result.cleanupFailed ? "Notifications stopped on this device. We couldn’t finish updating the service." : "Notifications stopped on this device.");
      } else {
        await enableDevicePush(context.api, context.userId, context.isCurrent);
        if (!context.isCurrent()) return;
        setRegistered(true);
        setMessage("Browser notifications enabled for this workspace on this device.");
        onChange();
      }
    } catch (failure) {
      if (context.isCurrent()) setError(failure.name === "ApiError" || failure.constructor === Error ? failure.message : "We couldn’t enable notifications. Please check your browser settings and try again.");
    } finally { if (context.isCurrent()) setBusy(false); }
  }
  return <section className="browser-push-settings" aria-label="Browser notifications">
    <h3><BellRing size={15} /> Browser notifications</h3>
    <p>Receive private update reminders, even when Sentinel isn’t open. Permission is requested only when you enable this device.</p>
    {!supported && <p className="metric-subtitle">Use a supported browser on HTTPS or localhost. On iPhone or iPad, you may need to add Sentinel to your Home Screen first.</p>}
    {supported && Notification.permission === "denied" && <p className="metric-subtitle">Notifications are blocked. Allow them in your browser’s site settings, then try again.</p>}
    {checking && <p className="metric-subtitle">Checking this device…</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {message && <p className="inline-success" role="status">{message}</p>}
    <div className="browser-push-actions">
      {!(registered && deliveryEnabled) && <button type="button" className="outline-button" disabled={!supported || checking || busy} onClick={() => action(false)}>{busy ? "Enabling…" : "Enable on this device"}</button>}
      {registered && <button type="button" className="text-link" disabled={checking || busy} onClick={() => action(true)}>{busy ? "Updating…" : "Disable on this device"}</button>}
    </div>
    <small>Device registration belongs to your account. Disabling this device leaves other devices unchanged. Lock-screen messages do not include article or search details.</small>
  </section>;
}
