import fs from 'fs';
import path from 'path';

let cachedData = null;

function loadVixData() {
  if (cachedData) return cachedData;

  const filePath = path.join(process.cwd(), 'data', 'vix-historical.csv');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.trim().split('\n').slice(1); // skip header

  const rows = lines
    .map((line) => {
      const parts = line.split(',');
      return {
        date: parts[0].trim(),
        close: parseFloat(parts[4]),
      };
    })
    .filter((r) => !isNaN(r.close));

  cachedData = rows;
  return rows;
}

export default function handler(req, res) {
  const jump = parseFloat(req.query.jump);

  if (isNaN(jump) || jump <= 0) {
    return res.status(400).json({ error: 'jump must be a positive number' });
  }

  const rows = loadVixData();
  const totalDays = rows.length - 1; // need pairs

  let matchingDays = 0;

  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1].close;
    const curr = rows[i].close;
    if (prev === 0) continue;
    const pctChange = ((curr - prev) / prev) * 100;
    if (pctChange >= jump) matchingDays++;
  }

  const probability = (matchingDays / totalDays) * 100;

  return res.status(200).json({
    jump,
    probability: parseFloat(probability.toFixed(2)),
    matchingDays,
    totalDays,
  });
}
