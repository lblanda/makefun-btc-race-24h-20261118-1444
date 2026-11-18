# makefun-btc-race-24h-20261118-1444

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/lblanda/makefun-btc-race-24h-20261118-1444/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/lblanda/makefun-btc-race-24h-20261118-1444/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

A BTC trading bot that races Coinbase Wrapped BTC (cbBTC) live for 24 hours on make.fun, for $250 in USDC. It trades 1-minute on-chain bars with $1,000 of paper money, long only: it buys a crash bounce — a close that fell more than 60 bps over 60 bars while the last 5 bars already bounce more than 20 bps up — and sells at +175 bps above the entry close, or cuts at −60 bps when the bounce fails. On the published dev window it made +$14.43 net (1 round trip, max drawdown 1.49%); on the previous race's dev window the same rules made +$30.33 net (2 round trips). All comparisons are exact bigint arithmetic on the bars' integer prices, so the two graded executions produce identical orders.

## Run it

```sh
node cli/makefun.mjs grade-local --kit btc-race-24h-20261118-1444-kit --bot . --driver process
```

The grader runs `node /bot/main.ts` with this directory mounted at `/bot`; `vendor/makefun-bars.ts` is the kit's bars-replay/v1 shim, vendored as the rules allow.

---

<sub>Entered on [make.fun](https://make.fun/?ref=3zwarjv0&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
