// Deterministic exact-string FIND/REPLACE applier.
// Written by Nemotron-3-Ultra-550B, human-reviewed (the main-module check was fixed for Windows).
// WHY it exists: LLMs produce correct code edits but broken unified-diff metadata (wrong @@ line counts).
// So instead of asking a model for a diff, have it emit exact { file, find, replace } edits, and apply
// them here by exact text match — no line-number arithmetic for the model to get wrong.
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { argv, exit } from "node:process";

/**
 * Apply exact-string FIND/REPLACE edits to files.
 * @param {Array<{file:string, find:string, replace:string}>} edits
 * @param {{dryRun?:boolean}} opts
 * @returns {Promise<Array<{file:string, edits:number, written:boolean}>>}
 */
export async function applyEdits(edits, opts = {}) {
  const { dryRun = false } = opts;

  // Group edits by file, preserving input order per file.
  const byFile = new Map();
  for (const { file, find, replace } of edits) {
    if (!byFile.has(file)) byFile.set(file, []);
    byFile.get(file).push({ find, replace });
  }

  // VALIDATE-ALL-FIRST: simulate every edit in memory across every file; throw on any mismatch so a bad
  // edit never leaves files half-applied. Writes happen only in the second pass.
  const finalText = new Map();
  for (const [file, list] of byFile) {
    let text = await readFile(file, "utf8");
    for (const { find, replace } of list) {
      let count = 0, pos = -1;
      while ((pos = text.indexOf(find, pos + 1)) !== -1) count++;
      if (count === 0) throw new Error(`${file}: find not found`);
      if (count > 1) throw new Error(`${file}: find occurs ${count} times (make it more specific)`);
      const idx = text.indexOf(find);
      text = text.slice(0, idx) + replace + text.slice(idx + find.length);
    }
    finalText.set(file, text);
  }

  // Second pass: write (or, for a dry run, just report) once per file.
  const summaries = [];
  for (const [file, text] of finalText) {
    if (!dryRun) await writeFile(file, text, "utf8");
    summaries.push({ file, edits: byFile.get(file).length, written: !dryRun });
  }
  return summaries;
}

// CLI: node applyEdits.mjs <edits.json> [--dry-run]
if (import.meta.url === pathToFileURL(argv[1] || "").href) {
  (async () => {
    try {
      const [, , editsPath, ...flags] = argv;
      if (!editsPath) throw new Error("Usage: node applyEdits.mjs <edits.json> [--dry-run]");
      const edits = JSON.parse(await readFile(editsPath, "utf8"));
      const summary = await applyEdits(edits, { dryRun: flags.includes("--dry-run") });
      for (const { file, edits: n, written } of summary)
        console.log(`${written ? "WRITE" : "DRY  "} ${file} (${n} edit${n !== 1 ? "s" : ""})`);
      exit(0);
    } catch (e) {
      console.error("ERROR:", e.message);
      exit(1);
    }
  })();
}
