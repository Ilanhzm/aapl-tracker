import { getToken } from 'next-auth/jwt';
import { getStore } from '@netlify/blobs';

export default async function handler(req, res) {
  const store = getStore('trade-log');

  if (req.method === 'GET') {
    const isServer = req.headers['x-log-secret'] === process.env.LOG_ENTRY_SECRET;
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!isServer && !token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const trades = (await store.get('trades', { type: 'json' })) || [];
      res.json({ trades });
    } catch {
      res.json({ trades: [] });
    }
  } else if (req.method === 'POST') {
    if (req.headers['x-log-secret'] !== process.env.LOG_ENTRY_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await store.set('trades', JSON.stringify(req.body.trades));
    res.json({ ok: true });
  } else {
    res.status(405).end();
  }
}
