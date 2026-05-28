import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { nextDecisionId, writeDecisionFile, listDecisions, showDecision } from "../scripts/lib/decisions-store.mjs";
async function tmpRepo(prefix) {
    return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}
test("nextDecisionId returns DEC-001 in an empty repo", async () => {
    const repo = await tmpRepo("al-dec-empty-");
    const id = await nextDecisionId(repo);
    assert.equal(id, "DEC-001");
});
test("nextDecisionId increments past existing decisions", async () => {
    const repo = await tmpRepo("al-dec-mono-");
    await writeDecisionFile(repo, {
        id: "DEC-001",
        title: "First",
        sliceId: "SLICE-01",
        rationale: "r"
    });
    await writeDecisionFile(repo, {
        id: "DEC-005",
        title: "Skipped numbering",
        sliceId: "SLICE-05",
        rationale: "r"
    });
    const next = await nextDecisionId(repo);
    assert.equal(next, "DEC-006");
});
test("writeDecisionFile creates a parseable ADR-style file", async () => {
    const repo = await tmpRepo("al-dec-write-");
    await writeDecisionFile(repo, {
        id: "DEC-001",
        title: "Use pagination",
        sliceId: "SLICE-52",
        rationale: "Payloads too large",
        consequences: "- bounded memory\n- pagination semantics differ"
    });
    const decs = await listDecisions(repo);
    assert.equal(decs.length, 1);
    assert.equal(decs[0].id, "DEC-001");
    assert.equal(decs[0].title, "Use pagination");
    assert.equal(decs[0].introduced_by_slice, "SLICE-52");
    assert.match(decs[0].body, /Payloads too large/);
});
test("listDecisions filters by status", async () => {
    const repo = await tmpRepo("al-dec-status-");
    await writeDecisionFile(repo, { id: "DEC-001", title: "A", sliceId: "SLICE-01", rationale: "r" });
    await writeDecisionFile(repo, { id: "DEC-002", title: "B", sliceId: "SLICE-02", rationale: "r" });
    // Manually mark DEC-002 as superseded
    const target = path.join(repo, ".claude/artifacts/loop/decisions/DEC-002.md");
    let content = await fs.readFile(target, "utf8");
    content = content.replace("status: accepted", "status: superseded");
    await fs.writeFile(target, content);
    const accepted = await listDecisions(repo, { status: "accepted" });
    assert.equal(accepted.length, 1);
    assert.equal(accepted[0].id, "DEC-001");
    const superseded = await listDecisions(repo, { status: "superseded" });
    assert.equal(superseded.length, 1);
    assert.equal(superseded[0].id, "DEC-002");
});
test("showDecision returns the full parsed entry", async () => {
    const repo = await tmpRepo("al-dec-show-");
    await writeDecisionFile(repo, {
        id: "DEC-001",
        title: "Test",
        sliceId: "SLICE-01",
        rationale: "r"
    });
    const dec = await showDecision(repo, "DEC-001");
    assert.ok(dec);
    assert.equal(dec.id, "DEC-001");
    assert.equal(dec.title, "Test");
});
test("showDecision returns null when not found", async () => {
    const repo = await tmpRepo("al-dec-missing-");
    const dec = await showDecision(repo, "DEC-999");
    assert.equal(dec, null);
});
