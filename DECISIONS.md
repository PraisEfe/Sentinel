# Decisions — Sentinel Frontend

## 2026-11-11 — Canonical capabilities and Unit-scoped assignment

Decision: consume the backend's six workspace capabilities as the UI authorization contract. Model State as jurisdiction, Unit as the organisation/roster boundary, Workspace as an office tenant, and membership as explicit assignment.

Reason: one server resolver keeps frontend controls aligned with backend policy and avoids over-permissive role, hierarchy, or design-derived inference.

Alternatives: infer access from `owner`/`admin`, `can_oversee`, workspace level, or Figma structure (rejected as stale and unsafe).

## 2026-11-11 — Refresh complete authorization state after access changes

Decision: re-fetch `/auth/me` and `/workspaces` after membership changes, invitation acceptance and workspace creation, with stale-request cancellation/generation guards. Pending and unassigned gates also refresh on focus.

Reason: mutations can change account status, assignment, visible workspaces and capabilities together; patching one local row cannot safely represent the resulting authorization state.

Alternatives: optimistic local capability edits or full sign-in after every change (rejected as unsafe or unnecessarily disruptive).

## Existing — Same-origin API boundary

Decision: every browser request uses same-origin `/api/v1`; nginx/Vite/Express proxy to the backend.

Reason: keeps credentials server-side and avoids browser CORS coupling.

## 2026-11-11 — Inactive roster is an authenticated account gate

Decision: treat `is_roster_active=false` as a dedicated gate before workspace discovery or routing. Keep the session, show trusted identity and Unit context, refresh account status on demand/focus, and request workspaces only after reactivation.

Reason: an inactive linked roster record removes tenant eligibility without implying that registration is pending or that the login identity should be disabled. A separate view avoids offering misleading registration edits and prevents tenant API calls while inactive.

Alternatives: reuse pending approval UI (rejected because registration is already approved); sign the user out (rejected because the backend preserves identity access); load workspaces and rely on 403 responses (rejected as unnecessary tenant access attempts).

## 2026-11-12 — Email verification precedes all tenant eligibility gates

Decision: keep mailbox verification separate from roster/administrator approval and gate authenticated users in this order: email verification, active roster, approval, workspace assignment. The verification gate preserves the session, supports resend and `/auth/me` refresh, and prevents workspace/Unit-member requests until verified. Only an explicit verified claim from Google/Microsoft can satisfy mailbox proof automatically.

Reason: mailbox ownership, personnel eligibility and tenant assignment are independent security claims. A missing or false social-provider claim must use local verification rather than fail social sign-in or bypass proof.

Alternatives: treat roster approval as email proof, allow a portal override, or reject social callbacks without a verified claim (rejected because they conflate independent claims or make recovery impossible).

## 2026-11-12 — One-time auth links are scrubbed and privacy-neutral

Decision: expose public `/verify-email` and `/reset-password` pages that snapshot required query values in memory, remove the query before network work, and guard one-time calls against StrictMode/double submission. Forgot-password does not reveal account existence; reset-token failures share one generic state. A successful reset clears the browser session/private state while the backend revokes all tokens.

Reason: verification/reset tokens must not remain in history, storage or rendered output, and account/token validity must not become an enumeration channel.

Alternatives: retain query strings until completion, expose detailed token failures, or preserve the current session after reset (rejected for leakage, enumeration and credential-rotation risk).

## 2026-11-12 — Ownership changes use the dedicated transfer endpoint

Decision: show ownership transfer in Team only to the canonical current owner and only for eligible existing non-owner members. The owner selects their resulting admin/member role, confirms the immediate effect, and the client refreshes complete authorization after the atomic backend operation.

Reason: direct role editing cannot safely preserve exactly one owner or update both memberships and capabilities together.

Alternatives: make `owner` available in ordinary role selectors or patch local rows optimistically (rejected as unsafe).
