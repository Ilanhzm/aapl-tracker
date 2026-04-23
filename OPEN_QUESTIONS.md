# VIXit — Open Questions

Questions that need to be revisited before or during implementation.

---

## 1. Strike Price Selection (UNRESOLVED)

Starting assumption: 3 puts entered at trigger time — 1 at-the-money (ATM) + 2 in-the-money (ITM).

Open issues:
- VIX options have strikes at whole numbers (e.g. 20, 21, 22). How many points in-the-money are the 2 ITM strikes? (e.g. ATM, ATM-1, ATM-2?)
- The profit ranking formula discussed was: `([Current VIX] - [PUT cost] - [Reversion price]) / [PUT cost]` — this needs to be finalized. It was noted "this will change a bit."
- PUT cost comes from IBKR live at the moment the trigger fires. Need to confirm the exact field/data point used (bid, ask, mid?)

---

## 2. Trade Return Calculation (UNRESOLVED)

How is the return on each trade calculated?
- Is it: `(PUT sell price - PUT buy price) / PUT buy price`?
- What price is used when the option expires worthless (return = -100%)?
- Are all 3 strikes averaged into one "trade return," or tracked individually?

---

## 3. IBKR Data Access from Netlify (TO CONFIRM)

The daily script will run as a Netlify Scheduled Function.
- IBKR TWS/Gateway typically requires a desktop app running locally. Need to confirm whether IBKR's API can be called from a cloud server (Netlify) without a local TWS session.
- Alternative: use IBKR's Client Portal Web API, which doesn't require a local session.
- Required subscriptions confirmed: OPRA L1 ($1.5/mo) + Cboe Streaming Market Indexes ($3.5/mo)

---

## 4. Multiple Spikes Across Consecutive Days (TO CLARIFY)

- If a spike triggers trades on Day 1 and VIX reverts, can a new spike on Day 2 trigger a new set of trades? (Assumed: yes, resets daily)
- If VIX is still elevated from Day 1's spike and rises another 20% on Day 2 — is that a new trigger? Or is it only counted as a new trigger relative to the original pre-spike base?

---

## 5. Script Run Timing (TO DECIDE)

- Daily run confirmed. At what time exactly? (e.g. 30 min after market close = 4:30 PM ET?)
- Does it look back exactly 1 day of 1-min candles, or a rolling window?

---

## 6. Missing Phase 1 Trade Data — Needs IBKR (Phase 2)

The following fields exist in every trade record but are left empty in Phase 1.
They will be populated in Phase 2 once IBKR is connected.

| Field | What it is | Where it comes from |
|-------|-----------|---------------------|
| `optionStrike` | Strike price of each PUT bought | Chosen at entry: ATM, ATM-1, ATM-2 (see Q1) |
| `optionExpiration` | Expiry date of the option contract | Closest expiry ≥ 10 trading days from trigger |
| `entryOptionPrice` | Cost of PUT at moment of entry | IBKR live bid/ask mid at trigger time |
| `exitOptionPrice` | Value of PUT at moment of exit | IBKR live price when VIX hits reversion target, or 0 if expired |
| `tradeReturn` | % profit or loss per trade | `(exitOptionPrice - entryOptionPrice) / entryOptionPrice × 100` |
| `avgReturn` | Average return across all closed trades | Sum of tradeReturn / number of closed trades |

Additional open questions for Phase 2:
- If option expires worthless: `exitOptionPrice = 0`, `tradeReturn = -100%`
- Are the 3 strikes tracked as separate trades or one combined trade? (see Q2)
- Which price to use from IBKR: bid, ask, or mid? (see Q1)

---

## 7. Phase 2 — Real Option Prices via IBKR (FUTURE)

Phase 1 of the tracker skips option pricing entirely and only validates whether VIX reverts after a spike.

Phase 2 requires:
- Opening an IBKR account
- Subscribing to OPRA L1 ($1.5/mo) + Cboe Streaming Market Indexes ($3.5/mo)
- Connecting via IBKR Client Portal Web API (works from Netlify without a local desktop session)
- Fetching real PUT prices at entry and exit to calculate actual P&L per trade
- Revisiting strike selection formula: `([Current VIX] - [PUT cost] - [Reversion price]) / [PUT cost]` (see Q1)
