// Reed HTTP API. The React app talks to this; this holds the model keys server-side.
import express from "express";
import cors from "cors";
import "dotenv/config";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import { reedTurn, startSkill } from "./orchestrator.js";
import { exportMem, erase, listChildren } from "./memory.js";
import { provider } from "./models.js";
import { SKILLS } from "./persona.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "256kb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, provider: provider() }));

// The companion turn: child message in, Reed's reply out.
app.post("/api/chat", async (req, res) => {
  const { childId, text } = req.body || {};
  if (!childId || typeof text !== "string" || !text.trim())
    return res.status(400).json({ error: "childId and non-empty text required" });
  try {
    const out = await reedTurn(childId, text.trim());
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: "reed_error", detail: String(e?.message || e) });
  }
});

// Reusable skills (games/activities) — list for the UI chips, and start one.
app.get("/api/skills", (_req, res) =>
  res.json({ skills: Object.values(SKILLS).map(({ id, label, emoji }) => ({ id, label, emoji })) }));
app.post("/api/skill", async (req, res) => {
  const { childId, skillId } = req.body || {};
  if (!childId || !SKILLS[skillId]) return res.status(400).json({ error: "childId and valid skillId required" });
  try { res.json(await startSkill(childId, skillId)); }
  catch (e) { res.status(500).json({ error: "skill_error", detail: String(e?.message || e) }); }
});

// Parent view — "data under your control": see everything Reed knows, and erase it.
app.get("/api/parent/:childId", (req, res) => res.json(exportMem(req.params.childId)));
app.delete("/api/parent/:childId", (req, res) => { erase(req.params.childId); res.json({ erased: true }); });
app.get("/api/children", (_req, res) => res.json({ children: listChildren() }));

// In production (a single-URL deploy), serve the built frontend from this same origin, so the
// browser talks to /api on the same host and the model key never leaves the server. In dev the
// Vite server handles the UI and proxies /api here, so this block simply stays dormant (no dist).
const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "frontend", "dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(join(dist, "index.html")));   // SPA fallback (API routes are above)
}

const PORT = process.env.PORT || 4310;
app.listen(PORT, () => console.log(`Reed server on http://localhost:${PORT} (provider: ${provider()})`));
