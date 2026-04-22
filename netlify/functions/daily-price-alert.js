const { schedule } = require('@netlify/functions');

exports.handler = schedule('20 17 * * *', async () => {
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
    const open = meta.regularMarketOpen || meta.chartPreviousClose;
    const change = (((price - open) / open) * 100).toFixed(2);
    const direction = price >= open ? '▲' : '▼';

    const message = `AAPL Morning Update\nPrice: $${price}\n${direction} ${change}% vs open ($${open})`;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });
  } catch (err) {
    console.error('Scheduled alert failed:', err.message);
  }

  return { statusCode: 200 };
});
