// /api/content.js
const { google } = require("googleapis");

function getPrivateKey() {
  const raw = process.env.GOOGLE_PRIVATE_KEY || "";
  // If the key was pasted as one line with \n, convert them.
  if (raw.includes("\\n")) return raw.replace(/\\n/g, "\n");
  return raw; // already multiline
}

function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = getPrivateKey();

  if (!email) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL");
  if (!key || !key.includes("BEGIN PRIVATE KEY"))
    throw new Error("GOOGLE_PRIVATE_KEY seems malformed");

  const auth = new google.auth.JWT(
    email,
    null,
    key,
    ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  );

  return google.sheets({ version: "v4", auth });
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }

  try {
    const sheets = getSheetsClient();

    // Fallback to env, but allow ?sheet=<id>&range=Sheet1!A:B for quick tests
    const spreadsheetId =
      (req.query.sheet && String(req.query.sheet)) ||
      process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) throw new Error("Missing GOOGLE_SHEET_ID");

    const range =
      (req.query.range && String(req.query.range)) || "content!A:B";

    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = data.values || [];
    const out = {};
    // If you have a header row, start from index 1. For pure key:value pairs,
    // leave as is.
    for (const [k, v] of rows) {
      if (!k) continue;
      out[k] = v ?? "";
    }

    return res.status(200).json({ ok: true, data: out, used: { spreadsheetId, range } });
  } catch (e) {
    // TEMP: Return the real message so we can see what’s wrong
    console.error("content error:", e?.message || e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Failed to read content",
    });
  }
};
