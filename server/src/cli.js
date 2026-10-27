// Dogfood Reed in the terminal before any UI. Usage: npm run cli  (needs .env copied from .env.example)
import readline from "node:readline";
import { reedTurn } from "./orchestrator.js";
import { provider } from "./models.js";

const childId = process.argv[2] || "demo-kid";
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

console.log(`\n🧡 Reed (provider: ${provider()}, child: ${childId}). Type 'exit' to quit.\n`);
console.log("Reed: Hi! I'm Reed. I'm really glad you're here. What should we do today?\n");

while (true) {
  const text = (await ask("You: ")).trim();
  if (!text || text.toLowerCase() === "exit") break;
  const t0 = Date.now();
  const { reply, trace } = await reedTurn(childId, text);
  console.log(`\nReed: ${reply}`);
  console.log(`   [guard-in: ${trace.safe ? "OK" : "FLAG"} · intent ${trace.intent} · ${Date.now() - t0}ms]\n`);
}
rl.close();
