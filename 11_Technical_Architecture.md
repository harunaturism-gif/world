# HUMAN WORLD — TECHNICAL ARCHITECTURE v1.0

## 1. PURPOSE
This document outlines the technical architecture for Human World, designed to be executed by a solo founder leveraging AI tools. It clearly delineates the on-chain vs. off-chain state.

## 2. TARGET STACK
- **Client:** Next.js, React, TypeScript, TailwindCSS
- **Environment:** World Mini App
- **Authentication:** World ID (Sign in with Worldcoin)
- **Database / Backend:** Supabase (PostgreSQL), Vercel Serverless Functions
- **Blockchain:** World Chain (Optimism L2 stack)

## 3. ARCHITECTURE SPLIT (ON-CHAIN VS. OFF-CHAIN)

### ON-CHAIN STATE (World Chain)
Only critical, high-value operations that require permanent verifiability are stored on-chain.
- **Land Ownership:** ERC-721 or similar standard for unique plot ownership.
- **Critical Transfers:** Secondary market final settlement for land.
- **WLD Integration:** Receiving WLD for primary sales, Treasury contracts.

### OFF-CHAIN STATE (Supabase / Postgres)
The vast majority of the game state and social economy must live off-chain to avoid gas fees, optimize speed, and allow rapid iteration.
- **The Social Engine:** Profiles, posts, district feeds, DMs.
- **The Marketplace UI:** Order books, trade requests, and auction states (until final settlement).
- **The Economic Engine:** HUM balances (non-tradable unit), business configurations, inventory, productive assets.
- **Analytics:** Unique human dwell time tracking, reputation scoring.

## 4. DATABASE SCHEMA (Postgres / Supabase)

### Core Tables
1. `users`
   - `id` (UUID, PK)
   - `world_id_nullifier` (String, Unique, used for Sybil resistance)
   - `hum_balance` (Numeric, default 0)
   - `profile_data` (JSONB)
   - `created_at` (Timestamp)

2. `land_plots`
   - `id` (UUID, PK)
   - `owner_id` (UUID, FK to users)
   - `coordinates` (String/JSONB)
   - `district_id` (UUID)
   - `on_chain_token_id` (Integer, nullable if not minted yet)
   - `status` (Enum: active, abandoned, listed)

3. `businesses`
   - `id` (UUID, PK)
   - `plot_id` (UUID, FK to land_plots)
   - `type` (String)
   - `metadata` (JSONB - stores inventory, levels, etc.)

4. `market_offers`
   - `id` (UUID, PK)
   - `plot_id` (UUID, FK to land_plots)
   - `buyer_id` (UUID, FK to users)
   - `offer_amount` (Numeric)
   - `status` (Enum: pending, accepted, rejected)

5. `social_events` (For feeds and Dwell Time analytics)
   - `id` (UUID, PK)
   - `actor_id` (UUID, FK to users)
   - `target_plot_id` (UUID, nullable)
   - `event_type` (String: "visit", "post", "trade")
   - `timestamp` (Timestamp)

## 5. CORE ENGINES & APIS

### A. Authentication API
- Integrates the `@worldcoin/idkit` for login.
- Extracts the `nullifier_hash` and checks if a user exists in the `users` table. If not, creates a new account.

### B. Economic Engine API
- Runs securely on backend (Vercel Serverless / Supabase Edge Functions).
- Processes all `HUM` transactions (faucets and sinks).
- Validates the user has sufficient HUM before allowing business construction or upgrades.

### C. Primary Market API (Bonding Curve)
- Calculates the current land price based on the `total_sold` count in the database.
- Verifies the user's World ID has not exceeded the `max_plots` cap.
- Processes the WLD payment (via World Chain) and assigns the `land_plot` in the database.

## 6. ABUSE PREVENTION & SECURITY
- **World ID Enforcement:** Every economic action (claiming, buying, voting) requires the session to be linked to a verified World ID.
- **Rate Limiting:** Supabase / Vercel rate limiting to prevent botting of the social feed.
- **Server-Side Authority:** The client NEVER tells the server what its HUM balance is. All HUM additions/subtractions are calculated securely on the backend based on validated game events.

## 7. DEPLOYMENT PIPELINE
- Development via Vercel Previews.
- Smart Contracts (when needed for Phase 2) tested via Hardhat/Foundry locally before deploying to World Chain testnet.
- **Rule:** DO NOT deploy smart contracts or tokens in Phase 1 MVP. Build the entire off-chain loop first.