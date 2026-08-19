import fs from "node:fs/promises";
import path from "node:path";
import { test, expect } from "bun:test";
import { runCrew } from "../scripts/crew.mjs";
import { makeTempDir } from "./helpers/cli-fixtures.mjs";

test("CLI artifact writers create markdown artifacts", async () => {
  const repoPath = await makeTempDir("crew-cli-artifacts-");
  const initResult = await runCrew(["init", "--repo", repoPath]);
  expect(initResult.code, "init should exit with code 0").toBe(0);

  const runBriefResult = await runCrew([
    "write-run-brief",
    "--repo",
    repoPath,
    "--title",
    "Platform guidance feature",
    "--goal",
    "Add platform guidance to the create page",
    "--mode",
    "single-session",
    "--pace",
    "medium",
    "--files",
    "app/templates/create.html,static/js/create.js"
  ]);
  expect(runBriefResult.code, "write-run-brief should exit with code 0").toBe(0);
  const runBriefOutput = JSON.parse(runBriefResult.output);
  const runBriefBody = await fs.readFile(runBriefOutput.path, "utf8");
  expect(runBriefBody).toMatch(/# Run Brief: Platform guidance feature/);
  expect(runBriefBody).toMatch(/single-session/);

  const reviewResult = await runCrew([
    "write-review-result",
    "--repo",
    repoPath,
    "--title",
    "Platform guidance review",
    "--decision",
    "approved",
    "--reviewer",
    "reviewer",
    "--files",
    "app/templates/create.html",
    "--non-code"
  ]);
  expect(reviewResult.code, "write-review-result should exit with code 0").toBe(0);
  const reviewOutput = JSON.parse(reviewResult.output);
  const reviewBody = await fs.readFile(reviewOutput.path, "utf8");
  expect(reviewBody).toMatch(/# Review Result: Platform guidance review/);
  expect(reviewBody).toMatch(/approved/);

  const reviewAliasResult = await runCrew([
    "write-review-result",
    "--repo",
    repoPath,
    "--title",
    "Platform guidance alias review",
    "--verdict",
    "approved_with_notes",
    "--non-code"
  ]);
  expect(reviewAliasResult.code, "write-review-result with --verdict should exit with code 0").toBe(
    0
  );
  const reviewAliasOutput = JSON.parse(reviewAliasResult.output);
  const reviewAliasBody = await fs.readFile(reviewAliasOutput.path, "utf8");
  expect(reviewAliasBody).toMatch(/approved_with_notes/);

  const validationPlanResult = await runCrew([
    "write-validation-plan",
    "--repo",
    repoPath,
    "--title",
    "Platform guidance validation plan",
    "--validator",
    "verifier",
    "--environment",
    "local",
    "--goal",
    "Exercise the create flow and collect smoke evidence",
    "--evidence",
    "vite build,playwright smoke"
  ]);
  expect(validationPlanResult.code, "write-validation-plan should exit with code 0").toBe(0);
  const validationPlanOutput = JSON.parse(validationPlanResult.output);
  const validationPlanBody = await fs.readFile(validationPlanOutput.path, "utf8");
  expect(validationPlanBody).toMatch(/# Validation Plan: Platform guidance validation plan/);
  expect(validationPlanBody).toMatch(/Exercise the create flow and collect smoke evidence/);

  const validationResult = await runCrew([
    "write-validation-result",
    "--repo",
    repoPath,
    "--title",
    "Platform guidance validation",
    "--validator",
    "verifier",
    "--environment",
    "local",
    "--decision",
    "passed",
    "--evidence",
    "vite build,playwright smoke",
    "--files",
    "http://localhost:5173,app/templates/create.html"
  ]);
  expect(validationResult.code, "write-validation-result should exit with code 0").toBe(0);
  const validationOutput = JSON.parse(validationResult.output);
  const validationBody = await fs.readFile(validationOutput.path, "utf8");
  expect(validationBody).toMatch(/# Validation Result: Platform guidance validation/);
  expect(validationBody).toMatch(/local/);
  expect(validationBody).toMatch(/passed/);

  const deploymentCheckResult = await runCrew([
    "write-deployment-check",
    "--repo",
    repoPath,
    "--title",
    "Platform guidance dev deploy",
    "--deployer",
    "release-engineer",
    "--environment",
    "dev",
    "--resource",
    "cloud-run:platform-guidance-dev",
    "--url",
    "https://platform-guidance-dev.example.com",
    "--revision",
    "platform-guidance-dev-00012-abc",
    "--decision",
    "passed",
    "--evidence",
    "gcloud deploy output,health check",
    "--files",
    "https://platform-guidance-dev.example.com"
  ]);
  expect(deploymentCheckResult.code, "write-deployment-check should exit with code 0").toBe(0);
  const deploymentCheckOutput = JSON.parse(deploymentCheckResult.output);
  const deploymentCheckBody = await fs.readFile(deploymentCheckOutput.path, "utf8");
  expect(deploymentCheckBody).toMatch(/# Deployment Check: Platform guidance dev deploy/);
  expect(deploymentCheckBody).toMatch(/cloud-run:platform-guidance-dev/);
  expect(deploymentCheckBody).toMatch(/https:\/\/platform-guidance-dev\.example\.com/);
  expect(deploymentCheckBody).toMatch(/platform-guidance-dev-00012-abc/);

  await fs.mkdir(path.join(repoPath, ".github", "workflows"), { recursive: true });
  await fs.writeFile(path.join(repoPath, ".github", "workflows", "deploy.yml"), "name: deploy\n");
  await fs.writeFile(path.join(repoPath, "Dockerfile"), "FROM node:20\n");

  const discoverResult = await runCrew(["discover-deployment", "--repo", repoPath]);
  expect(discoverResult.code, "discover-deployment should exit with code 0").toBe(0);
  const discoverOutput = JSON.parse(discoverResult.output);
  expect(discoverOutput.clues.includes(".github/workflows/deploy.yml")).toBeTruthy();
  expect(discoverOutput.clues.includes("Dockerfile")).toBeTruthy();

  const guidanceResult = await runCrew([
    "write-deployment-guidance",
    "--repo",
    repoPath,
    "--title",
    "Platform guidance deployment model",
    "--discovery-status",
    "live-verified",
    "--verified-from",
    "cloud run,github actions",
    "--summary",
    "GitHub Actions builds the image; gcloud deploy applies it to Cloud Run.",
    "--build",
    "merge to main or manual GitHub workflow builds container image",
    "--deploy",
    "gcloud run deploy applies the built image",
    "--environments",
    "dev,prod",
    "--logs",
    "Cloud Logging service logs",
    "--metrics",
    "Cloud Monitoring request/error/cpu metrics",
    "--alerts",
    "Cloud Monitoring alert policies on 5xx and crash loops",
    "--telemetry",
    "BigQuery product events",
    "--missing",
    "staging playground service url"
  ]);
  expect(guidanceResult.code, "write-deployment-guidance should exit with code 0").toBe(0);
  const guidanceOutput = JSON.parse(guidanceResult.output);
  const guidanceBody = await fs.readFile(guidanceOutput.path, "utf8");
  expect(guidanceBody).toMatch(/# Deployment Guidance: Platform guidance deployment model/);
  expect(guidanceBody).toMatch(/- Discovery Status: live-verified/);
  expect(guidanceBody).toMatch(/- Verified From:/);
  expect(guidanceBody).toMatch(/GitHub Actions builds the image/);
  expect(guidanceBody).toMatch(/Cloud Logging service logs/);
  expect(guidanceBody).toMatch(/staging playground service url/);
  expect(guidanceBody).toMatch(/\.github\/workflows\/deploy\.yml/);
});

test("write-* commands embed --feature and --phase in frontmatter", async () => {
  const repoPath = await makeTempDir("crew-cli-feature-phase-");
  const initResult = await runCrew(["init", "--repo", repoPath]);
  expect(initResult.code, "init should exit with code 0").toBe(0);

  // run-brief with feature + phase
  const runBriefResult = await runCrew([
    "write-run-brief",
    "--repo",
    repoPath,
    "--title",
    "Tagged brief",
    "--feature",
    "FEAT-021",
    "--phase",
    "3"
  ]);
  expect(runBriefResult.code, "write-run-brief should exit with code 0").toBe(0);
  const briefPath = JSON.parse(runBriefResult.output).path;
  const briefBody = await fs.readFile(briefPath, "utf8");
  expect(briefBody).toMatch(/^---\nphase: "3"\nfeature: FEAT-021\nstatus: \w+\n---\n/);
  expect(briefBody).toMatch(/# Run Brief: Tagged brief/);

  // review-result without feature/phase: P1.3 (2026-07-04) now always emits a
  // canonical `decision:` frontmatter line when --decision is set, so "no
  // frontmatter" is no longer the bare case — the canonical verdict enum is
  // exactly the field P1.3 intentionally moved out of body-prose-only.
  const reviewResult = await runCrew([
    "write-review-result",
    "--repo",
    repoPath,
    "--title",
    "Bare review",
    "--decision",
    "approved",
    "--non-code"
  ]);
  expect(reviewResult.code, "write-review-result should exit with code 0").toBe(0);
  const reviewPath = JSON.parse(reviewResult.output).path;
  const reviewBody = await fs.readFile(reviewPath, "utf8");
  expect(
    reviewBody,
    "review-result with feature/phase absent still carries the canonical decision frontmatter (P1.3)"
  ).toMatch(/^---\ndecision: approved\n---\n/);

  // review-result with only feature emits frontmatter without phase line
  const reviewFeatResult = await runCrew([
    "write-review-result",
    "--repo",
    repoPath,
    "--title",
    "Feat review",
    "--decision",
    "approved",
    "--feature",
    "FEAT-007",
    "--non-code"
  ]);
  expect(reviewFeatResult.code, "write-review-result with feature should exit with code 0").toBe(0);
  const reviewFeatPath = JSON.parse(reviewFeatResult.output).path;
  const reviewFeatBody = await fs.readFile(reviewFeatPath, "utf8");
  expect(reviewFeatBody).toMatch(/^---\nfeature: FEAT-007\ndecision: approved\n---\n/);
  expect(!reviewFeatBody.includes("phase:"), "no phase key when phase omitted").toBeTruthy();
});

test("write-handoff --repo-context appends ## Repo Layout section", async () => {
  const repoPath = await makeTempDir("crew-repo-context-");
  await runCrew(["init", "--repo", repoPath]);
  const result = await runCrew([
    "write-handoff",
    "--repo",
    repoPath,
    "--title",
    "Test handoff",
    "--from",
    "fullstack-dev",
    "--to",
    "lead",
    "--repo-context"
  ]);
  expect(result.code, "write-handoff should exit with code 0").toBe(0);
  const output = JSON.parse(result.output);
  expect(output.path, "should return artifact path").toBeTruthy();
  const content = await fs.readFile(output.path, "utf8");
  expect(content).toMatch(/## Repo Layout/);
  expect(content).toMatch(/npm scripts:/);
});

test("write-handoff without --repo-context has no ## Repo Layout section", async () => {
  const repoPath = await makeTempDir("crew-no-repo-context-");
  await runCrew(["init", "--repo", repoPath]);
  const result = await runCrew([
    "write-handoff",
    "--repo",
    repoPath,
    "--title",
    "Test handoff plain",
    "--from",
    "fullstack-dev",
    "--to",
    "lead"
  ]);
  expect(result.code, "write-handoff should exit with code 0").toBe(0);
  const output = JSON.parse(result.output);
  const content = await fs.readFile(output.path, "utf8");
  expect(
    !content.includes("## Repo Layout"),
    "should not contain Repo Layout without flag"
  ).toBeTruthy();
});

test("write-review-result with --validation-evidence emits frontmatter field and body section", async () => {
  const repoPath = await makeTempDir("crew-validation-evidence-present-");
  await runCrew(["init", "--repo", repoPath]);
  const evidenceText =
    "node --test: 42 pass / 0 fail; npm run lint exit 0; npm run typecheck exit 0 — code-only diff, no user-visible surface";
  const result = await runCrew([
    "write-review-result",
    "--repo",
    repoPath,
    "--title",
    "Bundled validation review",
    "--decision",
    "approved",
    "--non-code",
    "--validation-evidence",
    evidenceText
  ]);
  expect(result.code, "write-review-result should exit with code 0").toBe(0);
  const output = JSON.parse(result.output);
  const content = await fs.readFile(output.path, "utf8");
  expect(content, "frontmatter should contain validation_evidence key").toMatch(
    /validation_evidence:/
  );
  expect(
    content.includes(evidenceText),
    "frontmatter or body should contain the evidence text"
  ).toBeTruthy();
  expect(content, "body should contain ## Validation Evidence section").toMatch(
    /## Validation Evidence/
  );
});

test("write-review-result without --validation-evidence emits no frontmatter field and no body section", async () => {
  const repoPath = await makeTempDir("crew-validation-evidence-absent-");
  await runCrew(["init", "--repo", repoPath]);
  const result = await runCrew([
    "write-review-result",
    "--repo",
    repoPath,
    "--title",
    "No evidence review",
    "--decision",
    "approved",
    "--non-code"
  ]);
  expect(result.code, "write-review-result should exit with code 0").toBe(0);
  const output = JSON.parse(result.output);
  const content = await fs.readFile(output.path, "utf8");
  expect(
    !content.includes("validation_evidence"),
    "artifact should have no validation_evidence field when flag omitted"
  ).toBeTruthy();
  expect(
    !content.includes("## Validation Evidence"),
    "artifact should have no Validation Evidence section when flag omitted"
  ).toBeTruthy();
});

test("write-review-result with --validation-evidence empty string treats it as omitted", async () => {
  const repoPath = await makeTempDir("crew-validation-evidence-empty-");
  await runCrew(["init", "--repo", repoPath]);
  const result = await runCrew([
    "write-review-result",
    "--repo",
    repoPath,
    "--title",
    "Empty evidence review",
    "--decision",
    "approved",
    "--non-code",
    "--validation-evidence",
    ""
  ]);
  expect(result.code, "write-review-result should exit with code 0").toBe(0);
  const output = JSON.parse(result.output);
  const content = await fs.readFile(output.path, "utf8");
  expect(
    !content.includes("validation_evidence"),
    "artifact should have no validation_evidence field when flag is empty string"
  ).toBeTruthy();
  expect(
    !content.includes("## Validation Evidence"),
    "artifact should have no Validation Evidence section when flag is empty string"
  ).toBeTruthy();
});

test("write-validation-result: --findings persisted in frontmatter", async () => {
  const repoPath = await makeTempDir("crew-wvr-findings-");
  try {
    await runCrew(["init", "--repo", repoPath]);
    const result = await runCrew([
      "write-validation-result",
      "--repo",
      repoPath,
      "--title",
      "Findings validation",
      "--decision",
      "passed",
      "--evidence",
      "manual smoke",
      "--findings",
      "pass:2,partial:0,fail:1"
    ]);
    expect(result.code, "write-validation-result should exit with code 0").toBe(0);
    const output = JSON.parse(result.output);
    const body = await fs.readFile(output.path, "utf8");
    expect(body, "validation artifact must contain findings").toMatch(
      /findings:.*pass:2,partial:0,fail:1/
    );
  } finally {
    await fs.rm(repoPath, { recursive: true, force: true });
  }
});

test("write-deployment-check: --findings persisted in frontmatter", async () => {
  const repoPath = await makeTempDir("crew-wdc-findings-");
  try {
    await runCrew(["init", "--repo", repoPath]);
    const result = await runCrew([
      "write-deployment-check",
      "--repo",
      repoPath,
      "--title",
      "Findings deploy",
      "--environment",
      "dev",
      "--decision",
      "passed",
      "--evidence",
      "health check",
      "--findings",
      "healthy:1,degraded:0,down:0"
    ]);
    expect(result.code, "write-deployment-check should exit with code 0").toBe(0);
    const output = JSON.parse(result.output);
    const body = await fs.readFile(output.path, "utf8");
    expect(body, "deployment artifact must contain findings").toMatch(
      /findings:.*healthy:1,degraded:0,down:0/
    );
  } finally {
    await fs.rm(repoPath, { recursive: true, force: true });
  }
});
