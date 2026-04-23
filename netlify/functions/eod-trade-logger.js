const { schedule } = require('@netlify/functions');
const { addLogEntry } = require('./_log');
const { getOptionQuotes, midPrice } = require('./_tradier');

function addTradingDays(dateStr, days) {
  const date = new Date(dateStr + 'T12:00:00Z');
  let count = 0;
  while (count < days) {
    date.setDate(date.getDate() + 1);
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return date.toISOString().split('T')[0];
}

function countTradingDaysBetween(startStr, endStr) {
  const start = new Date(startStr + 'T12:00:00Z');
  const end = new Date(endStr + 'T12:00:00Z');
  let count = 0;
  const cur = new Date(start);
  while (cur < end) {
    cur.setDate(cur.getDate() + 1);
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

exports.handler = schedule('0 21 * * 1-5', async () => {
  try {
    const ticker = encodeURIComponent(process.env.PRICE_TICKER || '^VIX');
    const tickerDisplay = process.env.TICKER_DISPLAY || 'VIX';
    const siteUrl = process.env.URL || process.env.DEPLOY_URL;
    const secret = process.env.LOG_ENTRY_SECRET;
    const today = new Date().toISOString().split('T')[0];

    // Fetch 2-day 1-min candles
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&range=2d`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    const data = await response.json();
    const result = data.chart.result[0];
    const closes = result.indicators.quote[0].close;
    const timestamps = result.timestamp;

    const points = timestamps
      .map((t, i) => ({ time: t * 1000, price: closes[i] }))
      .filter((p) => p.price != null && !isNaN(p.price));

    if (points.length < 2) return { statusCode: 200 };

    const reversionTarget = points[0].price;
    const hikeTarget = reversionTarget * 1.2;

    // Load existing trades
    const tradesRes = await fetch(`${siteUrl}/api/trades`, {
      headers: { 'x-log-secret': secret },
    });
    let trades = [];
    try {
      const tradesData = await tradesRes.json();
      trades = tradesData.trades || [];
    } catch {}

    // --- Step 1: Create trade(s) if there was a spike today ---
    let entryPoint = null;
    for (const pt of points) {
      if (pt.price >= hikeTarget) { entryPoint = pt; break; }
    }

    const alreadyLoggedToday = trades.some((t) => t.triggerDate === today);

    if (entryPoint && !alreadyLoggedToday) {
      const pctMove = (((entryPoint.price - reversionTarget) / reversionTarget) * 100).toFixed(1);
      const expirationDate = addTradingDays(today, 10);
      const entryTime = new Date(entryPoint.time).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York', hour12: false,
      });

      // Read option data saved by spike-detector at spike time
      let optionData = null;
      let optionExpiration = null;
      try {
        const spikeRes = await fetch(`${siteUrl}/api/spike-status`);
        const spikeStatus = await spikeRes.json();
        if (spikeStatus.date === today) {
          optionData = spikeStatus.optionData || null;
          optionExpiration = spikeStatus.optionExpiration || null;
        }
      } catch {}

      const baseFields = {
        triggerDate: today,
        triggerTime: entryTime,
        pctMove: parseFloat(pctMove),
        entryVIX: parseFloat(entryPoint.price.toFixed(2)),
        reversionTarget: parseFloat(reversionTarget.toFixed(2)),
        expirationDate,
        status: 'OPEN',
        exitDate: null,
        exitReason: null,
        daysHeld: null,
        exitOptionPrice: null,
        tradeReturn: null,
      };

      if (optionData && optionData.length > 0) {
        // Phase 2: one trade record per option leg
        optionData.forEach((opt, i) => {
          trades.push({
            ...baseFields,
            id: Date.now() + i,
            optionLabel: opt.label,
            optionStrike: opt.strike,
            optionExpiration,
            optionSymbol: opt.symbol,
            entryOptionPrice: opt.entryMid,
          });
        });
        await addLogEntry(
          `${optionData.length} trades logged — ${tickerDisplay} spike +${pctMove}% at ${entryTime} ET. Options: ${optionData.map((o) => `${o.label} $${o.strike}P @ $${o.entryMid}`).join(', ')}. Expires: ${expirationDate}`,
          'scheduled',
          'EOD trade logger'
        );
      } else {
        // Phase 1 fallback: single trade without option data
        trades.push({
          ...baseFields,
          id: Date.now(),
          optionLabel: null,
          optionStrike: null,
          optionExpiration: null,
          optionSymbol: null,
          entryOptionPrice: null,
        });
        await addLogEntry(
          `Trade logged — ${tickerDisplay} spike +${pctMove}% at ${entryTime} ET. Reversion target: ${reversionTarget.toFixed(2)}. Expires: ${expirationDate} (no option data)`,
          'scheduled',
          'EOD trade logger'
        );
      }
    }

    // --- Step 2: Close trades that have reverted or expired ---
    // First pass: determine which trades need closing
    trades = trades.map((trade) => {
      if (trade.status !== 'OPEN') return trade;

      if (today >= trade.expirationDate) {
        return {
          ...trade,
          _closing: true,
          exitDate: trade.expirationDate,
          exitReason: 'Expired',
          daysHeld: countTradingDaysBetween(trade.triggerDate, trade.expirationDate),
        };
      }

      const entryMs = new Date(`${trade.triggerDate}T${trade.triggerTime}:00`).getTime();
      const reverted = points.some((pt) => pt.time > entryMs && pt.price <= trade.reversionTarget);

      if (reverted) {
        return {
          ...trade,
          _closing: true,
          exitDate: today,
          exitReason: 'Reverted',
          daysHeld: countTradingDaysBetween(trade.triggerDate, today),
        };
      }

      return trade;
    });

    // Second pass: fetch exit option prices for closing trades
    const closingWithOptions = trades.filter((t) => t._closing && t.optionSymbol);
    if (closingWithOptions.length > 0) {
      try {
        const symbols = closingWithOptions.map((t) => t.optionSymbol);
        const quotes = await getOptionQuotes(symbols);
        const priceMap = {};
        for (const q of quotes) {
          priceMap[q.symbol] = midPrice(q);
        }

        trades = trades.map((t) => {
          if (!t._closing || !t.optionSymbol) return t;
          const exitMid = priceMap[t.optionSymbol] ?? null;
          const tradeReturn = t.entryOptionPrice && exitMid !== null
            ? +((exitMid - t.entryOptionPrice) / t.entryOptionPrice * 100).toFixed(1)
            : null;
          const { _closing, ...rest } = t;
          return { ...rest, status: 'CLOSED', exitOptionPrice: exitMid, tradeReturn };
        });

        await addLogEntry(
          `Closed ${closingWithOptions.length} trade(s) with option exit prices`,
          'scheduled',
          'EOD trade logger'
        );
      } catch (err) {
        console.error('Exit option fetch failed:', err.message);
        // Still close the trades, just without option P&L
        trades = trades.map((t) => {
          if (!t._closing) return t;
          const { _closing, ...rest } = t;
          return { ...rest, status: 'CLOSED' };
        });
      }
    } else {
      // No option data to fetch — just finalize closes
      trades = trades.map((t) => {
        if (!t._closing) return t;
        const { _closing, ...rest } = t;
        return { ...rest, status: 'CLOSED' };
      });
    }

    // Save all trades
    await fetch(`${siteUrl}/api/trades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-log-secret': secret },
      body: JSON.stringify({ trades }),
    });

  } catch (err) {
    console.error('eod-trade-logger failed:', err.message);
  }

  return { statusCode: 200 };
});
