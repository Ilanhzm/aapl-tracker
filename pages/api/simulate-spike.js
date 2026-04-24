// Temporary — delete after use
export default async function handler(req, res) {
  const secret = req.query.secret || req.headers['x-log-secret'];
  if (!secret || secret !== process.env.LOG_ENTRY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = process.env.TRADIER_API_TOKEN;
  if (!token) return res.status(500).json({ error: 'TRADIER_API_TOKEN not set' });

  const base = process.env.TRADIER_ENV === 'production'
    ? 'https://api.tradier.com/v1'
    : 'https://sandbox.tradier.com/v1';

  async function tradierGet(path, params = {}) {
    const url = new URL(`${base}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!r.ok) throw new Error(`Tradier ${path} → ${r.status}`);
    return r.json();
  }

  try {
    // 1. Get real 2-day VIX data from Yahoo Finance
    const yahooUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1m&range=2d';
    const yahooRes = await fetch(yahooUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    const yahooData = await yahooRes.json();
    const result = yahooData.chart.result[0];
    const closes = result.indicators.quote[0].close;
    const timestamps = result.timestamp;
    const points = timestamps
      .map((t, i) => ({ time: t * 1000, price: closes[i] }))
      .filter((p) => p.price != null && !isNaN(p.price));

    const reversionTarget = points[0].price;           // 2-day open = reversion target
    const realCurrentVIX = points[points.length - 1].price;
    const simulatedVIX = reversionTarget * 1.20;        // what a 20% spike would look like
    const pctMove = (((simulatedVIX - reversionTarget) / reversionTarget) * 100).toFixed(1);

    // 2. Get nearest VIX option expiration ≥7 days out
    const expData = await tradierGet('/markets/options/expirations', {
      symbol: 'VIX', includeAllRoots: 'true',
    });
    const rawDates = expData.expirations?.date;
    const dates = Array.isArray(rawDates) ? rawDates : rawDates ? [rawDates] : [];
    const floor = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const expiration = dates.find((d) => d >= floor) || dates[0];

    if (!expiration) return res.status(500).json({ error: 'No expirations found' });

    // 3. Get put chain
    const chainData = await tradierGet('/markets/options/chains', {
      symbol: 'VIX', expiration, greeks: 'false',
    });
    const rawChain = chainData.options?.option || [];
    const chain = Array.isArray(rawChain) ? rawChain : [rawChain];
    const puts = chain.filter((o) => o.option_type === 'put' && (o.bid > 0 || o.ask > 0 || o.last > 0));

    // 4. Find ATM / ITM+1 / ITM+2 for the SIMULATED spike price
    const sorted = [...puts].sort((a, b) => a.strike - b.strike);
    const atmIdx = sorted.reduce(
      (best, opt, i) => Math.abs(opt.strike - simulatedVIX) < Math.abs(sorted[best].strike - simulatedVIX) ? i : best,
      0
    );
    const strikes = [sorted[atmIdx], sorted[atmIdx + 1], sorted[atmIdx + 2]].filter(Boolean);
    const labels = ['ATM', 'ITM+1', 'ITM+2'];
    const optionData = strikes.map((opt, i) => {
      const mid = opt.bid > 0 && opt.ask > 0 ? +((opt.bid + opt.ask) / 2).toFixed(2) : opt.last > 0 ? +opt.last.toFixed(2) : null;
      return { label: labels[i], strike: opt.strike, symbol: opt.symbol, bid: opt.bid, ask: opt.ask, mid };
    }).filter((o) => o.mid !== null);

    // 5. Build the exact Telegram message
    const optionLine = optionData.length > 0
      ? `\nOptions: ${optionData.map((o) => `${o.label} $${o.strike}P @ $${o.mid}`).join(' | ')}`
      : '';

    const telegramMessage =
      `SPIKE DETECTED — VIX\nCurrent: ${simulatedVIX.toFixed(2)}\nReversion target: ${reversionTarget.toFixed(2)}\n+${pctMove}% above 2-day open${optionLine}`;

    return res.json({
      telegramMessage,
      breakdown: {
        realCurrentVIX: +realCurrentVIX.toFixed(2),
        reversionTarget: +reversionTarget.toFixed(2),
        simulatedSpikeVIX: +simulatedVIX.toFixed(2),
        pctMove: parseFloat(pctMove),
        expiration,
        totalPutsWithQuotes: puts.length,
        optionData,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
