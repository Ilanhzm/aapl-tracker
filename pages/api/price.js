import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const range = req.query.range === '2d' ? '2d' : '1d';
  const interval = range === '2d' ? '15m' : '5m';
  const ticker = process.env.PRICE_TICKER || '^VIX';
  const tickerEncoded = encodeURIComponent(ticker);
  const tickerDisplay = process.env.TICKER_DISPLAY || ticker;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${tickerEncoded}?interval=${interval}&range=${range}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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

    // For 2-day: compare current price to the first data point (open 2 days ago)
    const open2d = chartPoints.length > 0 ? chartPoints[0].price : openPrice;
    const change2d = open2d ? (((price - open2d) / open2d) * 100) : null;

    res.json({ price, openPrice, chartPoints, open2d, change2d, tickerDisplay });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch price data' });
  }
}
