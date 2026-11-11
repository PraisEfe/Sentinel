import { useState } from "react";
import { useResource, useWorkspace } from "../../lib/workspace";

export default function TeamSettings() {
  const { api, workspace, canManageMembers } = useWorkspace();
  const membersResource = useResource(canManageMembers ? "/members" : null, {
    list: true,
  });
  const invitationsResource = useResource(
    canManageMembers ? "/invitations" : null,
    { list: true },
  );

  const [drafts, setDrafts] = useState({});
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const members = Array.isArray(membersResource.data?.data)
    ? membersResource.data.data
    : [];
  const invitations = Array.isArray(invitationsResource.data?.data)
    ? invitationsResource.data.data
    : [];
  const loading = membersResource.loading || invitationsResource.loading;
  const loadError = membersResource.error || invitationsResource.error;

  function reload() {
    membersResource.reload();
    invitationsResource.reload();
  }

  async function invite(event) {
    event.preventDefault();
    if (busy || !email.trim()) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api("/invitations", {
        method: "POST",
        body: { email: email.trim(), role },
      });
      if (result?.invitation?.token) {
        setMessage(
          `Invitation created. Email is off, so share this token manually: ${result.invitation.token}`,
        );
      } else {
        setMessage(result?.message || "Invitation sent.");
      }
      setEmail("");
      reload();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveRole(member) {
    const userId = member.user?.id;
    const nextRole = drafts[userId] || member.role;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(`/members/${userId}`, {
        method: "PATCH",
        body: { role: nextRole, can_oversee: Boolean(member.can_oversee) },
      });
      setMessage("Member role updated.");
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[userId];
        return next;
      });
      reload();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(member) {
    const userId = member.user?.id;
    if (!userId) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(`/members/${userId}`, { method: "DELETE" });
      setMessage("Member removed.");
      reload();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  async function revokeInvitation(invitation) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(`/invitations/${invitation.id}`, { method: "DELETE" });
      setMessage("Invitation revoked.");
      reload();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  if (!canManageMembers) {
    return (
      <div className="settings-panel">
        <div className="settings-panel-heading">
          <div>
            <h2>Team</h2>
            <p>Manage the people who can use this office’s workspace.</p>
          </div>
        </div>
        <p className="workspace-empty">
          You do not have permission to manage members for this office. Ask the
          office owner, your Head of Service or a Commissioner to invite you.
        </p>
      </div>
    );
  }

  return (
    <div className="settings-panel">
      <div className="settings-panel-heading">
        <div>
          <h2>Team</h2>
          <p>
            Invite officials to {workspace?.name || "this office"} and manage
            their roles.
          </p>
        </div>
        <button className="text-link" onClick={reload} disabled={loading || busy}>
          Refresh
        </button>
      </div>

      {(error || loadError) && (
        <p className="form-error" role="alert">
          {error || loadError}
        </p>
      )}
      {message && (
        <p className="inline-success" role="status">
          {message}
        </p>
      )}

      <form className="team-invite" onSubmit={invite}>
        <label className="settings-field">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="official@example.gov.ng"
          />
        </label>
        <label className="settings-field">
          Role
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button
          className="primary-button"
          type="submit"
          disabled={busy || !email.trim()}
        >
          {busy ? "Working…" : "Send invitation"}
        </button>
      </form>

      <h3 className="team-heading">Members</h3>
      {loading ? (
        <p className="workspace-empty">Loading members…</p>
      ) : members.length === 0 ? (
        <p className="workspace-empty">No members yet.</p>
      ) : (
        <div className="team-table-wrap">
          <table className="team-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Oversight</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const userId = member.user?.id || "";
                return (
                  <tr key={userId}>
                    <td>{member.user?.name || "—"}</td>
                    <td>{member.user?.email || "—"}</td>
                    <td>
                      <select
                        value={drafts[userId] ?? member.role}
                        onChange={(event) =>
                          setDrafts((previous) => ({
                            ...previous,
                            [userId]: event.target.value,
                          }))
                        }
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                      </select>
                    </td>
                    <td>{member.can_oversee ? "Yes" : "No"}</td>
                    <td className="team-actions">
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => saveRole(member)}
                        disabled={busy}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="text-link danger"
                        onClick={() => removeMember(member)}
                        disabled={busy}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="team-heading">Pending invitations</h3>
      {invitations.length === 0 ? (
        <p className="workspace-empty">No pending invitations.</p>
      ) : (
        <div className="team-table-wrap">
          <table className="team-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Expires</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {invitations.map((invitation) => (
                <tr key={invitation.id}>
                  <td>{invitation.email}</td>
                  <td>{invitation.role}</td>
                  <td>{invitation.expires_at || "—"}</td>
                  <td className="team-actions">
                    <button
                      type="button"
                      className="text-link danger"
                      onClick={() => revokeInvitation(invitation)}
                      disabled={busy}
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
