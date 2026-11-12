import { useEffect, useState } from "react";
import { workspaceCapabilities, useWorkspace } from "../../lib/workspace";
import OwnershipTransferDialog from "../common/OwnershipTransferDialog";

const emptyCollection = () => ({
  data: [],
  loading: true,
  error: "",
  meta: {},
});

export default function TeamSettings() {
  const {
    api,
    authenticatedApi,
    canManageMembers,
    refreshAuthorization,
    role: actorRole,
    scopeKey,
    user,
    workspace,
    workspaceId,
    workspaces,
  } = useWorkspace();
  const [membersState, setMembersState] = useState(emptyCollection);
  const [unitState, setUnitState] = useState(emptyCollection);
  const [invitationsState, setInvitationsState] = useState(emptyCollection);
  const [membersVersion, setMembersVersion] = useState(0);
  const [unitVersion, setUnitVersion] = useState(0);
  const [invitationsVersion, setInvitationsVersion] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [unitQuery, setUnitQuery] = useState("");
  const [unitPage, setUnitPage] = useState(1);
  const [roleDrafts, setRoleDrafts] = useState({});
  const [poolRoleDrafts, setPoolRoleDrafts] = useState({});
  const [sourceDrafts, setSourceDrafts] = useState({});
  const [targetDrafts, setTargetDrafts] = useState({});
  const [busyRows, setBusyRows] = useState({});
  const [email, setEmail] = useState("");
  const [invitationRole, setInvitationRole] = useState("member");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [transferTarget, setTransferTarget] = useState(null);

  const isCanonicalOwner = Boolean(
    user?.id && workspace?.owner_id === user.id,
  );

  const manageableTargets = workspaces.filter(
    (candidate) =>
      candidate.id !== workspaceId &&
      candidate.unit_id === workspace?.unit_id &&
      workspaceCapabilities(candidate).canManageMembers,
  );
  const manageableIds = new Set(
    workspaces
      .filter(
        (candidate) =>
          candidate.unit_id === workspace?.unit_id &&
          workspaceCapabilities(candidate).canManageMembers,
      )
      .map((candidate) => candidate.id),
  );

  useEffect(() => {
    if (!canManageMembers) return undefined;
    let active = true;
    const controller = new AbortController();
    async function loadMembers() {
      setMembersState((previous) => ({
        ...previous,
        loading: true,
        error: "",
      }));
      try {
        const result = await api("/members", {
          signal: controller.signal,
        });
        if (!Array.isArray(result?.data))
          throw Error("We couldn’t load workspace members. Please try again.");
        if (active)
          setMembersState({
            data: result.data,
            loading: false,
            error: "",
            meta: {},
          });
      } catch (failure) {
        if (active && failure.name !== "AbortError")
          setMembersState({
            data: [],
            loading: false,
            error: failure.message,
            meta: {},
          });
      }
    }
    void loadMembers();
    return () => {
      active = false;
      controller.abort();
    };
  }, [api, canManageMembers, membersVersion, scopeKey]);

  useEffect(() => {
    if (!canManageMembers || !workspace?.unit_id) return undefined;
    let active = true;
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(unitPage),
      per_page: "10",
    });
    if (unitQuery) params.set("q", unitQuery);
    async function loadUnitMembers() {
      setUnitState((previous) => ({
        ...previous,
        loading: true,
        error: "",
      }));
      try {
        const result = await authenticatedApi(
          `/units/${encodeURIComponent(workspace.unit_id)}/members?${params}`,
          { signal: controller.signal },
        );
        if (!Array.isArray(result?.data))
          throw Error("We couldn’t load Unit members. Please try again.");
        if (active)
          setUnitState({
            data: result.data,
            loading: false,
            error: "",
            meta: result.meta || {},
          });
      } catch (failure) {
        if (active && failure.name !== "AbortError")
          setUnitState({
            data: [],
            loading: false,
            error: failure.message,
            meta: {},
          });
      }
    }
    void loadUnitMembers();
    return () => {
      active = false;
      controller.abort();
    };
  }, [
    authenticatedApi,
    canManageMembers,
    scopeKey,
    unitPage,
    unitQuery,
    unitVersion,
    workspace?.unit_id,
  ]);

  useEffect(() => {
    if (!canManageMembers) return undefined;
    let active = true;
    const controller = new AbortController();
    async function loadInvitations() {
      setInvitationsState((previous) => ({
        ...previous,
        loading: true,
        error: "",
      }));
      try {
        const result = await api("/invitations", {
          signal: controller.signal,
        });
        if (!Array.isArray(result?.data))
          throw Error("We couldn’t load invitations. Please try again.");
        if (active)
          setInvitationsState({
            data: result.data,
            loading: false,
            error: "",
            meta: {},
          });
      } catch (failure) {
        if (active && failure.name !== "AbortError")
          setInvitationsState({
            data: [],
            loading: false,
            error: failure.message,
            meta: {},
          });
      }
    }
    void loadInvitations();
    return () => {
      active = false;
      controller.abort();
    };
  }, [api, canManageMembers, invitationsVersion, scopeKey]);

  function reloadAll() {
    setMembersVersion((value) => value + 1);
    setUnitVersion((value) => value + 1);
    setInvitationsVersion((value) => value + 1);
  }

  async function mutateMembership(key, confirmation, action, success) {
    if (busyRows[key] || !window.confirm(confirmation)) return;
    setBusyRows((previous) => ({ ...previous, [key]: true }));
    setActionError("");
    setMessage("");
    let saved = false;
    try {
      await action();
      saved = true;
      setMessage(success);
      await refreshAuthorization(workspaceId);
      setMembersVersion((value) => value + 1);
      setUnitVersion((value) => value + 1);
    } catch (failure) {
      setActionError(
        saved
          ? "The membership changed, but access could not be refreshed. Refresh the Team page to continue."
          : failure.message,
      );
      if (saved) {
        setMembersVersion((value) => value + 1);
        setUnitVersion((value) => value + 1);
      }
    } finally {
      setBusyRows((previous) => {
        const next = { ...previous };
        delete next[key];
        return next;
      });
    }
  }

  function saveRole(member) {
    const userId = member.user?.id;
    const nextRole = roleDrafts[userId] ?? member.role;
    if (
      !userId ||
      userId === user?.id ||
      member.role === "owner" ||
      nextRole === member.role
    )
      return;
    void mutateMembership(
      `member:${userId}`,
      `Change ${member.user?.name || "this member"} to ${nextRole}?`,
      () =>
        api(`/members/${encodeURIComponent(userId)}`, {
          method: "PATCH",
          body: { role: nextRole },
        }),
      "Member role updated.",
    );
  }

  function moveCurrentMember(member) {
    const userId = member.user?.id;
    const targetId = targetDrafts[userId] || manageableTargets[0]?.id;
    const target = manageableTargets.find((candidate) => candidate.id === targetId);
    if (!userId || !target || member.role === "owner") return;
    void mutateMembership(
      `member:${userId}`,
      `Move ${member.user?.name || "this member"} from ${workspace?.name} to ${target.name}?`,
      () =>
        api(`/members/${encodeURIComponent(userId)}/move`, {
          method: "POST",
          body: { target_workspace_id: target.id },
        }),
      `Member moved to ${target.name}.`,
    );
  }

  function removeMember(member) {
    const userId = member.user?.id;
    if (!userId || member.role === "owner") return;
    void mutateMembership(
      `member:${userId}`,
      `Remove ${member.user?.name || "this member"} from ${workspace?.name}?`,
      () =>
        api(`/members/${encodeURIComponent(userId)}`, { method: "DELETE" }),
      "Member removed from this workspace.",
    );
  }

  function assignMember(person) {
    if (person.id === user?.id) return;
    const role = poolRoleDrafts[person.id] || "member";
    void mutateMembership(
      `unit:${person.id}`,
      `Assign ${person.name} to ${workspace?.name} as ${role}?`,
      () =>
        api("/members", {
          method: "POST",
          body: { user_id: person.id, role },
        }),
      `${person.name} assigned to this workspace.`,
    );
  }

  async function transferOwnership(payload) {
    let saved = false;
    setActionError("");
    setMessage("");
    try {
      await api("/ownership-transfer", { method: "POST", body: payload });
      saved = true;
      await refreshAuthorization(workspaceId);
      setMembersVersion((value) => value + 1);
      setUnitVersion((value) => value + 1);
      setMessage("Workspace ownership transferred.");
    } catch (failure) {
      if (!saved) throw failure;
      setMembersVersion((value) => value + 1);
      setUnitVersion((value) => value + 1);
      setActionError(
        "Ownership transferred, but access could not be refreshed. Refresh the Team page to continue.",
      );
    }
  }

  function moveOtherMemberHere(person, movableMemberships) {
    const sourceId = sourceDrafts[person.id] || movableMemberships[0]?.workspace?.id;
    const source = movableMemberships.find(
      (membership) => membership.workspace?.id === sourceId,
    );
    if (!source) return;
    const nextRole =
      poolRoleDrafts[person.id] ||
      (["admin", "member"].includes(source.role) ? source.role : "member");
    const body = { target_workspace_id: workspaceId };
    if (person.id !== user?.id && nextRole !== source.role)
      body.role = nextRole;
    void mutateMembership(
      `unit:${person.id}`,
      `Move ${person.name} from ${source.workspace.name} to ${workspace?.name}?`,
      () =>
        authenticatedApi(
          `/workspaces/${encodeURIComponent(source.workspace.id)}/members/${encodeURIComponent(person.id)}/move`,
          { method: "POST", body },
        ),
      `${person.name} moved to this workspace.`,
    );
  }

  async function invite(event) {
    event.preventDefault();
    if (inviteBusy || !email.trim()) return;
    setInviteBusy(true);
    setActionError("");
    setMessage("");
    try {
      const result = await api("/invitations", {
        method: "POST",
        body: { email: email.trim(), role: invitationRole },
      });
      const token = result?.invitation?.token;
      setMessage(
        token
          ? `Invitation created. Share this one-time token securely: ${token}`
          : "Invitation sent.",
      );
      setEmail("");
      setInvitationsVersion((value) => value + 1);
    } catch (failure) {
      setActionError(failure.message);
    } finally {
      setInviteBusy(false);
    }
  }

  async function revokeInvitation(invitation) {
    const key = `invitation:${invitation.id}`;
    if (
      busyRows[key] ||
      !window.confirm(`Revoke the invitation for ${invitation.email}?`)
    )
      return;
    setBusyRows((previous) => ({ ...previous, [key]: true }));
    setActionError("");
    setMessage("");
    try {
      await api(`/invitations/${encodeURIComponent(invitation.id)}`, {
        method: "DELETE",
      });
      setMessage("Invitation revoked.");
      setInvitationsVersion((value) => value + 1);
    } catch (failure) {
      setActionError(failure.message);
    } finally {
      setBusyRows((previous) => {
        const next = { ...previous };
        delete next[key];
        return next;
      });
    }
  }

  if (!canManageMembers) {
    return (
      <section className="settings-panel">
        <div className="settings-panel-heading">
          <div>
            <h2>Team</h2>
            <p>Manage this office workspace’s members.</p>
          </div>
        </div>
        <p className="workspace-empty">
          You do not have permission to manage members for this workspace.
        </p>
      </section>
    );
  }

  return (
    <section className="settings-panel team-settings">
      <div className="settings-panel-heading">
        <div>
          <h2>Team</h2>
          <p>
            Manage {workspace?.name || "this office workspace"} and its Unit
            staff pool.
          </p>
        </div>
        <button
          className="text-link"
          type="button"
          onClick={reloadAll}
          disabled={
            membersState.loading ||
            unitState.loading ||
            invitationsState.loading
          }
        >
          Refresh all
        </button>
      </div>

      {actionError && (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      )}
      {message && (
        <p className="inline-success" role="status">
          {message}
        </p>
      )}

      <section className="team-section">
        <div className="team-section-heading">
          <div>
            <h3 id="workspace-members-heading">Workspace members</h3>
            <p>People currently assigned to this office workspace.</p>
          </div>
          <button
            className="text-link"
            type="button"
            onClick={() => setMembersVersion((value) => value + 1)}
            disabled={membersState.loading}
          >
            Refresh
          </button>
        </div>
        {membersState.loading && membersState.data.length === 0 && (
          <p className="workspace-empty">Loading workspace members…</p>
        )}
        {membersState.error && (
          <div className="load-error" role="alert">
            <span>{membersState.error}</span>
            <button
              className="text-link"
              type="button"
              onClick={() => setMembersVersion((value) => value + 1)}
            >
              Try again
            </button>
          </div>
        )}
        {!membersState.loading &&
          !membersState.error &&
          membersState.data.length === 0 && (
            <p className="workspace-empty">No workspace members found.</p>
          )}
        {membersState.data.length > 0 && (
          <div
            className="team-table-wrap"
            role="region"
            aria-label="Workspace members"
            tabIndex={0}
          >
            <table className="team-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Role</th>
                  <th>Oversight</th>
                  <th>Move to</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {membersState.data.map((member) => {
                  const userId = member.user?.id || "";
                  const owner = member.role === "owner";
                  const self = userId === user?.id;
                  const busy = Boolean(busyRows[`member:${userId}`]);
                  const nextRole = roleDrafts[userId] ?? member.role;
                  const transferEligible =
                    isCanonicalOwner &&
                    !owner &&
                    !self &&
                    member.user?.is_approved === true &&
                    member.user?.is_disabled === false &&
                    member.user?.is_roster_active === true &&
                    member.user?.unit_id === workspace?.unit_id;
                  const targetId =
                    targetDrafts[userId] || manageableTargets[0]?.id || "";
                  return (
                    <tr key={userId}>
                      <td>
                        <strong>{member.user?.name || "Unknown member"}</strong>
                        <small>{member.user?.email || "No email"}</small>
                      </td>
                      <td>
                        <select
                          aria-label={`Role for ${member.user?.name || "member"}`}
                          value={nextRole}
                          disabled={owner || self || busy}
                          onChange={(event) =>
                            setRoleDrafts((previous) => ({
                              ...previous,
                              [userId]: event.target.value,
                            }))
                          }
                        >
                          {owner && (
                            <option value="owner" disabled>
                              Owner
                            </option>
                          )}
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                        </select>
                      </td>
                      <td>{member.can_oversee ? "Yes" : "No"}</td>
                      <td>
                        {owner ? (
                          <span className="team-protected">Owner protected</span>
                        ) : manageableTargets.length > 0 ? (
                          <select
                            aria-label={`Destination for ${member.user?.name || "member"}`}
                            value={targetId}
                            disabled={busy}
                            onChange={(event) =>
                              setTargetDrafts((previous) => ({
                                ...previous,
                                [userId]: event.target.value,
                              }))
                            }
                          >
                            {manageableTargets.map((target) => (
                              <option key={target.id} value={target.id}>
                                {target.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="team-muted">No manageable destination</span>
                        )}
                      </td>
                      <td>
                        {owner ? (
                          <span className="team-protected">Cannot be changed</span>
                        ) : (
                          <div className="team-actions">
                            {self ? (
                              <span className="team-muted">Your role</span>
                            ) : (
                              <button
                                type="button"
                                className="text-link"
                                disabled={busy || nextRole === member.role}
                                onClick={() => saveRole(member)}
                              >
                                {busy ? "Working…" : "Save role"}
                              </button>
                            )}
                            <button
                              type="button"
                              className="text-link"
                              disabled={busy || !targetId}
                              onClick={() => moveCurrentMember(member)}
                            >
                              Move
                            </button>
                            <button
                              type="button"
                              className="text-link danger"
                              disabled={busy}
                              onClick={() => removeMember(member)}
                            >
                              Remove
                            </button>
                            {transferEligible && (
                              <button
                                type="button"
                                className="text-link ownership-transfer-action"
                                disabled={busy}
                                onClick={() => setTransferTarget(member)}
                              >
                                Transfer ownership
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="team-section">
        <div className="team-section-heading">
          <div>
            <h3 id="unit-members-heading">Unit members</h3>
            <p>
              Approved staff in this Unit. Their visible memberships are offices
              you can manage.
            </p>
          </div>
        </div>
        <form
          className="team-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            setUnitPage(1);
            setUnitQuery(searchInput.trim());
          }}
        >
          <label htmlFor="unit-member-search">Search Unit members</label>
          <div>
            <input
              id="unit-member-search"
              maxLength={120}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Name, email, staff ID or title"
            />
            <button className="outline-button" type="submit">
              Search
            </button>
            {unitQuery && (
              <button
                className="text-link"
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setUnitQuery("");
                  setUnitPage(1);
                }}
              >
                Clear
              </button>
            )}
          </div>
        </form>
        {!workspace?.unit_id && (
          <p className="workspace-empty">
            This workspace is not linked to a Unit, so its staff pool is
            unavailable.
          </p>
        )}
        {workspace?.unit_id && unitState.loading && unitState.data.length === 0 && (
          <p className="workspace-empty">Loading Unit members…</p>
        )}
        {workspace?.unit_id && unitState.error && (
          <div className="load-error" role="alert">
            <span>{unitState.error}</span>
            <button
              className="text-link"
              type="button"
              onClick={() => setUnitVersion((value) => value + 1)}
            >
              Try again
            </button>
          </div>
        )}
        {workspace?.unit_id &&
          !unitState.loading &&
          !unitState.error &&
          unitState.data.length === 0 && (
            <p className="workspace-empty">
              {unitQuery
                ? "No Unit members match this search."
                : "No approved Unit members are available."}
            </p>
          )}
        {unitState.data.length > 0 && (
          <div
            className="team-table-wrap"
            role="region"
            aria-label="Unit members"
            tabIndex={0}
          >
            <table className="team-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Visible memberships</th>
                  <th>Role here</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {unitState.data.map((person) => {
                  const self = person.id === user?.id;
                  const memberships = Array.isArray(person.memberships)
                    ? person.memberships
                    : [];
                  const currentMembership = memberships.find(
                    (membership) => membership.workspace?.id === workspaceId,
                  );
                  const movableMemberships = memberships.filter(
                    (membership) =>
                      membership.workspace?.id !== workspaceId &&
                      membership.role !== "owner" &&
                      manageableIds.has(membership.workspace?.id),
                  );
                  const sourceId =
                    sourceDrafts[person.id] ||
                    movableMemberships[0]?.workspace?.id ||
                    "";
                  const source = movableMemberships.find(
                    (membership) => membership.workspace?.id === sourceId,
                  );
                  const role =
                    poolRoleDrafts[person.id] ||
                    (source && ["admin", "member"].includes(source.role)
                      ? source.role
                      : "member");
                  const busy = Boolean(busyRows[`unit:${person.id}`]);
                  return (
                    <tr key={person.id}>
                      <td>
                        <strong>{person.name}</strong>
                        <small>{person.email}</small>
                        {(person.official_title || person.staff_id) && (
                          <small>
                            {[person.official_title, person.staff_id]
                              .filter(Boolean)
                              .join(" · ")}
                          </small>
                        )}
                      </td>
                      <td>
                        {memberships.length > 0 ? (
                          <ul className="team-memberships">
                            {memberships.map((membership) => (
                              <li key={membership.workspace?.id}>
                                {membership.workspace?.name || "Unknown workspace"}
                                <span>{membership.role}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="team-muted">No visible memberships</span>
                        )}
                      </td>
                      <td>
                        {currentMembership?.role === "owner" ? (
                          <span className="team-protected">Owner</span>
                        ) : (
                          <select
                            aria-label={`Role in this workspace for ${person.name}`}
                            value={role}
                            disabled={busy || self || Boolean(currentMembership)}
                            onChange={(event) =>
                              setPoolRoleDrafts((previous) => ({
                                ...previous,
                                [person.id]: event.target.value,
                              }))
                            }
                          >
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                          </select>
                        )}
                      </td>
                      <td>
                        {currentMembership ? (
                          <span className="team-muted">Already assigned here</span>
                        ) : self ? (
                          <span className="team-muted">This is you</span>
                        ) : (
                          <div className="team-pool-actions">
                            <button
                              className="text-link"
                              type="button"
                              disabled={busy}
                              onClick={() => assignMember(person)}
                            >
                              {busy ? "Working…" : "Assign here"}
                            </button>
                            {movableMemberships.length > 0 && (
                              <>
                                <select
                                  aria-label={`Source workspace for ${person.name}`}
                                  value={sourceId}
                                  disabled={busy}
                                  onChange={(event) =>
                                    setSourceDrafts((previous) => ({
                                      ...previous,
                                      [person.id]: event.target.value,
                                    }))
                                  }
                                >
                                  {movableMemberships.map((membership) => (
                                    <option
                                      key={membership.workspace.id}
                                      value={membership.workspace.id}
                                    >
                                      {membership.workspace.name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  className="text-link"
                                  type="button"
                                  disabled={busy || !sourceId}
                                  onClick={() =>
                                    moveOtherMemberHere(person, movableMemberships)
                                  }
                                >
                                  Move here
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {(unitState.meta.last_page || 1) > 1 && (
          <div className="monitor-pagination">
            <button
              className="outline-button"
              type="button"
              disabled={unitState.loading || unitPage <= 1}
              onClick={() => setUnitPage((page) => Math.max(1, page - 1))}
            >
              Previous
            </button>
            <span>
              Page {unitState.meta.current_page || unitPage} of{" "}
              {unitState.meta.last_page}
            </span>
            <button
              className="outline-button"
              type="button"
              disabled={
                unitState.loading || unitPage >= unitState.meta.last_page
              }
              onClick={() => setUnitPage((page) => page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </section>

      <section className="team-section">
        <div className="team-section-heading">
          <div>
            <h3 id="invitations-heading">Invitations</h3>
            <p>
              Fallback for unregistered email addresses. Assign registered staff
              from Unit members instead.
            </p>
          </div>
          <button
            className="text-link"
            type="button"
            onClick={() => setInvitationsVersion((value) => value + 1)}
            disabled={invitationsState.loading}
          >
            Refresh
          </button>
        </div>
        <form className="team-invite" onSubmit={invite}>
          <label className="settings-field">
            Unregistered email
            <input
              type="email"
              required
              maxLength={255}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="official@example.gov.ng"
            />
          </label>
          <label className="settings-field">
            Role
            <select
              value={invitationRole}
              onChange={(event) => setInvitationRole(event.target.value)}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button
            className="primary-button"
            type="submit"
            disabled={inviteBusy || !email.trim()}
          >
            {inviteBusy ? "Sending…" : "Send invitation"}
          </button>
        </form>
        {invitationsState.loading && invitationsState.data.length === 0 && (
          <p className="workspace-empty">Loading invitations…</p>
        )}
        {invitationsState.error && (
          <div className="load-error" role="alert">
            <span>{invitationsState.error}</span>
            <button
              className="text-link"
              type="button"
              onClick={() => setInvitationsVersion((value) => value + 1)}
            >
              Try again
            </button>
          </div>
        )}
        {!invitationsState.loading &&
          !invitationsState.error &&
          invitationsState.data.length === 0 && (
            <p className="workspace-empty">No pending invitations.</p>
          )}
        {invitationsState.data.length > 0 && (
          <div
            className="team-table-wrap"
            role="region"
            aria-label="Invitations"
            tabIndex={0}
          >
            <table className="team-table">
              <thead>
                <tr>
                  <th>Unregistered email</th>
                  <th>Role</th>
                  <th>Expires</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invitationsState.data.map((invitation) => {
                  const busy = Boolean(
                    busyRows[`invitation:${invitation.id}`],
                  );
                  return (
                    <tr key={invitation.id}>
                      <td>{invitation.email}</td>
                      <td>{invitation.role}</td>
                      <td>{invitation.expires_at || "—"}</td>
                      <td>
                        <button
                          type="button"
                          className="text-link danger"
                          disabled={busy}
                          onClick={() => revokeInvitation(invitation)}
                        >
                          {busy ? "Revoking…" : "Revoke"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {actorRole !== "owner" && (
        <p className="team-footnote">
          Owners are protected and can only be transferred through an owner
          workflow.
        </p>
      )}
      {transferTarget && (
        <OwnershipTransferDialog
          member={transferTarget}
          workspaceName={workspace?.name || "this workspace"}
          onClose={() => setTransferTarget(null)}
          onTransfer={transferOwnership}
        />
      )}
    </section>
  );
}
