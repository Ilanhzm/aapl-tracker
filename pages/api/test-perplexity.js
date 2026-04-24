// Temporary — delete after use
export default async function handler(req, res) {
  const secret = req.query.secret || req.headers['x-log-secret'];
  if (!secret || secret !== process.env.LOG_ENTRY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'PERPLEXITY_API_KEY not set in Netlify env vars' });

  const today = new Date().toISOString().split('T')[0];

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{
          role: 'user',
          content: `Today is ${today}. The VIX volatility index just spiked over 20% in 2 days. What specific news event or world development is driving this stock market fear right now? Be specific and brief — 2 to 3 sentences only.`,
        }],
        max_tokens: 220,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data });
    }

    const context = data.choices?.[0]?.message?.content?.trim();

    return res.json({
      telegramMessage: `📰 WHY IT'S HAPPENING:\n${context}`,
      rawResponse: context,
      model: data.model,
      tokensUsed: data.usage,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
