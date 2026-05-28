// Codemod: parse `tsc` diagnostics and insert `: any` at each TS7006/TS7031/TS7034/TS7005/TS18046/TS18048 position.
// Run repeatedly until no more relevant errors remain.
//
// This file is a one-shot migration tool for the TypeScript port (FEAT-021).
// It will be deleted after the port is complete.

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

function runTsc() {
  try {
    execSync("npx tsc --project tsconfig.json --noEmit --pretty false", { encoding: "utf8" });
    return "";
  } catch (err) {
    return err.stdout || "";
  }
}

function parseDiagnostics(output) {
  // Format: src/path/file.mts(line,col): error TSnnnn: message
  const re = /^(.+?)\((\d+),(\d+)\): error TS(\d+): (.+)$/gm;
  const diags: any[] = [];
  let m;
  while ((m = re.exec(output)) !== null) {
    diags.push({
      file: m[1],
      line: parseInt(m[2], 10),
      col: parseInt(m[3], 10),
      code: parseInt(m[4], 10),
      msg: m[5]
    });
  }
  return diags;
}

function applyFix(file, line, col, fix) {
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");
  const original = lines[line - 1];
  if (!original) return false;
  const before = original.slice(0, col - 1 + fix.skipFromCol);
  const after = original.slice(col - 1 + fix.skipFromCol);
  // Find the identifier end (word boundary or non-identifier char)
  let end = 0;
  const idMatch = /^([A-Za-z_$][\w$]*)/.exec(after);
  if (!idMatch) return false;
  end = idMatch[0].length;
  // Look ahead: if already typed (next chars are `: `), skip
  if (after.slice(end, end + 2) === ": " || after.slice(end, end + 1) === ":") return false;
  // Skip if followed by `?: ` or `?:` (optional with type)
  if (after.slice(end, end + 2) === "?:") return false;
  const insertion = fix.kind === "param" ? ": any" : fix.kind === "catch" ? ": any" : ": any";
  lines[line - 1] = before + after.slice(0, end) + insertion + after.slice(end);
  writeFileSync(file, lines.join("\n"));
  return true;
}

function applyDestructureFix(file, line, col) {
  // TS7031: binding element. We need to find the enclosing { ... } and add `: any` after the closing `}`.
  // Strategy: from (line, col), walk back to find the opening `{`, then forward to matching `}`, then insert `: any`.
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");
  if (!lines[line - 1]) return false;
  // Concatenate to a flat offset for easier brace matching
  // Simpler: find on same line, walk back to nearest `(` or `,` outside braces, then find next `}` and insert `: any`
  const ln = lines[line - 1];
  // Find the `{` to the left of col-1
  let i = col - 2;
  let depth = 0;
  let braceStart = -1;
  while (i >= 0) {
    if (ln[i] === "}") depth++;
    else if (ln[i] === "{") {
      if (depth === 0) {
        braceStart = i;
        break;
      }
      depth--;
    }
    i--;
  }
  if (braceStart < 0) return false;
  // Now find matching closing `}` after braceStart
  let j = braceStart + 1;
  depth = 1;
  while (j < ln.length) {
    if (ln[j] === "{") depth++;
    else if (ln[j] === "}") {
      depth--;
      if (depth === 0) break;
    }
    j++;
  }
  if (depth !== 0) return false;
  const braceEnd = j;
  // Check if already typed
  const after = ln.slice(braceEnd + 1);
  if (after.startsWith(":")) return false;
  lines[line - 1] = ln.slice(0, braceEnd + 1) + ": any" + ln.slice(braceEnd + 1);
  writeFileSync(file, lines.join("\n"));
  return true;
}

const HANDLED_CODES = new Set([7006, 7031, 7034, 7005, 18046, 18048, 18047]);

let pass = 0;
let prevCount = Infinity;
while (true) {
  pass++;
  const output = runTsc();
  if (!output) {
    console.log(`Pass ${pass}: no errors. Done.`);
    break;
  }
  const diags = parseDiagnostics(output);
  const handled = diags.filter((d) => HANDLED_CODES.has(d.code));
  console.log(`Pass ${pass}: ${diags.length} total errors, ${handled.length} addressable.`);
  if (handled.length === 0) {
    console.log("No more addressable errors; remaining are not implicit-any.");
    break;
  }
  if (handled.length >= prevCount) {
    console.log(`Stalled at ${handled.length}. Stopping to avoid infinite loop.`);
    break;
  }
  prevCount = handled.length;

  // Group by file, process from bottom of file up to keep col/line offsets stable
  const byFile = new Map();
  for (const d of handled) {
    if (!byFile.has(d.file)) byFile.set(d.file, []);
    byFile.get(d.file).push(d);
  }
  for (const [file, list] of byFile) {
    list.sort((a, b) => b.line - a.line || b.col - a.col);
    for (const d of list) {
      if (d.code === 7031) {
        applyDestructureFix(file, d.line, d.col);
      } else if (d.code === 18046 || d.code === 18048 || d.code === 18047) {
        applyFix(file, d.line, d.col, { kind: "catch", skipFromCol: 0 });
      } else {
        applyFix(file, d.line, d.col, { kind: "param", skipFromCol: 0 });
      }
    }
  }
  if (pass > 30) {
    console.log("Max passes hit.");
    break;
  }
}
