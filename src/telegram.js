'use strict';
// Send-only Telegram client.
function sender(token) {
  const base = (process.env.TELEGRAM_API_BASE || 'https://api.telegram.org').replace(/\/$/, '');
  return async function send(chatId, text) {
    const r = await fetch(`${base}/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: String(text).slice(0, 4000) }), signal: AbortSignal.timeout(15000),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(`telegram sendMessage failed: HTTP ${r.status} ${j.description || ''}`.trim());
  };
}
module.exports = { sender };
