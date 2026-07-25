'use strict';

/* ---------- Global DOM (singletons) ---------- */
const el = {
  stopwatchList: document.getElementById('stopwatchList'),
  template: document.getElementById('stopwatchTemplate'),
  exportAllBtn: document.getElementById('exportAllBtn'),
};

/* ---------- Time formatting ---------- */
function formatTime(ms) {
  const totalCentis = Math.floor(ms / 10);
  const centis = totalCentis % 100;
  const totalSeconds = Math.floor(totalCentis / 100);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const pad2 = (n) => String(n).padStart(2, '0');
  const base = `${pad2(minutes)}:${pad2(seconds)}.${pad2(centis)}`;
  return hours > 0 ? `${hours}:${base}` : base;
}

function currentElapsedMs(sw) {
  if (!sw.running) return sw.elapsedMs;
  return sw.elapsedMs + (Date.now() - sw.startEpoch);
}

/* ---------- Stopwatch instances ---------- */
const stopwatches = new Map(); // id -> stopwatch instance
const familyGroups = new Map(); // root parent id -> wrapping DOM element for that parent + its children
let nextStopwatchNumber = 1;

// seed lets a duplicate start already running, at the source's current elapsed time.
// seed.parentId, if set, makes this a child grouped under that root parent instead
// of a new independent parent.
function createStopwatch(seed) {
  const id = `sw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const number = nextStopwatchNumber++;

  const sw = {
    id,
    number,
    label: `ストップウォッチ ${number}`,
    parentId: seed?.parentId ?? null,
    running: seed?.running ?? false,
    startEpoch: Date.now(),
    elapsedMs: seed?.elapsedMs ?? 0,
    records: seed?.records ? seed.records.map((r) => ({ ...r })) : [],
    lastLapMs: seed?.lastLapMs ? { ...seed.lastLapMs } : { A: 0, B: 0 },
    lapCount: seed?.lapCount ? { ...seed.lapCount } : { A: 0, B: 0 },
  };

  const node = el.template.content.firstElementChild.cloneNode(true);
  node.dataset.swId = id;
  sw.dom = {
    root: node,
    label: node.querySelector('.sw-label'),
    duplicateBtn: node.querySelector('.sw-duplicate'),
    removeBtn: node.querySelector('.sw-remove'),
    display: node.querySelector('.display'),
    toggleBtn: node.querySelector('.sw-toggle'),
    lapABtn: node.querySelector('.sw-lap-a'),
    lapBBtn: node.querySelector('.sw-lap-b'),
    lapBothBtn: node.querySelector('.sw-lap-both'),
    liveA: node.querySelector('.sw-live-a'),
    liveB: node.querySelector('.sw-live-b'),
    resetBtn: node.querySelector('.sw-reset'),
    exportCsvBtn: node.querySelector('.sw-export-csv'),
    status: node.querySelector('.sw-status'),
    recordsA: node.querySelector('.sw-records-a'),
    recordsB: node.querySelector('.sw-records-b'),
    countA: node.querySelector('.sw-count-a'),
    countB: node.querySelector('.sw-count-b'),
    latestAll: node.querySelector('.sw-latest-all'),
    latestAllList: node.querySelector('.sw-latest-all-list'),
  };

  if (sw.parentId) node.classList.add('is-child');

  sw.dom.label.textContent = sw.label;
  sw.dom.display.textContent = formatTime(currentElapsedMs(sw));
  updateLiveSplits(sw);

  if (sw.running) {
    setRunningUi(sw, seed?.statusMessage ?? '計測中…');
  }

  sw.dom.label.addEventListener('blur', () => renameStopwatch(sw));
  sw.dom.label.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sw.dom.label.blur();
    }
  });
  sw.dom.toggleBtn.addEventListener('click', () => toggleStopwatch(sw));
  sw.dom.lapABtn.addEventListener('click', () => addRecord(sw, 'A'));
  sw.dom.lapBBtn.addEventListener('click', () => addRecord(sw, 'B'));
  sw.dom.lapBothBtn.addEventListener('click', () => addRecord(sw, 'both'));
  sw.dom.resetBtn.addEventListener('click', () => resetStopwatch(sw));
  sw.dom.exportCsvBtn.addEventListener('click', () => exportCsv(sw));
  sw.dom.duplicateBtn.addEventListener('click', () => duplicateStopwatch(sw));
  sw.dom.removeBtn.addEventListener('click', () => removeStopwatch(sw));

  const rootId = sw.parentId ?? sw.id;
  let group = familyGroups.get(rootId);
  if (!group) {
    group = document.createElement('div');
    group.className = 'family-group';
    el.stopwatchList.appendChild(group);
    familyGroups.set(rootId, group);
  }
  group.appendChild(node);

  stopwatches.set(id, sw);
  renderRecords(sw);
  updateRemoveButtons();
  refreshAllLatestPanels();
  return sw;
}

function renameStopwatch(sw) {
  const text = sw.dom.label.textContent.trim();
  sw.label = text || `ストップウォッチ ${sw.number}`;
  sw.dom.label.textContent = sw.label;
  refreshAllLatestPanels();
}

// Duplicating a stopped stopwatch starts a new independent parent.
// Duplicating a running one creates a child grouped under that stopwatch's
// root parent (or under itself, if it's already a parent).
function duplicateStopwatch(source) {
  const parentId = source.running ? (source.parentId ?? source.id) : null;
  const clone = createStopwatch({
    running: source.running,
    elapsedMs: currentElapsedMs(source),
    records: source.records,
    lastLapMs: source.lastLapMs,
    lapCount: source.lapCount,
    parentId,
    statusMessage: source.running ? `${source.label} の計測中の状態を引き継ぎました。` : '',
  });
  return clone;
}

function removeStopwatch(sw) {
  if (stopwatches.size <= 1) return;
  const rootId = sw.parentId ?? sw.id;
  const group = familyGroups.get(rootId);
  sw.dom.root.remove();
  stopwatches.delete(sw.id);
  if (group && group.children.length === 0) {
    group.remove();
    familyGroups.delete(rootId);
  }
  updateRemoveButtons();
  refreshAllLatestPanels();
}

function updateRemoveButtons() {
  const disable = stopwatches.size <= 1;
  stopwatches.forEach((sw) => {
    sw.dom.removeBtn.disabled = disable;
  });
}

/* ---------- Live "time since last lap" readouts on the A/B lap buttons ---------- */
function updateLiveSplits(sw) {
  const totalMs = currentElapsedMs(sw);
  sw.dom.liveA.textContent = formatTime(totalMs - sw.lastLapMs.A);
  sw.dom.liveB.textContent = formatTime(totalMs - sw.lastLapMs.B);
}

/* ---------- "Every stopwatch's latest lap", shown under a running clock ---------- */
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function latestRecordOf(sw) {
  return sw.records.length ? sw.records[sw.records.length - 1] : null;
}

function renderLatestAllPanel(sw) {
  const rows = stopwatchesInDisplayOrder()
    .map((other) => ({ other, record: latestRecordOf(other) }))
    .filter(({ record }) => record);

  sw.dom.latestAllList.innerHTML = rows
    .map(
      ({ other, record: r }) => `
      <div class="latest-all-row">
        <span class="latest-all-name">${escapeHtml(other.label)}</span>
        <span class="latest-all-tag track-${r.track.toLowerCase()}">${r.track}</span>
        <span class="latest-all-lap">${formatTime(r.lapMs)}</span>
        <span class="latest-all-total">${formatTime(r.totalMs)}</span>
      </div>
    `
    )
    .join('');
}

// Refreshes every running stopwatch's "latest across all" panel — called
// whenever any stopwatch's data changes, since that can affect all of them.
function refreshAllLatestPanels() {
  stopwatches.forEach((sw) => {
    sw.dom.latestAll.classList.toggle('is-visible', sw.running);
    if (sw.running) renderLatestAllPanel(sw);
  });
}

/* ---------- Single shared render loop for all running instances ---------- */
function tickAll() {
  stopwatches.forEach((sw) => {
    if (sw.running) {
      sw.dom.display.textContent = formatTime(currentElapsedMs(sw));
      updateLiveSplits(sw);
    }
  });
  requestAnimationFrame(tickAll);
}

/* ---------- Controls ---------- */
function toggleStopwatch(sw) {
  if (sw.running) {
    stopStopwatch(sw);
  } else {
    startStopwatch(sw);
  }
}

function setRunningUi(sw, statusMessage) {
  sw.dom.toggleBtn.textContent = 'ストップ';
  sw.dom.toggleBtn.classList.remove('btn-primary');
  sw.dom.toggleBtn.classList.add('btn-danger');
  sw.dom.lapABtn.disabled = false;
  sw.dom.lapBBtn.disabled = false;
  sw.dom.lapBothBtn.disabled = false;
  sw.dom.resetBtn.disabled = true;
  setStatus(sw, statusMessage);
}

function startStopwatch(sw) {
  if (sw.running) return;
  sw.running = true;
  sw.startEpoch = Date.now();
  setRunningUi(sw, '計測中…');
  updateLiveSplits(sw);
  refreshAllLatestPanels();
}

function stopStopwatch(sw) {
  if (!sw.running) return;
  sw.elapsedMs = currentElapsedMs(sw);
  sw.running = false;
  sw.dom.display.textContent = formatTime(sw.elapsedMs);
  sw.dom.toggleBtn.textContent = 'スタート';
  sw.dom.toggleBtn.classList.remove('btn-danger');
  sw.dom.toggleBtn.classList.add('btn-primary');
  sw.dom.lapABtn.disabled = true;
  sw.dom.lapBBtn.disabled = true;
  sw.dom.lapBothBtn.disabled = true;
  sw.dom.resetBtn.disabled = false;
  setStatus(sw, '停止しました。スタートで再開、リセットでクリアできます。');
  updateLiveSplits(sw);
  refreshAllLatestPanels();
}

function resetStopwatch(sw) {
  if (sw.running) return;
  sw.elapsedMs = 0;
  sw.records = [];
  sw.lastLapMs = { A: 0, B: 0 };
  sw.lapCount = { A: 0, B: 0 };
  sw.dom.display.textContent = formatTime(0);
  renderRecords(sw);
  updateLiveSplits(sw);
  setStatus(sw, '');
  refreshAllLatestPanels();
}

function pushLap(sw, track, totalMs) {
  const lapMs = totalMs - sw.lastLapMs[track];
  sw.lastLapMs[track] = totalMs;
  sw.lapCount[track] += 1;
  sw.records.push({
    idx: sw.lapCount[track],
    track,
    lapMs,
    totalMs,
    wallClock: new Date().toISOString(),
  });
}

function addRecord(sw, track) {
  if (!sw.running) return;
  const totalMs = currentElapsedMs(sw);
  if (track === 'both') {
    pushLap(sw, 'A', totalMs);
    pushLap(sw, 'B', totalMs);
  } else {
    pushLap(sw, track, totalMs);
  }
  renderRecords(sw);
  updateLiveSplits(sw);
  refreshAllLatestPanels();
}

function setStatus(sw, msg) {
  sw.dom.status.textContent = msg;
}

/* ---------- Records rendering ---------- */
function renderColumn(container, countEl, records, track) {
  const trackRecords = records.filter((r) => r.track === track);
  countEl.textContent = String(trackRecords.length);

  const frag = document.createDocumentFragment();
  for (let i = trackRecords.length - 1; i >= 0; i--) {
    const r = trackRecords[i];
    const row = document.createElement('div');
    row.className = 'record-row' + (i === trackRecords.length - 1 ? ' latest' : '');
    row.innerHTML = `
      <div class="record-row-top">
        <span class="idx">#${r.idx}</span>
        <span class="time-lap">${formatTime(r.lapMs)}</span>
      </div>
      <span class="time-total">${formatTime(r.totalMs)}</span>
    `;
    frag.appendChild(row);
  }
  container.innerHTML = '';
  container.appendChild(frag);
}

function renderRecords(sw) {
  renderColumn(sw.dom.recordsA, sw.dom.countA, sw.records, 'A');
  renderColumn(sw.dom.recordsB, sw.dom.countB, sw.records, 'B');
}

/* ---------- CSV export ---------- */
function downloadCsv(header, rows, filenamePrefix) {
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenamePrefix}_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCsv(sw) {
  if (sw.records.length === 0) {
    setStatus(sw, '記録がありません。');
    return;
  }
  const header = ['No', 'レーン', '記録日時', '区間タイム', '合計タイム'];
  const rows = sw.records.map((r) => [r.idx, r.track, r.wallClock, formatTime(r.lapMs), formatTime(r.totalMs)]);
  downloadCsv(header, rows, `stopwatch_${sw.number}`);
}

// Walks the DOM in display order (family-groups, then parent-then-children
// within each) so the combined file's row order matches what's on screen.
function stopwatchesInDisplayOrder() {
  const ordered = [];
  el.stopwatchList.querySelectorAll('.stopwatch-card').forEach((card) => {
    const sw = stopwatches.get(card.dataset.swId);
    if (sw) ordered.push(sw);
  });
  return ordered;
}

function exportAllCsv() {
  const header = ['ストップウォッチ', '親子', 'No', 'レーン', '記録日時', '区間タイム', '合計タイム'];
  const rows = [];
  stopwatchesInDisplayOrder().forEach((sw) => {
    const kind = sw.parentId ? '子' : '親';
    sw.records.forEach((r) => {
      rows.push([sw.label, kind, r.idx, r.track, r.wallClock, formatTime(r.lapMs), formatTime(r.totalMs)]);
    });
  });
  if (rows.length === 0) {
    window.alert('記録がありません。');
    return;
  }
  downloadCsv(header, rows, 'stopwatch_all');
}

el.exportAllBtn.addEventListener('click', exportAllCsv);

window.addEventListener('load', () => {
  createStopwatch();
  requestAnimationFrame(tickAll);
});
