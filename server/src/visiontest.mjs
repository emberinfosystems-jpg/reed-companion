import { reedTurn } from "./orchestrator.js";
import { erase } from "./memory.js";
import { readFileSync } from "node:fs";

// Use Reed's own concept art as a stand-in "drawing" to exercise the full look_at_drawing tool path.
const b64 = readFileSync(new URL("../../frontend/public/reed.jpg", import.meta.url)).toString("base64");
const dataUrl = "data:image/jpeg;base64," + b64;

const id = "_vision_test";
erase(id);
const t0 = Date.now();
const { reply, trace } = await reedTurn(id, "look what i drew! 🎨", dataUrl);
console.log(`[${Date.now() - t0}ms] DECISION: ${trace.decision}`);
console.log(`REED: ${reply}`);
erase(id);
