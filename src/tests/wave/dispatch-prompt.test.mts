// src/tests/wave/dispatch-prompt.test.mts
import { describe, expect, test } from "bun:test";
import { buildDispatchPrompt } from "../../scripts/lib/wave/dispatch-prompt.mjs";

describe("buildDispatchPrompt", () => {
  test("normal mode contains slice command + slice id + worktree path", () => {
    const p = buildDispatchPrompt({
      sliceId: "SLICE-117",
      worktreePath: "/tmp/wt/SLICE-117",
      sliceCommand: "/crew:orchestrate-slice",
      mode: "normal"
    });
    expect(p).toContain("/crew:orchestrate-slice --id SLICE-117");
    expect(p).toContain("/tmp/wt/SLICE-117");
    expect(p).toContain("JSON marker");
  });

  test("fix mode includes failure artifact path and /crew:fix invocation", () => {
    const p = buildDispatchPrompt({
      sliceId: "SLICE-117",
      worktreePath: "/tmp/wt/SLICE-117",
      sliceCommand: "/crew:orchestrate-slice",
      mode: "fix",
      failureArtifactPath: ".claude/artifacts/crew/handoffs/SLICE-117-fail.md"
    });
    expect(p).toContain("/crew:fix --slice SLICE-117");
    expect(p).toContain(".claude/artifacts/crew/handoffs/SLICE-117-fail.md");
    expect(p).toContain("fix mode");
  });

  test("fix mode without failure artifact uses no-artifact phrasing", () => {
    const p = buildDispatchPrompt({
      sliceId: "SLICE-117",
      worktreePath: "/tmp/wt/SLICE-117",
      sliceCommand: "/crew:orchestrate-slice",
      mode: "fix"
    });
    expect(p).toContain("no failure artifact was captured");
  });
});
