// ─────────────────────────────────────────────────────────────────────────────
// xzvl.store — Google Apps Script Web App
//
// HOW TO DEPLOY (do this every time you edit the script):
//  1. Open your Google Sheet → Extensions → Apps Script
//  2. Paste this entire file, replacing the default code → Save (Ctrl+S)
//  3. Click Deploy → New deployment  (NOT "Manage deployments")
//     - Type            : Web app
//     - Execute as      : Me
//     - Who has access  : Anyone
//  4. Click Deploy → Authorize if prompted → Copy the Web App URL
//  5. Set it in Vercel: Settings → Environment Variables → APPS_SCRIPT_URL
//
// TEST: open the Web App URL in a browser — you should see {"status":"ok"}
// ─────────────────────────────────────────────────────────────────────────────

var SHEET_NAME = "2026 PRE-ORDER";

// The API route calls this via GET with ?payload=<JSON>
// GET redirects follow cleanly from server environments; POST does not.
function doGet(e) {
  try {
    var raw = e.parameter && e.parameter.payload;

    // Health check — no payload means a plain browser visit
    if (!raw) {
      return respond({ status: "ok", sheet: SHEET_NAME });
    }

    var data  = JSON.parse(raw);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    if (!sheet) {
      return respond({ error: "Sheet '" + SHEET_NAME + "' not found." });
    }

    var items = data.items || [];

    items.forEach(function (item) {
      sheet.appendRow([
        data.date     || new Date().toLocaleDateString("en-PH"),
        data.name     || "",
        data.location || "",
        data.phone    || "",
        data.email    || "",
        item.product  || "",
        item.qty      || 1,
        item.subtotal || 0,
        "Pending"
      ]);
    });

    return respond({ success: true, rows: items.length });
  } catch (err) {
    return respond({ error: err.message });
  }
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
