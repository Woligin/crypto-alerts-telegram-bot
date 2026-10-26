'use strict';
const { evaluate, needs } = require('./rules');

// One check cycle. exchange: {price, change, funding}; send(text). state keeps cooldowns and "still firing" flags.
function createMonitor({ rules, exchange, send, cooldownMs = 3600000, now = () => Date.now(), log = () => {} }) {
  const lastSent = new Map();   // rule id -> time of last alert
  const firing = new Map();     // rule id -> true while the condition stays true (avoids repeats)

  async function readData(rule) {
    const d = {}; const n = needs(rule);
    if (n.includes('price')) d.price = await exchange.price(rule.symbol);
    if (n.includes('change')) d.change = await exchange.change(rule.symbol, rule.minutes);
    if (n.includes('funding')) d.funding = await exchange.funding(rule.symbol);
    return d;
  }

  async function tick() {
    const sent = [];
    for (const rule of rules) {
      let alert;
      try { alert = evaluate(rule, await readData(rule)); } catch (e) { log(`data error for ${rule.symbol}: ${e.message}`); continue; }
      if (!alert) { firing.delete(rule.id); continue; }
      const t = now();
      const wasFiring = firing.get(rule.id);
      const recent = lastSent.has(rule.id) && t - lastSent.get(rule.id) < cooldownMs;
      firing.set(rule.id, true);
      if (wasFiring || recent) continue;      // already told you; wait until it clears or the cooldown ends
      try { await send(alert.text); lastSent.set(rule.id, t); sent.push(alert.text); } catch (e) { log(`send error: ${e.message}`); firing.delete(rule.id); }
    }
    return sent;
  }
  return { tick };
}
module.exports = { createMonitor };
