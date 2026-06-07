import { listGrades, SCORE_DIMENSIONS } from "./grade-parser.mjs";

// Feeds-forward recent grade content for the next-slice planner. Researcher
// agent reads this before drafting acceptance criteria so prior pain doesn't
// repeat. Returns structured data + a ready-to-include markdown digest.

function parseListSection(body: string, sectionHeader: string) {
  const items: any[] = [];
  const lines = body.split("\n");
  let inSection = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (new RegExp(`^##\\s+${sectionHeader}\\b`, "i").test(trimmed)) {
      inSection = true;
      continue;
    }
    if (inSection && /^##\s+/.test(trimmed)) break;
    if (!inSection) continue;
    const m = trimmed.match(/^-\s+(.+)$/);
    if (m && m[1].trim() && !/bullet \d/.test(m[1])) items.push(m[1].trim());
  }
  return items;
}

export async function recentLessons(
  repoPath: string,
  { limit = 5, config = null }: { limit?: number; config?: unknown } = {}
) {
  const grades = await listGrades(repoPath, { config });
  const recent = grades.slice(-limit);
  const items = recent.map((g: Record<string, any>) => ({
    slice: g.frontmatter.slice,
    graded_at: g.frontmatter.graded_at,
    avg_score: avg(SCORE_DIMENSIONS.map((d) => g.scores?.[d])),
    lessons: parseListSection(g.body, "Lessons"),
    surprises: parseListSection(g.body, "Surprises"),
    followups: parseListSection(g.body, "Followups")
  }));
  return {
    count: items.length,
    items,
    digest: renderDigest(items)
  };
}

function avg(values: unknown[]): number | null {
  const nums = values.filter((v): v is number => typeof v === "number");
  if (nums.length === 0) return null;
  return Number((nums.reduce((a: number, b: number) => a + b, 0) / nums.length).toFixed(3));
}

function renderDigest(items: Record<string, any>[]): string {
  if (items.length === 0) return "_(no grades yet — first slice has no feed-forward signal)_";
  const lines: string[] = [];
  lines.push(`# Lessons feed-forward — last ${items.length} slice(s)`);
  lines.push("");
  for (const item of items) {
    lines.push(`## ${item.slice} (avg ${item.avg_score ?? "n/a"}, ${item.graded_at})`);
    lines.push("");
    if (item.lessons.length > 0) {
      lines.push("**Lessons**:");
      for (const l of item.lessons) lines.push(`- ${l}`);
      lines.push("");
    }
    if (item.surprises.length > 0) {
      lines.push("**Surprises**:");
      for (const s of item.surprises) lines.push(`- ${s}`);
      lines.push("");
    }
    if (item.followups.length > 0) {
      lines.push("**Followups (unresolved)**:");
      for (const f of item.followups) lines.push(`- ${f}`);
      lines.push("");
    }
  }
  lines.push("---");
  lines.push(
    "_Researcher: incorporate the above into acceptance criteria + risks for the new slice. Avoid repeating known mistakes._"
  );
  return lines.join("\n");
}
