// Proves applyEdits.mjs: unit cases + the capstone — applying the exact else-if edit that broke Kimi's diff.
import { applyEdits } from "./applyEdits.mjs";
import { writeFile, readFile, mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name}`); } };
const threw = async (fn, re) => { try { await fn(); return false; } catch (e) { return re.test(e.message); } };

const dir = await mkdtemp(join(tmpdir(), "applyedits-"));
try {
  // 1) a valid edit is applied
  const f = join(dir, "a.txt");
  await writeFile(f, "hello world\nkeep me\n");
  await applyEdits([{ file: f, find: "hello world", replace: "goodbye world" }]);
  ok("valid edit applied", (await readFile(f, "utf8")) === "goodbye world\nkeep me\n");

  // 2) find-not-found throws
  ok("not-found throws", await threw(() => applyEdits([{ file: f, find: "nope", replace: "x" }]), /not found/));

  // 3) ambiguous (2+ matches) throws
  const g = join(dir, "b.txt"); await writeFile(g, "dup\ndup\n");
  ok("ambiguous throws", await threw(() => applyEdits([{ file: g, find: "dup", replace: "x" }]), /occurs 2 times/));

  // 4) dry-run does not write
  const h = join(dir, "c.txt"); await writeFile(h, "untouched");
  await applyEdits([{ file: h, find: "untouched", replace: "CHANGED" }], { dryRun: true });
  ok("dry-run writes nothing", (await readFile(h, "utf8")) === "untouched");

  // 5) validate-all-first: a batch with one bad edit writes NOTHING
  const i = join(dir, "d.txt"); await writeFile(i, "aaa");
  await threw(() => applyEdits([{ file: i, find: "aaa", replace: "bbb" }, { file: i, find: "ZZZ", replace: "y" }]), /not found/);
  ok("atomic: bad edit in batch -> no partial write", (await readFile(i, "utf8")) === "aaa");

  // 6) CAPSTONE: the exact else-if edit that produced a dangling-else in Kimi's unified diff.
  // Applied by exact text match, it yields valid syntax — which `node --check` confirms.
  const orch = join(dir, "orch.mjs");
  // A valid if/else-if/else, matching reedTurn's real shape. Kimi's DIFF, applied, duplicated the
  // `} else {` into a dangling-else SyntaxError; this exact-match edit REPLACES it, so it stays valid.
  await writeFile(orch, [
    "function reedTurn(gin, text, mem) {",
    "  let reply;",
    "  if (gin === 'CARE') {",
    "    reply = 1;",
    "  } else if (gin === 'BLOCK') {",
    "    reply = 2;",
    "  } else {",
    "    reply = 4;",
    "  }",
    "  return reply;",
    "}",
  ].join("\n"));
  await applyEdits([{
    file: orch,
    find: "  } else {\n    reply = 4;",
    replace: "  } else if (showMoments(text)) {\n    reply = 3;\n  } else {\n    reply = 4;",
  }]);
  let compiles = true;
  try { execFileSync(process.execPath, ["--check", orch]); } catch { compiles = false; }
  ok("capstone: the edit that broke Kimi's diff applies and COMPILES", compiles);

  console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"}: ${pass}/${pass + fail}`);
  process.exit(fail === 0 ? 0 : 1);
} finally {
  await rm(dir, { recursive: true, force: true });
}
