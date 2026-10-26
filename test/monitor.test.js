'use strict';
const test = require('node:test'); const assert = require('node:assert');
const { validate } = require('../src/rules'); const { createMonitor } = require('../src/monitor');

function setup(rulesIn, cooldownMs = 3600000) {
  const state = { price: 100, change: 0, funding: 0, t: 0, sent: [], fail: false };
  const exchange = { price: async () => { if (state.fail) throw new Error('down'); return state.price; }, change: async () => state.change, funding: async () => state.funding };
  const m = createMonitor({ rules: validate(rulesIn), exchange, send: async (t) => { state.sent.push(t); }, cooldownMs, now: () => state.t });
  return { state, m };
}

test('alert is sent once while the condition stays true', async () => {
  const { state, m } = setup([{ type: 'cross', symbol: 'SOLUSDT', above: 150 }]);
  state.price = 160; await m.tick(); await m.tick(); await m.tick();
  assert.strictEqual(state.sent.length, 1);
});
test('re-arms after the condition clears, but respects the cooldown', async () => {
  const { state, m } = setup([{ type: 'cross', symbol: 'SOLUSDT', above: 150 }]);
  state.price = 160; await m.tick();
  state.price = 140; await m.tick();
  state.price = 160; state.t = 1000; await m.tick();            // inside cooldown: no repeat
  assert.strictEqual(state.sent.length, 1);
  state.price = 140; await m.tick(); state.price = 160; state.t = 3700000; await m.tick(); // after cooldown
  assert.strictEqual(state.sent.length, 2);
});
test('data errors do not crash and send nothing', async () => {
  const { state, m } = setup([{ type: 'cross', symbol: 'SOLUSDT', above: 150 }]);
  state.fail = true; state.price = 999; await m.tick(); assert.strictEqual(state.sent.length, 0);
});
test('send failure is retried on the next tick', async () => {
  const state = { n: 0, sent: [] };
  const exchange = { price: async () => 200 };
  const m = createMonitor({ rules: validate([{ type: 'cross', symbol: 'SOLUSDT', above: 150 }]), exchange,
    send: async (t) => { state.n++; if (state.n === 1) throw new Error('telegram down'); state.sent.push(t); }, now: () => 0 });
  await m.tick(); await m.tick();
  assert.strictEqual(state.sent.length, 1);
});
test('move rule uses the change value', async () => {
  const { state, m } = setup([{ type: 'move', symbol: 'BTCUSDT', minutes: 60, percent: 3 }]);
  state.change = -4; await m.tick(); assert.match(state.sent[0], /-4\.00%/);
});
