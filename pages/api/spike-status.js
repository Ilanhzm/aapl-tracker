import { getToken } from 'next-auth/jwt';
import { getStore } from '@netlify/blobs';

export default async function handler(req, res) {
  const store = getStore('spike-log');
  const today = new Date().toISOString().split('T')[0];

  if (req.method === 'GET') {
    const isServer = req.headers['x-log-secret'] === process.env.LOG_ENTRY_SECRET;
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!isServer && !token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const data = (await store.get('today', { type: 'json' })) || {};
      if (data.date !== today) return res.json({ date: today, alerted: false });
      res.json(data);
    } catch {
      res.json({ date: today, alerted: false });
    }
  } else if (req.method === 'POST') {
    if (req.headers['x-log-secret'] !== process.env.LOG_ENTRY_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await store.set('today', JSON.stringify(req.body));
    res.json({ ok: true });
  } else {
    res.status(405).end();
  }
}
