'use strict';
const fs = require('fs');
const path = require('path');
(function loadEnv() {
  try {
    for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch (_) { /* no .env */ }
})();
const { validate } = require('./rules');
const { create } = require('./exchange');
const { sender } = require('./telegram');
const { createMonitor } = require('./monitor');

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN; const chat = process.env.CHAT_ID;
  if (!token || !chat) { console.error('Set TELEGRAM_BOT_TOKEN and CHAT_ID in .env (see .env.example).'); process.exit(1); }
  const file = ['rules.json', 'rules.example.json'].map(n => path.join(__dirname, '..', 'config', n)).find(p => fs.existsSync(p));
  let rules;
  try { rules = validate(JSON.parse(fs.readFileSync(file, 'utf8'))); } catch (e) { console.error('Rules problem:', e.message); process.exit(1); }
  const exchange = create((process.env.EXCHANGE || 'binance').toLowerCase());
  const send = sender(token);
  const every = Math.max(15, Number(process.env.CHECK_SECONDS) || 60) * 1000;
  const cooldownMs = Math.max(1, Number(process.env.COOLDOWN_MINUTES) || 60) * 60000;
  const monitor = createMonitor({ rules, exchange, send: (t) => send(chat, t), cooldownMs, log: (m) => console.error(new Date().toISOString(), m) });
  console.log(`Watching ${rules.length} rule(s) on ${exchange.name}, every ${every / 1000}s. Rules file: ${path.basename(file)}. Ctrl+C to stop.`);
  try { await send(chat, `Alert bot started: ${rules.length} rule(s) on ${exchange.name}.`); } catch (e) { console.error('Could not send the first message:', e.message); process.exit(1); }
  for (;;) {
    const sent = await monitor.tick();
    if (sent.length) console.log(new Date().toISOString(), 'sent', sent.length, 'alert(s)');
    await new Promise(r => setTimeout(r, every));
  }
}
if (require.main === module) main();
