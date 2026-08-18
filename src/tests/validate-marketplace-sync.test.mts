import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareSemver,
  compareVersions,
  isMainRef,
  severityFor,
  type SyncResult
} from "../scripts/validate-marketplace-sync.mjs";

const registryAt = (version: string | null) => ({
  plugins: version === null ? [] : [{ name: "runner", version }]
});

const drift = (localVersion: string, registryVersion: string | null): SyncResult => ({
  status: "drift",
  localVersion,
  registryVersion
});

describe("compareVersions", () => {
  it("reports ok when the registry matches plugin.json", () => {
    const r = compareVersions("0.73.0", registryAt("0.73.0"));
    assert.equal(r.status, "ok");
  });

  it("reports drift when the versions differ", () => {
    const r = compareVersions("0.73.0", registryAt("0.72.0"));
    assert.equal(r.status, "drift");
    assert.equal(r.status === "drift" && r.registryVersion, "0.72.0");
  });

  it("reports drift with a null registryVersion when the entry is missing", () => {
    const r = compareVersions("0.73.0", registryAt(null));
    assert.equal(r.status, "drift");
    assert.equal(r.status === "drift" && r.registryVersion, null);
  });
});

describe("compareSemver", () => {
  it("orders by numeric segment, not lexically", () => {
    // The bug a string compare would hide: "0.9.0" > "0.73.0" lexically.
    assert.ok(compareSemver("0.73.0", "0.9.0") > 0);
    assert.ok(compareSemver("0.9.0", "0.73.0") < 0);
  });

  it("treats equal versions as equal", () => {
    assert.equal(compareSemver("1.2.3", "1.2.3"), 0);
  });

  it("treats a missing trailing segment as zero", () => {
    assert.equal(compareSemver("1.2", "1.2.0"), 0);
    assert.ok(compareSemver("1.2.1", "1.2") > 0);
  });
});

describe("isMainRef", () => {
  it("is true for a push build of main", () => {
    assert.equal(isMainRef({ GITHUB_REF: "refs/heads/main" } as NodeJS.ProcessEnv), true);
  });

  it("is false for a pull_request build even when it targets main", () => {
    // The release commit has not landed yet — registry-behind is still expected.
    assert.equal(
      isMainRef({
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_REF: "refs/heads/main",
        GITHUB_BASE_REF: "main"
      } as NodeJS.ProcessEnv),
      false
    );
  });

  it("is false for a feature branch", () => {
    assert.equal(
      isMainRef({ GITHUB_REF: "refs/heads/chore/release-v0.73.0" } as NodeJS.ProcessEnv),
      false
    );
  });

  it("is false with no CI env — a local run never blocks on another repo's state", () => {
    assert.equal(isMainRef({} as NodeJS.ProcessEnv), false);
  });
});

describe("severityFor", () => {
  it("passes when in sync", () => {
    const d = severityFor(
      { status: "ok", localVersion: "0.73.0", registryVersion: "0.73.0" },
      true
    );
    assert.equal(d.severity, "ok");
  });

  it("warns — never fails — when the registry is unreachable", () => {
    const d = severityFor(
      { status: "unreachable", localVersion: "0.73.0", reason: "HTTP 503" },
      true
    );
    assert.equal(d.severity, "warn");
  });

  // The regression this whole change exists for: the release PR was red by
  // construction, deadlocking the release. plugin.json bumps first; the
  // registry is a paired commit that follows the tag.
  it("WARNS when the registry is behind off main (the release-PR transient)", () => {
    const d = severityFor(drift("0.73.0", "0.72.0"), false);
    assert.equal(d.severity, "warn");
    assert.match(d.reason, /expected during a release/);
  });

  // The bug the gate was originally written to catch: registry sat at 0.67.0
  // while 0.68/0.69/0.70 shipped.
  it("FAILS when the registry is behind on main (a shipped release consumers can't get)", () => {
    const d = severityFor(drift("0.70.0", "0.67.0"), true);
    assert.equal(d.severity, "fail");
    assert.match(d.reason, /astra-marketplace/);
  });

  it("FAILS when the registry is ahead, even off main", () => {
    const d = severityFor(drift("0.72.0", "0.73.0"), false);
    assert.equal(d.severity, "fail");
    assert.match(d.reason, /never cut here/);
  });

  it("FAILS when the registry has no entry, even off main", () => {
    const d = severityFor(drift("0.73.0", null), false);
    assert.equal(d.severity, "fail");
    assert.match(d.reason, /cannot install/);
  });

  it("does not mistake a lexically-larger-but-numerically-older version for ahead", () => {
    // A naive string compare says "0.9.0" > "0.73.0" and would flip both of
    // these. Numerically 73 > 9, so:
    //   registry 0.9.0, local 0.73.0 -> registry BEHIND -> warn off main
    //   registry 0.73.0, local 0.9.0 -> registry AHEAD  -> fail anywhere
    assert.equal(severityFor(drift("0.73.0", "0.9.0"), false).severity, "warn");
    assert.equal(severityFor(drift("0.9.0", "0.73.0"), false).severity, "fail");
  });
});
