import fs from "node:fs/promises";
import path from "node:path";
import { resolveConfig, configPath as resolveConfigPath } from "../../src/scripts/lib/config-resolver.mts";
import { listBacklog } from "../../src/scripts/lib/backlog-parser.mts";
import { mergeFrontmatter, parseFrontmatter, serializeFrontmatter } from "../../src/scripts/lib/frontmatter.mts";
import { defaultGhExec, isGhInstalled } from "./github-sync/gh.mjs";
import { detectRepo } from "./github-sync/repo-detect.mjs";
import { upsertMilestone } from "./github-sync/milestone-sync.mjs";
import {
  createFeatureIssue,
  updateIssueStatus as _updateLabel,
  closeIssue
} from "./github-sync/issue-sync.mjs";
import { createSliceIssue, attachSubIssue, closeSliceIssue } from "./github-sync/subissue-sync.mjs";
import { buildSliceComment, postComment } from "./github-sync/comment-sync.mjs";
import { diffBody, patchBody } from "./github-sync/body-diff.mjs";
import { locateSliceFile, slicesRoot, backlogRoot as resolveBacklogRoot } from "../../src/scripts/lib/paths.mts";

function isEnabled(resolved) {
  return Boolean(resolved?.github?.enabled);
}

async function loadConfig(repoPath, configOverride) {
  return configOverride || (await resolveConfig(repoPath));
}

async function findSliceFile(repoPath, sliceId, resolved) {
  const root = slicesRoot(repoPath, resolved);
  try {
    return await locateSliceFile(root, sliceId);
  } catch {
    return null;
  }
}

/**
 * Publish all features and slices to GitHub.
 * - Upserts milestones for each phase.
 * - Creates feature issues for features without github_issue.
 * - Creates slice sub-issues and attaches them to feature issues.
 * Updates frontmatter with github_issue numbers.
 *
 * @param {string} repoPath
 * @param {object} options
 * @param {function} options.ghExec - gh CLI executor (default: defaultGhExec)
 * @param {object} options.config - resolved config (default: loaded from repoPath)
 * @returns {Promise<{ milestones: number, issues: number, subissues: number }>}
 */
export async function publishAll(repoPath, { ghExec = defaultGhExec, config } = {}) {
  const resolved = await loadConfig(repoPath, config);
  if (!isEnabled(resolved)) return { milestones: 0, issues: 0, subissues: 0 };
  const repo = detectRepo(resolved.github.repo, repoPath);
  if (!isGhInstalled({ ghExec })) {
    console.warn("[github-sync] gh CLI not found — skipping publish. Run: gh auth login");
    return { milestones: 0, issues: 0, subissues: 0 };
  }
  const feats = await listBacklog(repoPath, { config: resolved });
  let milestoneCount = 0;
  let issueCount = 0;
  let subissueCount = 0;

  const phases = [...new Set(feats.map((f) => f.frontmatter.phase).filter(Boolean))];
  const milestoneMap = {};
  for (const phase of phases) {
    const num = upsertMilestone(repo, { title: `Phase ${phase}` }, { ghExec });
    milestoneMap[phase] = num;
    milestoneCount++;
  }

  for (const feat of feats) {
    let issueNum = feat.frontmatter.github_issue;
    if (!issueNum) {
      const milestoneNum = feat.frontmatter.phase ? milestoneMap[feat.frontmatter.phase] : null;
      const milestoneTitle = feat.frontmatter.phase ? `Phase ${feat.frontmatter.phase}` : null;
      issueNum = createFeatureIssue(repo, feat, milestoneTitle, { ghExec });
      const url = `https://github.com/${repo}/issues/${issueNum}`;
      const updated = mergeFrontmatter(await fs.readFile(feat.filePath, "utf8"), {
        github_issue: issueNum,
        github_milestone: milestoneNum ?? null,
        github_url: url
      });
      await fs.writeFile(feat.filePath, updated);
      issueCount++;
      feat.frontmatter.github_issue = issueNum;
      feat.frontmatter.github_url = url;
    } else if (!feat.frontmatter.github_url) {
      // Backfill URL for FEATs published before github_url was tracked.
      const url = `https://github.com/${repo}/issues/${issueNum}`;
      const updated = mergeFrontmatter(await fs.readFile(feat.filePath, "utf8"), {
        github_url: url
      });
      await fs.writeFile(feat.filePath, updated);
      feat.frontmatter.github_url = url;
    }

    // Always attempt sub-issue linking — idempotent for already-linked pairs
    const sliceIds = feat.frontmatter.slices || [];
    for (const sliceId of sliceIds) {
      const sliceFile = await findSliceFile(repoPath, sliceId, resolved);
      if (!sliceFile) continue;
      const sliceContent = await fs.readFile(sliceFile, "utf8");
      const { frontmatter: sliceFm, body: sliceBody } = parseFrontmatter(sliceContent);
      let sliceIssueNum = sliceFm.github_issue;
      if (!sliceIssueNum) {
        sliceIssueNum = createSliceIssue(
          repo,
          { id: sliceId, frontmatter: sliceFm, body: sliceBody },
          { ghExec }
        );
        const sliceUrl = `https://github.com/${repo}/issues/${sliceIssueNum}`;
        const updatedSlice = mergeFrontmatter(sliceContent, {
          github_issue: sliceIssueNum,
          github_url: sliceUrl
        });
        await fs.writeFile(sliceFile, updatedSlice);
        subissueCount++;
      } else if (!sliceFm.github_url) {
        // Backfill URL for slices published before github_url was tracked.
        const sliceUrl = `https://github.com/${repo}/issues/${sliceIssueNum}`;
        const updatedSlice = mergeFrontmatter(sliceContent, { github_url: sliceUrl });
        await fs.writeFile(sliceFile, updatedSlice);
      }
      try {
        attachSubIssue(repo, issueNum, sliceIssueNum, { ghExec });
      } catch (err) {
        const detail = `${err.message ?? ""} ${err.stderr ?? ""}`;
        if (!detail.includes("422") && !detail.includes("duplicate")) {
          console.warn(
            `[github-sync] sub-issue link failed (#${issueNum} ← #${sliceIssueNum}): ${err.message?.split("\n")[0] ?? ""}`
          );
        }
      }
    }
  }

  console.log(
    `[github-sync] Published: ${milestoneCount} milestones, ${issueCount} issues, ${subissueCount} sub-issues`
  );
  return { milestones: milestoneCount, issues: issueCount, subissues: subissueCount };
}

/**
 * Sync pull: fetch updated feature bodies from GitHub and patch local copies.
 * Compares local and remote acceptance criteria, description, etc.
 * Updates the local file with remote changes when differences detected.
 *
 * @param {string} repoPath
 * @param {object} options
 * @param {function} options.ghExec - gh CLI executor (default: defaultGhExec)
 * @param {object} options.config - resolved config (default: loaded from repoPath)
 * @returns {Promise<{ checked: number, updated: number, changes: Array }>}
 */
export async function syncPull(repoPath, { ghExec = defaultGhExec, config } = {}) {
  const resolved = await loadConfig(repoPath, config);
  if (!isEnabled(resolved)) return { checked: 0, updated: 0, changes: [] };
  const repo = detectRepo(resolved.github.repo, repoPath);
  if (!isGhInstalled({ ghExec })) {
    console.warn("[github-sync] gh CLI not found — skipping sync.");
    return { checked: 0, updated: 0, changes: [] };
  }
  const feats = await listBacklog(repoPath, { config: resolved });
  const published = feats.filter((f) => f.frontmatter.github_issue);
  const today = new Date().toISOString().slice(0, 10);
  let updatedCount = 0;
  const changeLog = [];

  for (const feat of published) {
    const issueNum = feat.frontmatter.github_issue;
    let githubBody;
    try {
      const raw = ghExec(["issue", "view", String(issueNum), "--repo", repo, "--json", "body"]);
      githubBody = JSON.parse(raw).body;
    } catch {
      console.warn(`[github-sync] Could not fetch issue #${issueNum} for ${feat.id}`);
      continue;
    }
    const localContent = await fs.readFile(feat.filePath, "utf8");
    const { changed, changes } = diffBody(localContent, githubBody);
    if (!changed) {
      changeLog.push({ id: feat.id, status: "no-change" });
      continue;
    }
    const patched = patchBody(localContent, githubBody, today);
    await fs.writeFile(feat.filePath, patched);
    console.log(`[github-sync] ${feat.id}: updated ${changes.join(", ")}`);
    changeLog.push({ id: feat.id, status: "updated", changes });
    updatedCount++;
  }

  console.log(`[github-sync] Sync complete: ${published.length} checked, ${updatedCount} updated`);
  return { checked: published.length, updated: updatedCount, changes: changeLog };
}

/**
 * Read-only advisory drift check between GitHub issues and the local backlog.
 *
 * Unlike syncPull (patches local FEAT bodies) and bootstrapFromGithub (creates
 * local FEAT files), this function performs NO writes anywhere — it only reads
 * (gh issue list, local FEAT files) and reports differences. Callers that want
 * a two-way mirror should use syncPull/bootstrapFromGithub directly; this is
 * the cheap advisory cross-check that runs before any write-capable sync is
 * trusted (Phase 4.5 of the tracker-provider plan).
 *
 * @param {string} repoPath
 * @param {object} options
 * @param {function} options.ghExec - gh CLI executor (default: defaultGhExec)
 * @param {object} options.config - resolved config (default: loaded from repoPath)
 * @returns {Promise<{
 *   supported: boolean,
 *   reason: string|null,
 *   checked: number,
 *   trackerOnly: Array<{ number: number, title: string }>,
 *   localOnly: Array<{ id: string, title: string }>,
 *   statusMismatches: Array<{ id: string, number: number, localStatus: string, trackerState: string }>,
 *   bodyDrift: Array<{ id: string, number: number, changes: string[] }>
 * }>}
 */
export async function checkSyncDrift(repoPath, { ghExec = defaultGhExec, config } = {}) {
  const empty = {
    supported: true,
    reason: null,
    checked: 0,
    trackerOnly: [],
    localOnly: [],
    statusMismatches: [],
    bodyDrift: []
  };
  const resolved = await loadConfig(repoPath, config);
  if (!isEnabled(resolved)) {
    return { ...empty, reason: "github.enabled is false" };
  }
  const repo = detectRepo(resolved.github.repo, repoPath);
  if (!isGhInstalled({ ghExec })) {
    console.warn("[github-sync] gh CLI not found — skipping drift check.");
    return { ...empty, reason: "gh CLI not installed" };
  }

  const feats = await listBacklog(repoPath, { config: resolved });
  const localByIssue = new Map();
  const localOnly = [];
  for (const feat of feats) {
    const issueNum = feat.frontmatter.github_issue;
    if (issueNum) {
      localByIssue.set(issueNum, feat);
    } else {
      localOnly.push({ id: feat.id, title: feat.frontmatter.title ?? feat.id });
    }
  }

  let rawIssues;
  try {
    rawIssues = JSON.parse(
      ghExec([
        "issue",
        "list",
        "--repo",
        repo,
        "--state",
        "all",
        "--json",
        "number,title,body,state",
        "--limit",
        "500"
      ])
    );
  } catch (err) {
    console.warn(`[github-sync] drift check: could not list issues — ${err.message ?? err}`);
    return { ...empty, localOnly, reason: "issue list failed" };
  }

  const trackerOnly = [];
  const statusMismatches = [];
  const bodyDrift = [];
  let checked = 0;

  for (const issue of rawIssues) {
    const feat = localByIssue.get(issue.number);
    if (!feat) {
      trackerOnly.push({ number: issue.number, title: issue.title });
      continue;
    }
    checked++;

    const localStatus = feat.frontmatter.status ?? "unknown";
    const trackerState = issue.state ?? "unknown"; // "OPEN" | "CLOSED"
    const expectedOpen = localStatus !== "done";
    const actuallyOpen = String(trackerState).toUpperCase() === "OPEN";
    if (expectedOpen !== actuallyOpen) {
      statusMismatches.push({ id: feat.id, number: issue.number, localStatus, trackerState });
    }

    // Read-only diff — diffBody never writes; patchBody (which would) is
    // intentionally never called from this function.
    const localContent = await fs.readFile(feat.filePath, "utf8");
    const { changed, changes } = diffBody(localContent, issue.body ?? "");
    if (changed) {
      bodyDrift.push({ id: feat.id, number: issue.number, changes });
    }
  }

  console.log(
    `[github-sync] drift check: ${checked} linked, ${trackerOnly.length} tracker-only, ` +
      `${localOnly.length} local-only, ${statusMismatches.length} status mismatches, ` +
      `${bodyDrift.length} body diffs (read-only — no files written)`
  );

  return {
    supported: true,
    reason: null,
    checked,
    trackerOnly,
    localOnly,
    statusMismatches,
    bodyDrift
  };
}

/**
 * Post a completion comment on the feature issue for a slice.
 * Closes the slice sub-issue if github_issue is set.
 *
 * @param {string} repoPath
 * @param {string} sliceId
 * @param {object} context
 * @param {string|null} context.featureId
 * @param {object} context.sliceFm - slice frontmatter
 * @param {object|null} context.validationGate
 * @param {object|null} context.costReport
 * @param {string|null} context.synthPath
 * @param {object} options
 * @param {function} options.ghExec - gh CLI executor (default: defaultGhExec)
 * @param {object} options.config - resolved config (default: loaded from repoPath)
 * @returns {Promise<{ posted: boolean, issueNum: number } | null>}
 */
export async function postSliceComment(
  repoPath,
  sliceId,
  { featureId, sliceFm, validationGate, costReport, synthPath },
  { ghExec = defaultGhExec, config } = {}
) {
  const resolved = await loadConfig(repoPath, config);
  if (!isEnabled(resolved)) return null;
  if (!featureId) return null;
  const repo = detectRepo(resolved.github.repo, repoPath);
  const feats = await listBacklog(repoPath, { config: resolved });
  const feat = feats.find((f) => f.id === featureId);
  if (!feat?.frontmatter?.github_issue) return null;
  const issueNum = feat.frontmatter.github_issue;
  const objective = sliceFm?.objective || sliceId;
  const costStr = costReport?.totalCost ? `~$${costReport.totalCost.toFixed(2)}` : null;
  const reviewStatus = validationGate?.satisfied ? "Approved" : "Needs review";
  const body = buildSliceComment({
    sliceId,
    objective,
    validationSatisfied: Boolean(validationGate?.satisfied),
    reviewStatus,
    costStr,
    artifactPath: synthPath || null
  });
  postComment(repo, issueNum, body, { ghExec });
  if (sliceFm?.github_issue) closeSliceIssue(repo, sliceFm.github_issue, { ghExec });
  return { posted: true, issueNum };
}

/**
 * Update feature and slice issue status to in-progress.
 *
 * @param {string} repoPath
 * @param {string} sliceId
 * @param {object} context
 * @param {string|null} context.featureId
 * @param {object} context.sliceFm - slice frontmatter
 * @param {object} options
 * @param {function} options.ghExec - gh CLI executor (default: defaultGhExec)
 * @param {object} options.config - resolved config (default: loaded from repoPath)
 * @returns {Promise<{ updated: boolean } | null>}
 */
export async function updateIssueStatus(
  repoPath,
  _sliceId,
  { featureId, sliceFm },
  { ghExec = defaultGhExec, config } = {}
) {
  const resolved = await loadConfig(repoPath, config);
  if (!isEnabled(resolved)) return null;
  if (!featureId) return null;
  const repo = detectRepo(resolved.github.repo, repoPath);
  const feats = await listBacklog(repoPath, { config: resolved });
  const feat = feats.find((f) => f.id === featureId);
  if (feat?.frontmatter?.github_issue) {
    _updateLabel(repo, feat.frontmatter.github_issue, "in-progress", { ghExec });
  }
  if (sliceFm?.github_issue) {
    _updateLabel(repo, sliceFm.github_issue, "in-progress", { ghExec });
  }
  return { updated: true };
}

const STATE_TO_LABEL = {
  done: "done",
  "in-progress": "in-progress",
  triaged: "pending",
  pending: "pending"
};

/**
 * Sync milestones and status labels for all published FEATs.
 * - Upserts milestones for every unique phase value found across FEATs.
 * - Assigns each published FEAT to its milestone via gh issue edit.
 * - Updates status labels to match current local state.
 * - Closes GitHub issues for FEATs in state "done".
 * Idempotent — safe to run multiple times.
 */
export async function syncMilestones(repoPath, { ghExec = defaultGhExec, config } = {}) {
  const resolved = await loadConfig(repoPath, config);
  if (!isEnabled(resolved)) return { milestones: 0, updated: 0, closed: 0 };
  const repo = detectRepo(resolved.github.repo, repoPath);
  if (!isGhInstalled({ ghExec })) {
    console.warn("[github-sync] gh CLI not found. Run: gh auth login");
    return { milestones: 0, updated: 0, closed: 0 };
  }

  const feats = await listBacklog(repoPath, { config: resolved });
  const published = feats.filter((f) => f.frontmatter.github_issue);

  // Build milestone map for all phases present in published FEATs
  const phases = [...new Set(published.map((f) => f.frontmatter.phase).filter(Boolean))];
  const milestoneMap = {};
  for (const phase of phases) {
    milestoneMap[phase] = upsertMilestone(repo, { title: `Phase ${phase}` }, { ghExec });
  }

  let updatedCount = 0;
  let closedCount = 0;

  for (const feat of published) {
    const issueNum = feat.frontmatter.github_issue;
    const state = feat.state;
    const phase = feat.frontmatter.phase;
    const milestoneNum = phase ? milestoneMap[phase] : null;
    const statusLabel = STATE_TO_LABEL[state] ?? "pending";

    // Update milestone assignment when phase is set
    if (milestoneNum && phase) {
      ghExec(["issue", "edit", String(issueNum), "--repo", repo, "--milestone", `Phase ${phase}`]);
      // Write github_milestone back to frontmatter if changed
      if (feat.frontmatter.github_milestone !== milestoneNum) {
        const content = await fs.readFile(feat.filePath, "utf8");
        await fs.writeFile(
          feat.filePath,
          mergeFrontmatter(content, { github_milestone: milestoneNum })
        );
      }
    }

    // Sync status label to match local state
    _updateLabel(repo, issueNum, statusLabel, { ghExec });

    // Close GitHub issue when FEAT is done
    if (state === "done") {
      try {
        closeIssue(repo, issueNum, { ghExec });
        closedCount++;
      } catch {
        // already closed — ignore
      }
    }

    updatedCount++;
    console.log(
      `[github-sync] ${feat.id} → milestone:${milestoneNum ?? "none"} status:${statusLabel}`
    );
  }

  console.log(
    `[github-sync] syncMilestones: ${phases.length} milestones, ${updatedCount} issues updated, ${closedCount} closed`
  );
  return { milestones: phases.length, updated: updatedCount, closed: closedCount };
}

/**
 * One-shot setup: enable GitHub sync in loop.json and bulk-set phases on all FEATs.
 * Phase convention: done→"1", in-progress/triaged→"2", pending→"3".
 * Safe to re-run — skips FEATs that already have phase set if overwrite is false.
 */
export async function setupGithubSync(repoPath, { overwrite = false } = {}) {
  const cfgFile = resolveConfigPath(repoPath);
  const raw = await fs.readFile(cfgFile, "utf8");
  const cfg = JSON.parse(raw);

  // Enable github sync
  if (!cfg.github || overwrite) {
    cfg.github = { enabled: true, repo: null };
  } else {
    cfg.github.enabled = true;
  }

  // Ensure backlogRoot is set so listBacklog finds the right folder
  if (cfg.loop?.backlogPath && !cfg.loop?.backlogRoot) {
    cfg.loop.backlogRoot = cfg.loop.backlogPath;
  }

  await fs.writeFile(cfgFile, JSON.stringify(cfg, null, 2) + "\n");
  console.log("[github-sync] loop.json updated (github.enabled = true)");

  // Resolve backlog root
  const backlogRoot = cfg.loop?.backlogRoot
    ? path.join(repoPath, cfg.loop.backlogRoot)
    : path.join(repoPath, ".claude/artifacts/loop/backlog");

  const stateToPhase = { done: "1", triaged: "2", "in-progress": "2", pending: "3" };
  let count = 0;
  for (const [state, phase] of Object.entries(stateToPhase)) {
    const dir = path.join(backlogRoot, state);
    let files;
    try {
      files = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const f of files.filter((f) => f.endsWith(".md") && f.startsWith("FEAT-"))) {
      const fp = path.join(dir, f);
      const content = await fs.readFile(fp, "utf8");
      const { frontmatter } = parseFrontmatter(content);
      if (!overwrite && frontmatter.phase) continue;
      await fs.writeFile(fp, mergeFrontmatter(content, { phase }));
      count++;
    }
  }

  console.log(`[github-sync] ${count} FEATs phased (done→1, triaged/in-progress→2, pending→3)`);
  return { configUpdated: true, featsPhased: count };
}

/**
 * Reverse sync: fetch open GitHub issues and create local FEAT-NNN.md files.
 * Skips issues labeled "slice" and issues already linked to an existing FEAT.
 * Creates new FEATs in the backlog triaged/ folder.
 */
export async function bootstrapFromGithub(repoPath, { ghExec = defaultGhExec, config } = {}) {
  const resolved = await loadConfig(repoPath, config);
  if (!isEnabled(resolved)) return { created: 0, skipped: 0, featIds: [] };
  const repo = detectRepo(resolved.github.repo, repoPath);
  if (!isGhInstalled({ ghExec })) {
    console.warn("[github-sync] gh CLI not found. Run: gh auth login");
    return { created: 0, skipped: 0, featIds: [] };
  }

  // Fetch all open issues
  const rawIssues = JSON.parse(
    ghExec([
      "issue",
      "list",
      "--repo",
      repo,
      "--state",
      "open",
      "--json",
      "number,title,body,labels,milestone",
      "--limit",
      "200"
    ])
  );

  // Drop slice sub-issues
  const featIssues = rawIssues.filter((i) => !i.labels.some((l) => l.name === "slice"));

  // Find already-linked issue numbers
  const existingFeats = await listBacklog(repoPath, { config: resolved });
  const linkedNums = new Set(existingFeats.map((f) => f.frontmatter.github_issue).filter(Boolean));
  let nextIdNum = existingFeats.reduce((acc, e) => Math.max(acc, e.idNumber), 0);

  const backlogRootPath = resolveBacklogRoot(repoPath, resolved);
  const triagedDir = path.join(backlogRootPath, "triaged");
  await fs.mkdir(triagedDir, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const created = [];
  let skipped = 0;

  for (const issue of featIssues) {
    if (linkedNums.has(issue.number)) {
      skipped++;
      continue;
    }

    nextIdNum++;
    const featId = `FEAT-${String(nextIdNum).padStart(3, "0")}`;

    const labelNames = issue.labels.map((l) => l.name);
    const priorityLabel = labelNames.find((l) => l.startsWith("priority:"));
    const categoryLabel = labelNames.find((l) => l.startsWith("category:"));

    const milestoneTitle = issue.milestone?.title ?? null;
    const phaseMatch = milestoneTitle?.match(/^Phase\s+(\S+)$/i);
    const phase = phaseMatch ? phaseMatch[1] : null;

    const description = issue.title.replace(/^FEAT-\d+:\s*/i, "").trim();

    const frontmatter = {
      id: featId,
      status: "triaged",
      priority: priorityLabel ? priorityLabel.replace("priority:", "") : null,
      category: categoryLabel ? categoryLabel.replace("category:", "") : null,
      target_release: null,
      created: today,
      updated: today,
      depends_on: [],
      slices: [],
      derived_from: null,
      feature_complete: null,
      autonomous_safe: labelNames.includes("autonomous-safe") || null,
      phase,
      github_issue: issue.number,
      github_milestone: issue.milestone?.number ?? null,
      github_url: `https://github.com/${repo}/issues/${issue.number}`
    };

    const body = [
      "## Description",
      "",
      description,
      "",
      ...(issue.body?.trim() ? [issue.body.trim(), ""] : []),
      "## Acceptance criteria",
      "",
      "- [ ] AC-1: <replace with a concrete, testable acceptance criterion>",
      ""
    ].join("\n");

    await fs.writeFile(
      path.join(triagedDir, `${featId}.md`),
      serializeFrontmatter(frontmatter, body)
    );
    linkedNums.add(issue.number);
    created.push(featId);
    console.log(`[github-sync] ${featId} ← GitHub issue #${issue.number}: ${description}`);
  }

  console.log(`[github-sync] bootstrap: ${created.length} created, ${skipped} skipped`);
  return { created: created.length, skipped, featIds: created };
}

/**
 * Publish a single FEAT to GitHub — creates issue, writes frontmatter back.
 * Returns null (no-op) when github.enabled is false.
 * Throws when enabled but gh CLI is missing or the API call fails.
 * Idempotent: returns existing issueNum/url without gh calls if already published.
 *
 * @param {string} repoPath
 * @param {string} featId - e.g. "FEAT-007"
 * @param {object} options
 * @param {function} options.ghExec
 * @param {object} options.config
 * @returns {Promise<{ created: boolean, issueNum: number, url: string } | null>}
 */
export async function publishFeat(repoPath, featId, { ghExec = defaultGhExec, config } = {}) {
  const resolved = await loadConfig(repoPath, config);
  if (!isEnabled(resolved)) return null;
  const repo = detectRepo(resolved.github.repo, repoPath);
  const feats = await listBacklog(repoPath, { config: resolved });
  const feat = feats.find((f) => f.id === featId);
  if (!feat) throw new Error(`[github-sync] FEAT not found: ${featId}`);

  if (feat.frontmatter.github_issue) {
    return { created: false, issueNum: feat.frontmatter.github_issue, url: feat.frontmatter.github_url ?? null };
  }

  if (!isGhInstalled({ ghExec })) {
    throw new Error("[github-sync] gh CLI not found — cannot publish FEAT. Run: gh auth login");
  }

  let milestoneNum = null;
  let milestoneTitle = null;
  if (feat.frontmatter.phase) {
    milestoneTitle = `Phase ${feat.frontmatter.phase}`;
    milestoneNum = upsertMilestone(repo, { title: milestoneTitle }, { ghExec });
  }

  const issueNum = createFeatureIssue(repo, feat, milestoneTitle, { ghExec });
  const url = `https://github.com/${repo}/issues/${issueNum}`;
  const updated = mergeFrontmatter(await fs.readFile(feat.filePath, "utf8"), {
    github_issue: issueNum,
    github_milestone: milestoneNum ?? null,
    github_url: url,
  });
  await fs.writeFile(feat.filePath, updated);
  console.log(`[github-sync] publishFeat: ${featId} → #${issueNum}`);
  return { created: true, issueNum, url };
}

/**
 * Publish a single SLICE to GitHub as a sub-issue of its parent FEAT.
 * Ensures the parent FEAT issue exists first (calls publishFeat).
 * Returns null (no-op) when github.enabled is false.
 * Throws when enabled but gh CLI is missing or the API call fails.
 * Idempotent: returns existing issueNum/url without gh calls if already published.
 *
 * @param {string} repoPath
 * @param {string} sliceId - e.g. "SLICE-42"
 * @param {string} featId - e.g. "FEAT-007"
 * @param {object} options
 * @param {function} options.ghExec
 * @param {object} options.config
 * @returns {Promise<{ created: boolean, issueNum: number, url: string } | null>}
 */
export async function publishSlice(repoPath, sliceId, featId, { ghExec = defaultGhExec, config } = {}) {
  const resolved = await loadConfig(repoPath, config);
  if (!isEnabled(resolved)) return null;
  const repo = detectRepo(resolved.github.repo, repoPath);

  // Check slice idempotency before any gh calls
  const sliceFile = await findSliceFile(repoPath, sliceId, resolved);
  if (!sliceFile) throw new Error(`[github-sync] Slice file not found: ${sliceId}`);
  const sliceContent = await fs.readFile(sliceFile, "utf8");
  const { frontmatter: sliceFm, body: sliceBody } = parseFrontmatter(sliceContent);

  if (sliceFm.github_issue) {
    return { created: false, issueNum: sliceFm.github_issue, url: sliceFm.github_url ?? null };
  }

  if (!isGhInstalled({ ghExec })) {
    throw new Error("[github-sync] gh CLI not found — cannot publish SLICE. Run: gh auth login");
  }

  const featResult = await publishFeat(repoPath, featId, { ghExec, config: resolved });
  if (!featResult) return null;
  const featIssueNum = featResult.issueNum;

  const sliceIssueNum = createSliceIssue(
    repo,
    { id: sliceId, frontmatter: sliceFm, body: sliceBody },
    { ghExec }
  );
  const sliceUrl = `https://github.com/${repo}/issues/${sliceIssueNum}`;
  const updatedSlice = mergeFrontmatter(sliceContent, {
    github_issue: sliceIssueNum,
    github_url: sliceUrl,
  });
  await fs.writeFile(sliceFile, updatedSlice);

  try {
    attachSubIssue(repo, featIssueNum, sliceIssueNum, { ghExec });
  } catch (err) {
    const detail = `${err.message ?? ""} ${err.stderr ?? ""}`;
    if (!detail.includes("422") && !detail.includes("duplicate")) {
      throw err;
    }
  }

  console.log(`[github-sync] publishSlice: ${sliceId} → #${sliceIssueNum} (sub of #${featIssueNum})`);
  return { created: true, issueNum: sliceIssueNum, url: sliceUrl };
}
