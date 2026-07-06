// eval-generator.mts — FEAT-222: turns a clustered failure signal
// (FailureCluster, FEAT-221) into a machine-manufactured crew eval-spec test
// entry, appended into the existing evals/agents/crew-<agent>.yaml file in a
// sibling crew (dev-team) checkout.
//
// Contract: DEC-068 (.claude/artifacts/loop/decisions/DEC-068.md). Targets the
// crew eval-spec YAML format (evals/lib/run-eval.ts's tolerant
// `parseYaml(raw) as EvalSpec` cast) — never the gepa-core Trial JSONL.
// Append-only: writes into the EXISTING per-agent file, never a second file
// sharing a `prompt_id` (findSpecByPromptId only returns the first match).
// Never-throw: every per-cluster failure (unmapped failure_class, missing
// loop.crewRepoPath, missing target file, duplicate cluster_hash) resolves to
// a skip with a logged reason, not an exception (AC-4, DEC-068 §7).
//
// Zero-dep hand-rolled YAML append, mirroring frontmatter.mts's convention:
// the target evals/agents/*.yaml files are crew-owned and far richer than
// this plugin needs to fully parse — we only ever (a) scan for existing
// `cluster_hash:` values to dedup and (b) insert a new block-sequence item
// into the `tests:` array. No generic YAML parser is needed for that.

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { normalizeRootCause } from "./failure-classifier.mjs";
import type { FailureCluster, FailureClass } from "./failure-classifier.mjs";

export interface EvalGeneratorOpts {
  config?: { loop?: { crewRepoPath?: string } } | null;
  /** Injectable `generated_at` for deterministic provenance in tests. */
  nowIso?: string;
}

export interface EvalGeneratorResult {
  failure_class: FailureClass;
  status: "written" | "skipped";
  reason?: string;
  agent?: string;
  targetFile?: string;
  clusterHash?: string;
}

const CREW_NOT_CONFIGURED_REASON = "crew repo not configured/found — see loop.crewRepoPath";
const GENERATOR_NAME = "loop-eval-generator";
const CLUSTER_HASH_RE = /cluster_hash:\s*([A-Za-z0-9]+)/g;

// DEC-068 §5 — 4 of 9 FailureClass values map cleanly to one agent's own eval
// suite; the remaining 5 are intentionally undefined (no single owning agent)
// and always skip. Extending this table later is additive, not a contract
// break — see DEC-068 §5 for the full rationale per class.
export const FAILURE_CLASS_AGENT_MAP: Partial<Record<FailureClass, string>> = {
  review_fail: "reviewer",
  validation_fail: "verifier",
  hallucinated_ref: "refactor",
  bad_patch: "fullstack-dev"
};

/** DEC-068 §6 dedup key: sha256(failure_class + "::" + normalizeRootCause(root_cause)).slice(0,16). */
export function computeClusterHash(failureClass: FailureClass, rootCause: string): string {
  const normalized = normalizeRootCause(rootCause);
  const digest = crypto.createHash("sha256").update(`${failureClass}::${normalized}`).digest("hex");
  return digest.slice(0, 16);
}

function resolveCrewRepoPath(repoPath: string, opts: EvalGeneratorOpts): string | null {
  const configured = opts.config?.loop?.crewRepoPath;
  if (typeof configured !== "string" || configured.length === 0) return null;
  return path.isAbsolute(configured) ? configured : path.join(repoPath, configured);
}

function evalSpecPath(crewRepoPath: string, agent: string): string {
  return path.join(crewRepoPath, "evals", "agents", `crew-${agent}.yaml`);
}

/** `provenance.cluster_hash` values already present in a target eval-spec file (AC-3 dedup). */
function extractExistingClusterHashes(yamlText: string): Set<string> {
  const hashes = new Set<string>();
  for (const match of yamlText.matchAll(CLUSTER_HASH_RE)) {
    if (match[1]) hashes.add(match[1]);
  }
  return hashes;
}

/** Rubric text traceable to the cluster's representative fix (AC-2), falling back to root cause. */
function deriveRubric(cluster: FailureCluster): string {
  const fix = cluster.representative_fix?.trim();
  const base = `A recurring ${cluster.failure_class} failure was observed: ${cluster.representative_root_cause}.`;
  if (fix) return `${base} Expected corrected behavior: ${fix}`;
  return `${base} The response must not repeat this mistake.`;
}

function buildTestBlock(params: {
  clusterHash: string;
  cluster: FailureCluster;
  fixtureRelPath: string;
  generatedAt: string;
}): string {
  const { clusterHash, cluster, fixtureRelPath, generatedAt } = params;
  const rubric = deriveRubric(cluster).replace(/"/g, '\\"');
  const sourceRunId = cluster.exemplar_ids[0] ?? "unknown";
  return [
    `  - name: manufactured-${cluster.failure_class}-${clusterHash}`,
    `    manufactured: true`,
    `    provenance:`,
    `      generator: ${GENERATOR_NAME}`,
    `      failure_class: ${cluster.failure_class}`,
    `      cluster_hash: ${clusterHash}`,
    `      source_run_id: ${sourceRunId}`,
    `      generated_at: ${generatedAt}`,
    `    fixture: file://${fixtureRelPath}`,
    `    assert:`,
    `      - type: llm-rubric`,
    `        rubric: "${rubric}"`,
    ``
  ].join("\n");
}

/**
 * Insert a block-sequence item into the target file's top-level `tests:`
 * array — right before the next top-level key (column-0, non-blank line) or
 * at EOF if `tests:` is the last key. Returns null if the file has no
 * top-level `tests:` key to append into.
 */
function appendTestToEvalSpec(yamlText: string, testBlock: string): string | null {
  const lines = yamlText.split("\n");
  const testsIndex = lines.findIndex((line) => /^tests:\s*$/.test(line));
  if (testsIndex === -1) return null;

  let insertAt = lines.length;
  for (let i = testsIndex + 1; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (line.trim() === "") continue;
    if (/^\S/.test(line)) {
      insertAt = i;
      break;
    }
  }

  const before = lines.slice(0, insertAt);
  const after = lines.slice(insertAt);
  if (before.length > 0 && before[before.length - 1]!.trim() !== "") before.push("");
  return [...before, ...testBlock.split("\n"), ...after].join("\n");
}

async function writeFixture(
  crewRepoPath: string,
  clusterHash: string,
  cluster: FailureCluster
): Promise<string> {
  const relPath = ["evals", "fixtures", `manufactured-${clusterHash}.txt`];
  const absPath = path.join(crewRepoPath, ...relPath);
  const content = [
    `Manufactured fixture — ${cluster.failure_class} (cluster ${clusterHash})`,
    "",
    `Root cause: ${cluster.representative_root_cause}`,
    ...(cluster.representative_fix ? ["", `Recommended fix: ${cluster.representative_fix}`] : [])
  ].join("\n");
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, `${content}\n`);
  // POSIX-style join for the file:// URI, even when generated on Windows.
  return relPath.join("/");
}

async function generateOneCluster(
  cluster: FailureCluster,
  crewRepoPath: string,
  opts: EvalGeneratorOpts
): Promise<EvalGeneratorResult> {
  const agent = FAILURE_CLASS_AGENT_MAP[cluster.failure_class];
  if (!agent) {
    return {
      failure_class: cluster.failure_class,
      status: "skipped",
      reason: `no mapped agent-under-test for failure_class "${cluster.failure_class}" (DEC-068 §5)`
    };
  }

  const targetFile = evalSpecPath(crewRepoPath, agent);
  let yamlText: string;
  try {
    yamlText = await fs.readFile(targetFile, "utf8");
  } catch {
    return {
      failure_class: cluster.failure_class,
      status: "skipped",
      agent,
      targetFile,
      reason: `target eval-spec file not found: ${targetFile}`
    };
  }

  const clusterHash = computeClusterHash(cluster.failure_class, cluster.representative_root_cause);
  if (extractExistingClusterHashes(yamlText).has(clusterHash)) {
    return {
      failure_class: cluster.failure_class,
      status: "skipped",
      agent,
      targetFile,
      clusterHash,
      reason: `cluster_hash ${clusterHash} already present — idempotent skip (AC-3)`
    };
  }

  const fixtureRelPath = await writeFixture(crewRepoPath, clusterHash, cluster);
  const generatedAt = opts.nowIso ?? new Date().toISOString();
  const testBlock = buildTestBlock({ clusterHash, cluster, fixtureRelPath, generatedAt });
  const updated = appendTestToEvalSpec(yamlText, testBlock);
  if (updated === null) {
    return {
      failure_class: cluster.failure_class,
      status: "skipped",
      agent,
      targetFile,
      clusterHash,
      reason: `target file has no top-level "tests:" array — cannot append`
    };
  }
  await fs.writeFile(targetFile, updated);

  return {
    failure_class: cluster.failure_class,
    status: "written",
    agent,
    targetFile,
    clusterHash
  };
}

/**
 * Manufacture eval-spec test entries for a batch of FailureClusters (FEAT-221).
 * Never throws — every unmapped/misconfigured/duplicate case resolves to a
 * `skipped` result with a `reason` instead of propagating an error, so one bad
 * cluster can never abort the batch.
 */
export async function generateEvalsForClusters(
  repoPath: string,
  clusters: FailureCluster[],
  opts: EvalGeneratorOpts = {}
): Promise<EvalGeneratorResult[]> {
  const crewRepoPath = resolveCrewRepoPath(repoPath, opts);
  if (!crewRepoPath || !(await isDirectory(path.join(crewRepoPath, "evals", "agents")))) {
    return clusters.map((c) => ({
      failure_class: c.failure_class,
      status: "skipped",
      reason: CREW_NOT_CONFIGURED_REASON
    }));
  }

  const results: EvalGeneratorResult[] = [];
  for (const cluster of clusters) {
    try {
      results.push(await generateOneCluster(cluster, crewRepoPath, opts));
    } catch (err) {
      results.push({
        failure_class: cluster.failure_class,
        status: "skipped",
        reason: `unexpected error: ${(err as Error).message}`
      });
    }
  }
  return results;
}

async function isDirectory(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}
