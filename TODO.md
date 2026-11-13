# TODO — Sentinel Frontend

## Production rollout

- Backend final-contract code `fb3b221` is deployed with its migration skipped. Complete and verify the owner-approved admin/frontend release, including the DNS-independent frontend Nginx template; verify the active owner-managed vhost separately.
- Confirm a fresh backup/redacted audit after client deployment, then obtain separate approval for the owner-run maintenance-mode backend migration `2026_11_13_000001`. Verify services and repeat the redacted integrity audit before UAT.
- Configure the mail provider and verify email resend/completion plus forgot/reset-password delivery in staging without exposing account or token validity.
- Verify final authorization, inactive-roster, invitation, ownership-transfer and Unit-aware creation flows in staging after migration/backfill.
