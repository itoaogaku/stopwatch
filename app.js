'use strict';

/* ---------- Global DOM (singletons) ---------- */
const el = {
  stopwatchList: document.getElementById('stopwatchList'),
  template: document.getElementById('stopwatchTemplate'),

  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  scriptUrlInput: document.getElementById('scriptUrlInput'),
  secretInput: document.getElementById('secretInput'),
  sheetNameInput: document.getElementById('sheetNameInput'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  testConnectionBtn: document.getElementById('testConnectionBtn'),
  testStatus: document.getElementById('testStatus'),
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
let nextStopwatchNumber = 1;

// seed lets a duplicate start already running, at the source's current elapsed time.
function createStopwatch(seed) {
  const id = `sw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const number = nextStopwatchNumber++;

  const sw = {
    id,
    number,
    label: `ストップウォッチ ${number}`,
    running: seed?.running ?? false,
    startEpoch: Date.now(),
    elapsedMs: seed?.elapsedMs ?? 0,
    records: [],
    lastLapMs: { A: 0, B: 0 },
    lapCount: { A: 0, B: 0 },
    savedCount: 0,
  };

  const node = el.template.content.firstElementChild.cloneNode(true);
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
    resetBtn: node.querySelector('.sw-reset'),
    exportCsvBtn: node.querySelector('.sw-export-csv'),
    saveSheetBtn: node.querySelector('.sw-save-sheet'),
    sheetBtnLabel: node.querySelector('.sheet-btn-label'),
    status: node.querySelector('.sw-status'),
    recordsA: node.querySelector('.sw-records-a'),
    recordsB: node.querySelector('.sw-records-b'),
    countA: node.querySelector('.sw-count-a'),
    countB: node.querySelector('.sw-count-b'),
  };

  sw.dom.label.textContent = sw.label;
  sw.dom.display.textContent = formatTime(currentElapsedMs(sw));

  if (sw.running) {
    setRunningUi(sw, seed?.statusMessage ?? '計測中…');
  }

  sw.dom.toggleBtn.addEventListener('click', () => toggleStopwatch(sw));
  sw.dom.lapABtn.addEventListener('click', () => addRecord(sw, 'A'));
  sw.dom.lapBBtn.addEventListener('click', () => addRecord(sw, 'B'));
  sw.dom.lapBothBtn.addEventListener('click', () => addRecord(sw, 'both'));
  sw.dom.resetBtn.addEventListener('click', () => resetStopwatch(sw));
  sw.dom.exportCsvBtn.addEventListener('click', () => exportCsv(sw));
  sw.dom.saveSheetBtn.addEventListener('click', () => saveToSheet(sw));
  sw.dom.duplicateBtn.addEventListener('click', () => duplicateStopwatch(sw));
  sw.dom.removeBtn.addEventListener('click', () => removeStopwatch(sw));

  el.stopwatchList.appendChild(node);
  stopwatches.set(id, sw);
  renderRecords(sw);
  updateRemoveButtons();
  return sw;
}

function duplicateStopwatch(source) {
  const clone = createStopwatch({
    running: source.running,
    elapsedMs: currentElapsedMs(source),
    statusMessage: source.running ? `${source.label} の計測中の状態を引き継ぎました。` : '',
  });
  return clone;
}

function removeStopwatch(sw) {
  if (stopwatches.size <= 1) return;
  sw.dom.root.remove();
  stopwatches.delete(sw.id);
  updateRemoveButtons();
}

function updateRemoveButtons() {
  const disable = stopwatches.size <= 1;
  stopwatches.forEach((sw) => {
    sw.dom.removeBtn.disabled = disable;
  });
}

/* ---------- Single shared render loop for all running instances ---------- */
function tickAll() {
  stopwatches.forEach((sw) => {
    if (sw.running) {
      sw.dom.display.textContent = formatTime(currentElapsedMs(sw));
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
}

function resetStopwatch(sw) {
  if (sw.running) return;
  sw.elapsedMs = 0;
  sw.records = [];
  sw.lastLapMs = { A: 0, B: 0 };
  sw.lapCount = { A: 0, B: 0 };
  sw.savedCount = 0;
  sw.dom.display.textContent = formatTime(0);
  renderRecords(sw);
  setStatus(sw, '');
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
}

function setStatus(sw, msg) {
  sw.dom.status.textContent = msg;
}

/* ---------- Records rendering ---------- */
function renderColumn(container, countEl, records, track) {
  const trackRecords = records.filter((r) => r.track === track);
  countEl.textContent = String(trackRecords.length);
  container.classList.toggle('has-records', trackRecords.length > 0);

  const frag = document.createDocumentFragment();
  for (let i = trackRecords.length - 1; i >= 0; i--) {
    const r = trackRecords[i];
    const row = document.createElement('div');
    row.className = 'record-row' + (i === trackRecords.length - 1 ? ' latest' : '');
    row.innerHTML = `
      <span class="idx">#${r.idx}</span>
      <span class="time-lap">${formatTime(r.lapMs)}</span>
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
function exportCsv(sw) {
  if (sw.records.length === 0) {
    setStatus(sw, '記録がありません。');
    return;
  }
  const header = ['No', 'レーン', '記録日時', '区間タイム', '合計タイム'];
  const rows = sw.records.map((r) => [r.idx, r.track, r.wallClock, formatTime(r.lapMs), formatTime(r.totalMs)]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stopwatch_${sw.number}_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- Google Apps Script (GAS) webhook integration ---------- */
const sheets = {
  scriptUrl: localStorage.getItem('sw_scriptUrl') || '',
  secret: localStorage.getItem('sw_secret') || '',
  sheetName: localStorage.getItem('sw_sheetName') || 'シート1',
};

// Sent as text/plain to avoid a CORS preflight request against the Apps Script endpoint.
async function postToScript(payload) {
  const res = await fetch(sheets.scriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || `unexpected response (${res.status})`);
  return data;
}

async function testConnection() {
  const scriptUrl = el.scriptUrlInput.value.trim();
  if (!scriptUrl) {
    el.testStatus.textContent = 'ウェブアプリURLを入力してください。';
    return;
  }
  sheets.scriptUrl = scriptUrl;
  sheets.secret = el.secretInput.value.trim();
  sheets.sheetName = el.sheetNameInput.value.trim() || 'シート1';

  el.testStatus.textContent = '接続確認中…';
  try {
    const data = await postToScript({ secret: sheets.secret, sheetName: sheets.sheetName, rows: [] });
    el.testStatus.textContent = `接続できました(現在の行数: ${data.rowCount ?? '不明'})。`;
  } catch (err) {
    console.error(err);
    el.testStatus.textContent = `接続に失敗しました: ${err.message}`;
  }
}

async function saveToSheet(sw) {
  if (!sheets.scriptUrl) {
    openSettings();
    setStatus(sw, 'ウェブアプリURLを設定してください。');
    return;
  }
  const pending = sw.records.slice(sw.savedCount);
  if (pending.length === 0) {
    setStatus(sw, '保存する新しい記録がありません。');
    return;
  }

  sw.dom.saveSheetBtn.disabled = true;
  sw.dom.sheetBtnLabel.textContent = '保存中…';
  try {
    const rows = pending.map((r) => [r.idx, sw.label, r.track, r.wallClock, formatTime(r.lapMs), formatTime(r.totalMs)]);
    await postToScript({ secret: sheets.secret, sheetName: sheets.sheetName, rows });
    sw.savedCount = sw.records.length;
    setStatus(sw, `${pending.length}件をスプレッドシートに保存しました。`);
  } catch (err) {
    console.error(err);
    setStatus(sw, `スプレッドシートへの保存に失敗しました: ${err.message}`);
  } finally {
    sw.dom.saveSheetBtn.disabled = false;
    sw.dom.sheetBtnLabel.textContent = 'スプレッドシートに保存';
  }
}

/* ---------- Settings modal ---------- */
function openSettings() {
  el.scriptUrlInput.value = sheets.scriptUrl;
  el.secretInput.value = sheets.secret;
  el.sheetNameInput.value = sheets.sheetName;
  el.testStatus.textContent = '';
  el.settingsModal.classList.remove('hidden');
}

function closeSettings() {
  el.settingsModal.classList.add('hidden');
}

function saveSettings() {
  sheets.scriptUrl = el.scriptUrlInput.value.trim();
  sheets.secret = el.secretInput.value.trim();
  sheets.sheetName = el.sheetNameInput.value.trim() || 'シート1';
  localStorage.setItem('sw_scriptUrl', sheets.scriptUrl);
  localStorage.setItem('sw_secret', sheets.secret);
  localStorage.setItem('sw_sheetName', sheets.sheetName);
  el.testStatus.textContent = '設定を保存しました。';
}

/* ---------- Wire up global events ---------- */
el.settingsBtn.addEventListener('click', openSettings);
el.closeSettingsBtn.addEventListener('click', closeSettings);
el.settingsModal.addEventListener('click', (e) => {
  if (e.target === el.settingsModal) closeSettings();
});
el.saveSettingsBtn.addEventListener('click', () => {
  saveSettings();
});
el.testConnectionBtn.addEventListener('click', testConnection);

window.addEventListener('load', () => {
  createStopwatch();
  requestAnimationFrame(tickAll);
});
