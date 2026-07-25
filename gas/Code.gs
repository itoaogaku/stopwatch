/**
 * Apps Script backend for the stopwatch web app.
 * Bind this script to the target spreadsheet (Extensions > Apps Script),
 * set SECRET below, then deploy it as a web app (Execute as: Me, Who has access: Anyone).
 */

var SHEET_NAME_DEFAULT = 'シート1';
var SECRET = 'ここに合言葉を設定'; // アプリの設定画面に入力する値と一致させる
var HEADER = ['No', '記録日時', '区間タイム', '合計タイム'];

function doPost(e) {
  return handleRequest_(e);
}

function handleRequest_(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (SECRET && body.secret !== SECRET) {
      return jsonOutput_({ ok: false, error: 'unauthorized' });
    }

    var sheetName = body.sheetName || SHEET_NAME_DEFAULT;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADER);
    }

    var rows = body.rows || [];
    if (rows.length > 0) {
      sheet
        .getRange(sheet.getLastRow() + 1, 1, rows.length, HEADER.length)
        .setValues(rows);
    }

    return jsonOutput_({ ok: true, appended: rows.length, rowCount: sheet.getLastRow() });
  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err) });
  }
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
