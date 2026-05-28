import fs from "node:fs/promises";
import path from "node:path";

// Detects ad-hoc Wiggin Loop installs (the hand-pasted HARD RULE blocks from
// CLAUDE.md in WigginHarnes / MemoryService / AstraGenie.Tools) and:
//   1. Extracts custom phase-gate commands into a config object
//   2. Strips the ad-hoc blocks from CLAUDE.md so the installer can write the
//      new marker-bracketed block in their place
//
// The extracted commands NEVER execute during migration — they only seed the
// config. Actual execution happens later through phase-gate's execFile path.

// Canonical HARD RULE H2 header (what the installer writes today).
const AUTONOMOUS_LOOP_HEADER = "## Autonomous Loop Instruction — HARD RULE";

// Header variants observed in the wild from hand-pasted / drift installs.
// The migrator anchors removal on the FIRST of these found in CLAUDE.md.
// Anything matching a variant is treated as the start of the ad-hoc block.
const ADHOC_HEADER_VARIANTS = [
  AUTONOMOUS_LOOP_HEADER,
  "## Autonomous Loop — HARD RULE",
  "## HARD RULE — Loop Goal",
  "## Autonomous Backlog + Wiggin Loop",
  "## Autonomous Backlog System + How to Start the Loop"
];

const _CROSS_SLICE_HEADER = "**Cross-Slice Continuation — HARD RULE";
const PHASE_GATE_HEADER = "**Phase Completion Gate — HARD RULE";
const FIRST_ACTION_HEADER = "## First Action — Starting the Loop";

// Find the first variant present in content; return { header, index } or null.
function findFirstAdhocHeader(content) {
  let best: any = null;
  for (const header of ADHOC_HEADER_VARIANTS) {
    const idx = content.indexOf(header);
    if (idx === -1) continue;
    if (best === null || idx < best.index) {
      best = { header, index: idx };
    }
  }
  return best;
}

// Parse a backtick-quoted command line and split it into {cmd, args}.
// Quote-aware split: respects single and double quotes so paths with spaces
// pass through correctly. Returns null if parsing fails.
export function parseCommandLine(rawLine) {
  if (typeof rawLine !== "string") return null;
  const line = rawLine.trim();
  if (!line) return null;
  const tokens: any[] = [];
  let current = "";
  let quote: any = null;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (ch === " ") {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += ch;
  }
  if (current) {
    tokens.push(current);
  }
  if (tokens.length === 0) return null;
  return { cmd: tokens[0], args: tokens.slice(1) };
}

// Extract the inside of the first backtick span on a line.
function extractBacktickContent(line) {
  const match = line.match(/`([^`]+)`/);
  return match ? match[1] : null;
}

// Walk the Phase Completion Gate block, find numbered items, pull out
// shell-quoted commands. Returns an array of stage candidates:
//   { hint: "build" | "test" | "frontendBuild" | "infraPlan" | "aspireBoot" | "other",
//     command: {cmd, args} }
// Pattern-based hint resolution. First match wins; line-level overrides
// (e.g. "aspire" / "frontend" mentions in the surrounding prose) get
// resolved by classifyLineHint below.
const HINT_PATTERNS = [
  { hint: "build", match: (p) => p.cmd === "dotnet" && p.args[0] === "build" },
  { hint: "test", match: (p) => p.cmd === "dotnet" && p.args[0] === "test" },
  { hint: "test", match: (p) => p.cmd === "pytest" },
  { hint: "frontendBuild", match: (p) => p.cmd === "npm" && p.args.includes("build") },
  { hint: "infraPlan", match: (p) => p.cmd === "terraform" && p.args[0] === "plan" },
  { hint: "aspireBoot", match: (p) => p.cmd === "dotnet" && p.args[0] === "run" }
];

function classifyCommandHint(parsed) {
  return HINT_PATTERNS.find((p) => p.match(parsed))?.hint || "other";
}

function applyLineHintOverride(hint, parsed, line) {
  const lower = line.toLowerCase();
  if (lower.includes("aspire") && parsed.cmd === "dotnet" && parsed.args[0] === "run") {
    return "aspireBoot";
  }
  if (lower.includes("frontend") && parsed.cmd === "npm") {
    return "frontendBuild";
  }
  return hint;
}

function extractPhaseGateCommands(blockText) {
  const candidates: any[] = [];
  for (const line of blockText.split("\n")) {
    const cmdString = extractBacktickContent(line);
    if (!cmdString) continue;
    const parsed = parseCommandLine(cmdString);
    if (!parsed) continue;
    const hint = applyLineHintOverride(classifyCommandHint(parsed), parsed, line);
    candidates.push({ hint, command: parsed });
  }
  return candidates;
}

function findBlockRange(content, startHeader) {
  const startIdx = content.indexOf(startHeader);
  if (startIdx === -1) return null;
  // Block ends at the next horizontal rule (---) or the next H2 after startIdx.
  const restStart = startIdx + startHeader.length;
  const horizontalRuleIdx = content.indexOf("\n---\n", restStart);
  const nextH2 = content.indexOf("\n## ", restStart);
  const candidates = [horizontalRuleIdx, nextH2].filter((idx) => idx !== -1);
  if (candidates.length === 0) return { start: startIdx, end: content.length };
  const end = Math.min(...candidates);
  return { start: startIdx, end };
}

// Folds extracted phase-gate commands into the structured stack config.
// Push-many for build/test; first-wins for the single-slot stages.
function buildStackFromCandidates(candidates) {
  const stack: Record<string, any> = {
    build: [] as any[],
    test: [] as any[],
    frontendBuild: null,
    infraPlan: null,
    aspireBoot: null,
    healthchecks: [] as any[]
  };
  for (const c of candidates) {
    if (c.hint === "build") stack.build.push(c.command);
    else if (c.hint === "test") stack.test.push(c.command);
    else if (c.hint === "frontendBuild" && !stack.frontendBuild) stack.frontendBuild = c.command;
    else if (c.hint === "infraPlan" && !stack.infraPlan) stack.infraPlan = c.command;
    else if (c.hint === "aspireBoot" && !stack.aspireBoot) stack.aspireBoot = c.command;
  }
  return stack;
}

// Extends an initial cursor past every known loop header occurrence in
// `content`. Used so the deletion range covers the LAST loop-headed block
// (any of ADHOC_HEADER_VARIANTS or FIRST_ACTION_HEADER).
function extendCursorPastLoopHeaders(content, initialEnd, loopHeaders, removalStart) {
  let cursor = initialEnd;
  for (const header of loopHeaders) {
    const idx = content.indexOf(header);
    if (idx !== -1 && idx >= removalStart) {
      const endOfHeader = idx + header.length;
      if (endOfHeader > cursor) cursor = endOfHeader;
    }
  }
  return cursor;
}

// Scans forward from `startFrom` and returns the cut point: either the
// next non-loop H2, or the start of the loop marker block
// (whichever comes first), or EOF.
function findContentCutPoint(content, startFrom, loopHeaders) {
  let scanFrom = startFrom;
  for (;;) {
    const nextH2 = content.indexOf("\n## ", scanFrom);
    const nextMarker = content.indexOf("<!-- loop:start -->", scanFrom);
    if (nextH2 === -1 && nextMarker === -1) return content.length;
    if (nextMarker !== -1 && (nextH2 === -1 || nextMarker < nextH2)) return nextMarker;
    const headerLine = content.slice(nextH2 + 1, content.indexOf("\n", nextH2 + 1));
    if (loopHeaders.some((h) => headerLine.startsWith(h))) {
      scanFrom = nextH2 + 1;
      continue;
    }
    return nextH2 + 1;
  }
}

function computeRemovalEnd(content, initialEnd, loopHeaders) {
  const extended = extendCursorPastLoopHeaders(content, initialEnd, loopHeaders, initialEnd);
  return findContentCutPoint(content, extended, loopHeaders);
}

// Returns { extractedConfig, claudeMdRewritten, claudeMdPath, originalLength,
// newLength }.
export async function migrateAdhocInstall(repoPath) {
  const claudePath = path.join(repoPath, "CLAUDE.md");
  let content;
  try {
    content = await fs.readFile(claudePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return { extractedConfig: null, claudeMdRewritten: false, claudeMdPath: claudePath };
    }
    throw error;
  }

  const firstHeader = findFirstAdhocHeader(content);
  if (!firstHeader) {
    return { extractedConfig: null, claudeMdRewritten: false, claudeMdPath: claudePath };
  }

  // Find Phase Completion Gate block to extract commands.
  const phaseGateRange = findBlockRange(content, PHASE_GATE_HEADER);
  const phaseGateText = phaseGateRange
    ? content.slice(phaseGateRange.start, phaseGateRange.end)
    : "";
  const candidates = extractPhaseGateCommands(phaseGateText);

  const extractedConfig =
    candidates.length > 0 ? { stack: buildStackFromCandidates(candidates) } : null;

  // Range-delete the ad-hoc blocks. We delete from the FIRST recognized
  // loop header (any variant) up through the next H2 that ISN'T one of the
  // known loop headers — i.e. through the end of First Action if present,
  // otherwise through end of the last known block.
  const removalStart = firstHeader.index;
  const loopHeaders = [...ADHOC_HEADER_VARIANTS, FIRST_ACTION_HEADER];
  const removalEnd = computeRemovalEnd(
    content,
    removalStart + firstHeader.header.length,
    loopHeaders
  );

  // Strip trailing horizontal rule that often immediately precedes the next H2.
  const before = content.slice(0, removalStart).trimEnd();
  let after = content.slice(removalEnd).trimStart();
  // Drop a leading "---" + blank line from `after` if present — it was the
  // separator that lived between the ad-hoc blocks and the next section.
  after = after.replace(/^---\s*\n+/, "");
  const newContent = `${before}\n\n${after}\n`.replace(/\n{3,}/g, "\n\n");

  await fs.writeFile(claudePath, newContent);

  return {
    extractedConfig,
    claudeMdRewritten: true,
    claudeMdPath: claudePath,
    originalLength: content.length,
    newLength: newContent.length
  };
}
