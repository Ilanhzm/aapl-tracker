const { schedule } = require('@netlify/functions');
const { addLogEntry } = require('./_log');
const { getNearestExpiration, getVIXPutChain, findITMStrikes, midPrice } = require('./_tradier');

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

    const reversionPrice = points[0].price;
    const hikeTarget = reversionPrice * 1.2;
    const currentPrice = points[points.length - 1].price;

    if (currentPrice < hikeTarget) return { statusCode: 200 };

    // Check if already alerted today
    const today = new Date().toISOString().split('T')[0];
    const statusRes = await fetch(`${siteUrl}/api/spike-status`);
    const statusData = await statusRes.json();
    if (statusData.date === today && statusData.alerted) return { statusCode: 200 };

    const pctMove = (((currentPrice - reversionPrice) / reversionPrice) * 100).toFixed(1);

    // --- Phase 2: fetch VIX option prices at spike time ---
    let optionData = null;
    let optionExpiration = null;
    try {
      optionExpiration = await getNearestExpiration();
      if (optionExpiration) {
        const chain = await getVIXPutChain(optionExpiration);
        const strikes = findITMStrikes(chain, currentPrice);
        const labels = ['ATM', 'ITM+1', 'ITM+2'];
        optionData = strikes.map((opt, i) => ({
          label: labels[i],
          strike: opt.strike,
          symbol: opt.symbol,
          entryMid: midPrice(opt),
        })).filter((o) => o.entryMid !== null);
      }
      if (optionData && optionData.length > 0) {
        await addLogEntry(
          `Options fetched for spike: ${optionData.map((o) => `${o.label} $${o.strike} @ $${o.entryMid}`).join(', ')} exp ${optionExpiration}`,
          'info',
          'Spike alert'
        );
      }
    } catch (err) {
      console.error('Tradier option fetch failed:', err.message);
      await addLogEntry(`Option fetch skipped (${err.message}) — Phase 1 trade only`, 'warn', 'Spike alert');
    }

    // Send Telegram alert
    const optionLine = optionData && optionData.length > 0
      ? `\nOptions: ${optionData.map((o) => `${o.label} $${o.strike}P @ $${o.entryMid}`).join(' | ')}`
      : '';
    const message = `SPIKE DETECTED — ${tickerDisplay}\nCurrent: ${currentPrice.toFixed(2)}\nReversion target: ${reversionPrice.toFixed(2)}\n+${pctMove}% above 2-day open${optionLine}`;

    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: message }),
    });

    await addLogEntry(message, 'scheduled', 'Spike alert');

    // Save spike record (now includes option data for EOD logger to pick up)
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
        optionData,
        optionExpiration,
      }),
    });

  } catch (err) {
    console.error('spike-detector failed:', err.message);
  }

  return { statusCode: 200 };
});
