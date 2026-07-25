'use strict';

/* ---------- Stopwatch state ---------- */
const state = {
  running: false,
  startEpoch: 0,      // Date.now() at (re)start, minus already-elapsed time
  elapsedMs: 0,        // frozen elapsed time while paused
  rafId: null,
  records: [],          // { idx, type: 'split'|'lap', segmentMs, totalMs, wallClock }
  lastSplitMs: 0,
  lastLapMs: 0,
  savedCount: 0,        // how many records already pushed to the spreadsheet
};

/* ---------- DOM ---------- */
const el = {
  display: document.getElementById('display'),
  startBtn: document.getElementById('startBtn'),
  splitBtn: document.getElementById('splitBtn'),
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
  clientIdInput: document.getElementById('clientIdInput'),
  spreadsheetIdInput: document.getElementById('spreadsheetIdInput'),
  sheetNameInput: document.getElementById('sheetNameInput'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  googleSignInBtn: document.getElementById('googleSignInBtn'),
  authStatus: document.getElementById('authStatus'),
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
  el.splitBtn.disabled = false;
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
  el.splitBtn.disabled = true;
  el.lapBtn.disabled = true;
  el.stopBtn.disabled = true;
  el.resetBtn.disabled = false;
  setStatus('停止しました。スタートで再開、リセットでクリアできます。');
}

function reset() {
  if (state.running) return;
  state.elapsedMs = 0;
  state.records = [];
  state.lastSplitMs = 0;
  state.lastLapMs = 0;
  state.savedCount = 0;
  el.display.textContent = formatTime(0);
  renderRecords();
  setStatus('');
}

function addRecord(type) {
  if (!state.running) return;
  const totalMs = currentElapsedMs();
  const segmentMs = type === 'split' ? totalMs - state.lastSplitMs : totalMs - state.lastLapMs;
  if (type === 'split') state.lastSplitMs = totalMs;
  else state.lastLapMs = totalMs;

  const record = {
    idx: state.records.length + 1,
    type,
    segmentMs,
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
    row.className = `record-row type-${r.type}` + (i === state.records.length - 1 ? ' latest' : '');
    row.innerHTML = `
      <span class="idx">#${r.idx}</span>
      <span class="tag ${r.type === 'split' ? 'tag-split' : 'tag-lap'}">${r.type === 'split' ? 'SP' : 'LP'}</span>
      <span class="time-lap">${formatTime(r.segmentMs)}</span>
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
  const header = ['No', '種別', '記録日時', '区間タイム', '合計タイム'];
  const rows = state.records.map((r) => [
    r.idx,
    r.type === 'split' ? 'スプリット' : 'ラップ',
    r.wallClock,
    formatTime(r.segmentMs),
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

/* ---------- Google Sheets integration ---------- */
const sheets = {
  clientId: localStorage.getItem('sw_clientId') || '',
  spreadsheetId: localStorage.getItem('sw_spreadsheetId') || '',
  sheetName: localStorage.getItem('sw_sheetName') || 'シート1',
  accessToken: '',
  tokenClient: null,
  headerEnsured: false,
};

function initGoogleTokenClient() {
  if (!window.google || !sheets.clientId) return;
  sheets.tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: sheets.clientId,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    callback: (resp) => {
      if (resp.error) {
        el.authStatus.textContent = `サインインエラー: ${resp.error}`;
        return;
      }
      sheets.accessToken = resp.access_token;
      el.authStatus.textContent = 'サインイン済みです。';
    },
  });
}

function signIn() {
  if (!sheets.clientId) {
    el.authStatus.textContent = '先にクライアントIDを入力して保存してください。';
    return;
  }
  if (!sheets.tokenClient) initGoogleTokenClient();
  if (!sheets.tokenClient) {
    el.authStatus.textContent = 'Google認証ライブラリの読み込み待ちです。少し待って再試行してください。';
    return;
  }
  sheets.tokenClient.requestAccessToken({ prompt: sheets.accessToken ? '' : 'consent' });
}

async function sheetsApiFetch(path, options = {}) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheets.spreadsheetId}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${sheets.accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sheets API error ${res.status}: ${body}`);
  }
  return res.json();
}

async function ensureHeaderRow() {
  if (sheets.headerEnsured) return;
  const range = encodeURIComponent(`${sheets.sheetName}!A1:E1`);
  const data = await sheetsApiFetch(`/values/${range}`);
  if (!data.values || data.values.length === 0) {
    await sheetsApiFetch(`/values/${range}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      body: JSON.stringify({
        range: `${sheets.sheetName}!A1:E1`,
        majorDimension: 'ROWS',
        values: [['No', '種別', '記録日時', '区間タイム', '合計タイム']],
      }),
    });
  }
  sheets.headerEnsured = true;
}

async function saveToSheet() {
  if (!sheets.spreadsheetId || !sheets.clientId) {
    openSettings();
    setStatus('スプレッドシートの設定を入力してください。');
    return;
  }
  if (!sheets.accessToken) {
    openSettings();
    setStatus('先にGoogleでサインインしてください。');
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
    await ensureHeaderRow();
    const values = pending.map((r) => [
      r.idx,
      r.type === 'split' ? 'スプリット' : 'ラップ',
      r.wallClock,
      formatTime(r.segmentMs),
      formatTime(r.totalMs),
    ]);
    const range = encodeURIComponent(`${sheets.sheetName}!A1`);
    await sheetsApiFetch(`/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
      method: 'POST',
      body: JSON.stringify({ range: `${sheets.sheetName}!A1`, majorDimension: 'ROWS', values }),
    });
    state.savedCount = state.records.length;
    setStatus(`${pending.length}件をスプレッドシートに保存しました。`);
  } catch (err) {
    console.error(err);
    setStatus('スプレッドシートへの保存に失敗しました。設定・サインイン状態を確認してください。');
  } finally {
    el.saveSheetBtn.disabled = false;
    el.sheetBtnLabel.textContent = 'スプレッドシートに保存';
  }
}

/* ---------- Settings modal ---------- */
function openSettings() {
  el.clientIdInput.value = sheets.clientId;
  el.spreadsheetIdInput.value = sheets.spreadsheetId;
  el.sheetNameInput.value = sheets.sheetName;
  el.authStatus.textContent = sheets.accessToken ? 'サインイン済みです。' : '';
  el.settingsModal.classList.remove('hidden');
}

function closeSettings() {
  el.settingsModal.classList.add('hidden');
}

function saveSettings() {
  sheets.clientId = el.clientIdInput.value.trim();
  sheets.spreadsheetId = el.spreadsheetIdInput.value.trim();
  sheets.sheetName = el.sheetNameInput.value.trim() || 'シート1';
  localStorage.setItem('sw_clientId', sheets.clientId);
  localStorage.setItem('sw_spreadsheetId', sheets.spreadsheetId);
  localStorage.setItem('sw_sheetName', sheets.sheetName);
  sheets.headerEnsured = false;
  sheets.tokenClient = null;
  sheets.accessToken = '';
  initGoogleTokenClient();
  el.authStatus.textContent = '設定を保存しました。サインインしてください。';
}

/* ---------- Wire up events ---------- */
el.startBtn.addEventListener('click', start);
el.stopBtn.addEventListener('click', stop);
el.splitBtn.addEventListener('click', () => addRecord('split'));
el.lapBtn.addEventListener('click', () => addRecord('lap'));
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
el.googleSignInBtn.addEventListener('click', signIn);

window.addEventListener('load', () => {
  el.display.textContent = formatTime(0);
  if (sheets.clientId) {
    // google script loads async; retry a few times
    let attempts = 0;
    const tryInit = () => {
      attempts += 1;
      if (window.google && window.google.accounts) {
        initGoogleTokenClient();
      } else if (attempts < 20) {
        setTimeout(tryInit, 250);
      }
    };
    tryInit();
  }
});
