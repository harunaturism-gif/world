import numpy as np
import json

def gini(x):
    x = np.sort(np.array(x, dtype=float))
    n = len(x)
    if n == 0 or x.sum() == 0:
        return 0.0
    cum = np.cumsum(x)
    return (n + 1 - 2 * np.sum(cum) / cum[-1]) / n

def run_scenario(num_humans, land_cap, whale_cap_frac=None,
                 base_price=10.0, curve_k=1.3, seed=1):
    r = np.random.default_rng(seed)
    a = 1.4
    budgets = (r.pareto(a, num_humans) + 1) * 40.0

    holdings = np.zeros(num_humans)
    sold = 0
    price = base_price
    revenue = 0.0
    whale_cap = int(land_cap * whale_cap_frac) if whale_cap_frac else land_cap
    priced_out = 0

    order = np.arange(num_humans)
    r.shuffle(order)

    for i in order:
        if sold >= land_cap:
            priced_out += 1
            continue

        budget = budgets[i]
        max_spend_per_plot = budget * 0.25

        if price > max_spend_per_plot:
            priced_out += 1
            continue

        bought = 0
        remaining_cap = min(land_cap - sold, whale_cap)

        while remaining_cap > 0 and budget >= price and bought < remaining_cap:
            budget -= price
            revenue += price
            sold += 1
            bought += 1
            remaining_cap -= 1
            price = base_price * (1 + sold / land_cap) ** curve_k

        holdings[i] += bought

    top_n = lambda frac: holdings[
        np.argsort(holdings)[::-1][:max(1, int(num_humans * frac))]
    ].sum() / max(holdings.sum(), 1e-9)

    return {
        "num_humans": num_humans,
        "land_cap": land_cap,
        "whale_cap_frac": whale_cap_frac,
        "plots_sold": int(sold),
        "final_price": round(price, 2),
        "treasury_revenue_usd": round(revenue, 2),
        "gini_land": round(gini(holdings), 4),
        "pct_humans_with_zero_land": round(
            100 * (holdings == 0).sum() / num_humans, 2
        ),
        "top_0.1pct_own_pct_of_land": round(100 * top_n(0.001), 2),
        "top_1pct_own_pct_of_land": round(100 * top_n(0.01), 2),
        "top_5pct_own_pct_of_land": round(100 * top_n(0.05), 2),
        "top_10pct_own_pct_of_land": round(100 * top_n(0.10), 2),
    }

if __name__ == "__main__":
    results = []
    scales = [100_000, 1_000_000, 10_000_000]
    LAND_CAP = 2_000_000

    for n in scales:
        results.append(run_scenario(n, LAND_CAP, seed=1))

    for n in scales:
        results.append(run_scenario(n, LAND_CAP,
                                    whale_cap_frac=0.005, seed=1))

    print(json.dumps(results, indent=2))
