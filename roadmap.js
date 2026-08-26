(() => {
  'use strict';

  const STORAGE_KEY = 'price_action_roadmap_progress_v2';
  const $ = (id) => document.getElementById(id);
  const els = {
    principlesList: $('principlesList'), roadmapTree: $('roadmapTree'), phaseCount: $('phaseCount'), nodeCount: $('nodeCount'),
    coveredCount: $('coveredCount'), progressFill: $('progressFill'), progressText: $('progressText'), bookShelf: $('bookShelf'),
    expandAllBtn: $('expandAllBtn'), collapseAllBtn: $('collapseAllBtn'), resetProgressBtn: $('resetProgressBtn')
  };

  const state = { data: null, progress: loadProgress(), filter: 'all', collapsed: new Set() };

  function loadProgress() {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : {}; }
    catch (_) { return {}; }
  }
  function saveProgress() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress)); }
  async function fetchJson(path) { const res = await fetch(path, { cache: 'no-store' }); if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`); return res.json(); }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c])); }
  function uniqueBooks(data) { const map = new Map(); (data.library || []).forEach((book) => map.set(book.id, book)); return [...map.values()]; }
  function nodeVisible(node) { return state.filter === 'all' || node.priority === state.filter; }
  function filteredNodes(nodes, priority) { return nodes.filter((n) => n.priority === priority && nodeVisible(n)); }
  function statusLabel(status) { if (status === 'available') return 'Available'; if (status === 'covered') return 'Covered'; return 'Planned'; }

  function buildNode(node) {
    const isDone = Boolean(state.progress[node.id]);
    const links = [];
    if (node.lesson) links.push(`<a class="node-link" href="./index.html?lesson=${encodeURIComponent(node.lesson)}">Mở bài học →</a>`);
    if (node.roadmapNote) links.push(`<span class="muted">${escapeHtml(node.roadmapNote)}</span>`);
    return `<article class="node ${node.priority} ${isDone ? 'done' : ''}" data-node-id="${escapeHtml(node.id)}">
      <div class="node-head"><div class="node-topline"><span class="node-code">${escapeHtml(node.id)}</span><span class="status-pill ${escapeHtml(node.status || 'planned')}">${statusLabel(node.status)}</span></div>
      <div class="node-title">${escapeHtml(node.title)}</div><div class="node-links">${links.join('')}</div></div>
      <button class="mark-btn ${isDone ? 'is-done' : ''}" data-mark-node="${escapeHtml(node.id)}" type="button">${isDone ? 'Đã học' : 'Đánh dấu'}</button>
    </article>`;
  }

  function getBook(id) { return (state.data.library || []).find((x) => x.id === id); }
  function renderBooksInline(ids) {
    if (!ids?.length) return '<p class="muted">Chưa gắn reading list cho phase này.</p>';
    return `<div class="books-inline">${ids.map((id) => { const b = getBook(id); if (!b) return ''; return `<div class="book-chip"><h5>${escapeHtml(b.title)}</h5><div class="book-meta">${escapeHtml(b.author)} · ${escapeHtml(b.topic)}</div><p>${escapeHtml(b.useFor)}</p></div>`; }).join('')}</div>`;
  }

  function renderTree() {
    els.roadmapTree.innerHTML = state.data.phases.map((phase) => {
      const requiredNodes = filteredNodes(phase.nodes, 'required');
      const recommendedNodes = filteredNodes(phase.nodes, 'recommended');
      const optionalNodes = filteredNodes(phase.nodes, 'optional');
      const hidden = state.collapsed.has(phase.id);
      const hasVisibleNodes = requiredNodes.length || recommendedNodes.length || optionalNodes.length;
      return `<section class="phase-card" data-phase-id="${escapeHtml(phase.id)}">
        <div class="phase-head"><div><span class="phase-id">${escapeHtml(phase.id)}</span><h3 class="phase-title">${escapeHtml(phase.title)}</h3><div class="phase-level">${escapeHtml(phase.level || '')}</div><p class="phase-goal">${escapeHtml(phase.goal || '')}</p></div>
        <div class="phase-actions"><button class="btn btn-secondary phase-toggle" data-toggle-phase="${escapeHtml(phase.id)}" type="button">${hidden ? 'Mở phase' : 'Thu gọn'}</button></div></div>
        <div class="phase-grid ${hidden ? 'hidden' : ''}"><div class="phase-branches">
          ${hasVisibleNodes ? '' : '<p class="muted">Không có node nào khớp bộ lọc hiện tại.</p>'}
          ${requiredNodes.length ? `<div class="branch-group"><div class="branch-label">Core</div><div class="nodes">${requiredNodes.map(buildNode).join('')}</div></div>` : ''}
          ${recommendedNodes.length ? `<div class="branch-group"><div class="branch-label">Recommended</div><div class="nodes">${recommendedNodes.map(buildNode).join('')}</div></div>` : ''}
          ${optionalNodes.length ? `<div class="branch-group"><div class="branch-label">Optional</div><div class="nodes">${optionalNodes.map(buildNode).join('')}</div></div>` : ''}
        </div><div class="phase-detail"><div class="checkpoint"><h4>Checkpoint để qua phase</h4><p>${escapeHtml(phase.gate || '')}</p></div>
        <div class="book-group"><h4>Reading guidance</h4><p>${escapeHtml(phase.readingIntro || 'Đọc ít nhưng đọc đúng. Lấy framework và nguyên tắc, sau đó quay lại chart thật.')}</p>${renderBooksInline(phase.books)}</div></div></div>
      </section>`;
    }).join('');
    attachInteractiveHandlers(); updateProgress();
  }

  function attachInteractiveHandlers() {
    document.querySelectorAll('[data-mark-node]').forEach((btn) => btn.addEventListener('click', () => { const id = btn.dataset.markNode; state.progress[id] = !state.progress[id]; if (!state.progress[id]) delete state.progress[id]; saveProgress(); renderTree(); }));
    document.querySelectorAll('[data-toggle-phase]').forEach((btn) => btn.addEventListener('click', () => { const id = btn.dataset.togglePhase; if (state.collapsed.has(id)) state.collapsed.delete(id); else state.collapsed.add(id); renderTree(); }));
  }

  function updateProgress() {
    const allNodes = state.data.phases.flatMap((p) => p.nodes); const visibleNodes = allNodes.filter(nodeVisible);
    const doneCount = visibleNodes.filter((n) => state.progress[n.id]).length; const total = visibleNodes.length; const pct = total ? (doneCount / total) * 100 : 0;
    els.progressFill.style.width = `${pct}%`; els.progressText.textContent = `${doneCount}/${total} node đã đánh dấu học xong`;
  }

  function renderBooks() {
    els.bookShelf.innerHTML = uniqueBooks(state.data).map((book) => `<article class="book-card"><h4>${escapeHtml(book.title)}</h4><p class="muted">${escapeHtml(book.author)} · ${escapeHtml(book.topic)}</p><p>${escapeHtml(book.why)}</p><div class="book-tags">${(book.tags || []).map((tag) => `<span class="book-tag">${escapeHtml(tag)}</span>`).join('')}</div></article>`).join('');
  }

  function bindGlobalActions() {
    document.querySelectorAll('[data-filter]').forEach((btn) => btn.addEventListener('click', () => { state.filter = btn.dataset.filter; document.querySelectorAll('[data-filter]').forEach((b) => b.classList.toggle('chip-active', b === btn)); renderTree(); }));
    els.expandAllBtn.addEventListener('click', () => { state.collapsed.clear(); renderTree(); });
    els.collapseAllBtn.addEventListener('click', () => { state.data.phases.forEach((phase) => state.collapsed.add(phase.id)); renderTree(); });
    els.resetProgressBtn.addEventListener('click', () => { if (!confirm('Reset toàn bộ progress trên roadmap này?')) return; state.progress = {}; saveProgress(); renderTree(); });
  }

  function renderSummary() {
    const phases = state.data.phases; const nodes = phases.flatMap((p) => p.nodes); const covered = nodes.filter((n) => ['available','covered'].includes(n.status)).length;
    els.phaseCount.textContent = String(phases.length); els.nodeCount.textContent = String(nodes.length); els.coveredCount.textContent = String(covered);
    els.principlesList.innerHTML = (state.data.principles || []).map((x) => `<li>${escapeHtml(x)}</li>`).join('');
  }

  async function main() { state.data = await fetchJson('./roadmap.json'); renderSummary(); renderBooks(); renderTree(); bindGlobalActions(); }
  main().catch((err) => { console.error(err); els.roadmapTree.innerHTML = `<div class="card" style="padding:20px">Không tải được roadmap: ${escapeHtml(err.message)}</div>`; });
})();
