# Price Action Trainer

Interactive candlestick-based Price Action course built with TradingView Lightweight Charts and real Binance OHLCV data.

## Learning model

The course is organized as a dependency-first roadmap instead of a flat lesson list. Each phase has:

- required/core skills that should be learned in order;
- recommended topics that strengthen the core;
- optional advanced topics to pick later;
- a practical checkpoint before moving to the next phase;
- chart exercises and quizzes rather than theory-only completion.

Open `roadmap.html` to see and track the full learning path.

## Roadmap

1. **Orientation · Chart mechanics** — OHLC, candle anatomy, timeframe aggregation, chart mechanics.
2. **Candle Literacy** — body, wick, close location, candle strength, rejection and follow-through.
3. **Price Movement & Market Structure** — impulse/pullback, HH/HL/LH/LL, BOS, CHoCH, protected levels, liquidity sweeps.
4. **Location · Levels & Zones** — support/resistance, previous highs/lows, range structure, breakout acceptance/retest/failure.
5. **Market Regimes** — trends, ranges, transitions, compression/expansion and volatility regimes.
6. **Multi-Timeframe Context** — top-down analysis and HTF location → LTF trigger.
7. **Trade Construction** — thesis, trigger, invalidation, stop, target, R:R and no-trade conditions.
8. **Risk, Execution & Statistics** — position sizing, leverage/fees, expectancy, journaling and replay/backtesting.
9. **Advanced Price Action** — liquidity maps, imbalance/FVG (optional), volume + price, failed auctions.
10. **Capstone · Build Your Playbook** — blind replay, 100-example setup study, paper trading and playbook v1.0.

## Available lessons

- Lesson 01 — Body, wick and close location
- Lesson 02 — Candle strength
- Lesson 03 — Impulse and pullback
- Lesson 04 — Market structure: HH, HL, LH, LL
- Lesson 05 — BOS, CHoCH and protected levels
- Lesson 06 — Liquidity sweep and false breakout

The lesson UI is data-driven: new lessons are added through JSON metadata while reusing real OHLC candlestick datasets. Planned topics remain visible in the roadmap so learners know what comes next without pretending unfinished content is available.

## Run locally

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

Deployment workflow: `.github/workflows/deploy-pages.yml`.
