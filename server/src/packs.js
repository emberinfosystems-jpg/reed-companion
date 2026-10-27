// Skill-pack loader — the extensibility primitive. A "pack" is a small JSON file in server/packs/
// that drops a new activity (e.g. a grade-level homework tutor) into the SAME shared engine. Dropping a
// file = a new skill chip, with NO code change. Packs are the user-authorable, downloadable surface the
// platform is built for (Reed + Mira are just two reference instances of it).
//
// SAFETY BY CONSTRUCTION: a pack supplies only DECLARATIVE content (a label, an emoji, a tutoring prompt,
// an opening line). The loader copies EXACTLY those whitelisted fields and nothing else — a pack cannot
// define behavior around the guards, so every pack turn still runs guard-in -> brain -> guard-out. Even a
// user-authored pack inherits the red-teamed safety for free and can never become an escape hatch.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PACKS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../packs");

// Copy only the fields the engine understands. Throws on a malformed pack so it is skipped, not trusted.
function sanitize(raw, file) {
  for (const k of ["id", "label", "emoji", "prompt", "starter"]) {
    if (typeof raw[k] !== "string" || !raw[k].trim()) throw new Error(`missing/invalid "${k}"`);
  }
  const characters = Array.isArray(raw.characters) && raw.characters.length
    ? raw.characters.filter((c) => typeof c === "string" && c.trim())
    : ["reed"];
  return {
    id: raw.id.trim(), label: raw.label.trim(), emoji: raw.emoji.trim(),
    prompt: raw.prompt.trim(), starter: raw.starter.trim(),
    grade: typeof raw.grade === "string" ? raw.grade.trim() : "",
    subject: typeof raw.subject === "string" ? raw.subject.trim() : "",
    characters, pack: true,
  };
}

export function loadPacks() {
  if (!existsSync(PACKS_DIR)) return [];
  const out = [];
  const seen = new Set();
  for (const f of readdirSync(PACKS_DIR).sort()) {
    if (!f.endsWith(".json")) continue;
    try {
      const parsed = JSON.parse(readFileSync(join(PACKS_DIR, f), "utf8"));
      for (const item of Array.isArray(parsed) ? parsed : [parsed]) {
        const p = sanitize(item, f);
        if (seen.has(p.id)) { console.warn(`[packs] duplicate id "${p.id}" in ${f} — skipped`); continue; }
        seen.add(p.id);
        out.push(p);
      }
    } catch (e) { console.warn(`[packs] skipped ${f}: ${e.message}`); }
  }
  if (out.length) console.log(`[packs] loaded ${out.length}: ${out.map((p) => p.id).join(", ")}`);
  return out;
}

export const PACKS = loadPacks();
