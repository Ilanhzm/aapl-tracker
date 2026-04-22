import fs from 'fs';
import path from 'path';

let cachedRows = null;

function loadVixData() {
  if (cachedRows) return cachedRows;
  const filePath = path.join(process.cwd(), 'data', 'vix-historical.csv');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.trim().split('\n').slice(1);
  cachedRows = lines
    .map((line) => {
      const parts = line.split(',');
      return { date: parts[0].trim(), close: parseFloat(parts[4]) };
    })
    .filter((r) => !isNaN(r.close));
  return cachedRows;
}

export default function handler(req, res) {
  const jump = parseFloat(req.query.jump);
  if (isNaN(jump) || jump <= 0) {
    return res.status(400).json({ error: 'jump must be a positive number' });
  }

  const rows = loadVixData();
  const REVERSION_WINDOW = 10; // trading days (~2 weeks)

  let instances = 0;
  let reversions = 0;

  for (let i = 1; i < rows.length - REVERSION_WINDOW; i++) {
    const basePrice = rows[i - 1].close;
    const todayPrice = rows[i].close;
    if (basePrice === 0) continue;

    const pctChange = ((todayPrice - basePrice) / basePrice) * 100;
    if (pctChange < jump) continue;

    instances++;

    // Check if VIX reverts to basePrice within the next 10 trading days
    for (let j = i + 1; j <= i + REVERSION_WINDOW; j++) {
      if (rows[j].close <= basePrice) {
        reversions++;
        break;
      }
    }
  }

  if (instances === 0) {
    return res.status(200).json({
      jump,
      probability: 0,
      reversions: 0,
      instances: 0,
      message: 'No historical instances of this jump size found.',
    });
  }

  const probability = parseFloat(((reversions / instances) * 100).toFixed(1));

  return res.status(200).json({
    jump,
    probability,
    reversions,
    instances,
  });
}
