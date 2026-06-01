import fs from "node:fs/promises";
import { resolveConfig } from "./config-resolver.mjs";
import { listBacklog } from "./backlog-parser.mjs";
import { mergeFrontmatter, parseFrontmatter } from "./frontmatter.mjs";
import { defaultGhExec, isGhInstalled } from "./github-sync/gh.mjs";
import { detectRepo } from "./github-sync/repo-detect.mjs";
import { upsertMilestone } from "./github-sync/milestone-sync.mjs";
import { createFeatureIssue, updateIssueStatus as _updateLabel, closeIssue } from "./github-sync/issue-sync.mjs";
import { createSliceIssue, attachSubIssue, closeSliceIssue } from "./github-sync/subissue-sync.mjs";
import { buildSliceComment, postComment } from "./github-sync/comment-sync.mjs";
import { diffBody, patchBody } from "./github-sync/body-diff.mjs";
import { locateSliceFile, slicesRoot } from "./paths.mjs";

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
    if (feat.frontmatter.github_issue) continue;
    const milestoneNum = feat.frontmatter.phase ? milestoneMap[feat.frontmatter.phase] : null;
    const issueNum = createFeatureIssue(repo, feat, milestoneNum, { ghExec });
    const updated = mergeFrontmatter(
      await fs.readFile(feat.filePath, "utf8"),
      { github_issue: issueNum, github_milestone: milestoneNum ?? null }
    );
    await fs.writeFile(feat.filePath, updated);
    issueCount++;
    feat.frontmatter.github_issue = issueNum;

    const sliceIds = feat.frontmatter.slices || [];
    for (const sliceId of sliceIds) {
      const sliceFile = await findSliceFile(repoPath, sliceId, resolved);
      if (!sliceFile) continue;
      const sliceContent = await fs.readFile(sliceFile, "utf8");
      const { frontmatter: sliceFm, body: sliceBody } = parseFrontmatter(sliceContent);
      if (sliceFm.github_issue) continue;
      const sliceIssueNum = createSliceIssue(repo, { id: sliceId, frontmatter: sliceFm, body: sliceBody }, { ghExec });
      attachSubIssue(repo, issueNum, sliceIssueNum, { ghExec });
      const updatedSlice = mergeFrontmatter(sliceContent, { github_issue: sliceIssueNum });
      await fs.writeFile(sliceFile, updatedSlice);
      subissueCount++;
    }
  }

  console.log(`[github-sync] Published: ${milestoneCount} milestones, ${issueCount} issues, ${subissueCount} sub-issues`);
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
export async function postSliceComment(repoPath, sliceId, { featureId, sliceFm, validationGate, costReport, synthPath }, { ghExec = defaultGhExec, config } = {}) {
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
export async function updateIssueStatus(repoPath, sliceId, { featureId, sliceFm }, { ghExec = defaultGhExec, config } = {}) {
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
