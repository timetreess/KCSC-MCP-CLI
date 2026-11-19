export default function handler(_req, res) {
  res.status(200).json({ status: "ok", name: "kcsc-standards-mcp", endpoint: "/mcp?key=YOUR_KCSC_API_KEY" });
}
