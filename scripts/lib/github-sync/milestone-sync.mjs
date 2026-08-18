import { defaultGhExec } from "./gh.mjs";

export function upsertMilestone(repo, { title, dueOn = null }, { ghExec = defaultGhExec } = {}) {
  const milestones = JSON.parse(ghExec(["api", `repos/${repo}/milestones`, "--paginate"]));
  const existing = milestones.find((m) => m.title === title);
  if (existing) return existing.number;
  const args = ["api", `repos/${repo}/milestones`, "--method", "POST", "-f", `title=${title}`];
  if (dueOn) args.push("-f", `due_on=${dueOn}T00:00:00Z`);
  return JSON.parse(ghExec(args)).number;
}
