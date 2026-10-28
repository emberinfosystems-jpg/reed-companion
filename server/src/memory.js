// mempalace — persistent, owner-controlled per-child memory. Local JSON only; never uploaded.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { humanizeDate, todayISO } from "./dates.js";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
const file = (id) => join(DIR, `${id.replace(/[^a-z0-9_-]/gi, "_")}.json`);

const blank = (id) => ({
  id, name: "", likes: [], dislikes: [], pets: [], interests: [],
  threads: [],          // ongoing stories/games: { topic, note }
  recent: [],           // last turns: { who: "kid"|"reed", text }
  flagged: [],          // CARE moments for a grown-up to see: { at, text }
  moments: [],          // happy-moment sketchbook: { at, description }
  // Mira-the-organizer: the CHILD's own helper (never parent surveillance, never nagging).
  chores: [],           // the child's own little jobs/goals: { at, text, done }
  hobbies: [],          // things the child loves to do: { at, text }
  agenda: [],           // gentle "coming up" calendar: { at, text, date }  date = ISO (dates.js) or null
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
  // Surface the very next upcoming thing so the organizer companion can mention it warmly, unprompted.
  const up = nextUpcoming(mem);
  if (up) L.push(`Coming up for them: ${up.text}${up.date ? ` (${humanizeDate(up.date)})` : ""}.`);
  return L.length ? L.join(" ") : "You have not met this child before. Be gentle and curious.";
}

// The soonest not-yet-past agenda item, or null. Shared by recall() and the agenda replay.
function nextUpcoming(mem) {
  const today = todayISO();
  const dated = (mem.agenda || []).filter(a => a.date && a.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (dated.length) return dated[0];
  const undated = (mem.agenda || []).filter(a => !a.date);
  return undated.length ? undated[undated.length - 1] : null;
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

// Happy-moment sketchbook: save the description of a drawing the child made (text only — never the image).
export function addMoment(mem, description) {
  if (!Array.isArray(mem.moments)) mem.moments = [];
  mem.moments.push({ at: new Date().toISOString(), description: String(description || "").slice(0, 400) });
  if (mem.moments.length > 50) mem.moments = mem.moments.slice(-50);
}

// Warm, replayable list of the child's saved moments ("" if none). The collection name is per-character
// (Reed's "sketchbook", Mira's "Pocket Museum"). Screened by guard-out before send.
export function momentsText(mem, collection = "sketchbook") {
  if (!Array.isArray(mem.moments) || mem.moments.length === 0) return "";
  const lines = mem.moments.map((m, i) => `${i + 1}. ${m.description}`);
  return `Here are the things we've kept in your ${collection}:\n\n${lines.join("\n")}\n\nI'll keep them safe for you. 🌟`;
}

// ── Mira-the-organizer: chores / hobbies / agenda ────────────────────────────────────────────────
// These are the CHILD's own helper — their little jobs, the things they love, what's coming up. Never a
// grown-up's task list, never nagging. All three are plain local lists (same pattern as moments[]), and
// every reply that reads them back is still screened by guard-out before the child sees it.

const norm = (s) => String(s || "").trim().slice(0, 160);

export function addChore(mem, text) {
  if (!Array.isArray(mem.chores)) mem.chores = [];
  const s = norm(text);
  if (!s || mem.chores.some(c => !c.done && c.text.toLowerCase() === s.toLowerCase())) return;
  mem.chores.push({ at: new Date().toISOString(), text: s, done: false });
  if (mem.chores.length > 60) mem.chores = mem.chores.slice(-60);
}
// Mark a job finished by fuzzy text match (escalate-only: never un-completes).
export function completeChore(mem, text) {
  if (!Array.isArray(mem.chores)) return;
  const s = norm(text).toLowerCase();
  if (!s) return;
  const hit = mem.chores.find(c => !c.done &&
    (c.text.toLowerCase() === s || c.text.toLowerCase().includes(s) || s.includes(c.text.toLowerCase())));
  if (hit) hit.done = true;
}
export function choresText(mem) {
  const list = mem.chores || [];
  if (!list.length) return "";
  const open = list.filter(c => !c.done), done = list.filter(c => c.done);
  const L = [];
  if (open.length) { L.push("Here are your little jobs:"); open.forEach((c, i) => L.push(`${i + 1}. ${c.text}`)); }
  if (done.length) { L.push(`${open.length ? "\n" : ""}Already done 🎉`); done.forEach(c => L.push(`✓ ${c.text}`)); }
  L.push("\nNo rush — we do them when you're ready. 💛");
  return L.join("\n");
}

export function addHobby(mem, text) {
  if (!Array.isArray(mem.hobbies)) mem.hobbies = [];
  const s = norm(text);
  if (!s || mem.hobbies.some(h => h.text.toLowerCase() === s.toLowerCase())) return;
  mem.hobbies.push({ at: new Date().toISOString(), text: s });
  if (mem.hobbies.length > 60) mem.hobbies = mem.hobbies.slice(-60);
}
export function hobbiesText(mem) {
  const list = mem.hobbies || [];
  if (!list.length) return "";
  return `Things you love to do:\n${list.map((h, i) => `${i + 1}. ${h.text}`).join("\n")}\n\nI'll remember these for a slow day. 💛`;
}

// text = what it is; date = ISO from dates.js (may be null if the child gave no time).
export function addAgenda(mem, text, date) {
  if (!Array.isArray(mem.agenda)) mem.agenda = [];
  const s = norm(text);
  if (!s) return;
  mem.agenda.push({ at: new Date().toISOString(), text: s, date: date || null });
  if (mem.agenda.length > 60) mem.agenda = mem.agenda.slice(-60);
}
export function agendaText(mem, now = new Date()) {
  const list = mem.agenda || [];
  if (!list.length) return "";
  const today = todayISO(now);
  const dated = list.filter(a => a.date && a.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1));
  const undated = list.filter(a => !a.date);
  if (!dated.length && !undated.length) return "";
  const L = ["Here's what's coming up:"];
  for (const a of dated) L.push(`• ${a.text} — ${humanizeDate(a.date, now)}`);
  for (const a of undated) L.push(`• ${a.text}`);
  L.push("\nI'll keep reminding you. 💛");
  return L.join("\n");
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
