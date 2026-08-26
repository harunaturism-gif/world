# Admin owner bootstrap

Apply `supabase/migrations/202608260001_security_phase5_admin_rbac.sql` before enabling the Phase 5 server.

Set `ADMIN_BOOTSTRAP_USER_IDS` only in the server environment. Its value is a comma-separated allowlist of exact Human World internal user IDs (`user_` followed by 64 lowercase hexadecimal characters). Do not use World session IDs or usernames. Duplicate, malformed, or whitespace-padded entries prevent server startup.

After an allowlisted user completes World verification, the server persists the verified profile and idempotently assigns the owner role before returning the application-session cookie. Remove the bootstrap value after the initial owner is established if ongoing automatic repair is not desired. Existing database role assignments remain active.

Production must leave `ENABLE_DEV_ADMIN` disabled. Local browser editing additionally requires both Vite development mode and `VITE_ENABLE_DEV_ADMIN=true`; that path stores development drafts locally and is removed from production builds. Neither development flag authorizes production API requests.

Owner role changes should use the authenticated `/api/admin/roles` endpoints. The database serializes role mutations and refuses removal or demotion of the final owner.
