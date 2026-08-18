import { gitText, gitTextOrThrow } from "./run-git.mjs";

async function git(repoPath: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return gitTextOrThrow(args, { cwd: repoPath });
}

export interface CheckpointCommitOptions {
  repoPath: string;
  sliceId: string;
  summary: string;
  decisions?: string;
  remainingWork?: string;
  failedApproaches?: string;
  stagedOnly?: boolean;
}

export interface CheckpointCommitResult {
  committed: boolean;
  sha?: string;
  reason?: string;
}

const MAX_SUBJECT_LENGTH = 72;
const ELLIPSIS = "…";

function buildSubject(sliceId: string, summary: string): string {
  const full = `wip(checkpoint): ${sliceId} — ${summary}`;
  if (full.length <= MAX_SUBJECT_LENGTH) return full;
  return full.slice(0, MAX_SUBJECT_LENGTH - ELLIPSIS.length) + ELLIPSIS;
}

function buildBody(
  opts: Pick<CheckpointCommitOptions, "decisions" | "remainingWork" | "failedApproaches">
): string {
  const sections: string[] = [];
  if (opts.decisions?.trim()) sections.push(`## Decisions\n\n${opts.decisions.trim()}`);
  if (opts.remainingWork?.trim())
    sections.push(`## Remaining work\n\n${opts.remainingWork.trim()}`);
  if (opts.failedApproaches?.trim())
    sections.push(`## Failed approaches\n\n${opts.failedApproaches.trim()}`);
  return sections.join("\n\n");
}

async function isWorkingTreeClean(repoPath: string): Promise<boolean> {
  const stdout = await gitText(["status", "--porcelain"], { cwd: repoPath });
  return stdout === "";
}

export async function checkpointCommit(
  opts: CheckpointCommitOptions
): Promise<CheckpointCommitResult> {
  const { repoPath, sliceId, summary, stagedOnly = false } = opts;

  if (!stagedOnly) {
    if (await isWorkingTreeClean(repoPath)) {
      return { committed: false, reason: "clean" };
    }
    await git(repoPath, ["add", "-u"]);
  }

  // Re-check after staging: if nothing staged, tree was clean
  const { stdout: diffStat } = await git(repoPath, ["diff", "--cached", "--stat"]);
  if (diffStat.trim() === "") {
    return { committed: false, reason: "clean" };
  }

  const subject = buildSubject(sliceId, summary);
  const body = buildBody(opts);
  const message = body ? `${subject}\n\n${body}` : subject;

  await git(repoPath, ["commit", "-m", message]);

  const { stdout: sha } = await git(repoPath, ["rev-parse", "HEAD"]);
  return { committed: true, sha: sha.trim() };
}
