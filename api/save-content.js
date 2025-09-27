const { google } = require("googleapis");
const jwt = require("jsonwebtoken");

function getSheetsRW() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/spreadsheets"]
  );
  return google.sheets({ version: "v4", auth });
}

function getBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch { resolve({}); }
    });
  });
}

function requireAdmin(req) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  if (!token) return null;
  try { const p = jwt.verify(token, process.env.JWT_SECRET); return p.role === "admin" ? p : null; }
  catch { return null; }
}

module.exports = async (req, res) => {
  if (req.method !== "PUT") {
    res.setHeader("Allow", "PUT"); return res.status(405).end();
  }
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ ok:false, error:"Unauthorized" });

  const body = await getBody(req);
  const updates = body && body.updates;
  if (!updates || typeof updates !== "object")
    return res.status(400).json({ ok:false, error:"No updates" });

  try {
    const sheets = getSheetsRW();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const read = await sheets.spreadsheets.values.get({
      spreadsheetId, range: "content!A:B"
    });
    const rows = read.data.values || [];
    const index = {};
    rows.forEach(([k], i) => { if (k) index[k] = i + 1; });

    const batchData = [];
    const toAppend = [];

    for (const [k, v] of Object.entries(updates)) {
      const value = String(v ?? "");
      if (index[k]) {
        batchData.push({ range: `content!B${index[k]}`, values: [[value]] });
      } else {
        toAppend.push([k, value]);
      }
    }

    if (batchData.length) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: { valueInputOption: "USER_ENTERED", data: batchData }
      });
    }
    if (toAppend.length) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "content!A:B",
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: toAppend }
      });
    }
    res.status(200).json({ ok:true });
  } catch (e) {
    console.error("save-content error", e);
    res.status(500).json({ ok:false, error:"Failed to save" });
  }
};
