# Price Action Trainer

Interactive candlestick-based Price Action lessons using real market OHLC data.

## Lesson 01 — Body, wick, close location

The first lesson deliberately avoids memorizing named candle patterns. It trains the learner to read each candle through:

1. **Range** — size versus neighboring candles.
2. **Body** — how much of the range was retained from open to close.
3. **Upper/lower wick** — prices visited but not retained into the close.
4. **Close location** — whether the candle closed near its high, middle, or low.
5. **Context** — rejection alone is not a buy/sell signal.

The lesson uses a fixed BTCUSDT 4H snapshot from Binance Spot and also includes a live-practice mode that requests recent BTCUSDT 4H klines from the Binance public API.

## Stack

- TradingView Lightweight Charts 5.2.1
- Vanilla HTML/CSS/JavaScript
- Binance public Spot kline API
- GitHub Pages

## Development

Serve the repo with any static HTTP server. For example:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

> Opening `index.html` directly with `file://` is not recommended because browsers may block the lesson JSON fetch.

## Deployment

`.github/workflows/deploy-pages.yml` deploys the static site from `main` to GitHub Pages.
