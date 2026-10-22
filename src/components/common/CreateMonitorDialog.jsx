import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useResource, useWorkspace } from "../../lib/workspace";
import { ResourceState } from "./WorkspaceUI";
const sourceGroups = [
  ["news", "News & media", ["news"]],
  ["social", "Public social content", ["social"]],
  ["web", "Websites", ["web", "video"]],
  ["blogs", "Blogs & forums", ["blog", "forum"]],
];
export default function CreateMonitorDialog({
  onClose,
  onCreate,
  initialTopic = "",
}) {
  const dialog = useRef(null);
  const [created, setCreated] = useState(null);
  const reduced = useReducedMotion();
  const { api } = useWorkspace();
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState(initialTopic);
  const [include, setInclude] = useState("");
  const [exclude, setExclude] = useState("");
  const [type, setType] = useState("topic");
  const [frequency, setFrequency] = useState("20m");
  const [selected, setSelected] = useState(["news", "social", "web", "blogs"]);
  const [highRelevance, setHighRelevance] = useState(true);
  const [velocity, setVelocity] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sources = useResource("/sources", { list: true });
  const available = (sources.data?.data || [])
    .filter((item) => item.available !== false)
    .map((item) => item.source || item);
  const sourceIds = available
    .filter((source) =>
      sourceGroups.some(
        ([id, , types]) =>
          selected.includes(id) && types.includes(source.type || "web"),
      ),
    )
    .map((source) => source.id);
  useEffect(() => {
    const node = dialog.current;
    node.showModal();
    return () => node.close();
  }, []);
  async function submit(event) {
    event.preventDefault();
    setError("");
    if (step === 1) {
      if (!topic.trim()) {
        setError("Enter a topic to monitor.");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!sourceIds.length) {
        setError("Choose at least one available source.");
        return;
      }
      setStep(3);
      return;
    }
    if (busy) return;
    setBusy(true);
    let monitor = created;
    try {
      if (!monitor) {
        monitor = await onCreate({
          name: topic.trim().slice(0, 160),
          query: topic.trim(),
          type,
          frequency,
          source_ids: sourceIds,
          include_keywords: include
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
          exclude_keywords: exclude
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
        });
        setCreated(monitor || { unknown: true });
      }
      if (!monitor?.id)
        throw Error(
          "The server did not return the new monitor. Please refresh your monitors before trying again.",
        );
      await api(`/monitors/${encodeURIComponent(monitor.id)}/preferences`, {
        method: "PATCH",
        body: {
          notify_high_relevance: highRelevance,
          notify_velocity: velocity,
        },
      });
      onClose();
    } catch (failure) {
      setError(
        monitor
          ? `Your monitor was created. Notification preferences could not be saved: ${failure.message} Retry to save preferences without creating another monitor.`
          : failure.message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <motion.dialog
      ref={dialog}
      className="monitor-wizard"
      aria-labelledby="create-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      initial={{ opacity: 0, scale: reduced ? 1 : 0.97, y: reduced ? 0 : 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: reduced ? 1 : 0.98 }}
      transition={{ duration: reduced ? 0 : 0.2 }}
    >
      <div className="wizard-heading">
        <div>
          <h2 id="create-title">Create a monitor</h2>
          <p>Continuously discover public information about a saved topic.</p>
        </div>
        <button aria-label="Close dialog" disabled={busy} onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <ol className="wizard-progress" aria-label="Monitor creation progress">
        {["Topic", "Sources", "Schedule"].map((label, i) => (
          <li
            aria-current={step === i + 1 ? "step" : undefined}
            className={step === i + 1 ? "current" : ""}
            key={label}
          >
            {i + 1} · {label}
          </li>
        ))}
      </ol>
      <form onSubmit={submit}>
        <motion.div
          className="wizard-body"
          key={step}
          initial={{ opacity: 0, x: reduced ? 0 : 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: reduced ? 0 : 0.16 }}
        >
          {step === 1 && (
            <>
              <label className="field-label" htmlFor="monitor-topic">
                Person, organisation, topic or keyword
                <input
                  id="monitor-topic"
                  autoFocus
                  required
                  maxLength={2000}
                  placeholder="e.g. MTN Nigeria"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </label>
              <label className="field-label" htmlFor="monitor-include">
                Include keywords
                <input
                  id="monitor-include"
                  placeholder="network, 5G, tariff"
                  value={include}
                  onChange={(e) => setInclude(e.target.value)}
                  maxLength={2000}
                />
              </label>
              <label className="field-label" htmlFor="monitor-exclude">
                Exclude keywords
                <input
                  id="monitor-exclude"
                  placeholder="jobs, careers"
                  value={exclude}
                  onChange={(e) => setExclude(e.target.value)}
                  maxLength={2000}
                />
              </label>
              <details className="monitor-advanced">
                <summary>Topic type</summary>
                <label className="field-label" htmlFor="monitor-type">
                  Type
                </label>
                <select
                  aria-label="Type"
                  id="monitor-type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  {["person", "organisation", "topic", "keyword"].map(
                    (value) => (
                      <option value={value} key={value}>
                        {value}
                      </option>
                    ),
                  )}
                </select>
              </details>
            </>
          )}
          {step === 2 && (
            <>
              <p className="wizard-label">Sources to monitor</p>
              <ResourceState resource={sources} />
              {sourceGroups.map(([id, label, types]) => {
                const count = available.filter((source) =>
                  types.includes(source.type || "web"),
                ).length;
                return (
                  <label className="wizard-checkbox" key={id}>
                    <input
                      type="checkbox"
                      disabled={!count || sources.loading}
                      checked={selected.includes(id) && count > 0}
                      onChange={(e) =>
                        setSelected((previous) =>
                          e.target.checked
                            ? [...previous, id]
                            : previous.filter((value) => value !== id),
                        )
                      }
                    />
                    {label}
                    {!sources.loading && !count && <small>Unavailable</small>}
                  </label>
                );
              })}
            </>
          )}
          {step === 3 && (
            <>
              <label className="field-label" htmlFor="monitor-frequency">
                Monitoring frequency
                <select
                  id="monitor-frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                >
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
              <div>
                <p className="wizard-label">Notifications</p>
                <label className="wizard-checkbox">
                  <input
                    type="checkbox"
                    checked={highRelevance}
                    onChange={(e) => setHighRelevance(e.target.checked)}
                  />
                  New high-relevance results
                </label>
                <label className="wizard-checkbox">
                  <input
                    type="checkbox"
                    checked={velocity}
                    onChange={(e) => setVelocity(e.target.checked)}
                  />
                  Trending topics
                </label>
                <p className="field-hint">
                  Daily summaries are managed in notification settings.
                </p>
              </div>
            </>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </motion.div>
        <div className="wizard-actions">
          {step > 1 && (
            <button
              type="button"
              className="text-link"
              disabled={busy || !!created}
              onClick={() => {
                setStep((v) => v - 1);
                setError("");
              }}
            >
              Back
            </button>
          )}
          <span />
          <button
            type="button"
            className="text-link"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="primary-button"
            disabled={
              busy ||
              (step === 1 && !topic.trim()) ||
              (step === 2 && (sources.loading || !sourceIds.length))
            }
          >
            {busy
              ? "Saving…"
              : step < 3
                ? "Continue"
                : created
                  ? "Retry preferences"
                  : "Create monitor"}
          </button>
        </div>
      </form>
    </motion.dialog>
  );
}
