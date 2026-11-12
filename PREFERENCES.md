# Preferences — Sentinel Frontend

- Keep all browser API traffic same-origin under `/api/v1`; provider secrets and backend-origin calls stay off the client.
- Treat backend resources and canonical `workspace.capabilities` as authoritative; do not infer permissions from roles, workspace levels, Figma, or `can_oversee`.
- Preserve State/Unit/Workspace meanings and explicit same-Unit assignment. Refresh authorization after membership, invitation, approval, or workspace changes.
- Gate email verification, roster status and approval before tenant requests, in that order; preserve authenticated identity while an eligibility gate is recoverable.
- Keep auth-link tokens in memory only, scrub them from URLs immediately, and make one-time exchanges safe under React StrictMode. Use neutral account-recovery states and clear private session state after password reset.
- Render honest loading, empty, denied and retryable error states; never substitute fixtures or optimistic access claims.
- Avoid dependencies and custom infrastructure when existing React, Router, Zustand and project patterns suffice.
