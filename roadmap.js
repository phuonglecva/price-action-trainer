(() => {
  'use strict';

  const STORAGE_KEY = 'price-action-roadmap-progress-v1';
  const $ = (id) => document.getElementById(id);
  const els = {
    title: $('roadmapTitle'), subtitle: $('roadmapSubtitle'), principles: $('principles'), roadmap: $('roadmap'),
    progressLabel: $('progressLabel'), progressCount: $('progressCount'), progressBar: $('progressBar'),
    reset: $('resetProgress')
  };
  const state = { data: null, filter: 'all', done: new Set() };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  function loadProgress() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      state.done = new Set(Array.isArray(raw) ? raw : []);
    } catch (_) {
      state.done = new Set();
    }
  }

  function saveProgress() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.done]));
  }

  function allNodes() {
    return state.data.phases.flatMap((p) => p.nodes);
  }

  function updateProgress() {
    const core = allNodes().filter((n) => n.priority === 'required');
    const doneCore = core.filter((n) => state.done.has(n.id)).length;
    const pct = core.length ? Math.round(doneCore / core.length * 100) : 0;
    els.progressLabel.textContent = `${pct}% core hoàn thành`;
    els.progressCount.textContent = `${doneCore}/${core.length} core nodes`;
    els.progressBar.style.width = `${pct}%`;
  }

  function renderPrinciples() {
    els.principles.innerHTML = state.data.principles.map((p, idx) => `
      <div class="principle-mini"><strong>${String(idx + 1).padStart(2, '0')}</strong><br>${escapeHtml(p)}</div>
    `).join('');
  }

  function nodeHtml(node) {
    const completed = state.done.has(node.id);
    const isVisible = state.filter === 'all' || state.filter === node.priority;
    const lessonLink = node.lesson
      ? `<a class="node-link" href="./index.html?lesson=${encodeURIComponent(node.lesson)}">Mở bài học →</a>`
      : `<span class="node-planned">Planned</span>`;
    return `
      <article class="node ${escapeHtml(node.priority)} ${completed ? 'completed' : ''} ${isVisible ? '' : 'hidden-by-filter'}" data-node="${escapeHtml(node.id)}" data-priority="${escapeHtml(node.priority)}">
        <div class="node-top"><span class="node-id">${escapeHtml(node.id)}</span><span class="priority-dot" title="${escapeHtml(node.priority)}"></span></div>
        <h3>${escapeHtml(node.title)}</h3>
        <div class="node-actions">
          ${lessonLink}
          <label class="complete-toggle"><input type="checkbox" data-complete="${escapeHtml(node.id)}" ${completed ? 'checked' : ''}> Đã học</label>
        </div>
      </article>
    `;
  }

  function renderRoadmap() {
    els.roadmap.innerHTML = state.data.phases.map((phase, idx) => `
      <section class="phase" id="${escapeHtml(phase.id)}">
        <div class="phase-head">
          <div class="phase-code">${escapeHtml(phase.id)}</div>
          <div class="phase-title"><h2>${escapeHtml(phase.title)}</h2><p>${escapeHtml(phase.goal)}</p></div>
          <span class="phase-level">${escapeHtml(phase.level)}</span>
        </div>
        <div class="phase-body">
          <p class="phase-goal"><strong>Goal:</strong> ${escapeHtml(phase.goal)}</p>
          <div class="nodes">${phase.nodes.map(nodeHtml).join('')}</div>
          <div class="gate"><strong>Checkpoint để đi tiếp:</strong> ${escapeHtml(phase.gate)}</div>
        </div>
      </section>
      ${idx < state.data.phases.length - 1 ? '<div class="phase-arrow">↓</div>' : ''}
    `).join('');
  }

  function applyFilter(filter) {
    state.filter = filter;
    document.querySelectorAll('.filter-chip').forEach((btn) => btn.classList.toggle('active', btn.dataset.filter === filter));
    document.querySelectorAll('.node').forEach((node) => {
      node.classList.toggle('hidden-by-filter', filter !== 'all' && node.dataset.priority !== filter);
    });
  }

  document.addEventListener('change', (e) => {
    const checkbox = e.target.closest('[data-complete]');
    if (!checkbox) return;
    const id = checkbox.dataset.complete;
    if (checkbox.checked) state.done.add(id); else state.done.delete(id);
    saveProgress();
    checkbox.closest('.node')?.classList.toggle('completed', checkbox.checked);
    updateProgress();
  });

  document.addEventListener('click', (e) => {
    const filter = e.target.closest('[data-filter]');
    if (filter) applyFilter(filter.dataset.filter);
  });

  els.reset.addEventListener('click', () => {
    state.done.clear();
    saveProgress();
    document.querySelectorAll('[data-complete]').forEach((cb) => { cb.checked = false; });
    document.querySelectorAll('.node.completed').forEach((n) => n.classList.remove('completed'));
    updateProgress();
  });

  fetch('./roadmap.json', { cache: 'no-store' })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      state.data = data;
      loadProgress();
      els.title.textContent = data.title;
      els.subtitle.textContent = data.subtitle;
      renderPrinciples();
      renderRoadmap();
      updateProgress();
    })
    .catch((err) => {
      els.roadmap.innerHTML = `<div class="card" style="padding:18px">Không tải được roadmap: ${escapeHtml(err.message)}</div>`;
    });
})();
