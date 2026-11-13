# Decisions — Sentinel Frontend

## 2026-11-13 — Production API proxy uses the local nginx API vhost

Decision: proxy same-origin `/api/v1` requests to `https://127.0.0.1`, while sending `sentinel-api.absg-ohos.cloud` as TLS SNI and HTTP Host. Keep the shared nginx 1.24 listener options aligned with the other Certbot-managed vhosts.

Reason: an unattended upgrade restarted nginx and `systemd-resolved` together. The previous hostname-based `proxy_pass` required public DNS during nginx configuration loading, so nginx failed to restart and every site on the shared VPS remained unavailable. The loopback route removes that startup dependency without changing the browser contract or API virtual host.

Alternatives: rely on restart timing, add a static `/etc/hosts` entry, or proxy through the public address (rejected as fragile, globally stateful, or unnecessarily dependent on external routing).

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

## 2026-11-13 — Canonical capabilities fail closed without compatibility aliases

Decision: read workspace authorization only from the nested `workspace.capabilities` object. If it is missing or malformed, all workspace controls fail closed. Do not read top-level `can_manage_*`, role-based, workspace-level, or membership-oversight fallbacks. Team displays roles and assignment operations only; descendant visibility is represented by server-resolved scope capabilities, not a member flag.

Reason: the owner-approved test-phase reset created the pre-UAT window to remove compatibility behavior. One payload shape prevents the browser from accidentally granting controls from stale fields and keeps it aligned with backend policy.

Alternatives: retain fallbacks through UAT (rejected because UAT would validate a contract scheduled for removal); infer access from owner/admin labels (rejected because scopes and direct membership grant different capabilities).

Rollout: backend code `fb3b221` is deployed with migration skipped. Matching admin/frontend releases are owner-approved; backend migration `2026_11_13_000001` remains a separate approval gate after client deployment confirmation, backup confirmation, and the redacted audit.

## 2026-11-13 — Search is a contextual utility over collected mentions

Decision: make Home monitor-first, led by glanceable monitor cards and a compact collection pulse. Keep Search out of primary navigation and reach it from the header, a sidebar utility link and contextual drill-downs. Search only queries already-collected mentions and never triggers collection. Remove client use of live-web search, source/monitor result tabs, saved-search UI, recent searches on Home and the personal-history preference. Empty corpus results offer monitor creation.

Reason: scheduled monitors are Sentinel's durable collection mechanism. A search-first home and live/saved-search surfaces frame an autonomous monitoring product as a pull-based search tool, duplicate monitors and distract from daily triage.

Alternatives: deleting Search was rejected because verification and drill-down flows need it; keeping Search primary or retaining a Live web tab was rejected because both contradict the monitor-driven product model.

Rollout: deployed in frontend commit `643f02e`; CI run `43454548867` and deployment/health run `43454548974` passed.
