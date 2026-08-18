import { execFileSync } from "node:child_process";

const defaultGitExec = (repoPath) =>
  execFileSync("git", ["remote", "get-url", "origin"], { cwd: repoPath, encoding: "utf8" }).trim();

export function detectRepo(overrideRepo, repoPath, { gitExec = defaultGitExec } = {}) {
  if (overrideRepo) return overrideRepo;
  const url = gitExec(repoPath);
  const ssh = url.match(/git@github\.com[:/](.+?)(?:\.git)?$/);
  if (ssh) return ssh[1];
  const https = url.match(/https:\/\/github\.com\/(.+?)(?:\.git)?$/);
  if (https) return https[1];
  throw new Error(`Cannot parse GitHub repo from remote URL: ${url}`);
}
