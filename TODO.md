# TODO — Sentinel Frontend

## Production rollout

- Commit and deploy the matching backend/frontend changes; the current implementation is local, uncommitted and undeployed.
- Run the owner-controlled backend rollout for migrations `2026_11_11_000005` through `000007`, including reviewed Unit backfill/integrity checks. None has run in production.
- Configure the mail provider and verify email resend/completion plus forgot/reset-password delivery in staging without exposing account or token validity.
- Verify final authorization, inactive-roster, invitation, ownership-transfer and Unit-aware creation flows in staging after migration/backfill.

## P2

- Remove legacy `can_manage_*`/`can_oversee` compatibility reads after all deployed workspace responses provide canonical capabilities.
- Remove UI accommodation for legacy State workspaces or missing Unit links only after the backend integrity audit/backfill is complete.
