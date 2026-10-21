import { useRef, useState, useEffect } from "react";
import { X } from "lucide-react";
export default function CreateMonitorDialog({ onClose, onCreate }) {
  const dialog = useRef(null);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("organisation");
  const [frequency, setFrequency] = useState("20m");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current.showModal();
  }, []);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (!name.trim() || !query.trim()) {
      setError("Enter a topic name and search query.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onCreate({
        name: name.trim(),
        query: query.trim(),
        type,
        frequency,
      });
      onClose();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="create-dialog"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      aria-labelledby="create-title"
    >
      <div className="dialog-heading">
        <h2 id="create-title">Create a monitor</h2>
        <button aria-label="Close dialog" disabled={busy} onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <p>Keep track of what matters across the public web.</p>
      <form className="auth-form" onSubmit={submit}>
        <label className="field-label" htmlFor="monitor-name">
          Topic name
          <input
            id="monitor-name"
            autoFocus
            required
            maxLength={160}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="field-label" htmlFor="monitor-query">
          Search query
          <input
            id="monitor-query"
            required
            maxLength={2000}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="field-label">
          <label htmlFor="monitor-type">Type</label>
          <select
            id="monitor-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {["person", "organisation", "topic", "keyword"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="field-label">
          <label htmlFor="frequency">Check every</label>
          <select
            id="frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
          >
            {[
              ["5m", "5 minutes"],
              ["10m", "10 minutes"],
              ["20m", "20 minutes"],
              ["30m", "30 minutes"],
              ["1h", "Hour"],
              ["24h", "Day"],
            ].map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button type="submit" className="primary-button" disabled={busy}>
          {busy ? "Creating…" : "Create monitor"}
        </button>
      </form>
    </dialog>
  );
}
