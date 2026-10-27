// mempalace — persistent, owner-controlled per-child memory. Local JSON only; never uploaded.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
const file = (id) => join(DIR, `${id.replace(/[^a-z0-9_-]/gi, "_")}.json`);

const blank = (id) => ({
  id, name: "", likes: [], dislikes: [], pets: [], interests: [],
  threads: [],          // ongoing stories/games: { topic, note }
  recent: [],           // last turns: { who: "kid"|"reed", text }
  flagged: [],          // CARE moments for a grown-up to see: { at, text }
});

export function load(id) {
  try { return existsSync(file(id)) ? JSON.parse(readFileSync(file(id), "utf8")) : blank(id); }
  catch { return blank(id); }
}
export function save(mem) { writeFileSync(file(mem.id), JSON.stringify(mem, null, 2)); }

// Compact "what Reed remembers" block for the brain's context.
export function recall(mem) {
  const L = [];
  if (mem.name) L.push(`Their name is ${mem.name}.`);
  if (mem.pets?.length) L.push(`Pets: ${mem.pets.join(", ")}.`);
  if (mem.likes?.length) L.push(`They like: ${mem.likes.join(", ")}.`);
  if (mem.dislikes?.length) L.push(`They don't like: ${mem.dislikes.join(", ")}.`);
  if (mem.interests?.length) L.push(`Into: ${mem.interests.join(", ")}.`);
  if (mem.threads?.length) L.push(`Ongoing: ${mem.threads.map(t => `${t.topic} (${t.note})`).join("; ")}.`);
  return L.length ? L.join(" ") : "You have not met this child before. Be gentle and curious.";
}

// Merge newly-extracted durable facts into the profile (dedup, never clobber a known name with "").
export function mergeFacts(mem, facts) {
  if (!facts || typeof facts !== "object") return;
  // never record the companion's own name as the child's (defensive against extractor confusion)
  if (facts.name && !mem.name && String(facts.name).trim().toLowerCase() !== "reed")
    mem.name = String(facts.name).slice(0, 40);
  for (const k of ["pets", "likes", "dislikes", "interests"]) {
    if (!Array.isArray(facts[k])) continue;
    for (const v of facts[k]) {
      const s = String(v).trim().slice(0, 40);
      if (s && !mem[k].some(x => x.toLowerCase() === s.toLowerCase())) mem[k].push(s);
    }
  }
}

// Record a CARE moment (self-harm / abuse disclosure) for a grown-up to review. VERBATIM — the
// child's exact words, never a model paraphrase, because a life-safety disclosure must not be softened.
export function flagCare(mem, text) {
  if (!Array.isArray(mem.flagged)) mem.flagged = [];
  mem.flagged.push({ at: new Date().toISOString(), text });
  if (mem.flagged.length > 50) mem.flagged = mem.flagged.slice(-50);
}

export function pushTurn(mem, who, text) {
  mem.recent.push({ who, text });
  if (mem.recent.length > 12) mem.recent = mem.recent.slice(-12);
}
export function recentAsMessages(mem) {
  return mem.recent.map(t => ({ role: t.who === "kid" ? "user" : "assistant", content: t.text }));
}

// Parent controls — "data under your control."
export function exportMem(id) { return load(id); }
export function erase(id) { if (existsSync(file(id))) unlinkSync(file(id)); }
export function listChildren() {
  return readdirSync(DIR).filter(f => f.endsWith(".json")).map(f => f.replace(/\.json$/, ""));
}
