# Crypto Alerts Telegram Bot

A Telegram bot that watches **public** Binance or Bybit futures data and sends you a message when one of your rules fires. It only notifies: it never trades and never needs your exchange keys. Node.js 18+, no dependencies.

## Rules you can set
Edit `config/rules.json` (start from `config/rules.example.json`):

```json
[
  { "type": "move",    "symbol": "BTCUSDT", "minutes": 60, "percent": 3 },
  { "type": "cross",   "symbol": "SOLUSDT", "above": 250 },
  { "type": "cross",   "symbol": "SOLUSDT", "below": 100 },
  { "type": "funding", "symbol": "ETHUSDT", "above": 0.0005 }
]
```

- `move`: the price changed by at least `percent` within the last `minutes` (up or down).
- `cross`: the price is above and/or below a level.
- `funding`: the funding rate is above and/or below a limit (0.0005 = 0.05%).

## No spam
An alert is sent once when a rule starts firing. It is sent again only after the condition has cleared and the cooldown (`COOLDOWN_MINUTES`, default 60) has passed. If the exchange or Telegram is unavailable, the bot logs the problem and tries again on the next check; it does not crash.

## Run it
1. In Telegram, talk to **@BotFather**, send `/newbot` and copy the token.
2. Write any message to your new bot, then find your chat id (for example with the bot **@userinfobot**, or use your numeric Telegram user id).
3. Copy `.env.example` to `.env` and fill `TELEGRAM_BOT_TOKEN` and `CHAT_ID`. `.env` is git-ignored.
4. Copy `config/rules.example.json` to `config/rules.json` and edit it.
5. `node src/main.js`. You get a "started" message in Telegram. Stop with Ctrl+C.

Set `EXCHANGE=bybit` in `.env` to use Bybit instead of Binance.

## Tests
`npm test` runs 14 tests (rules, both exchange adapters against local fakes, no-spam and failure behavior). No network or real keys are used.

## Files
```
src/main.js      startup, config, check loop
src/monitor.js   one check cycle, cooldown and no-repeat logic
src/rules.js     rule validation and evaluation (pure functions)
src/exchange.js  Binance and Bybit public data
src/telegram.js  send-only Telegram client
config/          rules.example.json
```

## Limits
It must run on a computer that stays on (a small server or an always-on PC). Checks are polling, once per `CHECK_SECONDS` (minimum 15), not real-time streams. Changing rules means editing the file and restarting. This is a notification tool, not investment advice.

License: MIT.
