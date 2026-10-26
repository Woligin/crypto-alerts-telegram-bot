'use strict';
const test = require('node:test'); const assert = require('node:assert'); const http = require('http');
const { binance, bybit } = require('../src/exchange');

function fake(routes) {
  return new Promise(r => { const s = http.createServer((req, res) => {
    const key = Object.keys(routes).find(k => req.url.startsWith(k));
    if (!key) { res.statusCode = 404; return res.end('{}'); }
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(routes[key])); });
    s.listen(0, () => r(s)); });
}
const url = s => 'http://127.0.0.1:' + s.address().port;

test('binance adapter: price, change, funding', async () => {
  const s = await fake({
    '/fapi/v1/ticker/price': { symbol: 'BTCUSDT', price: '100.5' },
    '/fapi/v1/klines': [[0, '0', '0', '0', '100', '0'], [1, '0', '0', '0', '103', '0']],
    '/fapi/v1/premiumIndex': { lastFundingRate: '0.0007' },
  });
  const ex = binance(url(s));
  assert.strictEqual(await ex.price('BTCUSDT'), 100.5);
  assert.ok(Math.abs(await ex.change('BTCUSDT', 1) - 3) < 1e-9);
  assert.strictEqual(await ex.funding('BTCUSDT'), 0.0007); s.close();
});
test('bybit adapter: price, change (newest first), funding', async () => {
  const s = await fake({
    '/v5/market/tickers': { result: { list: [{ lastPrice: '200', fundingRate: '-0.0002' }] } },
    '/v5/market/kline': { result: { list: [[1, '0', '0', '0', '210'], [0, '0', '0', '0', '200']] } },
  });
  const ex = bybit(url(s));
  assert.strictEqual(await ex.price('ETHUSDT'), 200);
  assert.ok(Math.abs(await ex.change('ETHUSDT', 1) - 5) < 1e-9);
  assert.strictEqual(await ex.funding('ETHUSDT'), -0.0002); s.close();
});
test('HTTP errors are reported', async () => {
  const s = await fake({});
  await assert.rejects(() => binance(url(s)).price('BTCUSDT'), /HTTP 404/); s.close();
});
