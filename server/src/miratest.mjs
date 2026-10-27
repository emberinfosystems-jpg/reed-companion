// Prove the platform: same engine, two distinct voices — and Mira's Pocket Museum saves like the sketchbook.
import { reedTurn, startSkill } from "./orchestrator.js";
import { erase, load } from "./memory.js";
import { readFileSync } from "node:fs";
const dataUrl = "data:image/jpeg;base64," + readFileSync(new URL("../../frontend/public/reed.jpg", import.meta.url)).toString("base64");

for (const c of ["reed", "mira"]) {
  const id = `_char_${c}`; erase(id);
  const r = await reedTurn(id, "hi! who are you and what do you like to do?", null, c);
  console.log(`\n[${c.toUpperCase()}] ${r.reply.slice(0, 200)}`);
  erase(id);
}

// Mira's museum: start skill -> show a found thing -> it saves to the same gallery -> replay
const id = "_mira_museum"; erase(id);
const s = await startSkill(id, "museum", "mira");
console.log(`\n[MIRA museum start] ${s.reply.slice(0, 160)}`);
const t = await reedTurn(id, "look at this i found!", dataUrl, "mira");
console.log(`[MIRA sees it] ${t.reply.slice(0, 180)}`);
console.log(`  saved to museum: ${load(id).moments.length} item(s)`);
const rp = await reedTurn(id, "can i see my pocket museum?", null, "mira");
console.log(`[MIRA replay] ${rp.reply.slice(0, 180)}`);
erase(id);
