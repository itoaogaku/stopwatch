'use strict';

/* ---------- Global DOM (singletons) ---------- */
const el = {
  stopwatchList: document.getElementById('stopwatchList'),
  template: document.getElementById('stopwatchTemplate'),
  exportAllBtn: document.getElementById('exportAllBtn'),
  lockToggleBtn: document.getElementById('lockToggleBtn'),
  lockOverlay: document.getElementById('lockOverlay'),
};

/* ---------- Haptic feedback ---------- */
// Vibration API isn't supported by iOS Safari (as of this writing), so this
// is a no-op there — but it works on Android/Chrome, and costs nothing to
// have in place.
document.addEventListener('click', (e) => {
  if (e.target.closest('button') && 'vibrate' in navigator) {
    navigator.vibrate(15);
  }
});

/* ---------- Screen lock ---------- */
// Full lock: the overlay covers the whole page and swallows every tap, so
// nothing underneath can be triggered by accident. Only the toggle itself
// (fixed above the overlay) stays reachable to unlock.
el.lockToggleBtn.addEventListener('click', () => {
  const locked = el.lockOverlay.hidden;
  el.lockOverlay.hidden = !locked;
  el.lockToggleBtn.classList.toggle('is-locked', locked);
  el.lockToggleBtn.textContent = locked ? '固定中' : '固定';
  if (locked && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
});

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

// Excel export only: rounds to the nearest 0.1s and shows a single decimal
// digit (e.g. "0:00.0") instead of the on-screen two-digit centiseconds.
// The leftmost unit (hours if present, otherwise minutes) isn't zero-padded
// — e.g. "8:12.5", not "08:12.5" — but every unit below it still is, so
// "1:05:23.4" stays unambiguous.
function formatTimeShort(ms) {
  const totalDecis = Math.round(ms / 100);
  const decis = totalDecis % 10;
  const totalSeconds = Math.floor(totalDecis / 10);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const pad2 = (n) => String(n).padStart(2, '0');
  const minutesStr = hours > 0 ? pad2(minutes) : String(minutes);
  const base = `${minutesStr}:${pad2(seconds)}.${decis}`;
  return hours > 0 ? `${hours}:${base}` : base;
}

function currentElapsedMs(sw) {
  if (!sw.running) return sw.elapsedMs;
  return sw.elapsedMs + (Date.now() - sw.startEpoch);
}

// Past 1 hour the display grows an "H:" (or "HH:") prefix. The base font
// size is tuned to fill narrow phone screens with the normal 8-character
// MM:SS.CC readout, so those extra digits need a smaller size tier to avoid
// getting clipped at the edge of the watch case.
function setDisplayTime(sw, ms) {
  sw.dom.display.textContent = formatTime(ms);
  const hours = Math.floor(ms / 3600000);
  sw.dom.display.classList.toggle('is-hours', hours >= 1 && hours < 10);
  sw.dom.display.classList.toggle('is-long-hours', hours >= 10);
}

/* ---------- Stopwatch instances ---------- */
const stopwatches = new Map(); // id -> stopwatch instance
const familyGroups = new Map(); // root parent id -> wrapping DOM element for that parent + its children
let nextStopwatchNumber = 1;
let nextParentNumber = 1; // letter naming counted only among parents, so children in between never skip a letter
let firstStopwatchId = null; // only this stopwatch shows the "新規複製" button

// 1 -> A, 2 -> B, ..., 26 -> Z, 27 -> AA, 28 -> AB, ... (spreadsheet-style).
function defaultLabelFor(number) {
  let n = number;
  let label = '';
  while (n > 0) {
    n -= 1;
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26);
  }
  return label;
}

// Children (duplicated from a running stopwatch) are named after their root
// parent's label, e.g. "A-複製1", "A-複製2", counted among existing children
// of that same root parent.
function defaultChildLabel(rootId) {
  const rootSw = stopwatches.get(rootId);
  const parentLabel = rootSw ? rootSw.label : '';
  let count = 0;
  stopwatches.forEach((s) => {
    if (s.parentId === rootId) count += 1;
  });
  return `${parentLabel}-複製${count + 1}`;
}

// seed lets a duplicate start already running, at the source's current elapsed time.
// seed.parentId, if set, makes this a child grouped under that root parent instead
// of a new independent parent.
function createStopwatch(seed) {
  const id = `sw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const number = nextStopwatchNumber++;
  if (firstStopwatchId === null) firstStopwatchId = id;

  const defaultLabel = seed?.parentId ? defaultChildLabel(seed.parentId) : defaultLabelFor(nextParentNumber++);

  const sw = {
    id,
    number,
    label: defaultLabel,
    defaultLabel,
    parentId: seed?.parentId ?? null,
    running: seed?.running ?? false,
    startEpoch: Date.now(),
    elapsedMs: seed?.elapsedMs ?? 0,
    records: seed?.records ? seed.records.map((r) => ({ ...r })) : [],
    lastLapMs: seed?.lastLapMs ? { ...seed.lastLapMs } : { A: 0, B: 0 },
    lapCount: seed?.lapCount ? { ...seed.lapCount } : { A: 0, B: 0 },
    expanded: false,
  };

  const node = el.template.content.firstElementChild.cloneNode(true);
  node.dataset.swId = id;
  sw.dom = {
    root: node,
    label: node.querySelector('.sw-label'),
    actions: node.querySelector('.sw-actions'),
    duplicateBtn: node.querySelector('.sw-duplicate'),
    duplicateParentBtn: node.querySelector('.sw-duplicate-parent'),
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
    moreBtn: node.querySelector('.sw-more'),
    latestA: node.querySelector('.sw-latest-a'),
    latestB: node.querySelector('.sw-latest-b'),
  };

  if (sw.parentId) node.classList.add('is-child');
  sw.dom.duplicateParentBtn.hidden = id !== firstStopwatchId;
  if (id === firstStopwatchId) {
    sw.dom.actions.insertBefore(el.exportAllBtn, sw.dom.duplicateBtn);
  }

  sw.dom.label.textContent = sw.label;
  setDisplayTime(sw, currentElapsedMs(sw));
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
  sw.dom.exportCsvBtn.addEventListener('click', () => exportExcel(sw));
  sw.dom.duplicateBtn.addEventListener('click', () => duplicateStopwatch(sw));
  sw.dom.duplicateParentBtn.addEventListener('click', () => duplicateStopwatch(sw, { forceNewParent: true }));
  sw.dom.removeBtn.addEventListener('click', () => removeStopwatch(sw));
  sw.dom.moreBtn.addEventListener('click', () => {
    sw.expanded = !sw.expanded;
    renderRecords(sw);
  });

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
  refreshLatestPanels(sw);
  return sw;
}

function renameStopwatch(sw) {
  const text = sw.dom.label.textContent.trim();
  sw.label = text || sw.defaultLabel;
  sw.dom.label.textContent = sw.label;
}

// 子複製: always creates a child grouped under the source's root parent
// (or under the source itself, if it's already a parent), inheriting its
// current time/records — whether the source is running or stopped.
// 親複製 (forceNewParent): always creates a brand new, fully independent,
// stopped parent with nothing inherited at all.
function duplicateStopwatch(source, { forceNewParent = false } = {}) {
  if (forceNewParent) {
    return createStopwatch({ parentId: null });
  }

  const parentId = source.parentId ?? source.id;
  return createStopwatch({
    running: source.running,
    elapsedMs: currentElapsedMs(source),
    records: source.records,
    lastLapMs: source.lastLapMs,
    lapCount: source.lapCount,
    parentId,
    statusMessage: source.running ? `${source.label} の計測中の状態を引き継ぎました。` : '',
  });
}

function removeStopwatch(sw) {
  if (stopwatches.size <= 1) return;
  const rootId = sw.parentId ?? sw.id;
  const group = familyGroups.get(rootId);
  // The "全てExcel保存" button lives inside the first stopwatch's card;
  // move it to whatever remains first before that card is torn down, so
  // removing it never deletes the button along with it.
  if (sw.dom.root.contains(el.exportAllBtn)) {
    const nextCard = Array.from(el.stopwatchList.querySelectorAll('.stopwatch-card')).find(
      (card) => card !== sw.dom.root
    );
    if (nextCard) {
      nextCard.querySelector('.sw-actions').insertBefore(el.exportAllBtn, nextCard.querySelector('.sw-duplicate'));
    }
  }
  sw.dom.root.remove();
  stopwatches.delete(sw.id);
  if (group && group.children.length === 0) {
    group.remove();
    familyGroups.delete(rootId);
  }
  updateRemoveButtons();
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

/* ---------- Each lane's own latest lap, shown under its live split while running ---------- */
function latestRecordForTrack(sw, track) {
  for (let i = sw.records.length - 1; i >= 0; i--) {
    if (sw.records[i].track === track) return sw.records[i];
  }
  return null;
}

// Always renders both lines (using a dashed placeholder before the first
// lap) so the LCD panel is already at its final size from the start,
// instead of growing the moment a lap first appears.
function renderLatestLane(sw, track, el) {
  const r = latestRecordForTrack(sw, track);
  const lap = r ? formatTime(r.lapMs) : '--:--.--';
  const total = r ? formatTime(r.totalMs) : '--:--.--';
  el.innerHTML = `
    <div class="latest-lane-row${r ? '' : ' is-placeholder'}">
      <span class="latest-lane-lap">${lap}</span>
      <span class="latest-lane-total">${total}</span>
    </div>
  `;
}

// Refreshes a stopwatch's own A/B latest-lap readouts — called whenever its
// own data changes. Stays visible after Stop (frozen at the last lap), just
// like the main display freezes instead of clearing.
function refreshLatestPanels(sw) {
  renderLatestLane(sw, 'A', sw.dom.latestA);
  renderLatestLane(sw, 'B', sw.dom.latestB);
}

/* ---------- Single shared render loop for all running instances ---------- */
function tickAll() {
  stopwatches.forEach((sw) => {
    if (sw.running) {
      setDisplayTime(sw, currentElapsedMs(sw));
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
  refreshLatestPanels(sw);
}

function stopStopwatch(sw) {
  if (!sw.running) return;
  sw.elapsedMs = currentElapsedMs(sw);
  sw.running = false;
  setDisplayTime(sw, sw.elapsedMs);
  sw.dom.toggleBtn.textContent = 'スタート';
  sw.dom.toggleBtn.classList.remove('btn-danger');
  sw.dom.toggleBtn.classList.add('btn-primary');
  sw.dom.lapABtn.disabled = true;
  sw.dom.lapBBtn.disabled = true;
  sw.dom.lapBothBtn.disabled = true;
  sw.dom.resetBtn.disabled = false;
  setStatus(sw, '停止しました。スタートで再開、リセットでクリアできます。');
  updateLiveSplits(sw);
  refreshLatestPanels(sw);
}

function resetStopwatch(sw) {
  if (sw.running) return;
  sw.elapsedMs = 0;
  sw.records = [];
  sw.lastLapMs = { A: 0, B: 0 };
  sw.lapCount = { A: 0, B: 0 };
  sw.expanded = false;
  setDisplayTime(sw, 0);
  renderRecords(sw);
  updateLiveSplits(sw);
  setStatus(sw, '');
  refreshLatestPanels(sw);
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
  refreshLatestPanels(sw);
}

function setStatus(sw, msg) {
  sw.dom.status.textContent = msg;
}

/* ---------- Records rendering ---------- */
const VISIBLE_RECORD_COUNT = 4;

// Returns how many of this lane's records are hidden beyond the visible cap.
function renderColumn(container, countEl, records, track, expanded) {
  const trackRecords = records.filter((r) => r.track === track);
  countEl.textContent = String(trackRecords.length);

  const hiddenCount = Math.max(0, trackRecords.length - VISIBLE_RECORD_COUNT);
  const visibleCount = expanded ? trackRecords.length : trackRecords.length - hiddenCount;

  const frag = document.createDocumentFragment();
  for (let i = trackRecords.length - 1; i >= trackRecords.length - visibleCount; i--) {
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

  return hiddenCount;
}

// One shared "もっと見る" button expands/collapses both A and B together.
function renderRecords(sw) {
  const hiddenA = renderColumn(sw.dom.recordsA, sw.dom.countA, sw.records, 'A', sw.expanded);
  const hiddenB = renderColumn(sw.dom.recordsB, sw.dom.countB, sw.records, 'B', sw.expanded);
  const hiddenTotal = hiddenA + hiddenB;

  if (hiddenTotal > 0) {
    sw.dom.moreBtn.hidden = false;
    sw.dom.moreBtn.textContent = sw.expanded ? '折りたたむ' : `もっと見る(${hiddenTotal}件)`;
  } else {
    sw.dom.moreBtn.hidden = true;
  }
}

/* ---------- Excel export ---------- */
function sanitizeSheetName(name) {
  return name.replace(/[\\/*?:[\]]/g, '').slice(0, 31) || 'Sheet1';
}

function formatDateStamp(date) {
  const pad2 = (n) => String(n).padStart(2, '0');
  const datePart = `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
  const timePart = `${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
  return `${datePart}_${timePart}`;
}

async function downloadExcel(sheetName, header, rows, filenamePrefix) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sanitizeSheetName(sheetName));
  sheet.addRow(header);
  rows.forEach((row) => sheet.addRow(row));

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF322F2B' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  const thin = { style: 'thin', color: { argb: 'FFB8B0A6' } };
  sheet.eachRow((row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = { top: thin, left: thin, bottom: thin, right: thin };
    });
  });

  header.forEach((label, i) => {
    let maxLen = String(label).length;
    rows.forEach((row) => {
      const len = String(row[i] ?? '').length;
      if (len > maxLen) maxLen = len;
    });
    sheet.getColumn(i + 1).width = Math.min(maxLen + 2, 28);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${formatDateStamp(new Date())}_${filenamePrefix}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

const LANE_EXPORT_HEADER = ['No', 'Aの区間タイム', 'Aの合計タイム', 'Bの区間タイム', 'Bの合計タイム'];

// A and B are independent lap series (their own counters), so rows are
// aligned by lap number (No) rather than by when each lap was taken —
// each track keeps its own 区間タイム/合計タイム columns, left blank
// where that lane has no lap at that number.
function buildLaneRows(records) {
  const byIdx = new Map();
  records.forEach((r) => {
    if (!byIdx.has(r.idx)) byIdx.set(r.idx, {});
    byIdx.get(r.idx)[r.track] = r;
  });
  const maxIdx = byIdx.size ? Math.max(...byIdx.keys()) : 0;
  const rows = [];
  for (let idx = 1; idx <= maxIdx; idx++) {
    const entry = byIdx.get(idx) || {};
    rows.push({ idx, a: entry.A, b: entry.B });
  }
  return rows;
}

function laneRowToCells(row) {
  const { a, b } = row;
  return [
    row.idx,
    a ? formatTimeShort(a.lapMs) : '',
    a ? formatTimeShort(a.totalMs) : '',
    b ? formatTimeShort(b.lapMs) : '',
    b ? formatTimeShort(b.totalMs) : '',
  ];
}

async function exportExcel(sw) {
  if (sw.records.length === 0) {
    setStatus(sw, '記録がありません。');
    return;
  }
  const rows = buildLaneRows(sw.records).map(laneRowToCells);
  sw.dom.exportCsvBtn.disabled = true;
  try {
    await downloadExcel(sw.label, LANE_EXPORT_HEADER, rows, `stopwatch_${sw.number}`);
  } finally {
    sw.dom.exportCsvBtn.disabled = false;
  }
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

async function exportAllExcel() {
  const header = ['ストップウォッチ', '親子', ...LANE_EXPORT_HEADER];
  const rows = [];
  stopwatchesInDisplayOrder().forEach((sw) => {
    const kind = sw.parentId ? '子' : '親';
    buildLaneRows(sw.records).forEach((row) => {
      rows.push([sw.label, kind, ...laneRowToCells(row)]);
    });
  });
  if (rows.length === 0) {
    window.alert('記録がありません。');
    return;
  }
  el.exportAllBtn.disabled = true;
  try {
    await downloadExcel('記録一覧', header, rows, 'stopwatch_all');
  } finally {
    el.exportAllBtn.disabled = false;
  }
}

el.exportAllBtn.addEventListener('click', exportAllExcel);

// Runs immediately (the script tag sits at the end of <body>, so the DOM is
// already parsed) rather than waiting for window "load", so the "全て
// Excel保存" button gets moved into place before first paint instead of
// briefly flashing at its original spot in the markup.
createStopwatch();
requestAnimationFrame(tickAll);
