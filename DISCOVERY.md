# Discovery — Sentinel Frontend

## Architecture

- React 19, Vite 8, React Router 7 and Zustand. Production is static nginx hosting with a same-origin `/api/v1` reverse proxy; the Express server is a fallback host. The production proxy connects to the local API nginx vhost over `https://127.0.0.1` and preserves the API domain as SNI/Host, avoiding a public-DNS dependency during nginx startup.
- The backend and its generated OpenAPI contract are authoritative. Browser code never calls the backend origin directly.
- Routine deployments build assets without installing/reloading the Nginx template. The live vhost remains owner-managed and requires separate configuration verification; see `deploy/README.md`.
- Zustand verifies `/auth/me`, loads `/workspaces`, and owns the selected authorized workspace. Generation/abort guards prevent stale authorization responses from replacing newer state.
- An authenticated email-unverified user is gated before roster, approval, workspace discovery or tenant routing. The verification view preserves the session, can resend mail, and refreshes `/auth/me` manually/on focus; workspaces load only after verification.
- An authenticated user with `is_roster_active=false` is gated before workspace discovery. The dedicated inactive-roster view preserves the session, refreshes `/auth/me` manually and on focus, and loads workspaces only after reactivation.
- Public `/verify-email` and `/reset-password` routes snapshot sensitive query values in memory and scrub the URL immediately. Verification retains a single request promise and reset uses a submission lock so React StrictMode/double submission cannot consume one-time credentials twice. Forgot/reset failure states are privacy-neutral; successful reset clears local session/private state.
- Google/Microsoft social callbacks mark a local email verified only from an explicit true provider claim. Missing/false claims still complete social sign-in without changing local verification state, so an unverified account continues through Sentinel's verification gate.
- Workspace `capabilities` are the sole workspace authorization contract: `view`, `oversee_read`, `manage_members`, `manage_monitors`, `manage_settings`, and `create_workspace`; account-level `can_create_workspace` covers an eligible Unit without a root. Missing/malformed capabilities fail closed; the client has no role or top-level flag fallback.
- Home is monitor-first: monitored-topic cards show status, matched mentions, sources, new items from the latest scan and freshness; a compact `/intelligence/pulse` summary follows. Emerging stories remain on Intelligence.
- Search is a contextual utility over already-collected mentions. It is absent from primary navigation and available through the header, a sidebar utility link and contextual drill-downs. The client no longer calls live-web search or exposes source/monitor result tabs, saved-search UI, home history or the personal-history preference; empty corpus results can open monitor creation.

## P0 organisation model

- State is jurisdiction metadata, Unit is the organisation/roster/assignment boundary, and Workspace is an office tenant in one Unit tree.
- Registration selects an active Unit and staff ID. Membership is explicit; Team exposes Workspace members, manageable Unit members and Invitations, with direct add/update/move/remove operations and protected owners. A canonical owner can transfer atomically to an eligible existing non-owner member and choose their resulting admin/member role.
- Root creation is Unit-aware; child creation uses a manageable parent and inherits Unit/State. Authorization-changing flows refresh account and workspace capabilities before trusting new access.
- Invitation acceptance requires the invited approved/enabled same-Unit account. Registered users are assigned directly rather than invited.

## Status

- P0, ownership-transfer, verification and password-recovery behavior is deployed, including backend migrations `2026_11_11_000005` through `000007`.
- Backend final-contract code and migration `2026_11_13_000001` are deployed; the migration is Ran in production batch 9 and service checks passed. Matching admin/frontend final-contract releases are deployed. The monitor-first home/search-utility release is the next frontend deployment; authorization, real-mail and product UAT remain.
