async function addLogEntry(message, type, source) {
  try {
    const siteUrl = process.env.URL || process.env.DEPLOY_URL;
    const secret = process.env.LOG_ENTRY_SECRET;
    await fetch(`${siteUrl}/api/log-entry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-log-secret': secret,
      },
      body: JSON.stringify({ message, type, source }),
    });
  } catch (err) {
    console.error('Log write failed:', err.message);
  }
}

module.exports = { addLogEntry };
