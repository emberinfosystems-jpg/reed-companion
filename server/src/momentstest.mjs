// Dogfood the Happy Moment Sketchbook: start the skill -> show a drawing (saves a moment) -> replay.
import { reedTurn, startSkill } from "./orchestrator.js";
import { erase, load } from "./memory.js";
import { readFileSync } from "node:fs";
const dataUrl = "data:image/jpeg;base64," + readFileSync(new URL("../../frontend/public/reed.jpg", import.meta.url)).toString("base64");

const id = "_moments_test";
erase(id);

const s = await startSkill(id, "moments");
console.log("START:", s.reply.slice(0, 140), "\n");

const t1 = await reedTurn(id, "look what i drew!", dataUrl);
console.log("SHOW DRAWING:", t1.reply.slice(0, 180));
const saved = load(id).moments;
console.log(`  -> saved ${saved.length} moment(s); first: ${JSON.stringify(saved[0]?.description?.slice(0, 90))}\n`);

const t2 = await reedTurn(id, "can you show me my happy moments?");
console.log("REPLAY [decision", t2.trace.decision + "]:", t2.reply.slice(0, 240), "\n");

// guard: the raw image must NOT be stored (text only)
const rawHasImage = JSON.stringify(load(id)).includes("data:image");
console.log("raw image leaked into memory?", rawHasImage ? "YES (BUG)" : "no (text only) ✓");
erase(id);
