const { getStore } = require('@netlify/blobs');

async function addLogEntry(message, type, source) {
  try {
    const store = getStore({
      name: 'telegram-log',
      siteID: process.env.NETLIFY_SITE_ID || process.env.SITE_ID,
      token: process.env.NETLIFY_TOKEN || process.env.NETLIFY_BLOBS_TOKEN,
    });
    const entries = (await store.get('entries', { type: 'json' })) || [];
    entries.unshift({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      message,
      type,
      source,
    });
    if (entries.length > 500) entries.length = 500;
    await store.set('entries', JSON.stringify(entries));
  } catch (err) {
    console.error('Log write failed:', err.message);
  }
}

module.exports = { addLogEntry };
