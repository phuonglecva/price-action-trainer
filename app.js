(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const els = {
    chart: $('chart'), chartTitle: $('chartTitle'), chartSource: $('chartSource'), chartHelp: $('chartHelp'),
    pageTitle: $('pageTitle'), pageSubtitle: $('pageSubtitle'), lessonBadge: $('lessonBadge'), lessonTitle: $('lessonTitle'),
    lessonSummary: $('lessonSummary'), frameworkList: $('frameworkList'), principleTitle: $('principleTitle'),
    principleBody: $('principleBody'), principleCallout: $('principleCallout'), examplesList: $('examplesList'),
    lessonNav: $('lessonNav'), prevLessonBtn: $('prevLessonBtn'), nextLessonBtn: $('nextLessonBtn'),
    lessonModeBtn: $('lessonModeBtn'), liveModeBtn: $('liveModeBtn'), answerBtn: $('answerBtn'), answerHint: $('answerHint'),
    quizList: $('quizList'), gradeBtn: $('gradeBtn'), quizResult: $('quizResult'), conceptGrid: $('conceptGrid'),
    footerLesson: $('footerLesson'), lessonMeta: $('lessonMeta'), objectivesList: $('objectivesList'), qualityCard: $('qualityCard'),
    mistakesList: $('mistakesList'), practiceList: $('practiceList'), checkpointText: $('checkpointText'), referencesCard: $('referencesCard'), practiceCard: $('practiceCard'),
    referencesList: $('referencesList'), prerequisitesList: $('prerequisitesList'),
    statOpen: $('statOpen'), statHigh: $('statHigh'), statLow: $('statLow'), statClose: $('statClose'),
    statBody: $('statBody'), statUpper: $('statUpper'), statLower: $('statLower'), statCloseLoc: $('statCloseLoc')
  };

  const state = {
    manifest: null,
    lesson: null,
    lessonIndex: 0,
    mode: 'lesson',
    showAnswers: false,
    data: [],
    markersApi: null,
    priceLines: [],
    dataCache: new Map(),
    packCache: new Map()
  };

  const chart = LightweightCharts.createChart(els.chart, {
    autoSize: true,
    layout: {
      background: { type: LightweightCharts.ColorType.Solid, color: '#0f1621' },
      textColor: '#93a4bb', attributionLogo: true,
      panes: { separatorColor: '#263244', separatorHoverColor: '#40516b' }
    },
    grid: { vertLines: { color: 'rgba(38,50,68,0.55)' }, horzLines: { color: 'rgba(38,50,68,0.55)' } },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    rightPriceScale: { borderColor: '#263244', scaleMargins: { top: 0.08, bottom: 0.08 } },
    timeScale: { borderColor: '#263244', timeVisible: true, secondsVisible: false, rightOffset: 3, barSpacing: 12 },
    handleScroll: true, handleScale: true, localization: { locale: 'vi-VN' }
  });

  const candles = chart.addSeries(LightweightCharts.CandlestickSeries, {
    upColor: '#26a69a', downColor: '#ef5350', borderVisible: false,
    wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    priceLineVisible: true, lastValueVisible: true,
    priceFormat: { type: 'price', precision: 2, minMove: 0.01 }
  });
  state.markersApi = LightweightCharts.createSeriesMarkers(candles, []);

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));
  }
  function fmt(n) { return Number.isFinite(n) ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n) : '—'; }
  function analyzeBar(bar) {
    const range = Math.max(0, bar.high - bar.low);
    const body = Math.abs(bar.close - bar.open);
    const upper = Math.max(0, bar.high - Math.max(bar.open, bar.close));
    const lower = Math.max(0, Math.min(bar.open, bar.close) - bar.low);
    const closePct = range > 0 ? ((bar.close - bar.low) / range) * 100 : 50;
    const loc = closePct >= 70 ? `Gần High (${closePct.toFixed(0)}%)` : closePct <= 30 ? `Gần Low (${closePct.toFixed(0)}%)` : `Giữa range (${closePct.toFixed(0)}%)`;
    return { range, body, upper, lower, closePct, loc };
  }
  function pct(part, total) { return total > 0 ? `${(part / total * 100).toFixed(0)}%` : '—'; }
  function updateStats(bar) {
    if (!bar || typeof bar.open !== 'number') return;
    const a = analyzeBar(bar);
    els.statOpen.textContent = fmt(bar.open); els.statHigh.textContent = fmt(bar.high); els.statLow.textContent = fmt(bar.low); els.statClose.textContent = fmt(bar.close);
    els.statBody.textContent = `${fmt(a.body)} · ${pct(a.body, a.range)} range`;
    els.statUpper.textContent = `${fmt(a.upper)} · ${pct(a.upper, a.range)}`;
    els.statLower.textContent = `${fmt(a.lower)} · ${pct(a.lower, a.range)}`;
    els.statCloseLoc.textContent = a.loc;
  }
  function setData(data, fit = true) { state.data = data; candles.setData(data); if (data.length) updateStats(data[data.length - 1]); if (fit) chart.timeScale().fitContent(); }
  async function fetchJson(path) { const res = await fetch(path, { cache: 'no-store' }); if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`); return res.json(); }

  async function loadLessonData(item) {
    if (item.file) return fetchJson(`./lessons/${item.file}`);
    if (item.pack) {
      if (!state.packCache.has(item.pack)) state.packCache.set(item.pack, await fetchJson(`./lessons/${item.pack}`));
      const pack = state.packCache.get(item.pack);
      const lesson = pack?.lessons?.[item.key || item.id];
      if (!lesson) throw new Error(`Không tìm thấy lesson ${item.key || item.id} trong ${item.pack}`);
      return lesson;
    }
    throw new Error(`Manifest lesson ${item.id} thiếu file/pack`);
  }

  async function resolveCandles(lesson) {
    if (Array.isArray(lesson.candles)) return lesson.candles;
    const ref = lesson.candlesFrom;
    if (!ref) throw new Error(`Lesson ${lesson.id} không có candles/candlesFrom`);
    if (state.dataCache.has(ref)) return state.dataCache.get(ref);
    const source = await fetchJson(`./lessons/${ref}.json`);
    if (!Array.isArray(source.candles)) throw new Error(`Dataset ${ref} không có candles`);
    state.dataCache.set(ref, source.candles);
    return source.candles;
  }

  function priorityLabel(p) { return p === 'required' ? 'Core' : p === 'recommended' ? 'Recommended' : p === 'optional' ? 'Optional' : p || 'Core'; }
  function renderNav() {
    els.lessonNav.innerHTML = state.manifest.lessons.map((item, idx) => `<button class="lesson-chip ${idx === state.lessonIndex ? 'active' : ''}" data-lesson="${escapeHtml(item.id)}" type="button"><span>${escapeHtml(item.phase || String(idx + 1).padStart(2,'0'))}</span>${escapeHtml(item.title)}</button>`).join('');
    els.prevLessonBtn.disabled = state.lessonIndex <= 0;
    els.nextLessonBtn.disabled = state.lessonIndex >= state.manifest.lessons.length - 1;
    requestAnimationFrame(() => els.lessonNav.querySelector('.lesson-chip.active')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }));
  }

  function renderQuality(l) {
    const objectives = l.learningObjectives || [];
    const mistakes = l.commonMistakes || [];
    const practice = l.practiceDrill || [];
    const refs = l.references || [];
    const prereqs = l.prerequisites || [];
    els.qualityCard?.classList.toggle('hidden', !(objectives.length || prereqs.length));
    els.practiceCard?.classList.toggle('hidden', !(mistakes.length || practice.length || l.checkpoint));
    if (els.lessonMeta) {
      const meta = [
        l.phase && `<span class="meta-pill phase">${escapeHtml(l.phase)}</span>`,
        l.difficulty && `<span class="meta-pill">${escapeHtml(l.difficulty)}</span>`,
        l.estimatedMinutes && `<span class="meta-pill">≈ ${Number(l.estimatedMinutes)} phút</span>`,
        l.priority && `<span class="meta-pill priority-${escapeHtml(l.priority)}">${escapeHtml(priorityLabel(l.priority))}</span>`
      ].filter(Boolean);
      els.lessonMeta.innerHTML = meta.join('');
    }
    if (els.objectivesList) els.objectivesList.innerHTML = objectives.map((x) => `<li>${escapeHtml(x)}</li>`).join('');
    if (els.prerequisitesList) els.prerequisitesList.innerHTML = prereqs.length
      ? prereqs.map((id) => `<a class="prereq-link" href="?lesson=${encodeURIComponent(id)}">${escapeHtml(id)}</a>`).join('')
      : '<span class="muted-small">Không có prerequisite bắt buộc.</span>';
    if (els.mistakesList) els.mistakesList.innerHTML = mistakes.map((x) => `<li>${escapeHtml(x)}</li>`).join('');
    if (els.practiceList) els.practiceList.innerHTML = practice.map((x) => `<li>${escapeHtml(x)}</li>`).join('');
    if (els.checkpointText) els.checkpointText.textContent = l.checkpoint || '';
    els.referencesCard?.classList.toggle('hidden', !refs.length);
    if (els.referencesList) els.referencesList.innerHTML = refs.map((r) => `<article class="reference-item"><strong>${escapeHtml(r.title || '')}</strong><span class="reference-author">${escapeHtml(r.author || '')}</span><p>${escapeHtml(r.note || '')}</p></article>`).join('');
  }

  function renderContent() {
    const l = state.lesson;
    els.pageTitle.textContent = l.title;
    els.pageSubtitle.textContent = `${l.phase ? `${l.phase} · ` : ''}${l.subtitle || ''}`;
    els.lessonBadge.textContent = `BÀI ${l.id}`;
    els.lessonTitle.textContent = l.title;
    els.lessonSummary.textContent = l.summary || '';
    els.frameworkList.innerHTML = (l.framework || []).map((x) => `<li>${escapeHtml(x)}</li>`).join('');
    renderQuality(l);

    els.principleTitle.textContent = l.principle?.title || 'Nguyên tắc thực chiến';
    els.principleBody.innerHTML = (l.principle?.paragraphs || []).map((p) => `<p>${escapeHtml(p)}</p>`).join('');
    els.principleCallout.textContent = l.principle?.callout || '';

    els.examplesList.innerHTML = (l.examples || []).map((ex) => `<div class="example-row"><span class="example-label">${escapeHtml(ex.id)}</span><div><strong>${escapeHtml(ex.title || ex.id)}</strong><p>${escapeHtml(ex.prompt || '')}</p><p class="example-answer ${state.showAnswers ? '' : 'hidden'}"><strong>Đáp án:</strong> ${escapeHtml(ex.answer || '')}</p></div></div>`).join('');
    els.quizList.innerHTML = (l.quiz || []).map((q, idx) => `<div class="quiz-item" data-answer="${Number(q.answer)}"><p>${idx + 1}. ${escapeHtml(q.question)}</p>${(q.options || []).map((opt, oi) => `<label><input type="radio" name="q-${l.id}-${idx}" value="${oi}"> ${escapeHtml(opt)}</label>`).join('')}</div>`).join('');
    els.quizResult.textContent = '';
    els.conceptGrid.innerHTML = (l.concepts || []).map((c) => `<article class="concept-card"><span class="concept-number">${escapeHtml(c.number)}</span><h3>${escapeHtml(c.title)}</h3><p>${escapeHtml(c.text)}</p></article>`).join('');
    els.chartTitle.textContent = `${l.symbol || 'BTCUSDT'} · ${(l.interval || '4h').toUpperCase()} · Lesson ${l.id}`;
    els.chartSource.textContent = l.sourceNote || 'Dữ liệu bài học';
    els.chartHelp.textContent = l.chartHelp || 'Rê chuột lên candle để đọc OHLC; scroll để zoom; kéo để di chuyển chart.';
    els.footerLesson.textContent = `Price Action Trainer · ${l.phase || ''} · Lesson ${l.id}`;
    renderNav();
  }

  function lessonMarkers() {
    if (!state.lesson || state.mode !== 'lesson') return [];
    return (state.lesson.examples || []).filter((ex) => Number.isFinite(Number(ex.time))).map((ex) => ({ time: ex.time, position: ex.position || 'aboveBar', color: ex.color || '#7aa7ff', shape: ex.shape || 'circle', text: state.showAnswers ? `${ex.id} · ${ex.title || ''}` : ex.id }));
  }
  function clearPriceLines() { state.priceLines.forEach((line) => { try { candles.removePriceLine(line); } catch (_) {} }); state.priceLines = []; }
  function renderPriceLines() {
    clearPriceLines();
    if (state.mode !== 'lesson' || !state.lesson) return;
    (state.lesson.priceLines || []).filter((line) => !line.answerOnly || state.showAnswers).forEach((line) => {
      const apiLine = candles.createPriceLine({ price: Number(line.price), color: line.color || '#52647d', lineWidth: 1, lineStyle: Number.isFinite(line.lineStyle) ? line.lineStyle : LightweightCharts.LineStyle.Dashed, axisLabelVisible: true, title: state.showAnswers || !line.answerOnly ? (line.title || '') : '' });
      state.priceLines.push(apiLine);
    });
  }
  function renderAnswers() {
    state.markersApi.setMarkers(lessonMarkers()); renderPriceLines();
    document.querySelectorAll('.example-answer').forEach((el) => el.classList.toggle('hidden', !state.showAnswers));
    els.answerHint.classList.toggle('hidden', !state.showAnswers || state.mode !== 'lesson');
    els.answerBtn.textContent = state.showAnswers ? 'Ẩn đáp án' : 'Bật đáp án';
  }
  function setModeButtons() {
    els.lessonModeBtn.classList.toggle('btn-active', state.mode === 'lesson'); els.liveModeBtn.classList.toggle('btn-active', state.mode === 'live');
    els.answerBtn.disabled = state.mode !== 'lesson'; els.answerBtn.style.opacity = state.mode === 'lesson' ? '1' : '.5';
  }

  async function loadLessonById(id, updateUrl = true) {
    const idx = state.manifest.lessons.findIndex((x) => x.id === id);
    if (idx < 0) throw new Error(`Không tìm thấy lesson ${id}`);
    const item = state.manifest.lessons[idx];
    const lesson = await loadLessonData(item);
    const data = await resolveCandles(lesson);
    state.lessonIndex = idx; state.lesson = lesson; state.mode = 'lesson'; state.showAnswers = false;
    setData(data); renderContent(); renderAnswers(); setModeButtons();
    if (updateUrl) { const url = new URL(window.location.href); url.searchParams.set('lesson', id); history.replaceState({}, '', url); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function loadLive() {
    state.mode = 'live'; state.showAnswers = false; state.markersApi.setMarkers([]); clearPriceLines(); els.answerHint.classList.add('hidden'); els.answerBtn.textContent = 'Bật đáp án';
    els.chartTitle.textContent = 'BTCUSDT · 4H · Live practice'; els.chartSource.textContent = 'Đang tải 120 candle gần nhất từ Binance Spot…';
    try {
      const res = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=4h&limit=120', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
      const rows = await res.json();
      setData(rows.map((r) => ({ time: Math.floor(r[0] / 1000), open: Number(r[1]), high: Number(r[2]), low: Number(r[3]), close: Number(r[4]) })));
      els.chartSource.textContent = 'Live snapshot · Binance Spot API · 120 candle gần nhất';
      els.chartHelp.textContent = 'Practice mode: tự đọc candle/structure trước, sau đó quay lại bài học để đối chiếu framework.';
    } catch (err) {
      const fallback = await resolveCandles(state.lesson); setData(fallback); els.chartSource.textContent = `Không tải được Binance live; dùng snapshot bài học. (${err.message})`;
    }
    setModeButtons();
  }

  function gradeQuiz() {
    const items = [...els.quizList.querySelectorAll('.quiz-item')]; if (!items.length) return;
    let score = 0;
    items.forEach((item, idx) => { const picked = item.querySelector(`input[name="q-${state.lesson.id}-${idx}"]:checked`); if (picked && Number(picked.value) === Number(item.dataset.answer)) score += 1; });
    els.quizResult.textContent = score === items.length ? `✓ ${score}/${items.length} — Tốt. Hãy quay lại chart và giải thích bằng evidence, không chỉ nhớ đáp án.` : `${score}/${items.length} — Bật đáp án trên chart, đọc lại framework rồi thử giải thích từng điểm bằng candle + context.`;
  }

  chart.subscribeCrosshairMove((param) => { if (!param || !param.time) return; const bar = param.seriesData.get(candles); if (bar) updateStats(bar); });
  els.lessonNav.addEventListener('click', (e) => { const btn = e.target.closest('[data-lesson]'); if (btn) loadLessonById(btn.dataset.lesson).catch(console.error); });
  els.prevLessonBtn.addEventListener('click', () => { if (state.lessonIndex > 0) loadLessonById(state.manifest.lessons[state.lessonIndex - 1].id).catch(console.error); });
  els.nextLessonBtn.addEventListener('click', () => { if (state.lessonIndex < state.manifest.lessons.length - 1) loadLessonById(state.manifest.lessons[state.lessonIndex + 1].id).catch(console.error); });
  els.lessonModeBtn.addEventListener('click', () => { if (state.lesson) loadLessonById(state.lesson.id, false).catch(console.error); });
  els.liveModeBtn.addEventListener('click', () => loadLive().catch(console.error));
  els.answerBtn.addEventListener('click', () => { if (state.mode !== 'lesson') return; state.showAnswers = !state.showAnswers; renderAnswers(); });
  els.gradeBtn.addEventListener('click', gradeQuiz);

  async function init() {
    state.manifest = await fetchJson('./lessons/index.json');
    const requested = new URLSearchParams(window.location.search).get('lesson');
    const valid = state.manifest.lessons.some((x) => x.id === requested);
    await loadLessonById(valid ? requested : state.manifest.defaultLesson, false);
  }
  init().catch((err) => { els.chartSource.textContent = `Lỗi khởi tạo khóa học: ${err.message}`; els.lessonTitle.textContent = 'Không tải được bài học'; console.error(err); });
})();
