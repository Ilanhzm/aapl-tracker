const { getStore } = require('@netlify/blobs');

async function addLogEntry(message, type, source) {
  try {
    const store = getStore('telegram-log');
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
