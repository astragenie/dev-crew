// Flag schema + argv parser for the loop CLI (src/scripts/loop.mts). See
// hero-crew/scripts/crew.mjs for the same pattern.
//
// Extracted out of loop.mts (side-effect-free) so it can be imported directly
// in tests. loop.mts itself invokes `main()` unconditionally at module load
// (no `import.meta.main` guard) — importing it from a test would run the CLI
// against the test runner's own argv and could corrupt process.exitCode for
// the whole `bun test` process. See pr-watch-flags.test.mts.

export const FLAG_SPEC = {
  "--help": { key: "help", boolean: true },
  "-h": { key: "help", boolean: true },
  "--repo": { key: "repo" },
  "--preset": { key: "preset" },
  "--variant": { key: "variant" },
  "--override": { key: "override" },
  "--strict": { key: "strict", boolean: true },
  "--phase": { key: "phase" },
  "--note": { key: "note" },
  "--status": { key: "status" },
  "--priority": { key: "priority" },
  "--category": { key: "category" },
  "--target-release": { key: "targetRelease" },
  "--type": { key: "type" },
  "--title": { key: "title" },
  "--id": { key: "id" },
  "--body": { key: "body" },
  "--features": { key: "features" },
  "--goal": { key: "goal" },
  "--no-dispatch": { key: "noDispatch", boolean: true },
  "--no-research": { key: "noResearch", boolean: true },
  "--no-architect": { key: "noArchitect", boolean: true },
  "--no-doc-writer": { key: "noDocWriter", boolean: true },
  "--no-classify": { key: "noClassify", boolean: true },
  "--keep-feature-open": { key: "keepFeatureOpen", boolean: true },
  "--force-close": { key: "forceClose", boolean: true },
  "--skip-validation-check": { key: "skipValidationCheck" },
  "--version": { key: "version" },
  "--since": { key: "since" },
  "--span-days": { key: "spanDays" },
  "--until": { key: "until" },
  "--by": { key: "by" },
  "--artifact": { key: "artifact" },
  "--kind": { key: "kind" },
  "--files": { key: "files" },
  "--features-json": { key: "featuresJson" },
  "--key": { key: "key" },
  "--insight": { key: "insight" },
  "--confidence": { key: "confidence" },
  "--slice": { key: "slice" },
  "--limit": { key: "limit" },
  "--window": { key: "window" },
  "--max-features": { key: "maxFeatures" },
  "--dry-run": { key: "dryRun", boolean: true },
  "--auto-mode": { key: "autoMode", boolean: true },
  "--provider": { key: "provider" },
  "--pr": { key: "pr" },
  "--scores": { key: "scores" },
  "--autonomous-safe": { key: "autonomousSafe" },
  "--evidence": { key: "evidence" },
  "--reasoning": { key: "reasoning" },
  "--allow-cross-session": { key: "allowCrossSession", boolean: true },
  "--allow-human-comments": { key: "allowHumanComments", boolean: true },
  // pr-watch: optional slice/feat context forwarded onto the emitted pr.merged envelope
  "--slice-id": { key: "sliceId" },
  "--feat-id": { key: "featId" },
  "--explain-halts": { key: "explainHalts", boolean: true },
  "--worktree": { key: "worktree" },
  // SLICE-64: auto-merge flags
  "--no-merge": { key: "noMerge", boolean: true },
  "--skip-simplify": { key: "skipSimplify", boolean: true },
  "--grade-yaml": { key: "gradeYaml" },
  "--include-triaged": { key: "includeTriaged", boolean: true },
  // FEAT-201: targeted PM rescore — comma-separated FEAT ids
  "--ids": { key: "ids" },
  // doctor flags
  "--check": { key: "check", boolean: true },
  "--fix": { key: "fix", boolean: true },
  // phase-gate flags
  "--serial": { key: "serial", boolean: true },
  "--only": { key: "only" },
  // backlog-add: pre-fill from GitHub issue
  "--from-issue": { key: "fromIssue" },
  // cost-by-skill report
  "--cost-by-skill": { key: "costBySkill", boolean: true },
  // pause / resume subcommands
  "--reason": { key: "reason" },
  // backlog-audit output format / lint-artifacts
  "--json": { key: "json", boolean: true },
  // learnings rank
  "--query": { key: "query" },
  // intake from-text (FEAT-277)
  "--text": { key: "text" },
  "--deep": { key: "deep", boolean: true },
  "--spec": { key: "spec", boolean: true },
  // backlog pm-apply (FEAT-214 / DEC-058): path to a PM results JSON file
  "--file": { key: "file" },
  // ARCHITECT GATE (runner side): backlog arch-gate-apply
  "--verdict": { key: "verdict" },
  "--objections": { key: "objections" },
  "--risk-flags": { key: "risk-flags" },
  "--spent-usd": { key: "spent-usd" }
};

export function parseArgs(argv: string[]) {
  const [command, ...rest] = argv;
  const flags: Record<string, any> = {
    repo: process.cwd(),
    preset: null,
    variant: null,
    override: null,
    strict: false,
    phase: null,
    note: null,
    help: false,
    status: null,
    priority: null,
    category: null,
    targetRelease: null,
    type: null,
    title: null,
    id: null,
    body: null,
    features: null,
    version: null,
    since: null,
    spanDays: null,
    until: null,
    by: null,
    artifact: null,
    kind: null,
    files: null,
    featuresJson: null,
    keepFeatureOpen: false,
    skipValidationCheck: null,
    key: null,
    insight: null,
    confidence: null,
    slice: null,
    limit: null,
    window: null,
    maxFeatures: null,
    dryRun: false,
    autoMode: false,
    provider: null,
    pr: null,
    noResearch: false,
    noArchitect: false,
    noDocWriter: false,
    noClassify: false,
    scores: null,
    autonomousSafe: null,
    evidence: null,
    reasoning: null,
    allowCrossSession: false,
    allowHumanComments: false,
    sliceId: null,
    featId: null,
    worktree: null,
    explainHalts: false,
    noMerge: false,
    skipSimplify: false,
    check: false,
    fix: false,
    serial: false,
    only: null,
    includeTriaged: false,
    ids: null,
    fromIssue: null,
    costBySkill: false,
    reason: null,
    json: false,
    query: null,
    text: null,
    deep: false,
    spec: false,
    file: null,
    verdict: null,
    objections: null,
    "risk-flags": null,
    "spent-usd": null
  };
  const positionals: any[] = [];

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index]!;
    if (value === "--") {
      for (let tail = index + 1; tail < rest.length; tail += 1) {
        positionals.push(rest[tail]);
      }
      break;
    }
    const spec = FLAG_SPEC[value as keyof typeof FLAG_SPEC];
    if (spec) {
      if ("boolean" in spec && spec.boolean) {
        (flags as Record<string, any>)[spec.key] = true;
      } else {
        (flags as Record<string, any>)[spec.key] = rest[index + 1];
        index += 1;
      }
      continue;
    }
    if (value.startsWith("--")) {
      throw new Error(`Unknown argument: ${value}`);
    }
    positionals.push(value);
  }

  if (!command || command === "--help" || command === "-h") {
    return { command: "help", flags, positionals };
  }
  return { command, flags, positionals };
}
