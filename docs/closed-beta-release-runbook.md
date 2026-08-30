# Human World closed-beta release runbook

This runbook defines the minimum path from a reviewed commit to a reversible closed-beta release. A successful build alone is not a release decision.

## Release gate

The release candidate is GO only when all of the following are true:

- Security Phases 1–5 are integrated into one reviewed commit.
- The GitHub `Human World quality gate` is green for that exact commit.
- All database migrations have been applied in order and verified.
- Production contains no development authentication, persistence or admin bypass.
- Public metadata identifies Human World only, browser zoom remains available and closed-beta pages are `noindex`.
- An owner, an editor and an ordinary user have passed the RBAC smoke matrix.
- The frontend, HTTP API and authenticated WebSocket have passed the smoke flow below.
- A rollback target and an operator are identified before promotion.

Until every item is satisfied, the closed beta remains NO-GO.

## Deployment topology

The Vite frontend may be deployed to static hosting such as Vercel. The Express/WebSocket server requires hosting that supports long-lived WebSocket connections; do not assume a stateless serverless function can host the multiplayer server.

Use separate public origins:

- Frontend: HTTPS origin used by `APP_ORIGIN`.
- Backend: HTTPS/WSS origin used by `VITE_BACKEND_URL` and `VITE_WS_URL`.
- Database: Supabase reachable only from the backend service role.

## Environment inventory

Never copy secret values into tickets, chat, build logs or this repository.

Frontend variables:

- `VITE_BACKEND_URL` — exact production HTTPS backend origin, without path, query, fragment or trailing slash.
- `VITE_WS_URL` — exact production WSS backend origin, without path, query, fragment or trailing slash.
- `VITE_WORLD_APP_ID` — public World application identifier.
- `VITE_ENABLE_DEV_AUTH=false`.
- `VITE_ENABLE_DEV_ADMIN=false`.

Backend variables:

- `NODE_ENV=production`.
- `PORT`.
- `TRUST_PROXY_HOPS` — exact trusted reverse-proxy hop count from 0 to 3; use `0` for direct internet traffic and configure the real hosting topology before enabling forwarded client IPs.
- `APP_ORIGIN` — exact frontend origin, without wildcard matching.
- `WORLD_RP_ID`.
- `WORLD_RP_SIGNING_KEY`.
- `APP_SESSION_SECRET` — independent random secret of at least 32 bytes.
- `APP_IDENTITY_SECRET` — different independent random secret of at least 32 bytes.
- `SUPABASE_URL`.
- `SUPABASE_SERVICE_ROLE_KEY`.
- `ADMIN_BOOTSTRAP_USER_IDS` — comma-separated internal IDs for the initial owner bootstrap; remove after the intended owners exist unless automatic repair is explicitly required.
- `ENABLE_DEV_ADMIN=false`.
- All development mock flags disabled.

No backend variable may use a `VITE_` prefix.

## Pre-deployment procedure

1. Record the exact release commit and the previous known-good frontend/backend deployments.
2. Run `npm ci` and `npm --prefix server ci` from clean checkouts.
3. Run root unit tests when configured, typecheck, lint and production build.
4. Run the complete server security test suite.
5. Run `node scripts/verify-production-bundle.mjs` after the build.
6. Run `node scripts/verify-public-shell.mjs` and confirm no sitemap is published for the closed beta.
7. Run `node --test scripts/verify-release-env.test.mjs` to verify the preflight itself.
8. Validate each deployed service without exposing values: `node scripts/verify-release-env.mjs frontend` in the frontend environment and `node scripts/verify-release-env.mjs backend` in the backend environment. For a local combined environment, use `all`.
9. Rebuild the server and confirm `git diff --exit-code -- server`.
10. Review migrations for destructive operations. Closed-beta migrations should be forward compatible.
11. Back up production data before applying a migration that changes stored data.

## Discovery policy

The closed beta intentionally ships with `noindex` metadata, a deny-all `robots.txt` and no sitemap. Before a future public launch, choose the canonical production domain, add matching canonical and social-preview URLs, create a Human World sitemap, and update the automated public-shell check in the same reviewed change.

## Promotion order

1. Apply pending Supabase migrations.
2. Verify RLS is enabled and forced and that `anon`/`authenticated` grants remain revoked.
3. Deploy the backend candidate without redirecting frontend traffic.
4. Verify backend health, exact-Origin rejection, cookie authentication, auth rate-limit `429` behavior and WSS upgrade rejection/acceptance.
5. Deploy a frontend preview against the candidate backend.
6. Complete the smoke matrix.
7. Promote the already-tested frontend artifact; do not rebuild a different artifact for production.
8. Monitor backend errors, WebSocket disconnect rate and authentication failures during the initial beta window.

## Required smoke flow

Run on desktop and a 390 × 844 mobile viewport:

1. Unauthenticated entry renders without console errors.
2. World verification creates the HttpOnly application session.
3. Refresh restores the authenticated session without exposing a token to JavaScript.
4. World map loads persisted rooms.
5. Enter a room and confirm the authenticated WebSocket identity.
6. Move and chat; forged identity fields must be rejected and sustained auth/message floods must be throttled without affecting another user.
7. Create a post, like once, follow another user and save an avatar; refresh and confirm persistence.
8. Confirm a second like is idempotent.
9. Confirm an ordinary user cannot see or open admin controls.
10. Confirm an editor can publish a room but cannot manage roles.
11. Confirm an owner can manage roles and that revocation applies on the next request.
12. Confirm stale room-layout versions receive a conflict without losing the local draft.
13. Log out and confirm the session cookie is cleared and WebSocket access is rejected.

## Rollback

If the frontend fails, promote the previous known-good frontend artifact.

If the backend fails, redirect traffic to the previous compatible backend release. Do not roll back a database migration destructively during an incident; prefer a forward-compatible corrective migration.

If authentication integrity is uncertain:

1. Disable new beta entry.
2. Rotate `APP_SESSION_SECRET` to invalidate application sessions.
3. Rotate exposed upstream or Supabase credentials if relevant.
4. Revoke affected admin assignments directly through the protected operational path.
5. Preserve sanitized audit records for investigation.

## Release record

Record these items for every promotion:

- Release commit.
- Migration versions applied.
- Frontend deployment ID.
- Backend deployment ID.
- Test-suite totals.
- Smoke-test operator and timestamp.
- Known limitations.
- Previous deployment IDs used for rollback.
