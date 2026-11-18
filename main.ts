// BTC crash-bounce bot for make.fun's btc-race-24h-20261118-1444.
// Trades Coinbase Wrapped BTC (CBBTC) against USDC on 1-minute bars, long only.
// The bot speaks agent-fun/bars-replay/v1 through the vendored shim: the harness
// sends hello once, then one batch per bar (each batch carries the bar that just
// closed, the fills of the orders sent on the previous batch, and the account),
// and the bot answers every batch with exactly one reply of orders, echoed by seq.
// Orders decided on bar k fill at bar k + 1's open, charged a 4 bps fee, 2 bps of
// modelled slippage and the pool's price impact, so a full-size round trip costs
// about 30 bps before the price even moves.
//
// Strategy (found by offline analysis of the published 24h dev window, then
// verified with the kit's grade-local on that window and on the previous race's
// dev window): BTC on this pool falls in sharp legs and then bounces. The 1-minute
// noise is about 7 bps a bar, so fast signals drown in it, and the slow
// mean-reversion and trend rules the baselines ship all lose money on this dev
// window (buy-and-hold -31.63, momentum -23.87, ema-cross -148.17,
// rsi-bollinger -39.92). What survives is a crash bounce, traded rarely:
//   - buy, full size, when the close has fallen more than 60 bps over the last
//     60 bars AND the last 5 bars already bounce more than 20 bps up. A steep
//     60-minute drop with the 5-minute tape turning up is an oversold leg
//     finding its feet, not a slow bleed.
//   - sell the whole position when the close prints 175 bps above the entry
//     close (bank the recovery; the big legs run 200+ bps), or 60 bps below it
//     (the bounce failed, cut it before the next leg down).
// On the dev window that made +14.43 net (1 round trip, max drawdown 1.49%);
// on the previous race's dev window the same rules made +30.33 net (2 round
// trips). Verified with the kit's grade-local --driver process: net PnL
// 14.429122 USDC, 2 trades, win rate 1.0, max drawdown 0.014963562, fees
// 0.805935 USDC (13.618662 USDC at 2x fees), guardrails met, and the L1
// regrade reproduced the action log byte for byte, so the bot is deterministic. The parameters sit on a plateau, not a spike: drop 50-80 bps, bounce
// 10-20 bps, target 150-200 bps and stop 60-80 bps are all positive on both
// windows, and the same rules lose heavily on the bars shuffled (so the edge is
// the real time structure, a drop followed by a recovery, not the drift).
// The bot holds at most one position and sends at most one order per batch.
//
// All comparisons are exact bigint arithmetic on the bars' integer prices
// (price_scale 5), so the two graded executions produce identical orders. No
// clock, no environment, no randomness anywhere.

import { runBars, type Bar, type BarsState, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** The drop that marks an oversold leg: 60 bars, more than 60 bps down. */
const DROP_BARS = 60;
const DROP_BPS = 60n;
/** The bounce that confirms the leg is turning: 5 bars, more than 20 bps up. */
const BOUNCE_BARS = 5;
const BOUNCE_BPS = 20n;
/** Bank the recovery: 175 bps above the entry close. */
const TARGET_BPS = 175n;
/** The bounce failed: 60 bps below the entry close. */
const STOP_BPS = 60n;
const BPS = 10000n;
const MAX_SLIPPAGE_BPS = 100;

/** Every close seen so far, oldest first, as integer prices. */
const closes: bigint[] = [];
/** The close the open position was bought on, or null while flat. */
let entryClose: bigint | null = null;

/** The return in bps of the latest close against the close `bars` back. */
function retBps(bars: number): bigint | null {
  if (closes.length <= bars) return null;
  const now = closes[closes.length - 1];
  const then = closes[closes.length - 1 - bars];
  return ((now - then) * BPS) / then;
}

await runBars({
  onBatch(state: BarsState, batch: { bars: Bar[] }) {
    const bar = batch.bars.find((b) => b.symbol === SYMBOL);
    if (bar === undefined) return [];
    closes.push(BigInt(bar.c));
    const close = BigInt(bar.c);
    const held = state.positions.get(SYMBOL);
    if (held === undefined) entryClose = null;

    if (held === undefined) {
      const drop = retBps(DROP_BARS);
      const bounce = retBps(BOUNCE_BARS);
      if (drop !== null && bounce !== null && drop < -DROP_BPS && bounce > BOUNCE_BPS) {
        entryClose = close;
        const amount = state.cash;
        if (amount <= 0n) return [];
        return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: amount, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }

    if (entryClose === null) {
      // Holding with no entry on record (a buy filled after its decision was
      // never seen): sit tight until the position is gone rather than guess.
      return [];
    }
    const target = (entryClose * (BPS + TARGET_BPS)) / BPS;
    const stop = (entryClose * (BPS - STOP_BPS)) / BPS;
    if (close >= target || close < stop) {
      entryClose = null;
      return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    return [];
  },
});
