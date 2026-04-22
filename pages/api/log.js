import { getToken } from 'next-auth/jwt';
import { getLogEntries } from '../../lib/log';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const entries = await getLogEntries();
  res.json({ entries });
}
