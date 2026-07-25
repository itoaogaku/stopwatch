'use strict';

/* ---------- Stopwatch state ---------- */
const state = {
  running: false,
  startEpoch: 0,      // Date.now() at (re)start, minus already-elapsed time
  elapsedMs: 0,        // frozen elapsed time while paused
  rafId: null,
  records: [],          // { idx, lapMs, totalMs, wallClock }
  lastLapMs: 0,
  savedCount: 0,        // how many records already pushed to the spreadsheet
};

/* ---------- DOM ---------- */
const el = {
  display: document.getElementById('display'),
  startBtn: document.getElementById('startBtn'),
  lapBtn: document.getElementById('lapBtn'),
  stopBtn: document.getElementById('stopBtn'),
  resetBtn: document.getElementById('resetBtn'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  saveSheetBtn: document.getElementById('saveSheetBtn'),
  sheetBtnLabel: document.getElementById('sheetBtnLabel'),
  status: document.getElementById('status'),
  records: document.getElementById('records'),
  recordCount: document.getElementById('recordCount'),
  emptyState: document.getElementById('emptyState'),

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

function currentElapsedMs() {
  if (!state.running) return state.elapsedMs;
  return state.elapsedMs + (Date.now() - state.startEpoch);
}

/* ---------- Render loop ---------- */
function tick() {
  el.display.textContent = formatTime(currentElapsedMs());
  if (state.running) {
    state.rafId = requestAnimationFrame(tick);
  }
}

/* ---------- Controls ---------- */
function start() {
  if (state.running) return;
  state.running = true;
  state.startEpoch = Date.now();
  el.startBtn.disabled = true;
  el.lapBtn.disabled = false;
  el.stopBtn.disabled = false;
  el.resetBtn.disabled = true;
  setStatus('計測中…');
  tick();
}

function stop() {
  if (!state.running) return;
  state.elapsedMs = currentElapsedMs();
  state.running = false;
  cancelAnimationFrame(state.rafId);
  el.display.textContent = formatTime(state.elapsedMs);
  el.startBtn.disabled = false;
  el.lapBtn.disabled = true;
  el.stopBtn.disabled = true;
  el.resetBtn.disabled = false;
  setStatus('停止しました。スタートで再開、リセットでクリアできます。');
}

function reset() {
  if (state.running) return;
  state.elapsedMs = 0;
  state.records = [];
  state.lastLapMs = 0;
  state.savedCount = 0;
  el.display.textContent = formatTime(0);
  renderRecords();
  setStatus('');
}

function addRecord() {
  if (!state.running) return;
  const totalMs = currentElapsedMs();
  const lapMs = totalMs - state.lastLapMs;
  state.lastLapMs = totalMs;

  const record = {
    idx: state.records.length + 1,
    lapMs,
    totalMs,
    wallClock: new Date().toISOString(),
  };
  state.records.push(record);
  renderRecords();
}

function setStatus(msg) {
  el.status.textContent = msg;
}

/* ---------- Records rendering ---------- */
function renderRecords() {
  el.recordCount.textContent = String(state.records.length);
  el.records.classList.toggle('has-records', state.records.length > 0);

  const frag = document.createDocumentFragment();
  for (let i = state.records.length - 1; i >= 0; i--) {
    const r = state.records[i];
    const row = document.createElement('div');
    row.className = 'record-row' + (i === state.records.length - 1 ? ' latest' : '');
    row.innerHTML = `
      <span class="idx">#${r.idx}</span>
      <span class="time-lap">${formatTime(r.lapMs)}</span>
      <span class="time-total">${formatTime(r.totalMs)}</span>
    `;
    frag.appendChild(row);
  }
  el.records.innerHTML = '';
  el.records.appendChild(frag);
}

/* ---------- CSV export ---------- */
function exportCsv() {
  if (state.records.length === 0) {
    setStatus('記録がありません。');
    return;
  }
  const header = ['No', '記録日時', '区間タイム', '合計タイム'];
  const rows = state.records.map((r) => [
    r.idx,
    r.wallClock,
    formatTime(r.lapMs),
    formatTime(r.totalMs),
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stopwatch_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
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

async function saveToSheet() {
  if (!sheets.scriptUrl) {
    openSettings();
    setStatus('ウェブアプリURLを設定してください。');
    return;
  }
  const pending = state.records.slice(state.savedCount);
  if (pending.length === 0) {
    setStatus('保存する新しい記録がありません。');
    return;
  }

  el.saveSheetBtn.disabled = true;
  el.sheetBtnLabel.textContent = '保存中…';
  try {
    const rows = pending.map((r) => [
      r.idx,
      r.wallClock,
      formatTime(r.lapMs),
      formatTime(r.totalMs),
    ]);
    await postToScript({ secret: sheets.secret, sheetName: sheets.sheetName, rows });
    state.savedCount = state.records.length;
    setStatus(`${pending.length}件をスプレッドシートに保存しました。`);
  } catch (err) {
    console.error(err);
    setStatus(`スプレッドシートへの保存に失敗しました: ${err.message}`);
  } finally {
    el.saveSheetBtn.disabled = false;
    el.sheetBtnLabel.textContent = 'スプレッドシートに保存';
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

/* ---------- Wire up events ---------- */
el.startBtn.addEventListener('click', start);
el.stopBtn.addEventListener('click', stop);
el.lapBtn.addEventListener('click', addRecord);
el.resetBtn.addEventListener('click', reset);
el.exportCsvBtn.addEventListener('click', exportCsv);
el.saveSheetBtn.addEventListener('click', saveToSheet);

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
  el.display.textContent = formatTime(0);
});
