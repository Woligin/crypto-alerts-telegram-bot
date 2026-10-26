'use strict';
const test = require('node:test'); const assert = require('node:assert');
const { validate, evaluate } = require('../src/rules');

test('validate accepts good rules and adds ids', () => {
  const r = validate([{ type: 'move', symbol: 'BTCUSDT', minutes: 60, percent: 3 }, { type: 'cross', symbol: 'SOLUSDT', above: 250 }]);
  assert.strictEqual(r.length, 2); assert.ok(r[0].id);
});
test('validate rejects bad rules', () => {
  assert.throws(() => validate([]), /non-empty/);
  assert.throws(() => validate([{ type: 'nope', symbol: 'BTCUSDT' }]), /type/);
  assert.throws(() => validate([{ type: 'move', symbol: 'btc', minutes: 5, percent: 1 }]), /symbol/);
  assert.throws(() => validate([{ type: 'move', symbol: 'BTCUSDT', minutes: 0, percent: 1 }]), /minutes/);
  assert.throws(() => validate([{ type: 'move', symbol: 'BTCUSDT', minutes: 5, percent: -1 }]), /percent/);
  assert.throws(() => validate([{ type: 'cross', symbol: 'BTCUSDT' }]), /above/);
});
test('move fires on up and down moves only past the limit', () => {
  const [r] = validate([{ type: 'move', symbol: 'BTCUSDT', minutes: 60, percent: 3 }]);
  assert.ok(evaluate(r, { change: 3.4, price: 100 })); assert.ok(evaluate(r, { change: -3.1, price: 100 }));
  assert.strictEqual(evaluate(r, { change: 2.9, price: 100 }), null);
});
test('cross above and below', () => {
  const [a, b] = validate([{ type: 'cross', symbol: 'SOLUSDT', above: 250 }, { type: 'cross', symbol: 'SOLUSDT', below: 100 }]);
  assert.ok(evaluate(a, { price: 251 })); assert.strictEqual(evaluate(a, { price: 250 }), null);
  assert.ok(evaluate(b, { price: 99 })); assert.strictEqual(evaluate(b, { price: 100 }), null);
});
test('funding above and below', () => {
  const [a, b] = validate([{ type: 'funding', symbol: 'ETHUSDT', above: 0.0005 }, { type: 'funding', symbol: 'ETHUSDT', below: -0.0005 }]);
  assert.match(evaluate(a, { funding: 0.0006 }).text, /above/); assert.strictEqual(evaluate(a, { funding: 0.0004 }), null);
  assert.match(evaluate(b, { funding: -0.0006 }).text, /below/);
});
test('missing data never fires', () => {
  const [r] = validate([{ type: 'cross', symbol: 'SOLUSDT', above: 1 }]);
  assert.strictEqual(evaluate(r, {}), null); assert.strictEqual(evaluate(r, { price: NaN }), null);
});
