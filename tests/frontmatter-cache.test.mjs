import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFrontmatterCached, clearFrontmatterCache } from "../scripts/lib/frontmatter-cache.mjs";
describe("frontmatter-cache", () => {
    beforeEach(() => {
        clearFrontmatterCache();
    });
    test("same path + mtime returns cached data (readFile not called second time)", () => {
        const parsed = { id: "FEAT-001", status: "triaged" };
        let callCount = 0;
        const mockReadFile = (_path) => {
            callCount += 1;
            return "---\nid: FEAT-001\n---\n";
        };
        const mockParse = (_content) => parsed;
        const result1 = readFrontmatterCached("/repo/FEAT-001.md", 1000, mockParse, mockReadFile);
        const result2 = readFrontmatterCached("/repo/FEAT-001.md", 1000, mockParse, mockReadFile);
        assert.equal(callCount, 1, "readFile should only be called once (cache hit on second call)");
        assert.deepEqual(result1, parsed);
        assert.deepEqual(result2, parsed);
        assert.equal(result1, result2, "should return the exact same object reference");
    });
    test("same path, different mtime → cache miss, readFile called again", () => {
        let callCount = 0;
        const mockReadFile = (_path) => {
            callCount += 1;
            return `---\nid: FEAT-001\nmtime: ${callCount}\n---\n`;
        };
        const mockParse = (content) => {
            const m = content.match(/mtime: (\d+)/);
            return { id: "FEAT-001", mtime: m ? Number(m[1]) : 0 };
        };
        const result1 = readFrontmatterCached("/repo/FEAT-001.md", 1000, mockParse, mockReadFile);
        assert.equal(callCount, 1);
        assert.equal(result1.mtime, 1);
        const result2 = readFrontmatterCached("/repo/FEAT-001.md", 2000, mockParse, mockReadFile);
        assert.equal(callCount, 2, "readFile should be called again on mtime change");
        assert.equal(result2.mtime, 2);
    });
    test("clearFrontmatterCache() causes next call to be a cold miss", () => {
        let callCount = 0;
        const mockReadFile = (_path) => {
            callCount += 1;
            return "---\nid: FEAT-002\n---\n";
        };
        const mockParse = (_content) => ({ id: "FEAT-002" });
        readFrontmatterCached("/repo/FEAT-002.md", 5000, mockParse, mockReadFile);
        assert.equal(callCount, 1, "first call populates cache");
        clearFrontmatterCache();
        readFrontmatterCached("/repo/FEAT-002.md", 5000, mockParse, mockReadFile);
        assert.equal(callCount, 2, "after clearFrontmatterCache, next call should miss cache");
    });
    test("different paths are cached independently", () => {
        let readCount = 0;
        const mockReadFile = (_path) => {
            readCount += 1;
            return "---\nid: FEAT-X\n---\n";
        };
        const mockParse = (_content) => ({ id: "X" });
        readFrontmatterCached("/repo/A.md", 100, mockParse, mockReadFile);
        readFrontmatterCached("/repo/B.md", 100, mockParse, mockReadFile);
        readFrontmatterCached("/repo/A.md", 100, mockParse, mockReadFile);
        readFrontmatterCached("/repo/B.md", 100, mockParse, mockReadFile);
        assert.equal(readCount, 2, "each path gets its own cache slot; only 2 cold reads needed");
    });
    test("key collision guard: path+mtime combination is unique (different paths, same mtime don't collide)", () => {
        const results = {};
        let callCount = 0;
        const makeReadFile = (id) => (_path) => {
            callCount += 1;
            return `---\nid: ${id}\n---\n`;
        };
        const makeParse = (id) => (_content) => ({ id });
        const r1 = readFrontmatterCached("/repo/A.md", 999, makeParse("A"), makeReadFile("A"));
        const r2 = readFrontmatterCached("/repo/B.md", 999, makeParse("B"), makeReadFile("B"));
        results["A"] = r1;
        results["B"] = r2;
        assert.equal(r1.id, "A", "A path returns A data");
        assert.equal(r2.id, "B", "B path returns B data");
        assert.equal(callCount, 2, "two distinct paths = two reads, no collision");
    });
});
