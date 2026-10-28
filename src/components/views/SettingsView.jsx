import BrowserPushSettings from "../common/BrowserPushSettings";
import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import {
  ArrowRight,
  Bell,
  Globe,
  Radio,
  Search,
  UserRound,
} from "lucide-react";
import { PageMotion, ResourceState, Toggle } from "../common/WorkspaceUI";
import { enabled, useResource, useWorkspace } from "../../lib/workspace";
const tabs = [
  ["Search & discovery", "Set default sources and views", Search],
  ["Monitoring defaults", "Manage monitoring behaviour", Radio],
  ["Notifications", "Receive updates", Bell],
  ["Sources & languages", "Manage sources and languages", Globe],
  ["Account", "Manage account", UserRound],
];
function SettingsPanel({ tab }) {
  const { api, preferences, savePreferences, user, onUserUpdate } =
    useWorkspace();
  const path =
    tab === "Monitoring defaults"
      ? "/settings/monitoring-defaults"
      : tab === "Notifications"
        ? "/settings/notifications"
        : tab === "Sources & languages"
          ? "/settings/sources"
          : tab === "Account"
            ? "/auth/me"
            : null;
  const resource = useResource(path);
  const [changes, setChanges] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [localChanges, setLocalChanges] = useState({});
  const sourceList = Array.isArray(resource.data?.data) ? resource.data.data : [];
  const languages = (source) => Array.isArray(source.language_codes)
    ? source.language_codes : (source.language_codes || "en").split(/[,\s]+/);
  const sourceEnabled = (source) => get(`source_${source.id}`, enabled(source.enabled_for_workspace));
  const sourceGroup = (label, types, description) => {
    const list = sourceList.filter((source) => types.includes(source.type) && source.is_active);
    return <Toggle key={label} label={label} description={list.length ? description : "No active sources available in this group."}
      checked={list.length > 0 && list.every(sourceEnabled)} disabled={!list.length}
      onChange={(value) => { setChanges((previous) => ({ ...previous, ...Object.fromEntries(list.map((source) => [`source_${source.id}`, value])) })); setMessage(""); }} />;
  };
  const response = resource.data;
  const raw = response?.data ?? response;
  const data = raw && !Array.isArray(raw) ? raw : {};
  const get = (name, fallback) => (name in changes ? changes[name] : fallback);
  function change(name, value) {
    setChanges((previous) => ({ ...previous, [name]: value }));
    setMessage("");
  }
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!path) {
        savePreferences({ ...preferences, ...changes });
        setMessage("Preferences saved on this device.");
      } else {
        let body = changes;
        if (tab === "Sources & languages")
          body = {
            sources: (Array.isArray(raw) ? raw : [])
              .filter((source) => `source_${source.id}` in changes || "french" in changes)
              .map((source) => ({
                source_id: source.id,
                enabled: sourceEnabled(source),
                ...("french" in changes ? { language_codes: changes.french
                  ? [...new Set([...languages(source), "en", "fr"])]
                  : languages(source).filter((code) => code !== "fr") } : {}),
              })),
          };
        if (!Object.keys(changes).length && !Object.keys(localChanges).length) {
          setMessage("No changes to save.");
          return;
        }
        if (tab === "Account" && "name" in body && !body.name.trim())
          throw Error("Enter your full name.");
        const result = Object.keys(changes).length
          ? await api(path, { method: "PATCH", body }) : null;
        if (Object.keys(localChanges).length) savePreferences({ ...preferences, ...localChanges });
        if (tab === "Account" && result)
          onUserUpdate(result.data || result.user || { ...user, ...changes });
        setMessage("Changes saved.");
        resource.reload();
      }
      setChanges({});
      setLocalChanges({});
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  const locked = busy || resource.loading || !!resource.error;
  const searchRows = [
    [
      "groupStories",
      "Group similar stories automatically",
      "Combine duplicate and highly similar reports into a single story.",
    ],
    [
      "includeSocial",
      "Include public social sources",
      "Include public social mentions in your search results.",
    ],
    [
      "aiSummaries",
      "Show AI-generated summaries",
      "Display available summaries when you open a story.",
    ],
    [
      "detectTone",
      "Detect discussion tone",
      "Show the sentiment supplied for each result.",
    ],
  ];
  return (
    <form className="settings-panel" onSubmit={save}>
      <div className="settings-panel-heading">
        <div>
          <h2>{tab}</h2>
          <p>
            {tab === "Search & discovery"
              ? "Set the defaults used on this device."
              : tab === "Monitoring defaults" ? "Choose how newly created monitors scan for information."
                : tab === "Notifications" ? "Decide which discoveries should notify you and where."
                : tab === "Sources & languages" ? "Choose the public sources and languages included in discovery."
                : "Manage workspace behavior and account preferences."}
          </p>
        </div>
        <button className="primary-button" disabled={locked}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
      <ResourceState resource={resource} />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="inline-success" role="status">
          {message}
        </p>
      )}
      <fieldset disabled={locked}>
        {tab === "Search & discovery" &&
          searchRows.map(([key, label, description]) => (
            <Toggle
              key={key}
              label={label}
              description={description}
              checked={get(key, preferences[key])}
              onChange={(value) => change(key, value)}
            />
          ))}
        {tab === "Monitoring defaults" && (
          <>
            <Toggle label="Scan every 20 minutes" description="Use a twenty-minute discovery interval for new monitors. Turning off uses a thirty-minute interval."
              checked={get("frequency", data.frequency) === "20m"} onChange={(value) => change("frequency", value ? "20m" : "30m")} />
            <Toggle
              label="Track related keywords"
              description="Include related terms when creating monitors."
              checked={get(
                "include_related_terms",
                data.include_related_terms || false,
              )}
              onChange={(value) => change("include_related_terms", value)}
            />
            <Toggle label="Discover emerging topics" description="Emerging stories are available in Intelligence; automatic monitoring of them is not available yet." checked={false} disabled />
            <Toggle label="Include historical matches" description="Search up to thirty days of available history when a monitor is created. Off retains the API minimum of one day."
              checked={Number(get("history_days", data.history_days)) > 1} onChange={(value) => change("history_days", value ? 30 : 1)} />
            <details className="settings-advanced"><summary>Advanced monitoring settings</summary>
            <label className="settings-field">
              Monitoring frequency
              <select
                aria-label="Default monitoring frequency"
                value={get("frequency", data.frequency || "")}
                onChange={(e) => change("frequency", e.target.value)}
              >
                <option value="" disabled>
                  Choose frequency
                </option>
                {[
                  ["5m", "5 minutes"],
                  ["10m", "10 minutes"],
                  ["20m", "20 minutes"],
                  ["30m", "30 minutes"],
                  ["1h", "1 hour"],
                  ["24h", "24 hours"],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="settings-field">
              History to include (days)
              <input
                aria-label="History days"
                type="number"
                min="1"
                max="30"
                value={get("history_days", data.history_days || "")}
                onChange={(e) => change("history_days", Number(e.target.value))}
              />
            </label>
            </details>
            {Array.isArray(raw) && (
              <p className="field-hint">
                Choose values to set your defaults. Existing defaults were not
                supplied as named fields.
              </p>
            )}
          </>
        )}
        {tab === "Notifications" && (
          <>
            <Toggle label="High-velocity topic alerts" description="Notify me when discussion grows substantially above its normal baseline."
              checked={get("notify_velocity", data.alerts?.velocity)} onChange={(value) => change("notify_velocity", value)} />
            <Toggle label="Major source alerts" description="Notify me when a high-authority publication mentions a monitored topic."
              checked={get("notify_high_authority", data.alerts?.high_authority)} onChange={(value) => change("notify_high_authority", value)} />
            <Toggle label="New result digest" description="Send a digest every twenty minutes. Turning off switches to a daily digest."
              checked={get("digest_cadence", data.digest_cadence) === "20m"} onChange={(value) => change("digest_cadence", value ? "20m" : "daily")} />
            <Toggle label="Email notifications" description={data.email_available === false ? "Email delivery is not available yet." : `Also deliver selected alerts to ${user?.email || "your account email"}.`}
              checked={get("channel_email", data.channels?.email)} disabled={data.email_available === false} onChange={(value) => change("channel_email", value)} />
            <BrowserPushSettings deliveryEnabled={!!data.channels?.web_push} onChange={resource.reload} />
            <details className="settings-advanced"><summary>Advanced notification settings</summary>
              <label className="settings-field">Digest frequency
                <select aria-label="Digest frequency" value={get("digest_cadence", data.digest_cadence || "20m")} onChange={(event) => change("digest_cadence", event.target.value)}>
                  <option value="20m">Every 20 minutes</option><option value="daily">Daily</option><option value="weekly">Weekly</option>
                </select>
              </label>
              <Toggle label="High-relevance results" checked={get("notify_high_relevance", data.alerts?.high_relevance)} onChange={(value) => change("notify_high_relevance", value)} />
              <Toggle label="Workspace push delivery" description="Allow delivery for this workspace to registered devices. Use Enable on this device above to register this browser."
                checked={get("channel_web_push", data.channels?.web_push)} onChange={(value) => change("channel_web_push", value)} />
              <label className="settings-field">Daily digest hour
                <input aria-label="Daily digest hour" type="number" min="0" max="23" value={get("digest_hour", data.digest_hour ?? 9)} onChange={(event) => change("digest_hour", Number(event.target.value))} />
              </label>
            </details>
          </>
        )}
        {tab === "Sources & languages" && (
          <>
            {sourceGroup("News and media", ["news"], "Search public articles from local, regional and international publishers.")}
            {sourceGroup("Public social content", ["social"], "Include publicly accessible social posts and conversations.")}
            {sourceGroup("Blogs and forums", ["blog", "forum"], "Include specialist blogs, community forums and public discussions.")}
            <Toggle label="French-language results" description="Request French alongside each source’s existing languages. Collection depends on source support."
              checked={get("french", sourceList.length > 0 && sourceList.every((source) => languages(source).includes("fr")))} disabled={!sourceList.length}
              onChange={(value) => change("french", value)} />
            <details className="settings-advanced"><summary>Individual sources</summary>
            {(Array.isArray(raw) ? raw : []).map((source) => (
              <Toggle
                key={source.id}
                label={source.name}
                description={`${source.type} · ${Array.isArray(source.language_codes) ? source.language_codes.join(", ") : source.language_codes || "All available languages"}`}
                checked={get(
                  `source_${source.id}`,
                  enabled(source.enabled_for_workspace),
                )}
                disabled={!source.is_active}
                onChange={(value) => change(`source_${source.id}`, value)}
              />
            ))}
            </details>
            {Array.isArray(raw) && !raw.length && (
              <p className="workspace-empty">
                No sources have been configured for this workspace.
              </p>
            )}
          </>
        )}
        {tab === "Account" && (
          <>
            <Toggle label="Weekly research summary" description="Weekly summary delivery is not available for this account yet." checked={false} disabled />
            <Toggle label="Personal search history" description="Show recent searches on this device’s home screen. This does not disable backend history storage."
              checked={localChanges.showHistory ?? preferences.showHistory ?? true}
              onChange={(value) => { setLocalChanges((previous) => ({ ...previous, showHistory: value })); setMessage(""); }} />
            <Toggle label="Compact result density" description="Show more search results on screen with reduced vertical spacing on this device."
              checked={localChanges.compactResults ?? preferences.compactResults ?? false}
              onChange={(value) => { setLocalChanges((previous) => ({ ...previous, compactResults: value })); setMessage(""); }} />
            <Toggle label="Product research participation" description="Research participation is not available for this account yet." checked={false} disabled />
            <details className="settings-advanced"><summary>Profile details</summary>
            <label className="settings-field">
              Full name
              <input
                aria-label="Full name"
                required
                maxLength={120}
                value={get(
                  "name",
                  data.user?.name || data.name || user?.name || "",
                )}
                onChange={(e) => change("name", e.target.value)}
              />
            </label>
            <label className="settings-field">
              Timezone
              <input
                aria-label="Timezone"
                maxLength={64}
                value={get(
                  "timezone",
                  data.user?.timezone || data.timezone || "",
                )}
                onChange={(e) => change("timezone", e.target.value)}
                placeholder="Africa/Lagos"
              />
            </label>
            <label className="settings-field">
              Locale
              <input
                aria-label="Locale"
                maxLength={10}
                value={get("locale", data.user?.locale || data.locale || "")}
                onChange={(e) => change("locale", e.target.value)}
                placeholder="en"
              />
            </label>
            </details>
          </>
        )}
      </fieldset>
    </form>
  );
}
export default function SettingsView({ initialTab = "Search & discovery" }) {
  const [params, setParams] = useSearchParams();
  const sectionKeys = {
    "Search & discovery": "discovery",
    "Monitoring defaults": "monitoring",
    Notifications: "notifications",
    "Sources & languages": "sources",
    Account: "account",
  };
  const tab =
    tabs.find(([name]) => sectionKeys[name] === params.get("section"))?.[0] ||
    initialTab;
  const setTab = (name) => setParams({ section: sectionKeys[name] });
  return (
    <PageMotion className="research-page">
      <div className="research-heading">
        <div>
          <h1>Settings</h1>
          <p>Configure discovery, monitoring and notification preferences.</p>
        </div>
      </div>
      <div className="settings-layout">
        <nav aria-label="Settings sections" className="settings-nav">
          {tabs.map(([name, subtitle, Icon]) => (
            <button
              key={name}
              aria-current={tab === name ? "page" : undefined}
              className={tab === name ? "active" : ""}
              onClick={() => setTab(name)}
            >
              <Icon size={15} />
              <span>
                <strong>{name}</strong>
                <small>{subtitle}</small>
              </span>
              <ArrowRight size={13} />
            </button>
          ))}
        </nav>
        <SettingsPanel key={tab} tab={tab} />
      </div>
    </PageMotion>
  );
}
