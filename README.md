# Price Action Trainer

Interactive candlestick-based Price Action lessons built with TradingView Lightweight Charts and real Binance OHLCV data.

## Course

- Lesson 01 — Body, wick and close location
- Lesson 02 — Candle strength
- Lesson 03 — Impulse and pullback
- Lesson 04 — Market structure: HH, HL, LH, LL
- Lesson 05 — BOS, CHoCH and protected levels
- Lesson 06 — Liquidity sweep and false breakout

The app is a data-driven lesson engine: new lessons are added through JSON metadata while reusing real OHLC candlestick datasets.

## Run locally

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

Deployment workflow: `.github/workflows/deploy-pages.yml`.
