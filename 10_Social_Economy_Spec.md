# HUMAN WORLD — SOCIAL ECONOMY SPEC v1.0

## 1. PURPOSE
The social layer of Human World is not an isolated chat room; it is the primary engine for price discovery, liquidity generation, and establishing the "Use Value" of land.

## 2. THE SOCIAL-TO-ECONOMIC PIPELINE
Social activity must translate into economic utility without allowing raw "engagement farming" to directly print money.

**Rule:** We DO NOT reward raw likes, follows, or posts with HUM. This is easily botted and creates massive inflation. Instead, social engagement creates *Visibility* and *Reputation*, which drives *Demand* for a player's goods, services, or land.

**Anti-Farming Principle:** Genesis rewards and ecosystem mechanics must NOT reward repetitive clicking, meaningless logins, or automated farming. They must reward unique-human participation and meaningful contribution.

## 3. CORE FEATURES

### A. Profiles & World ID
- Every profile is strictly tied to a unique World ID.
- Displays: Owned land, active businesses, trade history, district affiliations.

### B. Property & Business Pages
- Land plots are not just coordinates; they are social pages.
- Owners can build "Businesses" (off-chain configurations in V1, eventually on-chain NFTs/assets) on their land.
- **Economic Tie:** A highly followed property page acts as top-of-funnel marketing. If the player runs an in-world service (e.g., selling custom digital furniture or hosting events), their property page is their storefront.

### C. Offers & Direct Trades (The Thin-Market Solution)
- Unique plots suffer from thin liquidity.
- A robust "Offer/Counteroffer" system built into the social feed is mandatory.
- Players can broadcast "Looking for Plot in District X" or negotiate publicly/privately.
- This creates decentralized price discovery without relying on an inappropriate AMM structure.

### D. District Communities
- Land is organized into Districts.
- Districts have their own shared feeds, governed by the landowners.
- **Economic Tie:** Strong communities increase the desirability (and thus price) of land in that district. A district can collectively agree to pool HUM to fund public infrastructure or district-wide marketing.

## 4. MEASURING "GENUINE DWELL TIME"
To value land without guaranteeing appreciation simply because time passed, we measure activity.
- **Metric:** Unique-human active interaction.
- **Mechanism:** Because World ID prevents Sybils, we can track how many *unique humans* visit a property, interact with its business, or engage with its owner.
- **Application:** High genuine dwell time increases a property's visibility ranking in the global marketplace, driving organic demand. It may also offer tax deductions (the property is providing public utility) compared to an abandoned, hoarded plot.

## 5. NEW PLAYER PATHWAYS (The Late-Entrant Economy)
How does human #8,000,000 succeed without buying expensive genesis land? The economic promise is that late players have genuine upward mobility and early users do not hold an unbeatable monopoly.
- **Worker/Creator:** They can create digital assets or provide services on another player's property in exchange for HUM.
- **Renter:** They can rent a storefront from an early landowner.
- **Entrepreneur:** Using the social layer, they can build a massive following and reputation, eventually generating enough HUM through services to buy their own land.
- **Schumpeterian Disruption:** New players must be capable of creating something better and displacing older businesses.

## 6. DATA MODEL (Off-chain)
- `users` (id, world_id_nullifier, profile_data, hum_balance)
- `properties` (id, owner_id, district_id, coordinates, on_chain_token_id, page_content)
- `businesses` (id, property_id, type, inventory_data)
- `social_events` (id, actor_id, target_id, event_type, timestamp)
- `market_offers` (id, property_id, bidder_id, hum_amount, status)