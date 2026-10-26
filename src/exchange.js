'use strict';
// Public market data only. No API keys, no account access.
async function getJson(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} from ${new URL(url).host}`);
  return r.json();
}

function binance(base = process.env.BINANCE_BASE || 'https://fapi.binance.com') {
  base = base.replace(/\/$/, '');
  return {
    name: 'binance',
    async price(symbol) { const j = await getJson(`${base}/fapi/v1/ticker/price?symbol=${symbol}`); return Number(j.price); },
    async change(symbol, minutes) {
      const k = await getJson(`${base}/fapi/v1/klines?symbol=${symbol}&interval=1m&limit=${minutes + 1}`);
      if (!Array.isArray(k) || k.length < 2) throw new Error('not enough candles');
      const first = Number(k[0][4]); const last = Number(k[k.length - 1][4]);
      return (last / first - 1) * 100;
    },
    async funding(symbol) { const j = await getJson(`${base}/fapi/v1/premiumIndex?symbol=${symbol}`); return Number(j.lastFundingRate); },
  };
}

function bybit(base = process.env.BYBIT_BASE || 'https://api.bybit.com') {
  base = base.replace(/\/$/, '');
  async function ticker(symbol) {
    const j = await getJson(`${base}/v5/market/tickers?category=linear&symbol=${symbol}`);
    const t = j.result && j.result.list && j.result.list[0];
    if (!t) throw new Error('symbol not found');
    return t;
  }
  return {
    name: 'bybit',
    async price(symbol) { return Number((await ticker(symbol)).lastPrice); },
    async change(symbol, minutes) {
      const j = await getJson(`${base}/v5/market/kline?category=linear&symbol=${symbol}&interval=1&limit=${minutes + 1}`);
      const list = j.result && j.result.list; // newest first
      if (!Array.isArray(list) || list.length < 2) throw new Error('not enough candles');
      const last = Number(list[0][4]); const first = Number(list[list.length - 1][4]);
      return (last / first - 1) * 100;
    },
    async funding(symbol) { return Number((await ticker(symbol)).fundingRate); },
  };
}

function create(name) {
  if (name === 'bybit') return bybit();
  if (name === 'binance' || !name) return binance();
  throw new Error('EXCHANGE must be binance or bybit');
}
module.exports = { binance, bybit, create };
