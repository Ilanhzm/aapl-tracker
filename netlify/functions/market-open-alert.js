const { schedule } = require('@netlify/functions');
const { addLogEntry } = require('./_log');

exports.handler = schedule('20 13 * * 1-5', async () => {
  try {
    const url =
      'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=5m&range=1d';
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    const data = await response.json();
    const meta = data.chart.result[0].meta;
    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose;
    const change = (((price - prevClose) / prevClose) * 100).toFixed(2);
    const direction = price >= prevClose ? '▲' : '▼';

    const message = `AAPL - Market opens in 10 minutes\nLast price: $${price}\n${direction} ${change}% vs yesterday's close ($${prevClose})`;

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
    await addLogEntry(message, 'scheduled', 'Pre-market alert');
  } catch (err) {
    console.error('market-open-alert failed:', err.message);
  }

  return { statusCode: 200 };
});
