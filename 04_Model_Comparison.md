# HUMAN WORLD — ECONOMIC MODEL COMPARISON v2.0

## 1. PURPOSE
This document compares the four major primary-market and supply models simulated across populations from 100K to 10M, derived from `07_Simulation_Results.json`.

## 2. THE MODELS TESTED

### MODEL A: Fixed Supply (2M), No Cap, Fixed Price
- **Description:** A hard cap of 2M plots, sold at a fixed price of $10, with no purchase limits per human.
- **Observations:**
  - At 100K population, sells ~315K plots (Gini 0.60).
  - At 10M population, the 2M cap is hit instantly. Gini spikes to 0.97.
  - **93.6% of the population is priced out or left with zero land.** The top 1% own 64.4% of the world.
- **Verdict:** Fails catastrophically at scale. Creates a neo-feudal economy that excludes new players.

### MODEL B: Fixed Supply (2M), Human Cap (5), Bonding Curve
- **Description:** A hard cap of 2M plots. Price starts at $10 and scales up as supply diminishes. Humans are capped at 5 plots each.
- **Observations:**
  - The bonding curve + human cap significantly improves distribution at lower populations.
  - At 100K, only 8.4% have zero land (Gini 0.39).
  - At 10M, the 2M cap is still a physical limitation. Gini reaches 0.92.
  - **89.1% of the population has zero land.** The top 1% own 25% of the land.
- **Verdict:** The bonding curve and caps delay the problem but cannot solve the math problem of a fixed 2M cap against 10M users.

### MODEL C: Ratio Supply (0.5), Human Cap (10), Bonding Curve
- **Description:** Land supply grows with population (0.5 plots per verified human). Humans are capped at 10 plots. Price scales on a bonding curve.
- **Observations:**
  - Supply scales to 5M plots at 10M population.
  - Gini remains perfectly stable across all populations (0.86).
  - The percentage of people with zero land remains stable at ~76.5%. (This implies the bonding curve quickly prices out lower-budget players, leaving a stable middle-class of owners).
  - **Treasury Revenue** is robust ($81.7M at 10M pop).
- **Verdict:** Highly stable, scalable model. The bonding curve might be slightly too steep, pricing out 76% of users, but the systemic stability is a massive improvement over fixed-cap models.

### MODEL D: Ratio Supply (0.5), No Cap, Fixed Price
- **Description:** Land supply grows with population. Price is fixed at $10. No caps.
- **Observations:**
  - Gini remains high (0.93 - 0.95) across all populations because whales simply buy as much as their budget allows at the fixed price.
  - Percentage of humans with zero land remains high (~83-86%).
- **Verdict:** Dynamic supply fails if there are no wealth controls or price curves to deter hoarding. Whales simply absorb the new supply.

## 3. CONCLUSION & RECOMMENDATION

The simulation conclusively proves that **Fixed Absolute Supply models (A & B) fail at scale**. They inherently create environments where late entrants have mathematical zero chance of primary ownership.

**Ratio Supply (Dynamic Issuance)** combined with **Human-level Caps** and a **Bonding Curve (Model C)** provides the most stable, scalable economy. It ensures that as the population grows, the world expands, but acquisition limits and rising prices prevent early adopters from hoarding the frontier.

**Expanded Parameter Sensitivity (v2.1):**
Testing supply ratios from 0.25 to 1.0 revealed critical thresholds. At 0.5 plots/human, ~72% of the population holds zero land. Expanding the supply ratio to 1.0 reduces this exclusion to ~61%, with a Gini drop from 0.79 to 0.75. This confirms that dynamic supply parameters can be directly tuned to manage wealth distribution without breaking the core economy.

**Refinement for Constitution v0.2:**
We will adopt the **Dynamic Ratio Supply** (e.g., permanent geography combined with controlled plot release based on population/activity) combined with **Human Caps**. The supply ratio target will be elevated (closer to 1.0) and the bonding curve parameter softened slightly to pull the "zero land" percentage below 60%.

**Supporting Models Integration:**
To ensure this primary model does not decay over time, it will be wrapped in the newly integrated modular systems:
- A `TaxModel` acting as a land maintenance sink to deter non-productive hoarding.
- A `FaucetSinkModel` closely monitoring the internal HUM issuance against WLD/HUM sinks.
- A `BuildingEconomyModel` enforcing use-value over speculative value.