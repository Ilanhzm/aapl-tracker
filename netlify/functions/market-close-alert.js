const { schedule } = require('@netlify/functions');
const { addLogEntry } = require('./_log');

exports.handler = schedule('30 20 * * 1-5', async () => {
  try {
    const ticker = encodeURIComponent(process.env.PRICE_TICKER || '^VIX');
    const tickerDisplay = process.env.TICKER_DISPLAY || process.env.PRICE_TICKER || 'VIX';
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=5m&range=1d`;
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    const data = await response.json();
    const meta = data.chart.result[0].meta;
    const price = meta.regularMarketPrice;
    const open = meta.regularMarketOpen || meta.chartPreviousClose;
    const change = (((price - open) / open) * 100).toFixed(2);
    const direction = price >= open ? '▲' : '▼';

    const message = `${tickerDisplay} - Market Closed\nClosing price: ${price}\n${direction} ${change}% today (opened at ${open})`;

    await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: message,
        }),
      }
    );
    await addLogEntry(message, 'scheduled', 'Post-close recap');
  } catch (err) {
    console.error('market-close-alert failed:', err.message);
  }

  return { statusCode: 200 };
});
