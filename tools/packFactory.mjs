// Reed Pack-Factory — the platform grows ITSELF, safely.
// Nemotron (the BIG model on Nebius) drafts new kid-appropriate skill packs; a DETERMINISTIC gate then
// enforces the schema AND the content rules (no trademarked characters/brands, no medical, PG) in code —
// so generation is autonomous but PUBLICATION is gated. Valid packs are written to server/packs/candidates/
// for human review; a reviewer moves the good ones up into server/packs/ where the loader picks them up with
// NO code change. Every pack still rides guard-in -> brain -> guard-out at runtime (safety by construction).
//
// Reads BIG_BASE_URL / BIG_API_KEY / BIG_MODEL from server/.env WITHOUT printing the key.
//   node tools/packFactory.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(ROOT, "server/.env"), "utf8").split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const BASE = env.BIG_BASE_URL, KEY = env.BIG_API_KEY, MODEL = env.BIG_MODEL || "nvidia/nemotron-3-super-120b-a12b";
if (!BASE || !KEY) { console.error("missing BIG_BASE_URL / BIG_API_KEY in server/.env"); process.exit(1); }

// Topics are generic activities ON PURPOSE — never licensed characters or brands.
const TOPICS = [
  { id: "space-explorers", hint: "pretend space exploration — planets, rockets, stars, astronauts" },
  { id: "dino-dig",        hint: "a friendly dinosaur dig — digging up fossils, naming dinosaurs, gentle facts" },
  { id: "story-garden",    hint: "collaborative make-believe storytelling, one line at a time" },
  { id: "animal-friends",  hint: "learning about and imagining friendly animals and their homes" },
];

const SYSTEM = `You author "skill packs" for Reed, a warm AI companion for children about 6-12 in the hospital.
A pack is a small activity theme. Return ONLY a single JSON object (no prose, no markdown fence) with EXACTLY these string fields:
- "id": short kebab-case id (lowercase letters, digits, hyphens only)
- "label": a cheerful 2-4 word chip name
- "emoji": ONE emoji
- "prompt": the system instruction for Reed in this activity. MUST say: stay warm and encouraging; keep replies to 1-4 short sentences; use simple words; celebrate effort; never shame; if the child seems upset, gently suggest telling a grown-up who is there. Age 6-12. PG only.
- "starter": Reed's cheerful opening line to the child.
HARD RULES (a pack that breaks any is rejected):
- NO trademarked or real brand names, franchises, or named characters (no Pokemon, Minecraft, Bluey, Marvel, Disney, YouTubers, etc.). Only generic, original themes.
- NO medical, health, diagnosis, medicine, or treatment content; no scary/violent/gory content; no romance; no collecting personal info (real name, address, school, photos).
- Nothing that tells a child to do something physically risky (real cooking with heat/knives, climbing, etc.) — keep it pretend/imaginative.
Keep it kind, simple, and safe.`;

// ---- deterministic content gate (enforced in CODE, not just prompted) ----
const BANNED = [
  // brands / franchises / IP (sample blocklist — extend as needed)
  "pokemon","pikachu","minecraft","roblox","fortnite","bluey","paw patrol","peppa","disney","pixar","marvel",
  "spider-man","spiderman","batman","star wars","mario","nintendo","sonic","barbie","lego","youtube","tiktok",
  "mrbeast","frozen","elsa","harry potter","taylor swift",
  // unsafe / off-limits domains
  "medicine","medication","diagnos","treatment","symptom","suicide","kill yourself","hospital stay is",
  "address","phone number","password","credit card",
];
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function extractJson(text) {
  // Nemotron reasons; grab the last {...} block.
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("no JSON object in model output");
  return JSON.parse(m[0]);
}
function gate(p) {
  for (const k of ["id", "label", "emoji", "prompt", "starter"]) {
    if (typeof p[k] !== "string" || !p[k].trim()) throw new Error(`missing/invalid "${k}"`);
  }
  if (!KEBAB.test(p.id)) throw new Error(`id not kebab-case: "${p.id}"`);
  const blob = `${p.label} ${p.prompt} ${p.starter}`.toLowerCase();
  const hit = BANNED.find((b) => blob.includes(b));
  if (hit) throw new Error(`banned term "${hit}" — rejected (IP/safety gate)`);
  if (p.prompt.length < 80) throw new Error("prompt too thin");
  // keep only the whitelisted fields (mirror the loader's sanitize)
  return { id: p.id.trim(), label: p.label.trim(), emoji: p.emoji.trim(),
           prompt: p.prompt.trim(), starter: p.starter.trim(), characters: ["reed"] };
}

async function draft(topic) {
  const res = await fetch(`${BASE.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: SYSTEM },
                 { role: "user", content: `Make a pack with id "${topic.id}" about: ${topic.hint}` }],
      temperature: 0.7, max_tokens: 1200,
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return extractJson(data.choices?.[0]?.message?.content || "");
}

const OUT = join(ROOT, "server/packs/candidates");
mkdirSync(OUT, { recursive: true });
const existing = new Set(
  existsSync(join(ROOT, "server/packs"))
    ? readdirSync(join(ROOT, "server/packs")).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""))
    : []
);

let ok = 0, bad = 0;
for (const t of TOPICS) {
  try {
    const raw = await draft(t);
    const pack = gate(raw);
    if (existing.has(pack.id)) { console.log(`• ${t.id}: id already exists — skipped`); continue; }
    writeFileSync(join(OUT, `${pack.id}.json`), JSON.stringify(pack, null, 2));
    console.log(`✅ ${pack.id} — "${pack.label}" ${pack.emoji}  → candidates/${pack.id}.json`);
    ok++;
  } catch (e) { console.log(`❌ ${t.id}: ${e.message}`); bad++; }
}
console.log(`\nDONE. ${ok} passed the gate, ${bad} rejected. Review candidates/, move good ones up to server/packs/.`);
