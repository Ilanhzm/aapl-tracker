const { schedule } = require('@netlify/functions');
const { addLogEntry } = require('./_log');

exports.handler = schedule('*/15 13-20 * * 1-5', async () => {
  try {
    const ticker = encodeURIComponent(process.env.PRICE_TICKER || '^VIX');
    const tickerDisplay = process.env.TICKER_DISPLAY || 'VIX';
    const siteUrl = process.env.URL || process.env.DEPLOY_URL;
    const secret = process.env.LOG_ENTRY_SECRET;

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

    const reversionPrice = points[0].price; // opening price 2 days ago
    const hikeTarget = reversionPrice * 1.2;
    const currentPrice = points[points.length - 1].price;

    // No spike — exit silently
    if (currentPrice < hikeTarget) return { statusCode: 200 };

    // Check if already alerted today
    const today = new Date().toISOString().split('T')[0];
    const statusRes = await fetch(`${siteUrl}/api/spike-status`);
    const statusData = await statusRes.json();
    if (statusData.date === today && statusData.alerted) return { statusCode: 200 };

    // Send Telegram alert
    const pctMove = (((currentPrice - reversionPrice) / reversionPrice) * 100).toFixed(1);
    const message = `SPIKE DETECTED — ${tickerDisplay}\nCurrent: ${currentPrice.toFixed(2)}\nReversion target: ${reversionPrice.toFixed(2)}\n+${pctMove}% above 2-day open`;

    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: message }),
    });

    await addLogEntry(message, 'scheduled', 'Spike alert');

    // Save spike record so we don't alert again today
    await fetch(`${siteUrl}/api/spike-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-log-secret': secret },
      body: JSON.stringify({
        date: today,
        alerted: true,
        currentVIX: currentPrice,
        reversionTarget: reversionPrice,
        pctMove: parseFloat(pctMove),
        time: new Date().toISOString(),
      }),
    });

  } catch (err) {
    console.error('spike-detector failed:', err.message);
  }

  return { statusCode: 200 };
});
