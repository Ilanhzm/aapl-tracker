// Tradier API helper — used by spike-detector and eod-trade-logger
// Set TRADIER_API_TOKEN in Netlify env vars
// Set TRADIER_ENV=production for live data; omit or set =sandbox for delayed test data

const TRADIER_BASE =
  process.env.TRADIER_ENV === 'production'
    ? 'https://api.tradier.com/v1'
    : 'https://sandbox.tradier.com/v1';

async function tradierGet(path, params = {}) {
  const token = process.env.TRADIER_API_TOKEN;
  if (!token) throw new Error('TRADIER_API_TOKEN not set');

  const url = new URL(`${TRADIER_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tradier ${path} → ${res.status}: ${body}`);
  }
  return res.json();
}

// Returns the nearest VIX option expiration date that is at least 7 days away
async function getNearestExpiration() {
  const data = await tradierGet('/markets/options/expirations', {
    symbol: 'VIX',
    includeAllRoots: 'true',
  });
  const raw = data.expirations?.date;
  const dates = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const floor = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  return dates.find((d) => d >= floor) || null;
}

// Returns all VIX PUT options for a given expiration date that have a non-zero bid or ask
async function getVIXPutChain(expiration) {
  const data = await tradierGet('/markets/options/chains', {
    symbol: 'VIX',
    expiration,
    greeks: 'false',
  });
  const raw = data.options?.option || [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.filter((o) => o.option_type === 'put' && (o.bid > 0 || o.ask > 0 || o.last > 0));
}

// Returns current quotes for a list of option symbols (e.g. ["VIX   260521P00018000", ...])
async function getOptionQuotes(symbols) {
  if (!symbols || symbols.length === 0) return [];
  const data = await tradierGet('/markets/quotes', {
    symbols: symbols.join(','),
    greeks: 'false',
  });
  const raw = data.quotes?.quote || [];
  return Array.isArray(raw) ? raw : [raw];
}

// Given a sorted PUT chain and current VIX price, returns [ATM, ITM+1, ITM+2] option objects
// For PUTs, OTM = strike BELOW the current price
function findOTMStrikes(chain, vixPrice) {
  const sorted = [...chain].sort((a, b) => a.strike - b.strike);
  if (sorted.length === 0) return [];
  const atmIdx = sorted.reduce(
    (best, opt, i) =>
      Math.abs(opt.strike - vixPrice) < Math.abs(sorted[best].strike - vixPrice) ? i : best,
    0
  );
  return [sorted[atmIdx], sorted[atmIdx - 1], sorted[atmIdx - 2]].filter(Boolean);
}

// Returns the mid price of an option, falling back to last traded price
function midPrice(opt) {
  if (opt.bid > 0 && opt.ask > 0) return +((opt.bid + opt.ask) / 2).toFixed(2);
  return opt.last > 0 ? +opt.last.toFixed(2) : null;
}

module.exports = { getNearestExpiration, getVIXPutChain, getOptionQuotes, findOTMStrikes, midPrice };
