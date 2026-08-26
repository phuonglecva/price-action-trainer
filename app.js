(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const els = {
    chart: $('chart'), chartTitle: $('chartTitle'), chartSource: $('chartSource'),
    lessonModeBtn: $('lessonModeBtn'), liveModeBtn: $('liveModeBtn'), answerBtn: $('answerBtn'),
    answerHint: $('answerHint'), gradeBtn: $('gradeBtn'), quizResult: $('quizResult'),
    statOpen: $('statOpen'), statHigh: $('statHigh'), statLow: $('statLow'), statClose: $('statClose'),
    statBody: $('statBody'), statUpper: $('statUpper'), statLower: $('statLower'), statCloseLoc: $('statCloseLoc')
  };

  const state = { lesson: null, mode: 'lesson', showAnswers: false, data: [], markersApi: null };

  const chart = LightweightCharts.createChart(els.chart, {
    autoSize: true,
    layout: {
      background: { type: LightweightCharts.ColorType.Solid, color: '#0f1621' },
      textColor: '#93a4bb',
      attributionLogo: true,
      panes: { separatorColor: '#263244', separatorHoverColor: '#40516b' }
    },
    grid: {
      vertLines: { color: 'rgba(38,50,68,0.55)' },
      horzLines: { color: 'rgba(38,50,68,0.55)' }
    },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    rightPriceScale: { borderColor: '#263244', scaleMargins: { top: 0.08, bottom: 0.08 } },
    timeScale: { borderColor: '#263244', timeVisible: true, secondsVisible: false, rightOffset: 3, barSpacing: 12 },
    handleScroll: true,
    handleScale: true,
    localization: { locale: 'vi-VN' }
  });

  const candles = chart.addSeries(LightweightCharts.CandlestickSeries, {
    upColor: '#26a69a', downColor: '#ef5350', borderVisible: false,
    wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    priceLineVisible: true, lastValueVisible: true,
    priceFormat: { type: 'price', precision: 2, minMove: 0.01 }
  });

  state.markersApi = LightweightCharts.createSeriesMarkers(candles, []);

  function fmt(n) {
    return Number.isFinite(n) ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n) : '—';
  }

  function analyzeBar(bar) {
    const range = bar.high - bar.low;
    const body = Math.abs(bar.close - bar.open);
    const upper = bar.high - Math.max(bar.open, bar.close);
    const lower = Math.min(bar.open, bar.close) - bar.low;
    const closePct = range > 0 ? ((bar.close - bar.low) / range) * 100 : 50;
    const loc = closePct >= 70 ? `Gần High (${closePct.toFixed(0)}%)` : closePct <= 30 ? `Gần Low (${closePct.toFixed(0)}%)` : `Giữa range (${closePct.toFixed(0)}%)`;
    return { range, body, upper, lower, closePct, loc };
  }

  function updateStats(bar) {
    if (!bar || typeof bar.open !== 'number') return;
    const a = analyzeBar(bar);
    els.statOpen.textContent = fmt(bar.open);
    els.statHigh.textContent = fmt(bar.high);
    els.statLow.textContent = fmt(bar.low);
    els.statClose.textContent = fmt(bar.close);
    els.statBody.textContent = `${fmt(a.body)} · ${(a.body / a.range * 100).toFixed(0)}% range`;
    els.statUpper.textContent = `${fmt(a.upper)} · ${(a.upper / a.range * 100).toFixed(0)}%`;
    els.statLower.textContent = `${fmt(a.lower)} · ${(a.lower / a.range * 100).toFixed(0)}%`;
    els.statCloseLoc.textContent = a.loc;
  }

  function markersForLesson(showAnswers) {
    if (!state.lesson) return [];
    const answerText = {
      A: 'A · body lớn, close sát High',
      B: 'B · upper wick rejection',
      C: 'C · lower wick rejection'
    };
    const colors = { A: '#5dd6c0', B: '#f3c969', C: '#7aa7ff' };
    return state.lesson.examples.map((ex) => ({
      time: ex.time,
      position: ex.id === 'C' ? 'belowBar' : 'aboveBar',
      color: colors[ex.id],
      shape: ex.id === 'C' ? 'arrowUp' : 'arrowDown',
      text: showAnswers ? answerText[ex.id] : ex.id
    }));
  }

  function renderMarkers() {
    state.markersApi.setMarkers(state.mode === 'lesson' ? markersForLesson(state.showAnswers) : []);
    els.answerHint.classList.toggle('hidden', !state.showAnswers || state.mode !== 'lesson');
    els.answerBtn.textContent = state.showAnswers ? 'Ẩn đáp án' : 'Bật đáp án';
  }

  function setData(data, fit = true) {
    state.data = data;
    candles.setData(data);
    if (data.length) updateStats(data[data.length - 1]);
    if (fit) chart.timeScale().fitContent();
  }

  chart.subscribeCrosshairMove((param) => {
    if (!param || !param.time) return;
    const bar = param.seriesData.get(candles);
    if (bar) updateStats(bar);
  });

  async function loadLesson() {
    const res = await fetch('./lessons/001.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Không tải được lesson JSON (${res.status})`);
    state.lesson = await res.json();
    state.mode = 'lesson';
    setData(state.lesson.candles);
    renderMarkers();
    els.chartTitle.textContent = `${state.lesson.symbol} · ${state.lesson.interval.toUpperCase()} · Lesson 01`;
    els.chartSource.textContent = state.lesson.sourceNote;
  }

  async function loadLive() {
    state.mode = 'live';
    state.showAnswers = false;
    renderMarkers();
    els.chartTitle.textContent = 'BTCUSDT · 4H · Live practice';
    els.chartSource.textContent = 'Đang tải 120 candle gần nhất từ Binance Spot…';
    try {
      const url = 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=4h&limit=120';
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
      const rows = await res.json();
      const data = rows.map((r) => ({
        time: Math.floor(r[0] / 1000), open: Number(r[1]), high: Number(r[2]), low: Number(r[3]), close: Number(r[4])
      }));
      setData(data);
      els.chartSource.textContent = 'Live snapshot · Binance Spot API · 120 candle gần nhất';
    } catch (err) {
      setData(state.lesson.candles);
      els.chartSource.textContent = `Không tải được Binance live; đang dùng snapshot bài học. (${err.message})`;
    }
  }

  function setModeButtons() {
    els.lessonModeBtn.classList.toggle('btn-active', state.mode === 'lesson');
    els.liveModeBtn.classList.toggle('btn-active', state.mode === 'live');
    els.answerBtn.disabled = state.mode !== 'lesson';
    els.answerBtn.style.opacity = state.mode === 'lesson' ? '1' : '.5';
  }

  els.lessonModeBtn.addEventListener('click', () => {
    state.mode = 'lesson';
    state.showAnswers = false;
    setData(state.lesson.candles);
    renderMarkers();
    setModeButtons();
    els.chartTitle.textContent = `${state.lesson.symbol} · ${state.lesson.interval.toUpperCase()} · Lesson 01`;
    els.chartSource.textContent = state.lesson.sourceNote;
  });

  els.liveModeBtn.addEventListener('click', async () => {
    await loadLive();
    setModeButtons();
  });

  els.answerBtn.addEventListener('click', () => {
    if (state.mode !== 'lesson') return;
    state.showAnswers = !state.showAnswers;
    renderMarkers();
  });

  els.gradeBtn.addEventListener('click', () => {
    const items = [...document.querySelectorAll('.quiz-item')];
    let score = 0;
    items.forEach((item, idx) => {
      const picked = item.querySelector(`input[name="q${idx + 1}"]:checked`);
      if (picked && Number(picked.value) === Number(item.dataset.answer)) score += 1;
    });
    els.quizResult.textContent = score === items.length
      ? `✓ ${score}/${items.length} — Tốt. Bạn đang đọc candle theo evidence thay vì tên pattern.`
      : `${score}/${items.length} — Xem lại: wick = rejection; close location + context mới cho biết rejection đó đáng chú ý đến đâu.`;
  });

  loadLesson()
    .then(setModeButtons)
    .catch((err) => {
      els.chartSource.textContent = `Lỗi khởi tạo bài học: ${err.message}`;
      console.error(err);
    });
})();
