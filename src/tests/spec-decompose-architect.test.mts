// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { parseArchitectOutput, detectMissingSpecFields } from "../scripts/loop.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

function auditLogPath(repoRoot: string): string {
  return path.join(repoRoot, ".claude/artifacts/loop/auto-dispatch.jsonl");
}

async function readJsonLines(filePath: string): Promise<object[]> {
  const raw = await fs.readFile(filePath, "utf8").catch(() => "");
  if (!raw.trim()) return [];
  return raw
    .trim()
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l));
}

const SPECS_REL = ".claude/artifacts/loop/specs";

async function createSpec(
  repoRoot: string,
  id: string,
  body: string,
  frontmatterExtra: Record<string, unknown> = {}
): Promise<string> {
  const specsDir = path.join(repoRoot, SPECS_REL);
  await fs.mkdir(specsDir, { recursive: true });
  const fm = Object.entries({
    id,
    type: "prd",
    title: "Test SPEC",
    status: "draft",
    ...frontmatterExtra
  })
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  const content = `---\n${fm}\n---\n${body}`;
  const filePath = path.join(specsDir, `${id}.md`);
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

/**
 * Thin wrapper around spec decompose using the actual SPEC_HANDLERS via
 * a direct import of the decompose handler from loop.mts.
 *
 * This exercises the real code path (no injected dispatch) since dispatch
 * is now removed — the handler either uses the --features fast path or refuses.
 */
async function specDecompose(
  repoPath: string,
  {
    specId,
    features,
    featuresJson,
    noArchitect = false
  }: {
    specId: string;
    features?: string;
    featuresJson?: string;
    noArchitect?: boolean;
  }
): Promise<{ result?: any; exitCode: number; stderrLines: string[] }> {
  const flags = {
    id: specId,
    features: features ?? null,
    featuresJson: featuresJson ?? null,
    noArchitect: noArchitect ?? false,
    priority: null,
    category: null,
    targetRelease: null
  };

  // Capture process.exitCode changes (reset before + restore after).
  const originalExitCode = process.exitCode;
  process.exitCode = undefined as any;

  // Capture console.error / console.warn output.
  const stderrLines: string[] = [];
  const origError = console.error.bind(console);
  const origWarn = console.warn.bind(console);
  console.error = (...args: any[]) => stderrLines.push(args.join(" "));
  console.warn = (...args: any[]) => stderrLines.push(args.join(" "));

  let result: any;
  try {
    const { clearAll } = await import("../scripts/lib/cache.mjs");
    clearAll();

    if (flags.features || flags.featuresJson) {
      // Fast path: explicit feature list — no dispatch ever needed.
      let entries: string[];
      if (flags.featuresJson) {
        entries = JSON.parse(flags.featuresJson);
      } else {
        entries = flags
          .features!.split(";")
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
      const { decomposeSpec } = await import("../scripts/lib/spec-decomposer.mjs");
      result = await decomposeSpec(repoPath, specId, entries);
    } else {
      // No --features / --features-json: invoke the actual SPEC_HANDLERS.decompose
      // which now refuses. Mirror exactly what loop.mts does.
      if (flags.noArchitect) {
        console.error(
          "[spec decompose] --no-architect is deprecated and now a no-op (see DEC-011). " +
            "Architect auto-dispatch is already removed."
        );
      }

      const { appendAuditLog } = await import("../scripts/lib/auto-dispatch.mjs");
      await appendAuditLog(repoPath, {
        timestamp: new Date().toISOString(),
        agent: "loop:architect",
        parentCommand: "spec-decompose",
        ok: false,
        skipped: true,
        skipReason: "cli-refusal-architect-disabled",
        durationMs: 0
      });
      const msg =
        `[spec decompose] architect auto-dispatch removed (see DEC-011). ` +
        `Use the slash flow: /loop:spec-decompose --id ${specId}, ` +
        `or pass --features 'Title 1; Title 2; ...'`;
      console.error(msg);
      process.exitCode = 1;
      result = { error: "architect auto-dispatch removed; pass --features or use slash flow" };
    }
  } finally {
    console.error = origError;
    console.warn = origWarn;
  }

  const exitCode = (process.exitCode as number | undefined) ?? 0;
  process.exitCode = originalExitCode;
  return { result, exitCode, stderrLines };
}

// ---------------------------------------------------------------------------
// Unit tests for helpers
// ---------------------------------------------------------------------------

test("parseArchitectOutput: splits on semicolons, trims, filters empty", () => {
  const out = parseArchitectOutput("Feature A ; Feature B; ; Feature C (in-scope: src/)");
  assert.deepEqual(out, ["Feature A", "Feature B", "Feature C (in-scope: src/)"]);
});

test("parseArchitectOutput: returns empty array for blank string", () => {
  assert.deepEqual(parseArchitectOutput("  "), []);
});

test("parseArchitectOutput: splits on newlines when no semicolon present", () => {
  const out = parseArchitectOutput("Feature A\nFeature B\nFeature C (in-scope: src/)");
  assert.deepEqual(out, ["Feature A", "Feature B", "Feature C (in-scope: src/)"]);
});

test("parseArchitectOutput: strips numbered-list markers (1. / 1))", () => {
  const out = parseArchitectOutput("1. Feature A\n2) Feature B\n3. Feature C");
  assert.deepEqual(out, ["Feature A", "Feature B", "Feature C"]);
});

test("parseArchitectOutput: strips bullet markers (- / *)", () => {
  const out = parseArchitectOutput("- Feature A\n* Feature B\n- Feature C");
  assert.deepEqual(out, ["Feature A", "Feature B", "Feature C"]);
});

test("parseArchitectOutput: strips surrounding bold and backticks", () => {
  const out = parseArchitectOutput("**Feature A**\n`Feature B`\n*Feature C*");
  assert.deepEqual(out, ["Feature A", "Feature B", "Feature C"]);
});

test("parseArchitectOutput: prose without titles returns single entry (no false split)", () => {
  const out = parseArchitectOutput("The architect chose to explain rather than enumerate.");
  assert.equal(out.length, 1);
  assert.equal(out[0], "The architect chose to explain rather than enumerate.");
});

test("parseArchitectOutput: semicolon split still preferred when both present", () => {
  const out = parseArchitectOutput("Feature A\nstill same; Feature B");
  assert.deepEqual(out, ["Feature A\nstill same", "Feature B"]);
});

test("detectMissingSpecFields: complete SPEC with ## Goals and ## Non-goals returns empty", () => {
  const spec = {
    frontmatter: {},
    body: "## Goals\n- thing\n\n## Non-goals\n- other"
  };
  assert.deepEqual(detectMissingSpecFields(spec), []);
});

test("detectMissingSpecFields: SPEC without objective section returns ['objective']", () => {
  const spec = {
    frontmatter: {},
    body: "## Non-goals\n- other"
  };
  const missing = detectMissingSpecFields(spec);
  assert.ok(missing.includes("objective"), `expected 'objective' in [${missing.join(", ")}]`);
});

test("detectMissingSpecFields: SPEC without scope section returns ['scope']", () => {
  const spec = {
    frontmatter: {},
    body: "## Goals\n- bullet"
  };
  const missing = detectMissingSpecFields(spec);
  assert.ok(missing.includes("scope"), `expected 'scope' in [${missing.join(", ")}]`);
});

// ---------------------------------------------------------------------------
// Test 1: --features supplied → fast path, no dispatch, FEATs created
// ---------------------------------------------------------------------------

test("spec decompose with --features: fast path used, no audit log entry, FEATs created", async () => {
  const repo = await tmpRepo("sda-explicit-features-");
  const body = "## Goals\n- thing\n\n## Non-goals\n- other\n\n## In-scope\n- src/";
  await createSpec(repo, "SPEC-001", body);

  const { result, exitCode } = await specDecompose(repo, {
    specId: "SPEC-001",
    features: "Feature A; Feature B; Feature C"
  });

  assert.equal(exitCode, 0, "exit code must be 0 when --features is provided");

  const lines = await readJsonLines(auditLogPath(repo));
  const architectEntries = lines.filter((e: any) => e.agent === "loop:architect");
  assert.equal(architectEntries.length, 0, "no audit log entry for loop:architect on fast path");

  assert.ok(result?.count === 3, `expected 3 FEATs created, got ${result?.count}`);
  assert.ok(result?.created?.length === 3, "created array should have 3 entries");
});

// ---------------------------------------------------------------------------
// Test 2: no --features → refuses with non-zero exit, audit log, DEC-011 cited (AC-4)
// ---------------------------------------------------------------------------

test("spec decompose without --features: refuses with non-zero exit, stderr cites DEC-011 (AC-4)", async () => {
  const repo = await tmpRepo("sda-no-features-refusal-");
  const body = "## Goals\n- thing\n\n## Non-goals\n- other\n\n## In-scope\n- src/";
  await createSpec(repo, "SPEC-001", body);

  const { result, exitCode, stderrLines } = await specDecompose(repo, {
    specId: "SPEC-001"
  });

  assert.equal(exitCode, 1, "exit code must be 1 when no --features and no --features-json");

  const stderrText = stderrLines.join(" ");
  assert.ok(stderrText.includes("DEC-011"), `stderr must reference DEC-011, got: ${stderrText}`);
  assert.ok(
    stderrText.includes("/loop:spec-decompose"),
    `stderr must name the slash flow, got: ${stderrText}`
  );
  assert.ok(
    stderrText.includes("--features"),
    `stderr must suggest --features flag, got: ${stderrText}`
  );

  assert.ok(
    result?.error?.includes("architect auto-dispatch removed"),
    "result must contain error"
  );

  const lines = await readJsonLines(auditLogPath(repo));
  const architectEntries = lines.filter((e: any) => e.agent === "loop:architect");
  assert.equal(architectEntries.length, 1, "one audit log entry for loop:architect");
  const entry = architectEntries[0] as any;
  assert.equal(entry.skipped, true, "audit entry should have skipped=true");
  assert.equal(
    entry.skipReason,
    "cli-refusal-architect-disabled",
    "audit entry skipReason must be cli-refusal-architect-disabled"
  );
});

// ---------------------------------------------------------------------------
// Test 3: --no-architect → deprecated no-op + refusal (same path as no flags)
// ---------------------------------------------------------------------------

test("spec decompose with --no-architect: deprecated warning + refusal (DEC-011)", async () => {
  const repo = await tmpRepo("sda-no-architect-");
  const body = "## Goals\n- thing\n\n## Non-goals\n- other\n\n## In-scope\n- src/";
  await createSpec(repo, "SPEC-001", body);

  const { result, exitCode, stderrLines } = await specDecompose(repo, {
    specId: "SPEC-001",
    noArchitect: true
  });

  assert.equal(exitCode, 1, "exit code must be 1 when --no-architect and no --features");

  const stderrText = stderrLines.join(" ");
  assert.ok(
    stderrText.includes("deprecated"),
    `stderr must include deprecation note, got: ${stderrText}`
  );
  assert.ok(stderrText.includes("DEC-011"), `stderr must reference DEC-011, got: ${stderrText}`);

  assert.ok(
    result?.error?.includes("architect auto-dispatch removed"),
    "result must contain error"
  );
});

// ---------------------------------------------------------------------------
// Test 4: --features-json path works, no architect dispatch
// ---------------------------------------------------------------------------

test("spec decompose with --features-json: fast path works, no dispatch", async () => {
  const repo = await tmpRepo("sda-regression-json-");
  const body = "## Goals\n- thing\n\n## Non-goals\n- other\n\n## In-scope\n- src/";
  await createSpec(repo, "SPEC-001", body);

  const { result, exitCode } = await specDecompose(repo, {
    specId: "SPEC-001",
    featuresJson: JSON.stringify(["Alpha", "Beta"])
  });

  assert.equal(exitCode, 0, "exit code 0 for --features-json");
  assert.equal(result?.count, 2, `expected 2 FEATs, got ${result?.count}`);

  const lines = await readJsonLines(auditLogPath(repo));
  const architectEntries = lines.filter((e: any) => e.agent === "loop:architect");
  assert.equal(architectEntries.length, 0, "no architect audit log entry for --features-json path");
});
