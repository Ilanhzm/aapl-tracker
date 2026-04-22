import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

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
    const result = data.chart.result[0];
    const meta = result.meta;

    const price = meta.regularMarketPrice;
    const openPrice = meta.regularMarketOpen || meta.chartPreviousClose;

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];

    const chartPoints = timestamps
      .map((t, i) => ({ time: t * 1000, price: closes[i] }))
      .filter((p) => p.price != null && !isNaN(p.price));

    res.json({ price, openPrice, chartPoints });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch price data' });
  }
}
