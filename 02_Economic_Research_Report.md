# HUMAN WORLD — ECONOMIC RESEARCH REPORT v1.0

## 1. INTRODUCTION
This document serves as the foundation for the Human World economic evaluation. Before defining the v0.2 Constitution or technical architecture, we must untangle the existing assumptions, hypotheses, and contradictions present in v0.1 research and teardowns.

## 2. CONTRADICTION MATRIX
The following matrix identifies disagreements, open questions, and untested assumptions across core economic modules.

### LAND SUPPLY
- **Fixed Absolute Supply:** Constitution v0.1 hypothesizes a finite maximum supply. However, the simulation teardown completely rejected a fixed 2M plot cap due to severe exclusion and concentration at high populations.
- **Alternatives to Evaluate:** Fixed land-to-human ratio, dynamic frontier issuance, activity-linked issuance, and hybrid (permanent geography + controlled release).
- **Contradiction:** Scarcity drives value, but absolute scarcity creates feudalism at scale.

### GENESIS
- **Options:** Free allocation, discounted allocation, fixed-price sale, Dutch auction, sealed-bid auction, hybrid.
- **Contradiction:** A cheap genesis allows widespread initial distribution but invites early whale hoarding. An expensive genesis prevents hoarding but prices out regular humans.

### PRIMARY PRICING
- **Options:** Fixed price, global bonding curve, district bonding curve, district auction, hybrid auction + pricing floor.
- **Contradiction:** Fixed pricing risks rapid depletion by whales. Bonding curves punish latecomers exponentially, undermining the late-player economy.

### SECONDARY MARKET
- **Options:** Fixed-price listings, offers/counteroffers, order book, auctions, AMM/fungible floor, hybrid.
- **Contradiction:** Unique plots are not fungible tokens. Treating them like ERC-20s (e.g., AMMs) abstracts away locational and utility value. Thin liquidity on unique assets makes price discovery difficult.

### LAND VALUATION
- **Signals:** Realized price, rental revenue, genuine dwell time, building activity, location, district activity, social engagement.
- **Contradiction:** Constitution v0.1 wants value discovered through activity, but easily manipulable metrics (like raw visitor counts or social engagement) can be botted or gamified. We must separate OBSERVABLE from MANIPULABLE metrics.

### WEALTH CONTROL
- **Options:** Per-wallet cap, per-human cap, acquisition-rate limits, progressive holding tax, land-value tax, Harberger-style taxation, inactivity reclaim, new-player reserves.
- **Contradiction:** Teardown v1 states per-wallet caps are insufficient. However, aggressive anti-concentration mechanisms (like harsh Harberger taxes) might destroy player attachment, investment incentives, and overall economic health.

### HUM
- **Options:** No internal currency, off-chain accounting unit, non-tradable internal currency, later tradable token, tradable token from launch, WLD-only economy.
- **Contradiction:** Constitution v0.1 proposes HUM as an internal unit, but Teardown v1 states tokenomics should not be finalized unless proven useful. Should HUM exist at all?

### WLD
- **Role:** Settlement only, pricing unit, on/off ramp, conversion mechanism.
- **Contradiction:** Using WLD as the primary internal pricing unit exposes the game economy to extreme external volatility. Teardown v1 explicitly warns against WLD dependency for stable pricing.

### INACTIVE LAND
- **Options:** Permanent ownership, maintenance cost, tax, degradation, reclaim, public auction, partial reclaim.
- **Contradiction:** True ownership implies permanence, but dead capital (inactive land) destroys the world's social and economic utility over time.

### LATE-PLAYER ECONOMY
- **Paths:** Renting, work/labor, entrepreneurship, creator economy, district competition.
- **Contradiction:** If the only path to prosperity for human #8,000,000 is buying expensive assets from early players, the game devolves into a Ponzi-like structure.

## 3. PROVENANCE OF FINDINGS

To ensure we do not treat previous AI recommendations as unquestionable truth, we classify existing findings:

- **SOURCE FACT:**
  - World ID provides structural proof-of-human, solving many Sybil vulnerabilities.
  - The founder has limited initial capital and cannot subsidize the economy.
- **SIMULATION RESULT:**
  - A fixed land cap of 2M plots leads to severe concentration and prices out the majority of users when population reaches 10M.
- **INFERENCE:**
  - The internal economy cannot use WLD as its stable unit of account due to external crypto market volatility.
  - Per-wallet caps are ineffective; caps must be enforced at the human (World ID) level.
- **DESIGN RECOMMENDATION:**
  - Land must have use-value (productive activity) rather than purely speculative value.
  - Tokenomics must not be finalized until the internal economy demonstrates a genuine need for a token.
- **OPEN QUESTION:**
  - How do buildings and businesses create real, non-gameable economic activity?
  - What are the exact conditions under which a tradable token (HUM) is justified?
