import { addLogEntry } from '../../lib/log';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (req.headers['x-log-secret'] !== process.env.LOG_ENTRY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { message, type, source } = req.body;
  await addLogEntry(message, type, source);
  res.json({ ok: true });
}
