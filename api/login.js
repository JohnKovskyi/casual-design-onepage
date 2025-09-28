const { google } = require("googleapis");
const jwt = require("jsonwebtoken");

function getSheets() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/spreadsheets"]
  );
  return google.sheets({ version: "v4", auth });
}

function getBody(req) {
  return Promise.resolve(req.body || {});
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST"); return res.status(405).end();
  }

  const { email, password } = await getBody(req);
  if (!email || !password) return res.status(400).json({ ok:false, error:"Missing credentials" });

  if (email.toLowerCase() === String(process.env.ADMIN_EMAIL||"").toLowerCase()
      && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ email, role:"admin" }, process.env.JWT_SECRET, { expiresIn:"2h" });
    return res.status(200).json({ ok:true, role:"admin", token });
  }

  try {
    const sheets = getSheets();
    const r = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "clients!A:D"
    });
    const rows = r.data.values || [];
    const hit = rows.find(row => (row[0]||"").toLowerCase() === email.toLowerCase());
    if (!hit) return res.status(401).json({ ok:false, error:"Invalid credentials" });
    if ((hit[1]||"") !== password) return res.status(401).json({ ok:false, error:"Invalid credentials" });

    const token = jwt.sign({ email, role:"client" }, process.env.JWT_SECRET, { expiresIn:"2h" });
    res.status(200).json({ ok:true, role:"client", token });
  } catch (e) {
    console.error("login error", e);
    res.status(500).json({ ok:false, error:"Login failed" });
  }
};
