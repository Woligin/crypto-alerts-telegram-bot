'use strict';
// Rule validation and evaluation. Pure functions: easy to test, no network here.
const TYPES = new Set(['move', 'cross', 'funding']);

function validate(rules) {
  if (!Array.isArray(rules) || !rules.length) throw new Error('rules must be a non-empty array');
  return rules.map((r, i) => {
    const where = `rule #${i + 1}`;
    if (!r || !TYPES.has(r.type)) throw new Error(`${where}: type must be move, cross or funding`);
    if (!/^[A-Z0-9]{5,20}$/.test(String(r.symbol || ''))) throw new Error(`${where}: symbol must look like BTCUSDT`);
    const num = (v) => typeof v === 'number' && Number.isFinite(v);
    if (r.type === 'move') {
      if (!(num(r.minutes) && r.minutes >= 1 && r.minutes <= 1440)) throw new Error(`${where}: minutes must be 1..1440`);
      if (!(num(r.percent) && r.percent > 0)) throw new Error(`${where}: percent must be a positive number`);
    }
    if (r.type === 'cross' || r.type === 'funding') {
      const has = num(r.above) || num(r.below);
      if (!has) throw new Error(`${where}: set "above" and/or "below" as numbers`);
    }
    return { ...r, id: `${r.type}:${r.symbol}:${r.minutes || ''}:${r.percent || ''}:${num(r.above) ? 'a' + r.above : ''}:${num(r.below) ? 'b' + r.below : ''}` };
  });
}

// data: { price?, change?, funding? } for the rule's symbol. Returns {key, text} or null.
function evaluate(rule, data) {
  const s = rule.symbol;
  if (rule.type === 'move') {
    if (!Number.isFinite(data.change)) return null;
    if (Math.abs(data.change) >= rule.percent) {
      const dir = data.change > 0 ? 'up' : 'down';
      return { key: rule.id, text: `${s} moved ${data.change > 0 ? '+' : ''}${data.change.toFixed(2)}% in ${rule.minutes} min (${dir}). Limit: ${rule.percent}%. Price: ${data.price}` };
    }
    return null;
  }
  if (rule.type === 'cross') {
    if (!Number.isFinite(data.price)) return null;
    if (Number.isFinite(rule.above) && data.price > rule.above) return { key: rule.id, text: `${s} is above ${rule.above}. Price: ${data.price}` };
    if (Number.isFinite(rule.below) && data.price < rule.below) return { key: rule.id, text: `${s} is below ${rule.below}. Price: ${data.price}` };
    return null;
  }
  if (rule.type === 'funding') {
    if (!Number.isFinite(data.funding)) return null;
    const pct = (data.funding * 100).toFixed(4);
    if (Number.isFinite(rule.above) && data.funding > rule.above) return { key: rule.id, text: `${s} funding ${pct}% is above ${(rule.above * 100).toFixed(4)}%` };
    if (Number.isFinite(rule.below) && data.funding < rule.below) return { key: rule.id, text: `${s} funding ${pct}% is below ${(rule.below * 100).toFixed(4)}%` };
    return null;
  }
  return null;
}

// which data a rule needs
function needs(rule) { return rule.type === 'move' ? ['price', 'change'] : rule.type === 'cross' ? ['price'] : ['funding']; }

module.exports = { validate, evaluate, needs };
