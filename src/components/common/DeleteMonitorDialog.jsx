import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export default function DeleteMonitorDialog({ monitor, onClose, onDelete }) {
  const dialog = useRef(null);
  const cancelButton = useRef(null);
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const node = dialog.current;
    node.showModal();
    cancelButton.current.focus();
    return () => node.close();
  }, []);
  async function remove(event) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await onDelete(monitor.id);
      onClose();
    } catch (failure) {
      setError(failure.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return <dialog ref={dialog} className="monitor-wizard delete-monitor-dialog" aria-labelledby="delete-monitor-title" aria-describedby="delete-monitor-description" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="wizard-heading"><h2 id="delete-monitor-title">Delete monitor?</h2><button type="button" aria-label="Close dialog" disabled={busy} onClick={onClose}><X size={18} /></button></div>
    <form onSubmit={remove} aria-busy={busy}>
      <div className="delete-monitor-body">
        <p id="delete-monitor-description">Delete <strong>{monitor.name}</strong>? This removes the monitor and stops future scans for it. This action cannot be undone.</p>
        {error && <div className="load-error" role="alert">{error}</div>}
      </div>
      <div className="wizard-actions"><span /><button type="button" className="text-link" ref={cancelButton} disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className="primary-button danger-button" disabled={busy}>{busy ? "Deleting…" : "Delete monitor"}</button></div>
    </form>
  </dialog>;
}
