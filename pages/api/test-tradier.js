// Temporary test endpoint — delete after confirming Tradier works
export default async function handler(req, res) {
  // Protect with the same secret used elsewhere in the app
  const secret = req.query.secret || req.headers['x-log-secret'];
  if (!secret || secret !== process.env.LOG_ENTRY_SECRET) {
    return res.status(401).json({ error: 'Provide ?secret=YOUR_LOG_ENTRY_SECRET' });
  }

  const token = process.env.TRADIER_API_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'TRADIER_API_TOKEN is not set in Netlify env vars' });
  }

  const env = process.env.TRADIER_ENV || 'sandbox';
  const base = env === 'production'
    ? 'https://api.tradier.com/v1'
    : 'https://sandbox.tradier.com/v1';

  try {
    // Step 1: Get VIX option expirations
    const expRes = await fetch(
      `${base}/markets/options/expirations?symbol=VIX&includeAllRoots=true`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
    );
    const expData = await expRes.json();
    const dates = expData.expirations?.date;
    const expirations = Array.isArray(dates) ? dates : dates ? [dates] : [];

    if (expirations.length === 0) {
      return res.json({ status: 'connected', env, token: token.slice(0, 6) + '…', expirations: [], warning: 'No expirations returned — market may be closed or token may be sandbox-only' });
    }

    // Step 2: Get the nearest expiration ≥7 days out
    const floor = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const nearestExp = expirations.find((d) => d >= floor) || expirations[0];

    // Step 3: Get VIX put chain for that expiration
    const chainRes = await fetch(
      `${base}/markets/options/chains?symbol=VIX&expiration=${nearestExp}&greeks=false`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
    );
    const chainData = await chainRes.json();
    const raw = chainData.options?.option || [];
    const chain = Array.isArray(raw) ? raw : [raw];
    const puts = chain.filter((o) => o.option_type === 'put' && (o.bid > 0 || o.ask > 0 || o.last > 0));

    // Step 4: Find ATM puts near current VIX (approximate with 20)
    const vixApprox = 20;
    const sorted = [...puts].sort((a, b) => a.strike - b.strike);
    const atmIdx = sorted.reduce(
      (best, opt, i) => Math.abs(opt.strike - vixApprox) < Math.abs(sorted[best].strike - vixApprox) ? i : best,
      0
    );
    const sampleStrikes = sorted.slice(Math.max(0, atmIdx - 1), atmIdx + 3).map((o) => ({
      strike: o.strike,
      symbol: o.symbol,
      bid: o.bid,
      ask: o.ask,
      mid: o.bid > 0 && o.ask > 0 ? +((o.bid + o.ask) / 2).toFixed(2) : o.last,
    }));

    return res.json({
      status: 'OK — Tradier is connected and working',
      env,
      tokenPrefix: token.slice(0, 6) + '…',
      nearestExpiration: nearestExp,
      totalExpirations: expirations.length,
      putsWithQuotes: puts.length,
      sampleStrikesNearVIX20: sampleStrikes,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message, env, tokenPrefix: token.slice(0, 6) + '…' });
  }
}
