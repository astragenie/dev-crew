import { describe, expect, test } from "bun:test";
import path from "node:path";
import { parseCrewBundle } from "../scripts/lib/crew-bundle-parser.mjs";

const FIXTURE = path.resolve(import.meta.dirname, "fixtures", "crew-bundle-sample.md");

describe("parseCrewBundle", () => {
  test("extracts stage markers in order", async () => {
    const result = await parseCrewBundle(FIXTURE);
    const stages = result.progressMarkers.map((m) => m.stage);
    expect(stages).toEqual(["discover", "implement", "verify"]);
  });

  test("extracts tool calls with toolName + duration", async () => {
    const result = await parseCrewBundle(FIXTURE);
    const tools = result.toolCalls.map((t) => t.toolName);
    expect(tools).toEqual(["Read", "Grep", "Write", "Edit", "Bash"]);
    expect(result.toolCalls[0].durationMs).toBe(42);
    expect(result.toolCalls[4].durationMs).toBe(2300);
  });

  test("extracts agent + sliceId from frontmatter", async () => {
    const result = await parseCrewBundle(FIXTURE);
    expect(result.agent).toBe("crew:builder");
    expect(result.sliceId).toBe("SLICE-1");
  });
});
