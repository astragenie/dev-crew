// crew-bundle-parser.mts — extract per-stage progress markers + per-tool calls
// from a crew artifact bundle file. Pure function over the file body; the only
// I/O is the explicit fs.readFile in parseCrewBundle.
//
// Expected bundle shape (illustrative — see src/tests/fixtures/crew-bundle-sample.md):
//
//   ---
//   agent: devcrew:builder
//   slice: SLICE-1
//   started: 2026-06-15T12:00:00Z
//   ---
//
//   ## Stage: discover
//
//   Description line.
//
//   ### Tool: Read
//   - path: src/foo.mts
//   - duration_ms: 42
//
// Real crew bundles on disk (`.claude/artifacts/crew/bundles/orphan/*.md`)
// today carry a `## Handoff` / `## Diff` / `## Files touched` layout without
// per-stage or per-tool markers. The Stage/Tool format here is the contract
// for the streaming upstream (M3.5 follow-up). Until then the parser falls
// back to an empty `progressMarkers` / `toolCalls` array, which the narrative
// emitter treats as a no-op.

import fs from "node:fs/promises";

export interface ProgressMarker {
  stage: string;
  description: string;
  ts?: string;
}

export interface ToolCallRecord {
  toolName: string;
  argsJson?: string;
  durationMs?: number;
  ts?: string;
}

export interface CrewBundleParseResult {
  agent?: string;
  sliceId?: string;
  startedAt?: string;
  progressMarkers: ProgressMarker[];
  toolCalls: ToolCallRecord[];
}

export async function parseCrewBundle(filePath: string): Promise<CrewBundleParseResult> {
  const raw = await fs.readFile(filePath, "utf8");
  return parseCrewBundleContent(raw);
}

interface Frontmatter {
  agent?: string;
  sliceId?: string;
  startedAt?: string;
}

function parseFrontmatter(raw: string): Frontmatter {
  const fm: Frontmatter = {};
  const fmMatch = /^---\n([\s\S]*?)\n---\n/.exec(raw);
  if (!fmMatch || !fmMatch[1]) return fm;
  for (const line of fmMatch[1].split("\n")) {
    const [k, ...rest] = line.split(":");
    const v = rest.join(":").trim();
    if (k === "agent") fm.agent = v;
    else if (k === "slice") fm.sliceId = v;
    else if (k === "started") fm.startedAt = v;
  }
  return fm;
}

function parseStageMarkers(raw: string): ProgressMarker[] {
  const out: ProgressMarker[] = [];
  const stageRe = /## Stage: ([^\n]+)\n\n([^\n#]+)/g;
  let m: RegExpExecArray | null;
  while ((m = stageRe.exec(raw)) !== null) {
    const stage = m[1]?.trim();
    const description = m[2]?.trim();
    if (!stage || !description) continue;
    out.push({ stage, description });
  }
  return out;
}

function parseToolCallBlock(toolName: string, block: string): ToolCallRecord {
  const durMatch = /- duration_ms:\s*(\d+)/.exec(block);
  const argsBlock = block
    .split("\n")
    .filter((l) => l.startsWith("- ") && !l.startsWith("- duration_ms"))
    .map((l) => l.slice(2))
    .join("\n");
  const record: ToolCallRecord = { toolName };
  if (argsBlock) record.argsJson = JSON.stringify({ raw: argsBlock });
  if (durMatch && durMatch[1]) record.durationMs = parseInt(durMatch[1], 10);
  return record;
}

function parseToolCalls(raw: string): ToolCallRecord[] {
  const out: ToolCallRecord[] = [];
  const toolRe = /### Tool: ([^\n]+)\n((?:- [^\n]+\n?)+)/g;
  let m: RegExpExecArray | null;
  while ((m = toolRe.exec(raw)) !== null) {
    const toolName = m[1]?.trim();
    const block = m[2];
    if (!toolName || !block) continue;
    out.push(parseToolCallBlock(toolName, block));
  }
  return out;
}

export function parseCrewBundleContent(raw: string): CrewBundleParseResult {
  const fm = parseFrontmatter(raw);
  const result: CrewBundleParseResult = {
    progressMarkers: parseStageMarkers(raw),
    toolCalls: parseToolCalls(raw)
  };
  if (fm.agent !== undefined) result.agent = fm.agent;
  if (fm.sliceId !== undefined) result.sliceId = fm.sliceId;
  if (fm.startedAt !== undefined) result.startedAt = fm.startedAt;
  return result;
}
