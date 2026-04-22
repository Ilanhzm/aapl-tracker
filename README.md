# VIXit — Trading Simulator

A password-protected web platform for VIX options trading intelligence. Tracks live price data, runs historical reversion probability calculations, sends automated daily Telegram alerts, and logs all messages sent.

> **Note:** AAPL is used as a live data placeholder until a VIX API is connected.

**Live site:** https://steady-salmiakki-5d5f44.netlify.app

## Login Credentials
- Username: `admin`
- Password: `test123`

---

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Main | `/` | Live 2-day price chart · green/bull or red/bear theme · Telegram send + log |
| Find Live Trades | `/live-trades` | Live VIX trade detection (in progress) |
| Simulate Hike | `/simulate` | Step-by-step VIX hike simulator with reversion probability |
| Did You Miss? | `/history` | Historical past trades log (in progress) |

---

## Features

### Main Page
- **Live 2-day price chart** — 15-min bars, auto-refreshes every 30 seconds
- **Dynamic theme** — green background + bull 🐂 when price is up over 2 days; red + bear 🐻 when down
- **SMN % change** — slot-machine animated 2-day % change display
- **Blinking dot** — animated pulse at the current price on the chart
- **Telegram send** — send any message to yourself from the dashboard
- **Message log** — persistent history of every Telegram message ever sent, grouped by date

### Simulate Hike
- **Step-by-step guided flow** — tooltips walk the user through each stage
- **Two vertical scrollbars** — left sets VIX starting price, right sets ending price
- **Live climbing chart** — green bezier curve draws between the two chosen prices
- **% hike display** — SMN-animated 2-day % hike derived from the two prices
- **CALCULATE NOW button** — triggers the reversion probability algorithm
- **Gauge + SMN results** — probability gauge sweeps to result; "happens once every N trading days" rolls up

### Algorithm (`/api/algorithm`)
- Scans **9,130 trading days** of historical VIX data (Jan 1990 – Apr 2026)
- Finds every instance where VIX jumped ≥ X% in a single day
- Returns the % of those instances where VIX reverted to its pre-jump level within **10 trading days (2 weeks)**
- Response: `{ jump, probability, reversions, instances }`

### Telegram Alerts (automatic, server-side)
All alerts fire on Netlify's servers — no computer needs to be on.

| Israel Time | Message |
|-------------|---------|
| 16:20 | Pre-market heads-up — market opens in 10 minutes |
| 16:30 | Market just opened + opening price |
| 23:00 | Market just closed + closing price |
| 23:30 | Post-close recap + daily % change |

Weekdays only (Mon–Fri).

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (Pages Router) |
| Auth | NextAuth.js (credentials) |
| Live price data | Yahoo Finance API (free, no key needed) — AAPL placeholder |
| Historical data | VIX daily CSV (1990–2026, 9,130 rows) bundled in repo |
| Messaging | Telegram Bot API |
| Storage | Netlify Blobs (message log) |
| Hosting | Netlify |
| Scheduled jobs | Netlify Scheduled Functions |

---

## Environment Variables (set in Netlify)

| Variable | Purpose |
|----------|---------|
| `NEXTAUTH_SECRET` | Secret key for session encryption |
| `NEXTAUTH_URL` | Full URL of the live site |
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token (from @BotFather) |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID |

---

## Project Structure

```
pages/
  index.js                        ← Main page (2-day chart, Telegram, log)
  simulate.js                     ← Simulate Hike page
  live-trades.js                  ← Find Live Trades (in progress)
  history.js                      ← Did You Miss? (in progress)
  login.js                        ← Login page
  api/
    price.js                      ← Fetches live price from Yahoo Finance (?range=1d|2d)
    algorithm.js                  ← VIX reversion probability calculator
    send-telegram.js              ← Sends manual Telegram message + logs it
    log.js                        ← Returns message log entries
    auth/
      [...nextauth].js            ← Handles authentication

components/
  Layout.js                       ← Shared sidebar nav layout

netlify/
  functions/
    market-open-alert.js          ← Runs at 16:20 Israel (pre-market warning)
    market-open-price.js          ← Runs at 16:30 Israel (market open price)
    market-close-price.js         ← Runs at 23:00 Israel (market close price)
    market-close-alert.js         ← Runs at 23:30 Israel (post-close recap)
    _log.js                       ← Shared logging utility for scheduled functions

lib/
  log.js                          ← Shared logging utility for Next.js API routes

data/
  vix-historical.csv              ← Daily VIX closing prices, Jan 1990 – Apr 2026
```
