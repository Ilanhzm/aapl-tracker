# AAPL Market Dashboard

A password-protected web dashboard that tracks the live AAPL stock price, sends automated daily Telegram alerts, and logs all messages sent.

**Live site:** https://steady-salmiakki-5d5f44.netlify.app

## Login Credentials
- Username: `admin`
- Password: `test123`

---

## Features

- **Live AAPL price** — updates every 30 seconds via Yahoo Finance
- **Intraday chart** — 5-minute bars with a fixed 09:30–16:00 ET x-axis and a blinking dot at the current price
- **Telegram alerts** — 4 automatic messages every trading day (weekdays only)
- **Manual Telegram messages** — send any message to yourself from the dashboard
- **Message log** — persistent history of every Telegram message ever sent

---

## Daily Telegram Schedule (Israel Time)

| Time  | Message |
|-------|---------|
| 16:20 | Pre-market heads-up — market opens in 10 minutes |
| 16:30 | Market just opened + opening price |
| 23:00 | Market just closed + closing price |
| 23:30 | Post-close recap + daily % change |

All alerts run automatically on Netlify's servers — no computer needs to be on.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (Pages Router) |
| Auth | NextAuth.js (credentials) |
| Stock data | Yahoo Finance API (free, no key needed) |
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
  index.js                        ← Dashboard UI (price, chart, Telegram, log)
  login.js                        ← Login page
  api/
    price.js                      ← Fetches AAPL price from Yahoo Finance
    send-telegram.js              ← Sends manual Telegram message + logs it
    log.js                        ← Returns message log entries
    auth/
      [...nextauth].js            ← Handles authentication

netlify/
  functions/
    market-open-alert.js          ← Runs at 16:20 Israel (pre-market warning)
    market-open-price.js          ← Runs at 16:30 Israel (market open price)
    market-close-price.js         ← Runs at 23:00 Israel (market close price)
    market-close-alert.js         ← Runs at 23:30 Israel (post-close recap)
    _log.js                       ← Shared logging utility for scheduled functions

lib/
  log.js                          ← Shared logging utility for Next.js API routes
```
