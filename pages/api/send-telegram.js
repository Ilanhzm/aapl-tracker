import { getToken } from 'next-auth/jwt';
import { addLogEntry } from '../../lib/log';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Empty message' });
  if (message.length > 500) return res.status(400).json({ error: 'Message too long' });

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  try {
    const r = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message }),
      }
    );
    const data = await r.json();
    if (!data.ok) throw new Error(data.description);
    await addLogEntry(message, 'manual', 'Manual');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
