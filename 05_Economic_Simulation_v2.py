import numpy as np
import json
import csv
import os

# =====================================================================
# HUMAN WORLD ECONOMIC SIMULATOR v2.1 (INTEGRATED)
# =====================================================================

def gini(x):
    x = np.sort(np.array(x, dtype=float))
    n = len(x)
    if n == 0 or x.sum() == 0:
        return 0.0
    cum = np.cumsum(x)
    return (n + 1 - 2 * np.sum(cum) / cum[-1]) / n

class HumanWorldSimulationVectorized:
    def __init__(self, target_population, config, seed=42):
        self.target_population = target_population
        self.config = config
        self.rng = np.random.default_rng(seed)

        # Agent Types:
        # 0: Casual (60%) - low budget, occasionally buys 1 plot, low activity
        # 1: Builder (15%) - med budget, buys land, constructs businesses
        # 2: Entrepreneur (10%) - med budget, buys businesses, high activity
        # 3: Trader (5%) - high budget, buys and sells land
        # 4: Whale (1%) - extreme budget, buys max land, dominates
        # 5: Social/Creator (9%) - low budget, no land, generates HUM via activity

        self.num_agents = target_population
        whale_p = config.get('whale_prob', 0.01)
        base_probs = np.array([0.60, 0.15, 0.10, 0.05, whale_p, 0.09])
        base_probs = base_probs / np.sum(base_probs)
        self.agent_types = self.rng.choice(6, size=self.num_agents, p=base_probs)

        self.active = np.ones(self.num_agents, dtype=bool)
        inactivity_rate = config.get('inactivity_rate', 0.0)
        if inactivity_rate > 0.0:
            inactive_mask = self.rng.random(self.num_agents) < inactivity_rate
            self.active[inactive_mask] = False

        # Initial budgets (WLD equivalent in USD)
        a = 1.4
        base_budgets = (self.rng.pareto(a, self.num_agents) + 1) * 40.0
        base_budgets[self.agent_types == 4] *= 100.0 # Whales
        base_budgets[self.agent_types == 3] *= 10.0  # Traders
        self.wld_budgets = base_budgets

        self.hum_balances = np.zeros(self.num_agents, dtype=float)
        self.land_owned = np.zeros(self.num_agents, dtype=int)
        self.businesses_owned = np.zeros(self.num_agents, dtype=int)

        self.total_plots_sold = 0
        self.treasury_wld = 0.0
        self.total_hum_issued = 0.0
        self.total_hum_sunk = 0.0

        self.wld_price = 1.0
        self.current_step = 0

    def get_max_supply(self, active_pop):
        if self.config['supply_type'] == 'fixed':
            return self.config['supply_cap']
        elif self.config['supply_type'] == 'ratio':
            return int(active_pop * self.config['supply_ratio'])
        return 0

    def get_primary_price(self, cap):
        safe_cap = max(cap, 1)
        if self.config['pricing'] == 'fixed':
            return self.config['base_price']
        elif self.config['pricing'] == 'bonding':
            return self.config['base_price'] * (1 + self.total_plots_sold / safe_cap) ** self.config['curve_k']

    def step(self):
        self.current_step += 1
        active_pop = np.sum(self.active)
        max_supply = self.get_max_supply(active_pop)

        # WLD Volatility
        if self.current_step % 12 == 0:
            self.wld_price *= self.config.get('wld_vol_factor', 1.0)

        # 1. Primary Market
        primary_price = self.get_primary_price(max_supply)
        human_cap = self.config.get('human_cap', 999999)

        # Find eligible buyers: active, have budget, under cap
        buy_intent = np.zeros(self.num_agents, dtype=bool)
        buy_intent[self.agent_types == 1] = self.rng.random(np.sum(self.agent_types == 1)) < 0.3
        buy_intent[self.agent_types == 3] = self.rng.random(np.sum(self.agent_types == 3)) < 0.5
        buy_intent[self.agent_types == 4] = self.rng.random(np.sum(self.agent_types == 4)) < 0.8
        buy_intent[self.agent_types == 0] = self.rng.random(np.sum(self.agent_types == 0)) < 0.05

        eligible = self.active & buy_intent & (self.wld_budgets >= primary_price) & (self.land_owned < human_cap)
        eligible_indices = np.where(eligible)[0]

        remaining_supply = max_supply - self.total_plots_sold
        if remaining_supply > 0 and len(eligible_indices) > 0:
            self.rng.shuffle(eligible_indices)
            buy_count = min(len(eligible_indices), int(remaining_supply))
            if buy_count > 0:
                actual_buyers = eligible_indices[:buy_count]
                self.wld_budgets[actual_buyers] -= primary_price
                self.treasury_wld += primary_price * buy_count
                self.land_owned[actual_buyers] += 1
                self.total_plots_sold += buy_count

        # 2. Secondary Market (Thin Liquidity Model)
        num_sellers = int(np.sum(self.land_owned > 0) * 0.005) # 0.5% liquidity
        if num_sellers > 0:
            potential_sellers = np.where(self.land_owned > 0)[0]
            potential_buyers = np.where((self.wld_budgets >= primary_price * 1.5) & (self.land_owned < human_cap))[0]

            if len(potential_sellers) > 0 and len(potential_buyers) > 0:
                actual_trades = min(num_sellers, len(potential_sellers), len(potential_buyers))
                if actual_trades > 0:
                    sellers = self.rng.choice(potential_sellers, size=actual_trades, replace=False)
                    buyers = self.rng.choice(potential_buyers, size=actual_trades, replace=False)

                    # Assume all trade at 1.2x primary price for simplicity in vectorization
                    sec_price = primary_price * 1.2

                    self.wld_budgets[buyers] -= sec_price
                    self.wld_budgets[sellers] += sec_price * 0.95
                    self.treasury_wld += sec_price * 0.05 * actual_trades
                    self.land_owned[sellers] -= 1
                    self.land_owned[buyers] += 1

        # 3. Productive Economy (Buildings & Businesses)
        build_cost = 50.0 # HUM
        can_build = self.active & (self.agent_types == 1) & (self.land_owned > self.businesses_owned) & (self.hum_balances >= build_cost)
        build_indices = np.where(can_build)[0]
        if len(build_indices) > 0:
            self.hum_balances[build_indices] -= build_cost
            self.total_hum_sunk += build_cost * len(build_indices)
            self.businesses_owned[build_indices] += 1

        # 4. Activity, Faucets & Sinks
        faucet_amount = 5.0 * self.config.get('faucet_mult', 1.0)
        active_social = self.active & (self.agent_types == 5)
        self.hum_balances[active_social] += faucet_amount
        self.total_hum_issued += faucet_amount * np.sum(active_social)

        active_biz = self.active & (self.businesses_owned > 0)
        biz_faucet = 10.0 * self.config.get('faucet_mult', 1.0) * self.businesses_owned[active_biz]
        self.hum_balances[active_biz] += biz_faucet
        self.total_hum_issued += np.sum(biz_faucet)

        # Taxes/Maintenance (Sink)
        tax_rate = self.config.get('tax_rate', 1.0) # HUM per land per step
        has_land = self.land_owned > 0
        tax_owed = self.land_owned[has_land] * tax_rate
        # Pay tax if able
        can_pay = self.hum_balances[has_land] >= tax_owed
        self.hum_balances[has_land] = np.where(can_pay, self.hum_balances[has_land] - tax_owed, 0)
        self.total_hum_sunk += np.sum(tax_owed[can_pay])

        # 5. Inactivity & Abandonment
        deact = self.rng.random(self.num_agents) < 0.01
        deact[self.agent_types != 0] = self.rng.random(np.sum(self.agent_types != 0)) < 0.001
        self.active[deact] = False

        unpaid = (~can_pay) & (~self.active[has_land])
        if np.any(unpaid):
            reclaim_indices = np.where(has_land)[0][unpaid]
            lost = self.land_owned[reclaim_indices]
            self.total_plots_sold -= np.sum(lost) # Re-enters supply
            self.land_owned[reclaim_indices] = 0
            self.businesses_owned[reclaim_indices] = 0

    def get_metrics(self):
        top_n = lambda frac: self.land_owned[
            np.argsort(self.land_owned)[::-1][:max(1, int(self.num_agents * frac))]
        ].sum() / max(self.land_owned.sum(), 1e-9)

        return {
            "scenario": self.config['name'],
            "population": self.num_agents,
            "total_land_sold": int(self.total_plots_sold),
            "treasury_revenue": round(self.treasury_wld, 2),
            "hum_velocity": round(self.total_hum_issued - self.total_hum_sunk, 2),
            "gini_land": round(gini(self.land_owned), 4),
            "pct_zero_land": round(100 * (self.land_owned == 0).sum() / self.num_agents, 2),
            "median_land": float(np.median(self.land_owned)),
            "top_1pct_land": round(100 * top_n(0.01), 2),
            "top_5pct_land": round(100 * top_n(0.05), 2),
            "top_10pct_land": round(100 * top_n(0.10), 2)
        }

def run_tournaments():
    # Reduced population bounds slightly for CI timeout constraints while maintaining scale representation
    populations = [100_000, 500_000, 1_000_000, 5_000_000]
    results = []

    # Scenarios Definition (Including Parameter Sensitivity, WLD Volatility, Whale Stress Tests)
    scenarios = [
        {
            "name": "Model A - Fixed Supply (2M), Fixed Price",
            "supply_type": "fixed",
            "supply_cap": 2_000_000,
            "pricing": "fixed",
            "base_price": 10.0,
            "tax_rate": 0.0,
            "human_cap": 999999
        },
        {
            "name": "Model B - Fixed Supply (2M), Cap 5, Bonding",
            "supply_type": "fixed",
            "supply_cap": 2_000_000,
            "pricing": "bonding",
            "base_price": 10.0,
            "curve_k": 1.5,
            "tax_rate": 1.0,
            "human_cap": 5
        },
        {
            "name": "Model C - Ratio Supply (0.5), Cap 10, Bonding",
            "supply_type": "ratio",
            "supply_ratio": 0.5,
            "pricing": "bonding",
            "base_price": 10.0,
            "curve_k": 1.2,
            "tax_rate": 2.0,
            "human_cap": 10
        },
        {
            "name": "Sensitivity - Ratio 1.5, Cap 10, Bonding",
            "supply_type": "ratio",
            "supply_ratio": 1.5,
            "pricing": "bonding",
            "base_price": 10.0,
            "curve_k": 1.2,
            "tax_rate": 2.0,
            "human_cap": 10
        },
        {
            "name": "Sensitivity - Ratio 2.0, Cap 10, Bonding",
            "supply_type": "ratio",
            "supply_ratio": 2.0,
            "pricing": "bonding",
            "base_price": 10.0,
            "curve_k": 1.2,
            "tax_rate": 2.0,
            "human_cap": 10
        },
        {
            "name": "30-Day Economy - New Casual Building Affordability",
            "supply_type": "ratio",
            "supply_ratio": 1.0,
            "pricing": "bonding",
            "base_price": 10.0,
            "curve_k": 1.2,
            "tax_rate": 2.0,
            "human_cap": 10,
            "simulate_30_days": True
        },
        {
            "name": "Sensitivity - Ratio 0.25, Cap 10, Bonding",
            "supply_type": "ratio",
            "supply_ratio": 0.25,
            "pricing": "bonding",
            "base_price": 10.0,
            "curve_k": 1.2,
            "tax_rate": 2.0,
            "human_cap": 10
        },
        {
            "name": "Sensitivity - Ratio 1.0, Cap 10, Bonding",
            "supply_type": "ratio",
            "supply_ratio": 1.0,
            "pricing": "bonding",
            "base_price": 10.0,
            "curve_k": 1.2,
            "tax_rate": 2.0,
            "human_cap": 10
        },
        {
            "name": "WLD Volatility - Ratio 0.5, Cap 10 (High Volatility)",
            "supply_type": "ratio",
            "supply_ratio": 0.5,
            "pricing": "bonding",
            "base_price": 10.0,
            "curve_k": 1.2,
            "tax_rate": 2.0,
            "human_cap": 10,
            "wld_vol_factor": 0.5 # WLD drops 50% periodically
        },
        {
            "name": "Whale Stress Test - 5% Whales",
            "supply_type": "ratio",
            "supply_ratio": 0.5,
            "pricing": "bonding",
            "base_price": 10.0,
            "curve_k": 1.2,
            "tax_rate": 2.0,
            "human_cap": 999999,
            "whale_prob": 0.05
        },
        {
            "name": "Inactivity Stress Test - 50% Inactive",
            "supply_type": "ratio",
            "supply_ratio": 0.5,
            "pricing": "bonding",
            "base_price": 10.0,
            "curve_k": 1.2,
            "tax_rate": 2.0,
            "human_cap": 10,
            "inactivity_rate": 0.50
        },
        {
            "name": "Faucet/Sink - +100% Faucet",
            "supply_type": "ratio",
            "supply_ratio": 0.5,
            "pricing": "bonding",
            "base_price": 10.0,
            "curve_k": 1.2,
            "tax_rate": 2.0,
            "human_cap": 10,
            "faucet_mult": 2.0
        },
        {
            "name": "HUM Variants - WLD Only (No HUM Sink)",
            "supply_type": "ratio",
            "supply_ratio": 0.5,
            "pricing": "bonding",
            "base_price": 10.0,
            "curve_k": 1.2,
            "tax_rate": 0.0,
            "human_cap": 10,
            "wld_only": True
        }
    ]

    print("Running Integrated Economic Simulation Scenarios...")
    for pop in populations:
        for config in scenarios:
            print(f"Simulating: {config['name']} at Population: {pop}")
            sim = HumanWorldSimulationVectorized(pop, config)
            # Standard simulation for 24 macro time steps
            steps = 30 if config.get('simulate_30_days') else 24
            for _ in range(steps):
                sim.step()

            metrics = sim.get_metrics()

            # Additional metric for the 30-day economy test
            if config.get('simulate_30_days'):
                # How many casual users (type 0) and social users (type 5) can afford a 50 HUM building after 30 days?
                build_cost = 50.0
                casual_can_afford = np.sum((sim.agent_types == 0) & (sim.hum_balances >= build_cost))
                social_can_afford = np.sum((sim.agent_types == 5) & (sim.hum_balances >= build_cost))
                metrics["casual_can_build_pct"] = round(100 * casual_can_afford / max(1, np.sum(sim.agent_types == 0)), 2)
                metrics["social_can_build_pct"] = round(100 * social_can_afford / max(1, np.sum(sim.agent_types == 5)), 2)

            results.append(metrics)

    # Output JSON
    with open("07_Simulation_Results.json", "w") as f:
        json.dump(results, f, indent=2)

    # Output CSV
    if results:
        # Collect all unique keys from all results (since some have extra metrics)
        all_keys = set()
        for r in results:
            all_keys.update(r.keys())
        # Ensure a consistent order, starting with common keys
        keys = list(results[0].keys()) + [k for k in all_keys if k not in results[0].keys()]

        with open("06_Simulation_Results.csv", "w", newline="") as f:
            dict_writer = csv.DictWriter(f, keys)
            dict_writer.writeheader()
            dict_writer.writerows(results)

    print("Simulation complete. Results saved to JSON and CSV.")

    # Generate charts
    try:
        import matplotlib.pyplot as plt

        # Chart 1: Gini vs Population
        plt.figure(figsize=(10, 6))
        for config in scenarios:
            scenario_name = config["name"]
            data = [r for r in results if r["scenario"] == scenario_name]
            x = [d["population"] for d in data]
            y = [d["gini_land"] for d in data]
            plt.plot(x, y, marker='o', label=scenario_name.split(' - ')[0])
        plt.xscale('log')
        plt.xlabel('Population')
        plt.ylabel('Land Gini Coefficient')
        plt.title('Wealth Concentration (Gini) vs Population')
        plt.legend()
        plt.grid(True)
        plt.savefig('chart_gini_vs_population.png')
        plt.close()

        # Chart 2: Pct Zero Land vs Population
        plt.figure(figsize=(10, 6))
        for config in scenarios:
            scenario_name = config["name"]
            data = [r for r in results if r["scenario"] == scenario_name]
            x = [d["population"] for d in data]
            y = [d["pct_zero_land"] for d in data]
            plt.plot(x, y, marker='o', label=scenario_name.split(' - ')[0])
        plt.xscale('log')
        plt.xlabel('Population')
        plt.ylabel('% of Humans with Zero Land')
        plt.title('Land Exclusion vs Population')
        plt.legend()
        plt.grid(True)
        plt.savefig('chart_zero_land_vs_population.png')
        plt.close()

        print("Charts generated: chart_gini_vs_population.png, chart_zero_land_vs_population.png")
    except ImportError:
        print("matplotlib not installed, skipping charts.")

if __name__ == "__main__":
    run_tournaments()
