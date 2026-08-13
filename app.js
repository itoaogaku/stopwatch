'use strict';

/* ---------- Global DOM (singletons) ---------- */
const el = {
  stopwatchList: document.getElementById('stopwatchList'),
  template: document.getElementById('stopwatchTemplate'),
  exportAllBtn: document.getElementById('exportAllBtn'),
  lockToggleBtn: document.getElementById('lockToggleBtn'),
  lockOverlay: document.getElementById('lockOverlay'),
  tabButtons: document.querySelectorAll('.tab-btn'),
  tabMenuToggle: document.getElementById('tabMenuToggle'),
  appTopbarTitle: document.getElementById('appTopbarTitle'),
  tabDrawer: document.getElementById('tabDrawer'),
  tabDrawerOverlay: document.getElementById('tabDrawerOverlay'),
  tabDrawerCloseBtn: document.getElementById('tabDrawerCloseBtn'),
  tabPanels: {
    timer: document.getElementById('timerTab'),
    pace: document.getElementById('paceTab'),
    crossing: document.getElementById('crossingTab'),
    stretch: document.getElementById('stretchTab'),
    reinforce: document.getElementById('reinforceTab'),
    tabata: document.getElementById('tabataTab'),
  },
  paceRows: document.getElementById('paceRows'),
  paceAddRowBtn: document.getElementById('paceAddRowBtn'),
  paceRowTemplate: document.getElementById('paceRowTemplate'),
  presetDistanceInput: document.getElementById('presetDistanceInput'),
  presetPaceRows: document.querySelectorAll('#presetPaceTable .preset-pace-row'),
  trainRowTemplate: document.getElementById('trainRowTemplate'),
  crossingCards: document.querySelectorAll('.crossing-card'),
  stretchProgress: document.getElementById('stretchProgress'),
  stretchVoiceToggle: document.getElementById('stretchVoiceToggle'),
  stretchVoiceSelect: document.getElementById('stretchVoiceSelect'),
  stretchRecordingsToggle: document.getElementById('stretchRecordingsToggle'),
  stretchRecordingsModal: document.getElementById('stretchRecordingsModal'),
  stretchRecordingsModalTitle: document.getElementById('stretchRecordingsModalTitle'),
  stretchRecordingsCloseBtn: document.getElementById('stretchRecordingsCloseBtn'),
  stretchRecordingsList: document.getElementById('stretchRecordingsList'),
  recordingRowTemplate: document.getElementById('recordingRowTemplate'),
  recordingSetSelect: document.getElementById('recordingSetSelect'),
  recordingSetNewBtn: document.getElementById('recordingSetNewBtn'),
  recordingSetDeleteBtn: document.getElementById('recordingSetDeleteBtn'),
  stretchTimer: document.getElementById('stretchTimer'),
  stretchCurrentGroup: document.getElementById('stretchCurrentGroup'),
  stretchNextGroup: document.getElementById('stretchNextGroup'),
  stretchNextSpeech: document.getElementById('stretchNextSpeech'),
  stretchStartBtn: document.getElementById('stretchStartBtn'),
  stretchPrevBtn: document.getElementById('stretchPrevBtn'),
  stretchNextBtn: document.getElementById('stretchNextBtn'),
  stretchPauseBtn: document.getElementById('stretchPauseBtn'),
  stretchResetBtn: document.getElementById('stretchResetBtn'),
  reinforceProgress: document.getElementById('reinforceProgress'),
  reinforceVoiceToggle: document.getElementById('reinforceVoiceToggle'),
  reinforceVoiceSelect: document.getElementById('reinforceVoiceSelect'),
  reinforceRecordingsToggle: document.getElementById('reinforceRecordingsToggle'),
  reinforceMenuPicker: document.getElementById('reinforceMenuPicker'),
  reinforceTimer: document.getElementById('reinforceTimer'),
  reinforceCurrentGroup: document.getElementById('reinforceCurrentGroup'),
  reinforceCurrentSpec: document.getElementById('reinforceCurrentSpec'),
  reinforceNextGroup: document.getElementById('reinforceNextGroup'),
  reinforceNextSpeech: document.getElementById('reinforceNextSpeech'),
  reinforceStartBtn: document.getElementById('reinforceStartBtn'),
  reinforcePrevBtn: document.getElementById('reinforcePrevBtn'),
  reinforceNextBtn: document.getElementById('reinforceNextBtn'),
  reinforcePauseBtn: document.getElementById('reinforcePauseBtn'),
  reinforceResetBtn: document.getElementById('reinforceResetBtn'),
  tabataProgress: document.getElementById('tabataProgress'),
  tabataDisplayPanel: document.getElementById('tabataDisplayPanel'),
  tabataPhase: document.getElementById('tabataPhase'),
  tabataTimer: document.getElementById('tabataTimer'),
  tabataStartBtn: document.getElementById('tabataStartBtn'),
  tabataResetBtn: document.getElementById('tabataResetBtn'),
};

/* ---------- Tabs ---------- */
function setTabDrawerOpen(open) {
  el.tabDrawer.classList.toggle('is-open', open);
  el.tabDrawerOverlay.classList.toggle('is-open', open);
  document.body.style.overflow = open ? 'hidden' : '';
}
el.tabMenuToggle.addEventListener('click', () => setTabDrawerOpen(true));
el.tabDrawerCloseBtn.addEventListener('click', () => setTabDrawerOpen(false));
el.tabDrawerOverlay.addEventListener('click', () => setTabDrawerOpen(false));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setTabDrawerOpen(false);
});

el.tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    el.tabButtons.forEach((b) => b.classList.toggle('is-active', b === btn));
    Object.entries(el.tabPanels).forEach(([name, panel]) => {
      panel.hidden = name !== btn.dataset.tab;
    });
    el.appTopbarTitle.textContent = btn.textContent;
    setTabDrawerOpen(false);
  });
});

/* ---------- Pace calculator ---------- */
// Accepts plain seconds ("270", "83.5") or minute:second ("4:30", "1:23.4",
// and even "h:mm:ss" for very long distances).
function parsePaceTime(str) {
  const s = String(str).trim();
  if (!s) return NaN;
  const parts = s.split(':');
  if (parts.some((p) => p.trim() === '' || Number.isNaN(Number(p)))) return NaN;
  const nums = parts.map(Number);
  if (nums.length === 1) return nums[0];
  if (nums.length === 2) return nums[0] * 60 + nums[1];
  if (nums.length === 3) return nums[0] * 3600 + nums[1] * 60 + nums[2];
  return NaN;
}

function formatPace(secPerKm) {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return '--:--/km';
  const totalDecis = Math.round(secPerKm * 10);
  const decis = totalDecis % 10;
  const totalSeconds = Math.floor(totalDecis / 10);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  const pad2 = (n) => String(n).padStart(2, '0');
  return `${minutes}:${pad2(seconds)}.${decis}/km`;
}

function formatSpeed(kmh) {
  if (!Number.isFinite(kmh) || kmh <= 0) return '-- km/h';
  return `${kmh.toFixed(2)} km/h`;
}

function computePaceRow(row) {
  const distance = Number(row.querySelector('.pace-distance').value);
  const timeSec = parsePaceTime(row.querySelector('.pace-time').value);
  const valid = distance > 0 && Number.isFinite(timeSec) && timeSec > 0;
  const paceSecPerKm = valid ? (timeSec / distance) * 1000 : NaN;
  const speedKmh = valid ? (distance / 1000 / timeSec) * 3600 : NaN;
  row.querySelector('.pace-pace-value').textContent = formatPace(paceSecPerKm);
  row.querySelector('.pace-speed-value').textContent = formatSpeed(speedKmh);
}

function addPaceRow(distance = '', time = '') {
  const node = el.paceRowTemplate.content.firstElementChild.cloneNode(true);
  const distanceInput = node.querySelector('.pace-distance');
  const timeInput = node.querySelector('.pace-time');
  distanceInput.value = distance;
  timeInput.value = time;
  distanceInput.addEventListener('input', () => computePaceRow(node));
  timeInput.addEventListener('input', () => computePaceRow(node));
  node.querySelector('.pace-remove').addEventListener('click', () => node.remove());
  el.paceRows.appendChild(node);
  computePaceRow(node);
}

el.paceAddRowBtn.addEventListener('click', () => addPaceRow());

addPaceRow();

/* ---------- Preset-pace time table ---------- */
// The reverse direction from the calculator above: fixed common paces, and
// the distance is the only thing you type — every row's time updates the
// instant it changes.
function formatDuration(sec) {
  if (!Number.isFinite(sec) || sec <= 0) return '--:--';
  const totalDecis = Math.round(sec * 10);
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

function renderPresetPaceTable() {
  const distance = Number(el.presetDistanceInput.value);
  const valid = distance > 0;
  el.presetPaceRows.forEach((row) => {
    const paceSecPerKm = Number(row.dataset.paceSec);
    const timeSec = valid ? paceSecPerKm * (distance / 1000) : NaN;
    row.querySelector('.preset-pace-time').textContent = formatDuration(timeSec);
  });
}

el.presetDistanceInput.addEventListener('input', renderPresetPaceTable);

/* ---------- Press feedback ---------- */
// Vibration API isn't supported by iOS Safari (as of this writing), so this
// is a no-op there — but it works on Android/Chrome, and costs nothing to
// have in place.
document.addEventListener('click', (e) => {
  if (e.target.closest('button') && 'vibrate' in navigator) {
    navigator.vibrate(15);
  }
});

// Visual stand-in for the missing haptic buzz on iOS: applied on pointerdown
// (not click) so it's instant, and cleared on pointerup/cancel anywhere —
// not just over the same button — in case a finger slides off before lifting.
document.addEventListener('pointerdown', (e) => {
  const btn = e.target.closest('button');
  if (btn && !btn.disabled) btn.classList.add('is-pressed');
});
function clearPressedButtons() {
  document.querySelectorAll('.is-pressed').forEach((btn) => btn.classList.remove('is-pressed'));
}
document.addEventListener('pointerup', clearPressedButtons);
document.addEventListener('pointercancel', clearPressedButtons);

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

// Rebuilds a family's page dots to match its current card count (none for a
// lone parent), and wires each dot to swipe its card into view on tap.
function updateFamilyDots(group) {
  const track = group.querySelector('.family-track');
  const dotsContainer = group.querySelector('.family-dots');
  const cards = Array.from(track.children);
  dotsContainer.innerHTML = '';
  if (cards.length <= 1) return;
  cards.forEach((card, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'family-dot';
    dot.setAttribute('aria-label', `${i + 1} / ${cards.length}`);
    dot.addEventListener('click', () => {
      card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    });
    dotsContainer.appendChild(dot);
  });
  syncFamilyDots(group);
}

// Highlights whichever dot matches the card currently snapped into view.
function syncFamilyDots(group) {
  const track = group.querySelector('.family-track');
  const dots = group.querySelector('.family-dots').children;
  if (dots.length === 0 || track.clientWidth === 0) return;
  const index = Math.round(track.scrollLeft / track.clientWidth);
  Array.from(dots).forEach((dot, i) => dot.classList.toggle('is-active', i === index));
}

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
    const track = document.createElement('div');
    track.className = 'family-track';
    const dots = document.createElement('div');
    dots.className = 'family-dots';
    track.addEventListener('scroll', () => syncFamilyDots(group));
    group.appendChild(track);
    group.appendChild(dots);
    el.stopwatchList.appendChild(group);
    familyGroups.set(rootId, group);
  }
  group.querySelector('.family-track').appendChild(node);
  updateFamilyDots(group);

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
  if (group) {
    const track = group.querySelector('.family-track');
    if (track.children.length === 0) {
      group.remove();
      familyGroups.delete(rootId);
    } else {
      track.scrollTo({ left: 0 });
      updateFamilyDots(group);
    }
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
const VISIBLE_RECORD_COUNT = 0;

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

/* ---------- Level-crossing safety calculator (山試走) ---------- */
// Clock time ("7:21") -> seconds since midnight. Distinct from parsePaceTime
// (a duration parser reused below for the fastest/slowest fields) because
// a bare "H:MM" here means hours:minutes, not minutes:seconds.
function parseClockTime(str) {
  const s = String(str).trim();
  if (!s) return NaN;
  const parts = s.split(':');
  if (parts.length < 2 || parts.length > 3) return NaN;
  const nums = parts.map(Number);
  if (nums.some((n) => Number.isNaN(n))) return NaN;
  return nums.length === 2 ? nums[0] * 3600 + nums[1] * 60 : nums[0] * 3600 + nums[1] * 60 + nums[2];
}

function formatClockTime(totalSeconds) {
  if (!Number.isFinite(totalSeconds)) return '--:--';
  let secs = Math.round(totalSeconds);
  secs = ((secs % 86400) + 86400) % 86400;
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;
  const pad2 = (n) => String(n).padStart(2, '0');
  return seconds > 0 ? `${hours}:${pad2(minutes)}:${pad2(seconds)}` : `${hours}:${pad2(minutes)}`;
}

// Closure formula confirmed against two observed trains: a 小涌谷→宮ノ下
// train closes the crossing [発-2分, 着-2分]; a 宮ノ下→小涌谷 train closes
// it [発+1分, 着]. Given a runner's fastest/slowest start→crossing time,
// the corresponding "avoid starting in this window" range is
// [closureStart - slowest, closureEnd - fastest] — algebraically, that's
// exactly the set of start times whose [start+fastest, start+slowest]
// arrival-at-crossing window overlaps the closure.
function computeTrainRow(row, fastestSec, slowestSec) {
  const dir = row.querySelector('.train-direction').value;
  const depSec = parseClockTime(row.querySelector('.train-dep').value);
  const arrSec = parseClockTime(row.querySelector('.train-arr').value);
  const closureEl = row.querySelector('.train-closure');
  const avoidEl = row.querySelector('.train-avoid');

  if (!Number.isFinite(depSec) || !Number.isFinite(arrSec)) {
    closureEl.textContent = '--';
    avoidEl.textContent = '--';
    return null;
  }

  const closureStart = dir === 'AtoB' ? depSec - 120 : depSec + 60;
  const closureEnd = dir === 'AtoB' ? arrSec - 120 : arrSec;
  closureEl.textContent = `${formatClockTime(closureStart)}〜${formatClockTime(closureEnd)}`;

  if (!Number.isFinite(fastestSec) || !Number.isFinite(slowestSec)) {
    avoidEl.textContent = '--';
    return null;
  }
  const unsafeStart = closureStart - slowestSec;
  const unsafeEnd = closureEnd - fastestSec;
  avoidEl.textContent = `${formatClockTime(unsafeStart)}〜${formatClockTime(unsafeEnd)}`;
  return [unsafeStart, unsafeEnd];
}

function mergeIntervals(intervals) {
  if (intervals.length === 0) return [];
  const sorted = intervals.map((iv) => iv.slice()).sort((a, b) => a[0] - b[0]);
  const merged = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const [s, e] = sorted[i];
    if (s <= last[1]) {
      last[1] = Math.max(last[1], e);
    } else {
      merged.push([s, e]);
    }
  }
  return merged;
}

function renderCrossingSummary(card, unsafeWindows) {
  const resultEl = card.querySelector('.crossing-result');
  const rangeStart = parseClockTime(card.querySelector('.search-start').value);
  const rangeEnd = parseClockTime(card.querySelector('.search-end').value);
  if (!Number.isFinite(rangeStart) || !Number.isFinite(rangeEnd) || rangeEnd <= rangeStart) {
    resultEl.innerHTML = '<p class="pace-desc">検索範囲(開始・終了)を正しく入力してください。</p>';
    return;
  }

  const merged = mergeIntervals(unsafeWindows)
    .map(([s, e]) => [Math.max(s, rangeStart), Math.min(e, rangeEnd)])
    .filter(([s, e]) => s < e);

  const safeRanges = [];
  let cursor = rangeStart;
  merged.forEach(([s, e]) => {
    if (s > cursor) safeRanges.push([cursor, s]);
    cursor = Math.max(cursor, e);
  });
  if (cursor < rangeEnd) safeRanges.push([cursor, rangeEnd]);

  const dangerHtml = merged.length
    ? merged.map(([s, e]) => `<li class="crossing-danger">${formatClockTime(s)}〜${formatClockTime(e)} は避ける</li>`).join('')
    : '<li class="crossing-safe">この範囲に踏切の危険はありません</li>';
  const safeHtml = safeRanges.length
    ? safeRanges.map(([s, e]) => `<li class="crossing-safe">${formatClockTime(s)}〜${formatClockTime(e)} はスタート可</li>`).join('')
    : '<li class="crossing-danger">この範囲内に安全なスタート時刻はありません</li>';

  resultEl.innerHTML = `
    <p class="pace-metric-label">スタートを避けるべき時間帯</p>
    <ul class="crossing-list">${dangerHtml}</ul>
    <p class="pace-metric-label">安全にスタートできる時間帯</p>
    <ul class="crossing-list">${safeHtml}</ul>
  `;
}

function computeCrossingCard(card) {
  const fastestSec = parsePaceTime(card.querySelector('.crossing-fastest').value);
  const slowestSec = parsePaceTime(card.querySelector('.crossing-slowest').value);
  const unsafeWindows = [];
  card.querySelectorAll('.train-row').forEach((row) => {
    const win = computeTrainRow(row, fastestSec, slowestSec);
    if (win) unsafeWindows.push(win);
  });
  renderCrossingSummary(card, unsafeWindows);
}

function addTrainRow(card, direction, dep, arr) {
  const node = el.trainRowTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector('.train-direction').value = direction;
  node.querySelector('.train-dep').value = dep;
  node.querySelector('.train-arr').value = arr;
  const recompute = () => computeCrossingCard(card);
  node.querySelector('.train-direction').addEventListener('change', recompute);
  node.querySelector('.train-dep').addEventListener('input', recompute);
  node.querySelector('.train-arr').addEventListener('input', recompute);
  node.querySelector('.train-remove').addEventListener('click', () => {
    node.remove();
    recompute();
  });
  card.querySelector('.train-rows').appendChild(node);
}

el.crossingCards.forEach((card) => {
  const recompute = () => computeCrossingCard(card);
  card.querySelector('.crossing-fastest').addEventListener('input', recompute);
  card.querySelector('.crossing-slowest').addEventListener('input', recompute);
  card.querySelector('.search-start').addEventListener('input', recompute);
  card.querySelector('.search-end').addEventListener('input', recompute);
  card.querySelector('.add-train-btn').addEventListener('click', () => {
    addTrainRow(card, 'AtoB', '', '');
    recompute();
  });
  // Both directions share the same observed pair of trains as a starting example.
  addTrainRow(card, 'AtoB', '7:21', '7:26');
  addTrainRow(card, 'BtoA', '7:26', '7:31');
  computeCrossingCard(card);
});

/* ---------- Stretch-count timer (ストレッチ) ---------- */
// Flattened from the team's cue sheet: every 30-second segment gets its own
// entry, in the order the manager reads them aloud. "group" is the short
// name shown big; "speech" is the exact line to say when that segment starts.
// "speech" is the full on-screen cue (kanji + furigana + stage directions,
// e.g. "(選手が体制を変えたらウォッチ押す)") — useful reference text for the
// manager. "voice" is what's actually spoken aloud: kana readings in place
// of kanji (verified against anatomical-term sources) so it's pronounced
// correctly, with stage directions and asides dropped since those are
// instructions for the manager, not part of the spoken cue itself.
const STRETCH_STEPS = [
  { group: '下後鋸筋', speech: '下後鋸筋(かこうきょきん)行きます、よーいはじめ', voice: 'かこうきょきん、行きます。よーいはじめ' },
  { group: '下後鋸筋(反対)', speech: '反対、よーいはじめ', voice: '反対、よーいはじめ' },

  { group: '大臀筋', speech: '次、大臀筋(だいでんきん)(選手が体制を変えたらよーいはじめ)', voice: '次、だいでんきん' },
  { group: '大臀筋(反対)', speech: '反対、よーいはじめ', voice: '反対、よーいはじめ' },

  { group: '梨状筋', speech: '次、梨状筋(りじょうきん)(選手が体制を変えたらウォッチ押す)', voice: '次、りじょうきん' },
  { group: '梨状筋(反対)', speech: '反対', voice: '反対' },

  { group: '中臀筋', speech: '次、中臀筋(ちゅうでんきん)(選手が体制を変えたらウォッチ押す)', voice: '次、ちゅうでんきん' },
  { group: '中臀筋(反対)', speech: '反対', voice: '反対' },

  { group: '大腿筋膜張筋', speech: '次、大腿筋膜張筋(だいたいきんまくちょうきん)(選手が体制を変えたらウォッチ押す)', voice: '次、だいたいきんまくちょうきん' },
  { group: '大腿筋膜張筋(反対)', speech: '反対', voice: '反対' },

  { group: 'ハム', speech: '次、ハム(選手が体制を変えたらウォッチ押す)', voice: '次、ハム' },
  { group: 'ハム(内側)', speech: '内側', voice: '内側' },
  { group: 'ハム(外側)', speech: '外側', voice: '外側' },
  { group: 'ハム(反対)', speech: '反対', voice: '反対' },
  { group: 'ハム(反対・内側)', speech: '内側', voice: '内側' },
  { group: 'ハム(反対・外側)', speech: '外側', voice: '外側' },

  { group: '内転筋', speech: '次、内転筋(ないてんきん)(選手が体制を変えたらウォッチ押す) ※補強のサーキットなどで内転筋をした場合とばす', voice: '次、ないてんきん' },
  { group: '内転筋(反対)', speech: '反対', voice: '反対' },

  { group: '腸骨筋', speech: '次、腸骨筋(ちょうこつきん)(選手が体制を変えたらウォッチ押す)', voice: '次、ちょうこつきん' },
  { group: '腸骨筋(大腰筋)', speech: '大腰筋(だいようきん)', voice: 'だいようきん' },

  { group: '反対・腸骨筋', speech: '次、反対、腸骨筋(ちょうこつきん)(選手が体制を変えたらウォッチ押す)', voice: '次、反対、ちょうこつきん' },
  { group: '反対・腸骨筋(大腰筋)', speech: '大腰筋', voice: 'だいようきん' },

  { group: '大腿四頭筋', speech: '次、大腿四頭筋(だいたいしとうきん)(選手が体制を変えたらウォッチ押す)', voice: '次、だいたいしとうきん' },
  { group: '大腿四頭筋(反対)', speech: '反対', voice: '反対' },

  { group: '腓骨筋', speech: '次、腓骨筋(ひこつきん)(選手が体制を変えたらウォッチ押す)', voice: '次、ひこつきん' },
  { group: '腓骨筋(後脛骨筋)', speech: '後脛骨筋(こうけいこつきん)', voice: 'こうけいこつきん' },
  { group: '腓骨筋(反対)', speech: '反対、腓骨筋', voice: '反対、ひこつきん' },
  { group: '腓骨筋(反対・後脛骨筋)', speech: '後脛骨筋(こうけいこつきん)', voice: 'こうけいこつきん' },

  { group: '足底', speech: '次、足底(そくてい)(選手が体制を変えたらウォッチ押す)', voice: '次、そくてい' },

  { group: '腓腹筋', speech: '次、腓腹筋(ひふくきん)(選手が体制を変えたらウォッチ押す)', voice: '次、ひふくきん' },
  { group: '腓腹筋(ヒラメ筋)', speech: 'ヒラメ筋(ひらめきん) ※2024夏合宿よりつま先内側廃止', voice: 'ひらめきん' },
  { group: '腓腹筋(反対)', speech: '反対腓腹筋(ひふくきん)', voice: '反対、ひふくきん' },
  { group: '腓腹筋(反対・ヒラメ筋)', speech: 'ヒラメ筋(ひらめきん) ※2024夏合宿よりつま先内側廃止', voice: 'ひらめきん' },

  { group: '前脛骨筋', speech: '次、前脛骨筋(ぜんけいこつきん)(選手が体制を変えたらウォッチ押す)', voice: '次、ぜんけいこつきん' },
  { group: '前脛骨筋(反対)', speech: '反対', voice: '反対' },
  { group: '前脛骨筋(終わり)', speech: '終わりです', voice: '終わりです' },
];

const STRETCH_STEP_MS = 30000;

/* ---------- Reinforcement training menus (補強) ---------- */
// Same "group / speech / voice" shape as STRETCH_STEPS (see comment above),
// plus "spec" (the reps/count description shown for reference, e.g. "10回4
// カウント") and "durationSec": a number for steps with an explicit fixed
// duration (auto-counts and auto-stops, like the stretch timer), or null for
// rep/count-based steps with no real clock duration (the manager decides
// when to advance — see startNextReinforceStep). Menus other than フル are
// added as their content is provided; an empty array just shows as "準備中".
const REINFORCE_MENUS = {
  フル: [
    { group: '【1】膝立て', spec: '10回4カウント', speech: '膝立ていきます、よーいはじめ', voice: '膝立ていきます、よーいはじめ', durationSec: null },
    { group: '【2】膝伸ばし', spec: '10回4カウント', speech: '膝伸ばしいきます、よーいはじめ', voice: '膝伸ばしいきます、よーいはじめ', durationSec: null },
    { group: '【3】バンザイ', spec: '10回4カウント', speech: 'バンザイいきます、よーいはじめ', voice: 'バンザイいきます、よーいはじめ', durationSec: null },
    { group: '【4】四つん這い', spec: '10回4カウント', speech: '四つん這いいきます、よーいはじめ', voice: '四つん這いいきます、よーいはじめ', durationSec: null },
    { group: '【5】プランク', spec: '10回4カウント', speech: 'プランクいきます、よーいはじめ', voice: 'プランクいきます、よーいはじめ', durationSec: null },
    { group: '【6】プランク(各自)', spec: '8回4カウント', speech: 'プランク各自いきます、よーいはじめ', voice: 'プランク各自いきます、よーいはじめ', durationSec: null },

    { group: '【7】ダイアゴナル(縦横)', spec: '40秒', speech: 'ダイアゴナル縦横40秒ずついきます、よーいはじめ', voice: 'ダイアゴナル縦横40秒ずついきます、よーいはじめ', durationSec: 40 },
    { group: '【7】ダイアゴナル(反対)', spec: '40秒', speech: '反対いきます、よーいはじめ', voice: '反対いきます、よーいはじめ', durationSec: 40 },
    { group: '【7】ダイアゴナル(サイド)', spec: '40秒', speech: 'サイドいきます、よーいはじめ', voice: 'サイドいきます、よーいはじめ', durationSec: 40 },
    { group: '【7】ダイアゴナル(反対)', spec: '40秒', speech: '反対いきます、よーいはじめ', voice: '反対いきます、よーいはじめ', durationSec: 40 },

    { group: '【8】L字傾け', spec: '8回4カウント×4(一拍空ける)', speech: 'L字傾けいきます、よーいはじめ', voice: 'L字傾けいきます、よーいはじめ', durationSec: null },
    { group: '【9】L字腕振り', spec: '60秒', speech: 'L字腕振りいきます、よーいはじめ', voice: 'L字腕振りいきます、よーいはじめ', durationSec: 60 },

    { group: '【10】上体起こし', spec: '4回4カウント×5', speech: '上体起こしいきます、よーいはじめ', voice: '上体起こしいきます、よーいはじめ', durationSec: null },
    { group: '【10】上体起こし(反対)', spec: '4回4カウント×5', speech: '反対', voice: '反対', durationSec: null },

    { group: '【11】ストレッチ', spec: '30秒', speech: 'ストレッチいきます、よーいはじめ', voice: 'ストレッチいきます、よーいはじめ', durationSec: 30 },
    { group: '【11】ストレッチ(脊柱起立筋)', spec: '30秒', speech: '次、脊柱起立筋(30秒)いきます、よーいはじめ', voice: '次、せきちゅうきりつきん、いきます、よーいはじめ', durationSec: 30 },

    { group: '※2人組になる', spec: '', speech: '2人組になってください', voice: '2人組になってください', durationSec: null },

    { group: '【12.14】2人組腹斜筋', spec: '各10回4カウント×2', speech: '2人組腹斜筋いきます、外腹斜筋を意識してください、よーいはじめ', voice: '2人組腹斜筋いきます、外腹斜筋を意識してください、よーいはじめ', durationSec: null },
    { group: '【12.14】2人組腹斜筋(反対)', spec: '各10回4カウント×2', speech: '反対', voice: '反対', durationSec: null },

    { group: '【13.15】スリップボード', spec: '45秒', speech: 'スリップボードいきます、バックラインを意識してください、よーいはじめ', voice: 'スリップボードいきます、バックラインを意識してください、よーいはじめ', durationSec: 45 },

    { group: '※2人組交代', spec: '腹斜筋に戻る', speech: '交代してください', voice: '交代してください', durationSec: null },

    { group: '【16】ショートV', spec: '(1人で行う)10回4カウント×2', speech: 'ショートVいきます、外腹斜筋と内転筋を意識してください、よーいはじめ', voice: 'ショートVいきます、外腹斜筋と内転筋を意識してください、よーいはじめ', durationSec: null },
    { group: '【16】ショートV(反対)', spec: '(1人で行う)10回4カウント×2', speech: '反対', voice: '反対', durationSec: null },

    { group: '【17】レッグダウン', spec: '(2人組)各8回4カウント+あげて', speech: 'レッグダウンいきます、外腹斜筋と内転筋を意識してください、よーいはじめ', voice: 'レッグダウンいきます、外腹斜筋と内転筋を意識してください、よーいはじめ', durationSec: null },
    { group: '【17】レッグダウン(反対)', spec: '(2人組)各8回4カウント+あげて', speech: '反対', voice: '反対', durationSec: null },
    { group: '【17】レッグダウン(交代)', spec: '', speech: '交代', voice: '交代', durationSec: null },

    { group: '【18】ストレッチ', spec: '30秒×2(1人で行う)', speech: 'ストレッチいきます、よーいはじめ', voice: 'ストレッチいきます、よーいはじめ', durationSec: 30 },
    { group: '【18】ストレッチ(反対)', spec: '30秒×2(1人で行う)', speech: '反対', voice: '反対', durationSec: 30 },

    { group: '【19】前鋸筋', spec: '(1人で行う)各20回4カウント×2', speech: '前鋸筋いきます、よーいはじめ', voice: '前鋸筋いきます、よーいはじめ', durationSec: null },
    { group: '【19】前鋸筋(反対)', spec: '(1人で行う)各20回4カウント×2', speech: '反対', voice: '反対', durationSec: null },

    { group: '【20】下後鋸筋', spec: '(2人組)各自30回・全員終わるまで待つ', speech: '下後鋸筋いきます', voice: '下後鋸筋いきます', durationSec: null },

    { group: '【21】ストレッチ', spec: '30秒×2(以降1人で行う)', speech: 'ストレッチいきます、よーいはじめ', voice: 'ストレッチいきます、よーいはじめ', durationSec: 30 },
    { group: '【21】ストレッチ(反対)', spec: '30秒×2(以降1人で行う)', speech: '反対', voice: '反対', durationSec: 30 },

    { group: '【22】アップ', spec: 'なるべく上級生の動きに合わせて', speech: 'アップいきます、よーいはじめ', voice: 'アップいきます、よーいはじめ', durationSec: null },

    { group: '【23】サーキット①腕振り(1/2セット)', spec: '10カウント', speech: 'サーキット右手下からいきます、(選手がコア入れたのを確認してから)よーいはじめ', voice: 'サーキット右手下からいきます、よーいはじめ', durationSec: null },
    { group: '【23】サーキット②(1/2セット)', spec: '10カウント', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【23】サーキット③腕をたたむ(1/2セット)', spec: '10回4カウント×2', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【23】サーキット④サイドバキューム(1/2セット)', spec: '6回4カウント×2', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【23】サーキット⑤サイドプランクアブダクション(1/2セット)', spec: '10カウント', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【23】サーキット⑥ジャックナイフ(1/2セット)', spec: '10回4カウント×2', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },

    { group: '【23】サーキット①腕振り(2/2セット)', spec: '10カウント', speech: 'サーキット右手下からいきます、(選手がコア入れたのを確認してから)よーいはじめ', voice: 'サーキット右手下からいきます、よーいはじめ', durationSec: null },
    { group: '【23】サーキット②(2/2セット)', spec: '10カウント', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【23】サーキット③腕をたたむ(2/2セット)', spec: '10回4カウント×2', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【23】サーキット④サイドバキューム(2/2セット)', spec: '6回4カウント×2', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【23】サーキット⑤サイドプランクアブダクション(2/2セット)', spec: '10カウント', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
    { group: '【23】サーキット⑥ジャックナイフ(2/2セット)', spec: '10回4カウント×2', speech: 'よーいはじめ', voice: 'よーいはじめ', durationSec: null },
  ],
  コアA: [],
  コアB: [],
  ループ: [],
  下肢: [],
};
const REINFORCE_MENU_ORDER = ['フル', 'コアA', 'コアB', 'ループ', '下肢'];

let stretchIndex = -1; // -1 = not started yet
let stretchRunning = false;
let stretchElapsedMs = 0; // accumulated time for the current step, while paused/stopped
let stretchStartEpoch = 0; // epoch when the current running span began

// Reads each step's cue aloud (via speechSynthesis or a recording — see
// below) so the manager doesn't have to read it themselves. Shared between
// the ストレッチ and 補強 tabs — both drive the same voice/recording engine.
let voiceEnabled = true;

// The Web Speech API can only use voices the browser itself exposes to
// speechSynthesis.getVoices() — on iOS Safari that's a small, fixed list
// that does NOT track the system "Spoken Content" voice chosen in
// Settings > Accessibility (that setting only affects VoiceOver/Speak
// Screen, not web pages). So instead of guessing, let the user see exactly
// what's available in THIS browser and pick directly, with a live preview.
// ストレッチ・補強はそれぞれ完全に独立した録音プールを持つため(同じ
// 「反対」でも別収録として扱う)、選んだ声もタブごとに別々に覚えておく。
const CATEGORIES = ['stretch', 'reinforce'];
const selectedVoiceURIByCategory = { stretch: null, reinforce: null };

// Recordings are grouped into named "sets" (e.g. one per coach) so several
// complete recordings can coexist and be switched between for playback,
// rather than the whole team sharing one anonymous pool. Selecting a set's
// entry in the dropdown, listed below the synthesized voices, switches
// playback to that set's recorded human audio (this device's own copy,
// falling back to the team's shared copy) instead of speechSynthesis. The
// value format is "recorded:<set name>". Sets are also scoped per category
// for the same reason the voice choice is.
const DEFAULT_SET_NAME = '個人利用音声'; // pre-existing recordings from before sets existed; local-only, never shared
const RECORDED_VOICE_PREFIX = 'recorded:';
const knownSetsByCategory = {
  stretch: new Set([DEFAULT_SET_NAME]),
  reinforce: new Set([DEFAULT_SET_NAME]),
}; // every set name seen so far in each category, local or shared
const activeRecordingSetIdByCategory = { stretch: DEFAULT_SET_NAME, reinforce: DEFAULT_SET_NAME }; // which set each category's recordings modal is currently viewing/recording into
let activeRecordingCategory = 'stretch'; // which category's recordings modal is currently open

function recordedVoiceValue(setName) {
  return RECORDED_VOICE_PREFIX + setName;
}
function isRecordedVoiceValue(value) {
  return typeof value === 'string' && value.startsWith(RECORDED_VOICE_PREFIX);
}
function setNameFromVoiceValue(value) {
  return value.slice(RECORDED_VOICE_PREFIX.length);
}

const voiceSelectByCategory = { stretch: el.stretchVoiceSelect, reinforce: el.reinforceVoiceSelect };
const voiceToggles = [el.stretchVoiceToggle, el.reinforceVoiceToggle].filter(Boolean); // mute is one shared, device-wide setting

function populateVoiceSelect(category) {
  const select = voiceSelectByCategory[category];
  if (!select) return;

  const voices = 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : [];
  const jaVoices = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('ja'));
  const list = jaVoices.length > 0 ? jaVoices : voices;
  const knownSets = knownSetsByCategory[category];

  let selected = selectedVoiceURIByCategory[category];
  if (isRecordedVoiceValue(selected)) {
    if (!knownSets.has(setNameFromVoiceValue(selected))) {
      selected = recordedVoiceValue(DEFAULT_SET_NAME); // its set was deleted — fall back to the default set
    }
  } else {
    const stillAvailable = selected && list.some((v) => v.voiceURI === selected);
    if (!stillAvailable) {
      if (list.length > 0) {
        const preferred = list.find((v) => /premium|enhanced|neural|siri/i.test(v.name)) || list[0];
        selected = preferred.voiceURI;
      } else {
        selected = recordedVoiceValue(DEFAULT_SET_NAME); // no synthesized voice available at all — recordings are the only option
      }
    }
  }
  selectedVoiceURIByCategory[category] = selected;

  select.innerHTML = '';
  select.disabled = false;
  list.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v.voiceURI;
    opt.textContent = `${v.name} (${v.lang})`;
    select.appendChild(opt);
  });
  knownSets.forEach((setName) => {
    const opt = document.createElement('option');
    opt.value = recordedVoiceValue(setName);
    opt.textContent = `🎙 ${setName}`;
    select.appendChild(opt);
  });
  select.value = selected;
}

function populateAllVoiceSelects() {
  CATEGORIES.forEach(populateVoiceSelect);
}

if ('speechSynthesis' in window) {
  populateAllVoiceSelects();
  window.speechSynthesis.addEventListener('voiceschanged', populateAllVoiceSelects);
} else {
  populateAllVoiceSelects(); // still offers the recorded-voice option even with no TTS at all
}

CATEGORIES.forEach((category) => {
  const select = voiceSelectByCategory[category];
  if (!select) return;
  select.addEventListener('change', () => {
    selectedVoiceURIByCategory[category] = select.value;
    announceCue(category, 'これはテストの音声です');
  });
});

function speakCue(category, text) {
  if (!voiceEnabled || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel(); // don't let a fast "次へ" tap queue up overlapping lines
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  const voiceURI = selectedVoiceURIByCategory[category];
  const voice = window.speechSynthesis.getVoices().find((v) => v.voiceURI === voiceURI);
  if (voice) utterance.voice = voice;
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

function renderVoiceToggle() {
  voiceToggles.forEach((toggle) => {
    toggle.classList.toggle('is-muted', !voiceEnabled);
    toggle.textContent = voiceEnabled ? '🔊 音声' : '🔇 音声';
  });
}

voiceToggles.forEach((toggle) => {
  toggle.addEventListener('click', () => {
    voiceEnabled = !voiceEnabled;
    if (!voiceEnabled) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      stopAnyPlayback();
    }
    renderVoiceToggle();
  });
});
renderVoiceToggle();

/* ---------- Cue recordings (自分の声で録音) ---------- */
// Lets the manager record their own voice for each cue instead of relying on
// speechSynthesis. Recordings are saved as audio Blobs in IndexedDB, the only
// persistent storage in this app — everything else here is deliberately
// stateless, but there's no other way to keep a recording across reloads.
//
// ストレッチと補強は完全に独立したタイマーで、同じ「反対」という言葉でも
// 別の収録として扱いたいという要望から、あらゆる録音データは
// (category, setName, text) の3つ組で管理される。category は 'stretch' か
// 'reinforce'。recordingsMap/sharedRecordingsMapは Map<"category setName", Map<text, ...>>
// という2階層構造で、外側キーをmapKey()で組み立てて既存のnested*ヘルパーを
// そのまま使い回す。
const RECORDINGS_DB_NAME = 'stretchRecordings';
const RECORDINGS_STORE_NAME = 'recordings';
const recordingSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
const recordingsMap = new Map(); // mapKey(category, setName) -> Map<text, Blob> (this device's own recordings, in IndexedDB)
let currentPlaybackAudio = null;
let activeRecording = null; // { category, setName, id, recorder, stream, chunks } while recording is in progress

function mapKey(category, setName) {
  return `${category} ${setName}`;
}
function nestedGet(map, outerKey, innerKey) {
  const inner = map.get(outerKey);
  return inner ? inner.get(innerKey) : undefined;
}
function nestedHas(map, outerKey, innerKey) {
  const inner = map.get(outerKey);
  return !!inner && inner.has(innerKey);
}
function nestedSet(map, outerKey, innerKey, value) {
  if (!map.has(outerKey)) map.set(outerKey, new Map());
  map.get(outerKey).set(innerKey, value);
}
function nestedDelete(map, outerKey, innerKey) {
  const inner = map.get(outerKey);
  if (inner) inner.delete(innerKey);
}

// Recordings can also be shared with the whole team via a small API hosted
// alongside the trainer's separate knowledge-base site (itonomaki), which
// already has FTP access to their Xserver hosting for storing files. Listing
// is public; uploading/deleting needs a shared token (entered once, kept in
// this browser's localStorage — never committed to source, unlike the
// server-side FTP credentials it ultimately relies on).
const SHARED_AUDIO_API_URL = 'https://itonomaki-55ve.vercel.app/api/stretch-audio';
const SHARED_AUDIO_TOKEN_KEY = 'stretchAudioToken';
const sharedRecordingsMap = new Map(); // mapKey(category, setName) -> Map<text, url>

function getStoredAudioToken() {
  try {
    return localStorage.getItem(SHARED_AUDIO_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

function promptForAudioToken() {
  const input = prompt('チーム共有のアップロード用の合言葉を入力してください(この端末に保存され、次回からは聞かれません)');
  const token = input ? input.trim() : '';
  if (token) {
    try {
      localStorage.setItem(SHARED_AUDIO_TOKEN_KEY, token);
    } catch {
      /* localStorage unavailable (private browsing etc.) — just skip sharing this once */
    }
  }
  return token;
}

async function loadSharedRecordings() {
  try {
    const res = await fetch(SHARED_AUDIO_API_URL, { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    sharedRecordingsMap.clear();
    (data.items || []).forEach((item) => {
      if (!item || !item.text || !item.url) return;
      const category = item.category === 'reinforce' ? 'reinforce' : 'stretch';
      const setName = item.setName || DEFAULT_SET_NAME;
      knownSetsByCategory[category].add(setName);
      nestedSet(sharedRecordingsMap, mapKey(category, setName), item.text, item.url);
    });
  } catch {
    // Offline, or the shared server is unreachable — local recordings and
    // speech synthesis still work fine without it.
  }
}

async function uploadRecordingToServer(category, setName, text, blob, allowRetry = true) {
  let token = getStoredAudioToken();
  if (!token) token = promptForAudioToken();
  if (!token) return false; // declined to enter one — recording stays local-only

  const form = new FormData();
  form.append('file', blob, 'cue');
  form.append('text', text);
  form.append('setName', setName);
  form.append('category', category);
  try {
    const res = await fetch(SHARED_AUDIO_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (res.status === 401) {
      try {
        localStorage.removeItem(SHARED_AUDIO_TOKEN_KEY);
      } catch {
        /* ignore */
      }
      if (!allowRetry) return false;
      alert('合言葉が正しくありませんでした。もう一度入力してください。');
      return uploadRecordingToServer(category, setName, text, blob, false);
    }
    if (!res.ok) return false;
    const data = await res.json();
    if (data && data.url) nestedSet(sharedRecordingsMap, mapKey(category, setName), text, data.url);
    return true;
  } catch {
    return false; // offline, etc. — local recording is still saved
  }
}

async function deleteRecordingFromServer(category, setName, text) {
  let token = getStoredAudioToken();
  if (!token) token = promptForAudioToken();
  if (!token) return false;
  try {
    const res = await fetch(
      `${SHARED_AUDIO_API_URL}?category=${encodeURIComponent(category)}&setName=${encodeURIComponent(setName)}&text=${encodeURIComponent(text)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.status === 401) {
      try {
        localStorage.removeItem(SHARED_AUDIO_TOKEN_KEY);
      } catch {
        /* ignore */
      }
      alert('合言葉が正しくありませんでした。共有からの削除はできませんでしたが、この端末からは削除されました。');
      return false;
    }
    if (!res.ok) return false;
    nestedDelete(sharedRecordingsMap, mapKey(category, setName), text);
    return true;
  } catch {
    return false;
  }
}

async function deleteSetFromServer(category, setName) {
  let token = getStoredAudioToken();
  if (!token) token = promptForAudioToken();
  if (!token) return false;
  try {
    const res = await fetch(`${SHARED_AUDIO_API_URL}?category=${encodeURIComponent(category)}&setName=${encodeURIComponent(setName)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      try {
        localStorage.removeItem(SHARED_AUDIO_TOKEN_KEY);
      } catch {
        /* ignore */
      }
      alert('合言葉が正しくありませんでした。共有からの削除はできませんでしたが、この端末からは削除されました。');
      return false;
    }
    return res.ok;
  } catch {
    return false;
  }
}

function openRecordingsDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(RECORDINGS_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(RECORDINGS_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// The IndexedDB key for a (category, set, text) triple. Recordings made
// before 補強/sets existed are stored under a plain-text key (no prefix) and
// were always ストレッチ content (補強 didn't exist yet); keeping that exact
// scheme for (category: "stretch", set: DEFAULT_SET_NAME) means those old
// recordings still load with no migration. The "|||" separator is a string
// nobody would plausibly type into a cue or a set name, so every other
// composite key stays unambiguous.
const DB_KEY_SEP = '|||';
function dbKeyFor(category, setName, text) {
  if (category === 'stretch' && setName === DEFAULT_SET_NAME) return text;
  return `${category}${DB_KEY_SEP}${setName}${DB_KEY_SEP}${text}`;
}
function parseDbKey(key) {
  const firstSep = key.indexOf(DB_KEY_SEP);
  if (firstSep === -1) return { category: 'stretch', setName: DEFAULT_SET_NAME, text: key };
  const category = key.slice(0, firstSep);
  const rest = key.slice(firstSep + DB_KEY_SEP.length);
  const secondSep = rest.indexOf(DB_KEY_SEP);
  return { category, setName: rest.slice(0, secondSep), text: rest.slice(secondSep + DB_KEY_SEP.length) };
}

async function loadAllRecordings() {
  const db = await openRecordingsDB();
  return new Promise((resolve, reject) => {
    const store = db.transaction(RECORDINGS_STORE_NAME, 'readonly').objectStore(RECORDINGS_STORE_NAME);
    const request = store.getAllKeys();
    request.onsuccess = () => {
      const keys = request.result;
      const getAll = store.getAll ? store.getAll() : null;
      if (getAll) {
        getAll.onsuccess = () => {
          keys.forEach((key, i) => {
            const { category, setName, text } = parseDbKey(key);
            if (!knownSetsByCategory[category]) return; // ignore anything from an unrecognized future category
            knownSetsByCategory[category].add(setName);
            nestedSet(recordingsMap, mapKey(category, setName), text, getAll.result[i]);
          });
          resolve();
        };
        getAll.onerror = () => reject(getAll.error);
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

async function saveRecordingToDB(category, setName, text, blob) {
  const db = await openRecordingsDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RECORDINGS_STORE_NAME, 'readwrite');
    tx.objectStore(RECORDINGS_STORE_NAME).put(blob, dbKeyFor(category, setName, text));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteRecordingFromDB(category, setName, text) {
  const db = await openRecordingsDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RECORDINGS_STORE_NAME, 'readwrite');
    tx.objectStore(RECORDINGS_STORE_NAME).delete(dbKeyFor(category, setName, text));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteSetFromDB(category, setName) {
  const db = await openRecordingsDB();
  return new Promise((resolve, reject) => {
    const store = db.transaction(RECORDINGS_STORE_NAME, 'readwrite').objectStore(RECORDINGS_STORE_NAME);
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      const parsed = parseDbKey(cursor.key);
      if (parsed.category === category && parsed.setName === setName) cursor.delete();
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}

function pickRecordingMimeType() {
  const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
  for (const type of candidates) {
    if (window.MediaRecorder.isTypeSupported && window.MediaRecorder.isTypeSupported(type)) return type;
  }
  return ''; // let the browser pick its default
}

// Groups a category's steps by their exact spoken text — "反対" alone is
// read at several different steps within a menu, "終わり" for every step's
// auto-stop, etc. — so one recording covers every step within that category
// that says the same thing, instead of making the manager record the same
// word over and over. ストレッチ and 補強 are listed completely separately
// (see the module comment above) so this only pools cues within the given
// category, never across the two.
function buildRecordingItems(category) {
  const byText = new Map(); // text -> groupNames[]
  function addStep(step) {
    if (!byText.has(step.voice)) byText.set(step.voice, []);
    byText.get(step.voice).push(step.group);
  }
  if (category === 'stretch') {
    STRETCH_STEPS.forEach(addStep);
  } else {
    Object.values(REINFORCE_MENUS).forEach((steps) => steps.forEach(addStep));
  }
  if (!byText.has('終わり')) byText.set('終わり', []);
  byText.get('終わり').push('(共通)終わりの合図');
  return Array.from(byText.entries()).map(([text, groupNames]) => ({ id: text, text, groupNames }));
}

function stopAnyPlayback() {
  if (currentPlaybackAudio) {
    currentPlaybackAudio.pause();
    currentPlaybackAudio = null;
  }
}

// Reflects the currently-open category's known sets into the modal's own
// set picker (independent of the "声を選ぶ" playback pickers — this one just
// controls which set the modal is currently viewing/recording into, via
// activeRecordingSetIdByCategory).
function populateRecordingSetSelect() {
  const category = activeRecordingCategory;
  const knownSets = knownSetsByCategory[category];
  el.recordingSetSelect.innerHTML = '';
  knownSets.forEach((setName) => {
    const opt = document.createElement('option');
    opt.value = setName;
    opt.textContent = setName;
    el.recordingSetSelect.appendChild(opt);
  });
  if (!knownSets.has(activeRecordingSetIdByCategory[category])) activeRecordingSetIdByCategory[category] = DEFAULT_SET_NAME;
  el.recordingSetSelect.value = activeRecordingSetIdByCategory[category];
  el.recordingSetDeleteBtn.disabled = activeRecordingSetIdByCategory[category] === DEFAULT_SET_NAME;
}

el.recordingSetSelect.addEventListener('change', () => {
  activeRecordingSetIdByCategory[activeRecordingCategory] = el.recordingSetSelect.value;
  el.recordingSetDeleteBtn.disabled = activeRecordingSetIdByCategory[activeRecordingCategory] === DEFAULT_SET_NAME;
  buildAllRecordingRows();
});

el.recordingSetNewBtn.addEventListener('click', () => {
  const input = prompt('新しいセットの名前を入力してください(例:田中コーチ)');
  const name = input ? input.trim() : '';
  if (!name) return;
  const category = activeRecordingCategory;
  knownSetsByCategory[category].add(name);
  activeRecordingSetIdByCategory[category] = name;
  populateRecordingSetSelect();
  populateVoiceSelect(category); // the new set should also appear as a playback choice right away
  buildAllRecordingRows();
});

el.recordingSetDeleteBtn.addEventListener('click', async () => {
  const category = activeRecordingCategory;
  const setName = activeRecordingSetIdByCategory[category];
  if (setName === DEFAULT_SET_NAME) return; // guarded by disabled state too
  if (!confirm(`セット「${setName}」の録音を全て削除します。よろしいですか?`)) return;

  const key = mapKey(category, setName);
  recordingsMap.delete(key);
  await deleteSetFromDB(category, setName);
  const hadShared = sharedRecordingsMap.has(key);
  sharedRecordingsMap.delete(key);
  knownSetsByCategory[category].delete(setName);
  if (hadShared) await deleteSetFromServer(category, setName);
  if (selectedVoiceURIByCategory[category] === recordedVoiceValue(setName)) selectedVoiceURIByCategory[category] = null; // populateVoiceSelect() re-picks a fallback

  activeRecordingSetIdByCategory[category] = DEFAULT_SET_NAME;
  populateRecordingSetSelect();
  populateVoiceSelect(category);
  buildAllRecordingRows();
});

function createRecordingRow(item) {
  const node = el.recordingRowTemplate.content.firstElementChild.cloneNode(true);
  const groupEl = node.querySelector('.recording-row-group');
  const statusEl = node.querySelector('.recording-row-status');
  const textEl = node.querySelector('.recording-row-text');
  const recordBtn = node.querySelector('.recording-record-btn');
  const playBtn = node.querySelector('.recording-play-btn');
  const deleteBtn = node.querySelector('.recording-delete-btn');

  groupEl.textContent = item.text;
  textEl.textContent = `使用箇所: ${item.groupNames.join('、')}`;

  if (!recordingSupported) {
    recordBtn.disabled = true;
    recordBtn.title = 'この端末は録音に対応していません(再生・削除は可能です)';
  }

  // Reads activeRecordingCategory/activeRecordingSetIdByCategory live (not
  // captured at row-build time) so these handlers always act on whichever
  // category+set is currently selected.
  function currentKey() {
    return mapKey(activeRecordingCategory, activeRecordingSetIdByCategory[activeRecordingCategory]);
  }
  function refreshRowStatus() {
    const key = currentKey();
    const isDefaultSet = activeRecordingSetIdByCategory[activeRecordingCategory] === DEFAULT_SET_NAME;
    const hasLocal = nestedHas(recordingsMap, key, item.id);
    const hasShared = nestedHas(sharedRecordingsMap, key, item.id);
    node.classList.toggle('is-recorded', hasLocal || hasShared);
    statusEl.textContent = hasShared ? 'チーム共有済み' : hasLocal ? (isDefaultSet ? '端末に保存済み(共有なし)' : '端末のみ(未共有)') : '未録音';
    playBtn.disabled = !(hasLocal || hasShared);
    deleteBtn.disabled = !(hasLocal || hasShared);
  }
  refreshRowStatus();

  recordBtn.addEventListener('click', () =>
    toggleRecording(activeRecordingCategory, activeRecordingSetIdByCategory[activeRecordingCategory], item.id, recordBtn, refreshRowStatus)
  );

  playBtn.addEventListener('click', () => {
    stopAnyPlayback();
    const key = currentKey();
    const blob = nestedGet(recordingsMap, key, item.id);
    if (blob) {
      const audio = new Audio(URL.createObjectURL(blob));
      currentPlaybackAudio = audio;
      audio.play().catch((err) => alert(`再生に失敗しました(端末保存分)\n${err.name}: ${err.message}`));
      return;
    }
    const url = nestedGet(sharedRecordingsMap, key, item.id);
    if (url) {
      const audio = new Audio(url);
      currentPlaybackAudio = audio;
      // 共有音声だけ、原因の切り分けができるよう詳しいエラーを表示する
      // (端末保存分と違い、ネットワーク越しの再生でここが失敗しがちなため)。
      // error イベントと play() の reject は同じ失敗で両方発火することがある
      // ので、二重アラートにならないようフラグで抑制する。
      //
      // 注意: ここで fetch() によるHEADリクエストでヘッダーを確認しようと
      // したことがあるが、<audio> 要素自体はCORSの制限を受けずに再生できる
      // 一方、fetch() は別オリジン(Xserver)への読み取りにCORSヘッダーが
      // 必要なため、無関係な"Load failed"エラーが出てしまい誤診断の原因に
      // なった。ヘッダーを確認したい場合は、このURLをブラウザで直接開いて
      // もらう(トップレベルナビゲーションはCORSの対象外)のが正しい方法。
      let alerted = false;
      audio.addEventListener('error', () => {
        if (alerted) return;
        alerted = true;
        const code = audio.error ? audio.error.code : null;
        const codeNames = { 1: 'MEDIA_ERR_ABORTED', 2: 'MEDIA_ERR_NETWORK', 3: 'MEDIA_ERR_DECODE', 4: 'MEDIA_ERR_SRC_NOT_SUPPORTED' };
        alert(`共有音声の再生に失敗しました\nURL: ${url}\nエラーコード: ${code ?? '不明'}(${codeNames[code] || '不明'})`);
      });
      audio.play().catch((err) => {
        if (alerted) return;
        alerted = true;
        alert(`共有音声の再生に失敗しました\nURL: ${url}\n${err.name}: ${err.message}`);
      });
    }
  });

  deleteBtn.addEventListener('click', async () => {
    const category = activeRecordingCategory;
    const setName = activeRecordingSetIdByCategory[category];
    const key = mapKey(category, setName);
    const hadShared = setName !== DEFAULT_SET_NAME && nestedHas(sharedRecordingsMap, key, item.id);
    nestedDelete(recordingsMap, key, item.id);
    await deleteRecordingFromDB(category, setName, item.id);
    if (hadShared) await deleteRecordingFromServer(category, setName, item.id);
    refreshRowStatus();
  });

  return node;
}

function buildAllRecordingRows() {
  el.stretchRecordingsList.innerHTML = '';
  buildRecordingItems(activeRecordingCategory).forEach((item) => {
    el.stretchRecordingsList.appendChild(createRecordingRow(item));
  });
}

async function toggleRecording(category, setName, id, btn, refreshRowStatus) {
  if (activeRecording && activeRecording.category === category && activeRecording.setName === setName && activeRecording.id === id) {
    activeRecording.recorder.stop(); // onstop handles saving + cleanup
    return;
  }
  if (activeRecording) return; // one recording at a time

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    alert('マイクを使用できませんでした。ブラウザの設定でマイクへのアクセスを許可してください。');
    return;
  }

  const mimeType = pickRecordingMimeType();
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks = [];
  recorder.addEventListener('dataavailable', (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  });
  recorder.addEventListener('stop', async () => {
    stream.getTracks().forEach((track) => track.stop());
    activeRecording = null;
    btn.classList.remove('is-recording');
    btn.textContent = '🔴 録音';
    const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
    if (blob.size > 0) {
      nestedSet(recordingsMap, mapKey(category, setName), id, blob);
      refreshRowStatus();
      await saveRecordingToDB(category, setName, id, blob);

      // 個人利用音声は端末のみに保存し、チーム共有はしない仕様。
      if (setName !== DEFAULT_SET_NAME) {
        btn.disabled = true;
        btn.textContent = '☁️ 共有中…';
        const uploaded = await uploadRecordingToServer(category, setName, id, blob);
        btn.disabled = false;
        btn.textContent = '🔴 録音';
        refreshRowStatus();
        if (!uploaded) {
          alert('チームへの共有アップロードに失敗しました(この端末には保存されています)。通信状況を確認して、もう一度「🔴 録音」を押すと再試行できます。');
        }
      }
    }
  });

  activeRecording = { category, setName, id, recorder, stream, chunks };
  btn.classList.add('is-recording');
  btn.textContent = '⏹ 停止';
  recorder.start();
}

// Only used when the given category's selected voice is a "🎙 <セット名>"
// entry: prefers this device's own recording (in that category+set) for the
// exact cue text, then the team's shared recording (same category+set),
// falling back to speechSynthesis if neither exists. Any TTS voice always
// speaks via speechSynthesis, ignoring recordings entirely. Recordings are
// keyed by the spoken text itself, so every step within a category that
// says e.g. "反対" shares one recording within a set automatically — but
// ストレッチ and 補強 never share recordings with each other, even for the
// exact same word (see the module comment above).
function announceCue(category, text) {
  if (!voiceEnabled) return;
  stopAnyPlayback();
  const selectedVoiceURI = selectedVoiceURIByCategory[category];
  if (isRecordedVoiceValue(selectedVoiceURI)) {
    const setName = setNameFromVoiceValue(selectedVoiceURI);
    const key = mapKey(category, setName);
    const blob = nestedGet(recordingsMap, key, text);
    if (blob) {
      const audio = new Audio(URL.createObjectURL(blob));
      currentPlaybackAudio = audio;
      audio.play();
      return;
    }
    const url = nestedGet(sharedRecordingsMap, key, text);
    if (url) {
      const audio = new Audio(url);
      currentPlaybackAudio = audio;
      // 共有音声の再生に失敗しても(権限・回線・非対応形式など)ワークアウト中に
      // 無音のまま止まらないよう、音声合成に自動でフォールバックする。二重に
      // 読み上げないよう、フォールバック済みかどうかをフラグで管理する。
      let fellBack = false;
      const fallbackToSpeech = () => {
        if (fellBack) return;
        fellBack = true;
        speakCue(category, text);
      };
      audio.addEventListener('error', fallbackToSpeech);
      audio.play().catch(fallbackToSpeech);
      return;
    }
  }
  speakCue(category, text);
}

populateRecordingSetSelect();
buildAllRecordingRows();
loadAllRecordings()
  .then(() => {
    populateRecordingSetSelect();
    populateAllVoiceSelects();
    buildAllRecordingRows();
  })
  .catch(() => {});
loadSharedRecordings()
  .then(() => {
    populateRecordingSetSelect();
    populateAllVoiceSelects();
    buildAllRecordingRows();
  })
  .catch(() => {});

const RECORDINGS_MODAL_TITLE = { stretch: 'ストレッチのセリフを自分の声で録音する', reinforce: '補強のセリフを自分の声で録音する' };

function openRecordingsModal(category) {
  activeRecordingCategory = category;
  el.stretchRecordingsModalTitle.textContent = RECORDINGS_MODAL_TITLE[category];
  el.stretchRecordingsModal.hidden = false;
  populateRecordingSetSelect();
  buildAllRecordingRows();
  loadSharedRecordings()
    .then(() => {
      populateRecordingSetSelect();
      populateVoiceSelect(category);
      buildAllRecordingRows();
    })
    .catch(() => {});
}
function closeRecordingsModal() {
  el.stretchRecordingsModal.hidden = true;
  stopAnyPlayback();
}
if (el.stretchRecordingsToggle) el.stretchRecordingsToggle.addEventListener('click', () => openRecordingsModal('stretch'));
if (el.reinforceRecordingsToggle) el.reinforceRecordingsToggle.addEventListener('click', () => openRecordingsModal('reinforce'));
el.stretchRecordingsCloseBtn.addEventListener('click', closeRecordingsModal);
el.stretchRecordingsModal.addEventListener('click', (e) => {
  if (e.target === el.stretchRecordingsModal) closeRecordingsModal(); // backdrop tap
});

function currentStretchElapsedMs() {
  if (!stretchRunning) return stretchElapsedMs;
  return stretchElapsedMs + (Date.now() - stretchStartEpoch);
}

function formatStretchTimer(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  const pad2 = (n) => String(n).padStart(2, '0');
  return `${minutes}:${pad2(seconds)}`;
}

function updateStretchTimerDisplay() {
  const elapsedMs = stretchIndex === -1 ? 0 : Math.min(currentStretchElapsedMs(), STRETCH_STEP_MS);
  el.stretchTimer.textContent = formatStretchTimer(elapsedMs);
  el.stretchTimer.classList.toggle('is-overtime', elapsedMs >= STRETCH_STEP_MS);
}

function renderStretchUI() {
  const current = stretchIndex >= 0 ? STRETCH_STEPS[stretchIndex] : null;
  const next = stretchIndex + 1 < STRETCH_STEPS.length ? STRETCH_STEPS[stretchIndex + 1] : null;

  el.stretchCurrentGroup.textContent = current ? current.group : '準備中';
  el.stretchNextGroup.textContent = next ? next.group : stretchIndex >= 0 ? 'これで終わりです' : STRETCH_STEPS[0].group;
  el.stretchNextSpeech.textContent = next ? next.speech : stretchIndex >= 0 ? '' : STRETCH_STEPS[0].speech;
  el.stretchProgress.textContent = `${Math.max(stretchIndex + 1, 0)} / ${STRETCH_STEPS.length}`;

  // "ストレッチ中" (locked) covers the whole in-progress span for this step,
  // including while paused — not just while actively counting — so pausing
  // doesn't look like the step finished. Only reaching the full 30s unlocks it.
  const stepInProgress = stretchIndex >= 0 && currentStretchElapsedMs() < STRETCH_STEP_MS;
  el.stretchStartBtn.disabled = stepInProgress;
  el.stretchStartBtn.textContent = stretchIndex === -1 ? 'スタート' : stepInProgress ? 'ストレッチ中' : '次へ(スタート)';
  // 前に戻る/次に進む はロック中でも押せる手動スキップ用ボタンなので、
  // stepInProgress では無効化しない(戻れない/進めない条件のときだけ無効化)。
  el.stretchPrevBtn.disabled = stretchIndex <= 0;
  el.stretchNextBtn.disabled = STRETCH_STEPS.length === 0;
  el.stretchPauseBtn.disabled = stretchIndex === -1;
  el.stretchPauseBtn.textContent = stretchRunning ? '一時停止' : '再開';
  updateStretchTimerDisplay();
}

function startNextStretchStep() {
  stretchIndex += 1;
  if (stretchIndex >= STRETCH_STEPS.length) {
    stretchIndex = -1;
    stretchRunning = false;
    stretchElapsedMs = 0;
    renderStretchUI();
    return;
  }
  stretchRunning = true;
  stretchElapsedMs = 0;
  stretchStartEpoch = Date.now();
  renderStretchUI();
  announceCue('stretch', STRETCH_STEPS[stretchIndex].voice);
}

// 「前に戻る」: ロック中かどうかに関わらず、直前の種目に戻ってやり直せる。
// 最初の種目(index 0)より前には戻れない。
function goToPreviousStretchStep() {
  if (stretchIndex <= 0) return;
  stretchIndex -= 1;
  stretchRunning = true;
  stretchElapsedMs = 0;
  stretchStartEpoch = Date.now();
  renderStretchUI();
  announceCue('stretch', STRETCH_STEPS[stretchIndex].voice);
}

// For interruptions mid-stretch (a car passing on the road, etc.) — freezes
// the current step's elapsed time in place rather than losing it.
function toggleStretchPause() {
  if (stretchIndex === -1) return;
  if (stretchRunning) {
    stretchElapsedMs = currentStretchElapsedMs();
    stretchRunning = false;
  } else {
    stretchStartEpoch = Date.now();
    stretchRunning = true;
  }
  renderStretchUI();
}

function resetStretch() {
  stretchIndex = -1;
  stretchRunning = false;
  stretchElapsedMs = 0;
  renderStretchUI();
}

function tickStretch() {
  if (stretchRunning) {
    if (currentStretchElapsedMs() >= STRETCH_STEP_MS) {
      // Auto-stop right at 30s instead of counting up indefinitely.
      stretchElapsedMs = STRETCH_STEP_MS;
      stretchRunning = false;
      renderStretchUI();
      announceCue('stretch', '終わり');
    } else {
      updateStretchTimerDisplay();
    }
  }
  requestAnimationFrame(tickStretch);
}

el.stretchStartBtn.addEventListener('click', startNextStretchStep);
el.stretchPrevBtn.addEventListener('click', goToPreviousStretchStep);
el.stretchNextBtn.addEventListener('click', startNextStretchStep); // same "advance" action, but usable even while locked
el.stretchPauseBtn.addEventListener('click', toggleStretchPause);
el.stretchResetBtn.addEventListener('click', resetStretch);

renderStretchUI();
requestAnimationFrame(tickStretch);

/* ---------- Reinforcement training timer (補強) ---------- */
// Structurally like the stretch timer (manual "次へ" advance through a list
// of steps, sharing the same voice/recording engine above), generalized to
// handle a mix of fixed-duration steps (auto-counts and auto-stops, like
// every stretch step) and rep/count-based steps with no real duration (the
// manager just presses "次へ" whenever the group is done — see
// REINFORCE_MENUS's durationSec comment). Also adds a menu picker since
// there are multiple named workouts (フル・コアA・コアB・ループ・下肢).
let reinforceMenuKey = 'フル';
let reinforceIndex = -1;
let reinforceRunning = false;
let reinforceElapsedMs = 0;
let reinforceStartEpoch = 0;

function currentReinforceSteps() {
  return REINFORCE_MENUS[reinforceMenuKey] || [];
}

function currentReinforceStep() {
  const steps = currentReinforceSteps();
  return reinforceIndex >= 0 && reinforceIndex < steps.length ? steps[reinforceIndex] : null;
}

function currentReinforceDurationMs() {
  const step = currentReinforceStep();
  return step && step.durationSec ? step.durationSec * 1000 : null;
}

function currentReinforceElapsedMs() {
  if (!reinforceRunning) return reinforceElapsedMs;
  return reinforceElapsedMs + (Date.now() - reinforceStartEpoch);
}

function updateReinforceTimerDisplay() {
  const durationMs = currentReinforceDurationMs();
  const rawElapsedMs = reinforceIndex === -1 ? 0 : currentReinforceElapsedMs();
  const elapsedMs = durationMs !== null ? Math.min(rawElapsedMs, durationMs) : rawElapsedMs;
  el.reinforceTimer.textContent = formatStretchTimer(elapsedMs);
  el.reinforceTimer.classList.toggle('is-overtime', durationMs !== null && rawElapsedMs >= durationMs);
}

function renderReinforceMenuPicker() {
  el.reinforceMenuPicker.innerHTML = '';
  REINFORCE_MENU_ORDER.forEach((key) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-ghost btn-sm reinforce-menu-btn';
    btn.textContent = key;
    btn.classList.toggle('is-active', key === reinforceMenuKey);
    btn.addEventListener('click', () => {
      if (key === reinforceMenuKey) return;
      reinforceMenuKey = key;
      resetReinforce();
      renderReinforceMenuPicker();
    });
    el.reinforceMenuPicker.appendChild(btn);
  });
}

function renderReinforceUI() {
  const steps = currentReinforceSteps();
  const current = currentReinforceStep();
  const next = reinforceIndex + 1 < steps.length ? steps[reinforceIndex + 1] : null;

  el.reinforceCurrentGroup.textContent = current ? current.group : steps.length > 0 ? '準備中' : 'このメニューは準備中です';
  el.reinforceCurrentSpec.textContent = current ? current.spec : '';
  el.reinforceNextGroup.textContent = next
    ? next.group
    : reinforceIndex >= 0
      ? 'これで終わりです'
      : steps[0]
        ? steps[0].group
        : '';
  el.reinforceNextSpeech.textContent = next ? next.speech : reinforceIndex >= 0 ? '' : steps[0] ? steps[0].speech : '';
  el.reinforceProgress.textContent = `${Math.max(reinforceIndex + 1, 0)} / ${steps.length}`;

  const durationMs = currentReinforceDurationMs();
  const stepInProgress = reinforceIndex >= 0 && durationMs !== null && currentReinforceElapsedMs() < durationMs;
  el.reinforceStartBtn.disabled = stepInProgress || steps.length === 0;
  el.reinforceStartBtn.textContent = reinforceIndex === -1 ? 'スタート' : stepInProgress ? '実施中' : '次へ(スタート)';
  // 前に戻る/次に進む はロック中でも押せる手動スキップ用ボタンなので、
  // stepInProgress では無効化しない(戻れない/進めない条件のときだけ無効化)。
  el.reinforcePrevBtn.disabled = reinforceIndex <= 0;
  el.reinforceNextBtn.disabled = steps.length === 0;
  el.reinforcePauseBtn.disabled = reinforceIndex === -1;
  el.reinforcePauseBtn.textContent = reinforceRunning ? '一時停止' : '再開';
  updateReinforceTimerDisplay();
}

function startNextReinforceStep() {
  const steps = currentReinforceSteps();
  reinforceIndex += 1;
  if (reinforceIndex >= steps.length) {
    reinforceIndex = -1;
    reinforceRunning = false;
    reinforceElapsedMs = 0;
    renderReinforceUI();
    return;
  }
  reinforceRunning = true;
  reinforceElapsedMs = 0;
  reinforceStartEpoch = Date.now();
  renderReinforceUI();
  announceCue('reinforce', steps[reinforceIndex].voice);
}

// 「前に戻る」: ロック中かどうかに関わらず、直前の種目に戻ってやり直せる。
// 最初の種目(index 0)より前には戻れない。
function goToPreviousReinforceStep() {
  if (reinforceIndex <= 0) return;
  const steps = currentReinforceSteps();
  reinforceIndex -= 1;
  reinforceRunning = true;
  reinforceElapsedMs = 0;
  reinforceStartEpoch = Date.now();
  renderReinforceUI();
  announceCue('reinforce', steps[reinforceIndex].voice);
}

function toggleReinforcePause() {
  if (reinforceIndex === -1) return;
  if (reinforceRunning) {
    reinforceElapsedMs = currentReinforceElapsedMs();
    reinforceRunning = false;
  } else {
    reinforceStartEpoch = Date.now();
    reinforceRunning = true;
  }
  renderReinforceUI();
}

function resetReinforce() {
  reinforceIndex = -1;
  reinforceRunning = false;
  reinforceElapsedMs = 0;
  renderReinforceUI();
}

function tickReinforce() {
  if (reinforceRunning) {
    const durationMs = currentReinforceDurationMs();
    if (durationMs !== null && currentReinforceElapsedMs() >= durationMs) {
      // Auto-stop steps with a fixed duration, same as the stretch timer;
      // rep/count-based steps (durationMs === null) never hit this — those
      // just keep counting up until the manager presses "次へ" themselves.
      reinforceElapsedMs = durationMs;
      reinforceRunning = false;
      renderReinforceUI();
      announceCue('reinforce', '終わり');
    } else {
      updateReinforceTimerDisplay();
    }
  }
  requestAnimationFrame(tickReinforce);
}

el.reinforceStartBtn.addEventListener('click', startNextReinforceStep);
el.reinforcePrevBtn.addEventListener('click', goToPreviousReinforceStep);
el.reinforceNextBtn.addEventListener('click', startNextReinforceStep); // same "advance" action, but usable even while locked
el.reinforcePauseBtn.addEventListener('click', toggleReinforcePause);
el.reinforceResetBtn.addEventListener('click', resetReinforce);

renderReinforceMenuPicker();
renderReinforceUI();
requestAnimationFrame(tickReinforce);

/* ---------- TABATA timer ---------- */
// Unlike the manually-advanced stretch timer, TABATA is meant to run
// hands-free once started: 20s training / 10s rest, repeated for 8 sets,
// auto-advancing on its own.
const TABATA_TRAIN_SEC = 20;
const TABATA_REST_SEC = 10;
const TABATA_SETS = 8;
const TABATA_PHASES = [];
for (let set = 1; set <= TABATA_SETS; set++) {
  TABATA_PHASES.push({ type: 'train', set, duration: TABATA_TRAIN_SEC });
  TABATA_PHASES.push({ type: 'rest', set, duration: TABATA_REST_SEC });
}

let tabataIndex = -1; // -1 = not started, TABATA_PHASES.length = finished
let tabataRunning = false;
let tabataPhaseStartEpoch = 0;

function updateTabataTimerDisplay() {
  const phase = TABATA_PHASES[tabataIndex];
  const elapsedMs = Date.now() - tabataPhaseStartEpoch;
  const remainingSec = Math.max(0, phase.duration - Math.floor(elapsedMs / 1000));
  el.tabataTimer.textContent = String(remainingSec);
}

function renderTabataUI() {
  const idle = tabataIndex === -1;
  const finished = tabataIndex >= TABATA_PHASES.length;
  const phase = !idle && !finished ? TABATA_PHASES[tabataIndex] : null;

  el.tabataProgress.textContent = `セット ${phase ? phase.set : finished ? TABATA_SETS : 0} / ${TABATA_SETS}`;
  el.tabataPhase.textContent = phase ? (phase.type === 'train' ? 'トレーニング' : 'レスト') : finished ? '完了!' : 'スタート待ち';
  el.tabataDisplayPanel.classList.toggle('is-train', !!phase && phase.type === 'train');
  el.tabataDisplayPanel.classList.toggle('is-rest', !!phase && phase.type === 'rest');
  el.tabataStartBtn.disabled = !!phase;
  el.tabataStartBtn.textContent = phase ? '実行中' : idle ? 'スタート' : 'もう一度';

  if (phase) {
    updateTabataTimerDisplay();
  } else {
    el.tabataTimer.textContent = idle ? String(TABATA_TRAIN_SEC) : '0';
  }
}

function advanceTabataPhase() {
  tabataIndex += 1;
  if (tabataIndex >= TABATA_PHASES.length) {
    tabataRunning = false;
    renderTabataUI();
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 200]);
    return;
  }
  tabataPhaseStartEpoch = Date.now();
  renderTabataUI();
  if ('vibrate' in navigator) {
    navigator.vibrate(TABATA_PHASES[tabataIndex].type === 'train' ? [300] : [150, 100, 150]);
  }
}

function startTabata() {
  if (tabataRunning) return;
  tabataIndex = 0;
  tabataRunning = true;
  tabataPhaseStartEpoch = Date.now();
  renderTabataUI();
  if ('vibrate' in navigator) navigator.vibrate([300]);
}

function resetTabata() {
  tabataIndex = -1;
  tabataRunning = false;
  renderTabataUI();
}

function tickTabata() {
  if (tabataRunning && tabataIndex >= 0 && tabataIndex < TABATA_PHASES.length) {
    const phase = TABATA_PHASES[tabataIndex];
    if (Date.now() - tabataPhaseStartEpoch >= phase.duration * 1000) {
      advanceTabataPhase();
    } else {
      updateTabataTimerDisplay();
    }
  }
  requestAnimationFrame(tickTabata);
}

el.tabataStartBtn.addEventListener('click', startTabata);
el.tabataResetBtn.addEventListener('click', resetTabata);

renderTabataUI();
requestAnimationFrame(tickTabata);

// Runs immediately (the script tag sits at the end of <body>, so the DOM is
// already parsed) rather than waiting for window "load", so the "全て
// Excel保存" button gets moved into place before first paint instead of
// briefly flashing at its original spot in the markup.
createStopwatch();
requestAnimationFrame(tickAll);
