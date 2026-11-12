import { useEffect, useRef, useState } from "react";

export default function OwnershipTransferDialog({
  member,
  workspaceName,
  onClose,
  onTransfer,
}) {
  const dialog = useRef(null);
  const cancelButton = useRef(null);
  const submitting = useRef(false);
  const [previousOwnerRole, setPreviousOwnerRole] = useState("admin");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const node = dialog.current;
    node.showModal();
    cancelButton.current.focus();
    return () => node.close();
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (!confirmed || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await onTransfer({
        new_owner_id: member.user.id,
        previous_owner_role: previousOwnerRole,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      onClose();
    } catch (failure) {
      setError(failure.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const name = member.user?.name || "this member";

  return (
    <dialog
      ref={dialog}
      className="create-dialog ownership-transfer-dialog"
      aria-labelledby="ownership-transfer-title"
      aria-describedby="ownership-transfer-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="dialog-heading">
        <h2 id="ownership-transfer-title">Transfer ownership</h2>
      </div>
      <form onSubmit={submit} aria-busy={busy}>
        <p id="ownership-transfer-description">
          Make <strong>{name}</strong> the owner of {workspaceName}. You will
          immediately lose owner-only access.
        </p>
        <label className="settings-field">
          Your role after transfer
          <select
            value={previousOwnerRole}
            disabled={busy}
            onChange={(event) => setPreviousOwnerRole(event.target.value)}
          >
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>
        </label>
        <label className="settings-field">
          Reason (optional)
          <textarea
            value={reason}
            disabled={busy}
            maxLength={500}
            rows={3}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <label className="ownership-confirmation">
          <input
            type="checkbox"
            checked={confirmed}
            disabled={busy}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          I understand that this changes the workspace owner immediately.
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="wizard-actions">
          <span />
          <button
            ref={cancelButton}
            type="button"
            className="text-link"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="primary-button danger-button"
            disabled={busy || !confirmed}
          >
            {busy ? "Transferring…" : "Transfer ownership"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
