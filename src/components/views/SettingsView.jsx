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
              .filter((source) => `source_${source.id}` in changes)
              .map((source) => ({
                source_id: source.id,
                enabled: changes[`source_${source.id}`],
              })),
          };
        if (!Object.keys(changes).length) {
          setMessage("No changes to save.");
          return;
        }
        if (tab === "Account" && "name" in body && !body.name.trim())
          throw Error("Enter your full name.");
        const result = await api(path, { method: "PATCH", body });
        if (tab === "Account")
          onUserUpdate(result.data || result.user || { ...user, ...changes });
        setMessage("Changes saved.");
        resource.reload();
      }
      setChanges({});
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
              : "Manage preferences for your workspace."}
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
            <Toggle
              label="Track related keywords"
              description="Include related terms when creating monitors."
              checked={get(
                "include_related_terms",
                data.include_related_terms || false,
              )}
              onChange={(value) => change("include_related_terms", value)}
            />
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
            <label className="settings-field">
              Digest frequency
              <select
                aria-label="Digest frequency"
                value={get("digest_cadence", data.digest_cadence || "20m")}
                onChange={(e) => change("digest_cadence", e.target.value)}
              >
                <option value="20m">Every 20 minutes</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>
            {[
              [
                "notify_high_relevance",
                "High-relevance results",
                data.alerts?.high_relevance,
              ],
              ["notify_velocity", "Trending topics", data.alerts?.velocity],
              [
                "notify_high_authority",
                "Major source alerts",
                data.alerts?.high_authority,
              ],
              ["channel_email", "Email notifications", data.channels?.email],
              [
                "channel_web_push",
                "Web push delivery preference",
                data.channels?.web_push,
              ],
            ].map(([key, label, value]) => (
              <Toggle
                key={key}
                label={label}
                description={
                  key === "channel_web_push"
                    ? "Delivery requires a browser subscription registered for your account."
                    : key === "channel_email" && !data.email_available
                      ? "Email delivery is not available yet."
                      : undefined
                }
                checked={get(key, value)}
                disabled={
                  key === "channel_email" && data.email_available === false
                }
                onChange={(next) => change(key, next)}
              />
            ))}
            <label className="settings-field">
              Daily digest hour
              <input
                aria-label="Daily digest hour"
                type="number"
                min="0"
                max="23"
                value={get("digest_hour", data.digest_hour ?? 9)}
                onChange={(e) => change("digest_hour", Number(e.target.value))}
              />
            </label>
          </>
        )}
        {tab === "Sources & languages" && (
          <>
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
            {Array.isArray(raw) && !raw.length && (
              <p className="workspace-empty">
                No sources have been configured for this workspace.
              </p>
            )}
          </>
        )}
        {tab === "Account" && (
          <>
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
