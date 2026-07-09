// pr-watch.mts — PR check polling + auto-fix dispatch loop (FEAT-110 / SLICE-134).
// Polls `gh pr checks`, dispatches crew:builder on failures, enforces retry/cost
// ceilings, handles PR state edge cases, and returns a discriminated result.

import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

// ---------------------------------------------------------------------------
// Types

export type PrState = "OPEN" | "MERGED" | "CLOSED";

export type CheckConclusion = "success" | "failure" | "skipped" | "pending" | string;

export interface PrCheckItem {
  name: string;
  status: CheckConclusion;
  conclusion: CheckConclusion | null;
  detailsUrl: string;
}

export interface PrWatchConfig {
  pollIntervalSeconds: number;
  maxRetries: number;
  maxCostUsd: number;
}

export type PrWatchResult =
  | { outcome: "all-green" }
  | { outcome: "max-retries"; retriesUsed: number }
  | { outcome: "cost-exceeded"; cumulativeCostUsd: number }
  | { outcome: "pr-merged"; mergedAt: string | null; prNumber: number | null }
  | { outcome: "pr-closed" }
  | { outcome: "no-checks" };

export interface PrWatchExec {
  viewPr: (prUrl: string) => Promise<string>;
  listChecks: (prUrl: string) => Promise<string>;
  fetchLog: (detailsUrl: string, maxChars: number) => Promise<string>;
  dispatchBuilder: (prompt: string) => Promise<number>;
  listReviews: (prUrl: string) => Promise<string>;
  sleep: (ms: number) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Config reader

const DEFAULT_CONFIG: PrWatchConfig = {
  pollIntervalSeconds: 30,
  maxRetries: 3,
  maxCostUsd: 5.0
};

const MIN_POLL_INTERVAL = 10;

export function readPrWatchConfig(config: Record<string, any> | null): PrWatchConfig {
  const block = config?.loop?.prWatch;
  if (!block) return { ...DEFAULT_CONFIG };

  let pollIntervalSeconds =
    typeof block.pollIntervalSeconds === "number"
      ? block.pollIntervalSeconds
      : DEFAULT_CONFIG.pollIntervalSeconds;

  if (pollIntervalSeconds < MIN_POLL_INTERVAL) {
    process.stderr.write(
      `[pr-watch] warn: pollIntervalSeconds ${pollIntervalSeconds} is below minimum ${MIN_POLL_INTERVAL}; clamping.\n`
    );
    pollIntervalSeconds = MIN_POLL_INTERVAL;
  }

  return {
    pollIntervalSeconds,
    maxRetries: typeof block.maxRetries === "number" ? block.maxRetries : DEFAULT_CONFIG.maxRetries,
    maxCostUsd: typeof block.maxCostUsd === "number" ? block.maxCostUsd : DEFAULT_CONFIG.maxCostUsd
  };
}

// ---------------------------------------------------------------------------
// Parsers

export function parsePrState(raw: string): PrState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`[pr-watch] could not parse PR view JSON: ${raw}`);
  }
  const data = parsed as Record<string, unknown>;
  if (!data || typeof data.state !== "string") {
    throw new Error(
      `[pr-watch] unexpected PR view JSON shape — missing "state" field: ${JSON.stringify(data)}`
    );
  }
  return data.state as PrState;
}

/** Merge metadata extracted from the same `gh pr view` JSON as `parsePrState`. */
export interface PrMergeInfo {
  mergedAt: string | null;
  prNumber: number | null;
}

export function parsePrMergeInfo(raw: string): PrMergeInfo {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { mergedAt: null, prNumber: null };
  }
  const data = parsed as Record<string, unknown>;
  return {
    mergedAt: typeof data.mergedAt === "string" ? data.mergedAt : null,
    prNumber: typeof data.number === "number" ? data.number : null
  };
}

export function parseChecks(raw: string): PrCheckItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`[pr-watch] could not parse checks JSON: ${raw}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(
      `[pr-watch] expected checks JSON to be an array, got: ${JSON.stringify(parsed)}`
    );
  }
  return parsed as PrCheckItem[];
}

// ---------------------------------------------------------------------------
// Classifier

const KNOWN_DONE_STATUSES = new Set(["success", "skipped", "failure"]);
const KNOWN_FAILING_STATUSES = new Set(["failure"]);

export function classifyChecks(checks: PrCheckItem[]): "green" | "failing" | "pending" {
  let hasFailure = false;
  let hasPending = false;

  for (const check of checks) {
    const status = check.status;
    if (KNOWN_FAILING_STATUSES.has(status)) {
      hasFailure = true;
    } else if (!KNOWN_DONE_STATUSES.has(status)) {
      process.stderr.write(
        `[pr-watch] WARN: unknown check status "${status}" for "${check.name}" — treating as pending.\n`
      );
      hasPending = true;
    }
  }

  if (hasPending) return "pending";
  if (hasFailure) return "failing";
  return "green";
}

// ---------------------------------------------------------------------------
// Prompt builder

const MAX_HUMAN_COMMENTS = 5;
const MAX_COMMENT_CHARS = 500;

export function buildBuilderPrompt(opts: {
  prUrl: string;
  failingChecks: Array<{ name: string; logExcerpt: string }>;
  humanComments: string[];
  allowHumanComments: boolean;
}): string {
  const { prUrl, failingChecks, humanComments, allowHumanComments } = opts;

  const lines: string[] = [
    `## PR watch: fix failing checks`,
    ``,
    `PR: ${prUrl}`,
    ``,
    `### Failing checks`,
    ``
  ];

  for (const check of failingChecks) {
    lines.push(`#### ${check.name}`);
    if (check.logExcerpt) {
      lines.push("```");
      lines.push(check.logExcerpt);
      lines.push("```");
    } else {
      lines.push("_(no log excerpt available)_");
    }
    lines.push("");
  }

  if (allowHumanComments && humanComments.length > 0) {
    const capped = humanComments.slice(0, MAX_HUMAN_COMMENTS);
    lines.push("### Human review comments");
    lines.push("");
    for (const comment of capped) {
      const truncated =
        comment.length > MAX_COMMENT_CHARS ? comment.slice(0, MAX_COMMENT_CHARS) + "…" : comment;
      lines.push(`- ${truncated}`);
    }
    lines.push("");
  } else if (!allowHumanComments && humanComments.length > 0) {
    process.stderr.write(
      `[pr-watch] human review comments detected but --allow-human-comments not set; omitting from prompt.\n`
    );
  }

  lines.push("Fix the failing checks listed above. Push the fix to the PR branch when done.");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Production exec builder

export function buildDefaultExec(): PrWatchExec {
  return {
    viewPr: async (prUrl: string): Promise<string> => {
      const { stdout } = await execFile(
        "gh",
        ["pr", "view", prUrl, "--json", "state,title,mergedAt,number"],
        { encoding: "utf8" }
      );
      return stdout;
    },

    listChecks: async (prUrl: string): Promise<string> => {
      const { stdout } = await execFile(
        "gh",
        ["pr", "checks", prUrl, "--json", "name,status,conclusion,detailsUrl"],
        { encoding: "utf8" }
      );
      return stdout;
    },

    fetchLog: async (detailsUrl: string, maxChars: number): Promise<string> => {
      try {
        const { stdout } = await execFile("gh", ["api", detailsUrl], { encoding: "utf8" });
        return stdout.slice(0, maxChars);
      } catch {
        return "";
      }
    },

    dispatchBuilder: async (prompt: string): Promise<number> => {
      console.log(`[pr-watch] builder prompt:\n${prompt}`);
      return 0;
    },

    listReviews: async (prUrl: string): Promise<string> => {
      const { stdout } = await execFile("gh", ["pr", "view", prUrl, "--json", "reviews"], {
        encoding: "utf8"
      });
      return stdout;
    },

    sleep: (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))
  };
}

// ---------------------------------------------------------------------------
// Core loop

const DEFAULT_MAX_LOG_CHARS = 2000;

export async function runPrWatch(
  prUrl: string,
  config: PrWatchConfig,
  allowHumanComments: boolean,
  exec: PrWatchExec
): Promise<PrWatchResult> {
  let retriesUsed = 0;
  let cumulativeCostUsd = 0;

  for (;;) {
    const prStateRaw = await exec.viewPr(prUrl);
    const prState = parsePrState(prStateRaw);

    if (prState === "MERGED") {
      const mergeInfo = parsePrMergeInfo(prStateRaw);
      return { outcome: "pr-merged", mergedAt: mergeInfo.mergedAt, prNumber: mergeInfo.prNumber };
    }
    if (prState === "CLOSED") {
      return { outcome: "pr-closed" };
    }

    const checksRaw = await exec.listChecks(prUrl);
    const checks = parseChecks(checksRaw);

    if (checks.length === 0) {
      return { outcome: "no-checks" };
    }

    const classification = classifyChecks(checks);

    if (classification === "green") {
      return { outcome: "all-green" };
    }

    if (classification === "pending") {
      await exec.sleep(config.pollIntervalSeconds * 1000);
      continue;
    }

    if (config.maxRetries === 0) {
      await exec.sleep(config.pollIntervalSeconds * 1000);
      continue;
    }

    if (retriesUsed >= config.maxRetries) {
      return { outcome: "max-retries", retriesUsed };
    }

    const failingChecks = checks.filter((c) => c.status === "failure");
    const logExcerpts = await Promise.all(
      failingChecks.map(async (c) => ({
        name: c.name,
        logExcerpt: c.detailsUrl ? await exec.fetchLog(c.detailsUrl, DEFAULT_MAX_LOG_CHARS) : ""
      }))
    );

    let humanComments: string[] = [];
    if (allowHumanComments) {
      try {
        const reviewsRaw = await exec.listReviews(prUrl);
        const reviewsParsed = JSON.parse(reviewsRaw) as { reviews?: Array<{ body?: string }> };
        humanComments = (reviewsParsed.reviews ?? []).map((r) => r.body ?? "").filter(Boolean);
      } catch {
        // Non-fatal — proceed without comments
      }
    }

    const prompt = buildBuilderPrompt({
      prUrl,
      failingChecks: logExcerpts,
      humanComments,
      allowHumanComments
    });

    const dispatchCost = await exec.dispatchBuilder(prompt);
    cumulativeCostUsd += dispatchCost;
    retriesUsed += 1;

    if (cumulativeCostUsd >= config.maxCostUsd) {
      return { outcome: "cost-exceeded", cumulativeCostUsd };
    }

    if (retriesUsed >= config.maxRetries) {
      const checksRaw2 = await exec.listChecks(prUrl);
      const checks2 = parseChecks(checksRaw2);
      const classification2 = classifyChecks(checks2);
      if (classification2 === "green") {
        return { outcome: "all-green" };
      }
      return { outcome: "max-retries", retriesUsed };
    }

    await exec.sleep(config.pollIntervalSeconds * 1000);
  }
}
