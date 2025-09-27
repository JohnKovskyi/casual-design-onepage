const { google } = require("googleapis");
const jwt = require("jsonwebtoken");

function getSheets() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  );
  return google.sheets({ version: "v4", auth });
}

function getUser(req) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET); }
  catch { return null; }
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET"); return res.status(405).end();
  }
  const user = getUser(req);
  if (!user) return res.status(401).json({ ok:false, error:"Unauthorized" });

  const targetEmail = (user.role === "admin" && req.query.email)
    ? String(req.query.email) : user.email;

  try {
    const sheets = getSheets();
    const r = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "clients!A:D"
    });
    const rows = r.data.values || [];
    const hit = rows.find(row => (row[0]||"").toLowerCase() === String(targetEmail).toLowerCase());
    if (!hit) return res.status(404).json({ ok:false, error:"Not found" });

    res.status(200).json({ ok:true, portfolio: hit[2] || "", passport: hit[3] || "" });
  } catch (e) {
    console.error("client-links error", e);
    res.status(500).json({ ok:false, error:"Failed to read links" });
  }
};
