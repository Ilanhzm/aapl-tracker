// Daily state: resets each calendar day (ET). Survives warm Lambda instances;
// resets on cold starts, which is acceptable — open/close alerts are idempotent.
if (!global.__aaplState) {
  global.__aaplState = {
    date: null,
    openPrice: null,
    openAlertSent: false,
    closeAlertSent: false,
    riseAlertSent: false,
  };
}

async function sendTelegram(text) {
  await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text }),
    }
  );
}

async function fetchAAPL() {
  const url =
    'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1m&range=1d';
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });
  const data = await res.json();
  const meta = data.chart.result[0].meta;
  return {
    price: meta.regularMarketPrice,
    open: meta.regularMarketOpen || meta.chartPreviousClose,
  };
}

export default async function handler(req, res) {
  const auth = req.headers['authorization'];
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Current time in US/Eastern
  const etNow = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
  );
  const h = etNow.getHours();
  const m = etNow.getMinutes();
  const dateStr = etNow.toISOString().slice(0, 10);

  const state = global.__aaplState;

  // Reset for a new trading day
  if (state.date !== dateStr) {
    state.date = dateStr;
    state.openPrice = null;
    state.openAlertSent = false;
    state.closeAlertSent = false;
    state.riseAlertSent = false;
  }

  try {
    const { price, open } = await fetchAAPL();

    // Capture open price as soon as market opens
    if (!state.openPrice && (h > 9 || (h === 9 && m >= 30))) {
      state.openPrice = open || price;
    }

    // Market open alert: 9:30–9:35 ET
    if (h === 9 && m >= 30 && m < 36 && !state.openAlertSent) {
      await sendTelegram(
        `🔔 AAPL Market Open\nPrice: $${price.toFixed(2)}\n${new Date().toUTCString()}`
      );
      state.openAlertSent = true;
    }

    // 0.5% rise alert (fires at most once per day)
    if (state.openPrice && !state.riseAlertSent) {
      const pct = ((price - state.openPrice) / state.openPrice) * 100;
      if (pct >= 0.5) {
        await sendTelegram(
          `📈 AAPL up ${pct.toFixed(2)}% from open\nOpen: $${state.openPrice.toFixed(2)}\nNow:  $${price.toFixed(2)}`
        );
        state.riseAlertSent = true;
      }
    }

    // Market close alert: 4:00–4:05 ET
    if (h === 16 && m >= 0 && m < 6 && !state.closeAlertSent) {
      await sendTelegram(
        `🔔 AAPL Market Close\nPrice: $${price.toFixed(2)}\n${new Date().toUTCString()}`
      );
      state.closeAlertSent = true;
    }

    res.json({ ok: true, price, et: `${h}:${String(m).padStart(2, '0')}`, state });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
