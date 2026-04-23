# VIXit — Open Questions

Questions that need to be revisited before or during implementation.

---

## 1. Strike Price Selection (UNRESOLVED)

Starting assumption: 3 puts entered at trigger time — 1 at-the-money (ATM) + 2 in-the-money (ITM).

Open issues:
- VIX options have strikes at whole numbers (e.g. 20, 21, 22). How many points in-the-money are the 2 ITM strikes? (e.g. ATM, ATM-1, ATM-2?)
- The profit ranking formula discussed was: `([Current VIX] - [PUT cost] - [Reversion price]) / [PUT cost]` — this needs to be finalized. It was noted "this will change a bit."
- PUT cost comes from Tradier live at the moment the trigger fires. Need to confirm the exact field/data point used (bid, ask, mid?)

---

## 2. Trade Return Calculation (UNRESOLVED)

How is the return on each trade calculated?
- Is it: `(PUT sell price - PUT buy price) / PUT buy price`?
- What price is used when the option expires worthless (return = -100%)?
- Are all 3 strikes averaged into one "trade return," or tracked individually?

---

## 3. Tradier Data Access — PENDING ACCOUNT APPROVAL

~~IBKR approach abandoned~~ — replaced by Tradier (simpler REST API, no local session required).

- Tradier brokerage account application in progress (free, $0 minimum)
- Once approved: add `TRADIER_API_TOKEN` (sandbox token) to Netlify env vars
- Set `TRADIER_ENV=sandbox` for testing with delayed data; switch to `production` for live prices
- Code is already built and deployed — waiting only on the API token

---

## 4. Multiple Spikes Across Consecutive Days (TO CLARIFY)

- If a spike triggers trades on Day 1 and VIX reverts, can a new spike on Day 2 trigger a new set of trades? (Assumed: yes, resets daily)
- If VIX is still elevated from Day 1's spike and rises another 20% on Day 2 — is that a new trigger? Or is it only counted as a new trigger relative to the original pre-spike base?

---

## 5. Script Run Timing (TO DECIDE)

- Daily run confirmed. At what time exactly? (e.g. 30 min after market close = 4:30 PM ET?)
- Does it look back exactly 1 day of 1-min candles, or a rolling window?

---

## 6. Missing Phase 1 Trade Data — Needs Tradier (Phase 2)

The following fields exist in every trade record but are left empty in Phase 1.
They will be populated in Phase 2 once the Tradier API token is active.

| Field | What it is | Where it comes from |
|-------|-----------|---------------------|
| `optionStrike` | Strike price of each PUT bought | Chosen at entry: ATM, ATM+1, ATM+2 |
| `optionExpiration` | Expiry date of the option contract | Nearest VIX expiry ≥ 7 days from trigger |
| `entryOptionPrice` | Cost of PUT at moment of entry | Tradier bid/ask mid at trigger time |
| `exitOptionPrice` | Value of PUT at moment of exit | Tradier price when VIX hits reversion target, or 0 if expired |
| `tradeReturn` | % profit or loss per trade | `(exitOptionPrice - entryOptionPrice) / entryOptionPrice × 100` |
| `avgReturn` | Average return across all closed trades | Sum of tradeReturn / number of closed trades |

Additional open questions for Phase 2:
- If option expires worthless: `exitOptionPrice = 0`, `tradeReturn = -100%`
- Are the 3 strikes tracked as separate trades or one combined trade? (see Q2)
- Which price to use from Tradier: bid, ask, or mid? (mid is current assumption)

---

## 7. Phase 2 — Real Option Prices via Tradier — PENDING ACCOUNT APPROVAL

~~Phase 2 was planned around IBKR.~~ Switched to Tradier (pure REST, stateless, works from Netlify).

Integration is fully coded. Waiting on:
- Tradier account approval (application submitted)
- Sandbox API token → add to Netlify as `TRADIER_API_TOKEN`
- Test one full spike cycle in sandbox before switching to production token

---

## 8. Perplexity API Key Needed — AI Event Context Feature

A new feature sends a second Telegram message on every spike explaining *why* VIX spiked (what world event caused it). This uses the Perplexity `sonar` model (web-grounded AI search).

To activate:
1. Sign up at **perplexity.ai/api** (pay-as-you-go, ~$0.003 per spike alert)
2. Generate an API key
3. Add to Netlify env vars as `PERPLEXITY_API_KEY`

The feature is already coded and deployed — it's skipped silently until the key is added.

Expected Telegram output on next spike:
```
SPIKE DETECTED — VIX
Current: 28.40 · Reversion target: 15.20 · +20.3% above 2-day open

📰 WHY IT'S HAPPENING:
[2–3 sentence AI summary of the market event driving the spike]
```
