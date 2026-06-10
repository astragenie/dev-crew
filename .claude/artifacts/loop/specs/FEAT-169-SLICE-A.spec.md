# Spec: FEAT-169 SLICE-A — Type Safety: Result<T,E> + Branded IDs

## Metadata
- developer_type: agent
- estimated_complexity: medium
- languages: [typescript]
- referenced_design: docs/superpowers/specs/2026-06-07-code-quality-pivot-design.md § B6–B7
- referenced_plan: docs/superpowers/plans/2026-06-07-code-quality-pivot.md § B6–B7

---

## Objective

Land `Result<T,E>` discriminated-union error handling for domain parsers and gates (not infrastructure boundaries), plus branded ID types for FEAT/SLICE/SPEC/DEC/GRADE identifiers. This slice eliminates raw-string ID mixing bugs at compile time and replaces throw-based errors in expected-failure-mode domains (parsing, validation) with typed `Result` returns. At the completion of this slice, at least the frontmatter and backlog parsers must return `Result`, and all FEAT/SLICE/SPEC/DEC/GRADE ID constructors must validate their canonical regex format. Observability: debug log on ID validation failure; trace log on Result construction and error handling in hot parsers.

---

## Context

The loop plugin accumulated ~90 modules with inconsistent error handling. Parsers throw on shape failures; gates return `{ ok: boolean; reason?: string }`. Branded IDs exist nowhere — raw ID strings are passed through call chains, allowing accidental cross-type mixing (e.g. passing a `FeatId` string where a `SliceId` is required, only caught at runtime). The code-quality pivot (SPEC-004) requires both patterns. This slice implements:

1. `src/scripts/lib/result.mts` — canonical `Result<T,E>` per standards patterns.
2. `src/scripts/lib/ids.mts` — branded ID constructors with validation.
3. Retrofit `frontmatter.mts`, `backlog-parser.mts`, `spec-parser.mts`, `grade-parser.mts` to return `Result<T, ParseError>`.
4. Retrofit `validation-gate.mts`, `phase-gate.mts`, `walker-gates.mts` to return `Result<GateOutcome, GateError>`.
5. Audit ~80 raw-string ID call sites; wrap in branded ID constructors at parse boundaries.

Repo conventions: ESM `.mts` source → `scripts/*.mjs` emit via tsc. Tests in `src/tests/*.mts`. Complexity cap 15 (cyclomatic). No `process.exit` from libs. Keep every `npm run typecheck && npm run lint && npm test` green.

---

## Implementation Contract

### Part 1: Result<T, E> Type Module

#### Inputs
None (pure module definition).

#### Outputs

**Export `Result<T, E>` discriminated union:**
```typescript
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

**Export constructors:**
```typescript
export function ok<T>(value: T): Result<T, never>;
export function err<E>(error: E): Result<never, E>;
```

**Export helper functions:**
```typescript
export function map<T, U, E>(r: Result<T, E>, f: (t: T) => U): Result<U, E>;
export function flatMap<T, U, E>(r: Result<T, E>, f: (t: T) => Result<U, E>): Result<U, E>;
```

**File:** `src/scripts/lib/result.mts` (new file).

#### Side Effects
None (pure).

---

### Part 2: Branded ID Types Module

#### Inputs
A string in the canonical format for each ID type (validated at the constructor boundary).

#### Outputs

**Export branded types (compile-time only):**
```typescript
export type FeatId = Brand<string, "FeatId">;      // matches /^FEAT-\d{3,}$/
export type SliceId = Brand<string, "SliceId">;    // matches /^SLICE-\d{2,}$/
export type SpecId = Brand<string, "SpecId">;      // matches /^SPEC-\d{3,}$/
export type DecisionId = Brand<string, "DecisionId">; // matches /^DEC-\d{3,}$/
export type GradeId = Brand<string, "GradeId">;    // matches /^SLICE-\d{2,}$/ (same as SliceId)
```

**Export constructors (validating):**
```typescript
export const FeatId: (s: string) => FeatId;        // throws Error if not /^FEAT-\d{3,}$/
export const SliceId: (s: string) => SliceId;      // throws Error if not /^SLICE-\d{2,}$/
export const SpecId: (s: string) => SpecId;        // throws Error if not /^SPEC-\d{3,}$/
export const DecisionId: (s: string) => DecisionId; // throws Error if not /^DEC-\d{3,}$/
export const GradeId: (s: string) => GradeId;      // throws Error if not /^SLICE-\d{2,}$/
```

When a constructor rejects input:
- Log at `debug` level: `"ID validation failed: ${brand} expected /${pattern}/, got: ${s}"`.
- Throw `Error` with message: `"${brand} expected /${pattern.source}/, got: ${s}"`.

**File:** `src/scripts/lib/ids.mts` (new file).

#### Side Effects
- Debug log on every validation failure.
- No file I/O; no exit calls.

---

### Part 3: Parser Retrofit — Return Result<T, ParseError>

#### Input Types (per parser)

- **`frontmatter.mts`:** text (string, UTF-8 YAML frontmatter block + body)
- **`backlog-parser.mts`:** paths to `.md` files in the backlog tree
- **`spec-parser.mts`:** paths to SPEC `.md` files
- **`grade-parser.mts`:** paths to grade report `.json` files

#### Output Types (per parser)

Each parser exports a discriminated-union error type and a `Result`-bearing parse function:

**`frontmatter.mts`:**
```typescript
export type ParseError =
  | { readonly code: "missing-frontmatter" }
  | { readonly code: "malformed-yaml"; readonly detail: string };

export type ParsedFile = {
  readonly frontmatter: Record<string, unknown>;
  readonly body: string;
};

export function parseFrontmatter(text: string): Result<ParsedFile, ParseError>;
```

**`backlog-parser.mts`:**
```typescript
export type BacklogParseError =
  | { readonly code: "file-read-failed"; readonly path: string; readonly detail: string }
  | { readonly code: "missing-id" }
  | { readonly code: "malformed-frontmatter"; readonly path: string; readonly detail: string };

export interface BacklogEntry {
  readonly id: FeatId;
  readonly status: string;
  readonly path: string;
  readonly frontmatter: Record<string, unknown>;
  readonly body: string;
}

// The main export; signature unchanged but **return type** becomes Result.
export function parseBacklog(backlogRoot: string): Promise<Result<readonly BacklogEntry[], BacklogParseError>>;
```

**`spec-parser.mts`:**
```typescript
export type SpecParseError =
  | { readonly code: "file-read-failed"; readonly path: string; readonly detail: string }
  | { readonly code: "missing-spec-id" }
  | { readonly code: "malformed-spec-yaml" };

export interface SpecEntry {
  readonly id: SpecId;
  readonly title: string;
  readonly path: string;
  readonly frontmatter: Record<string, unknown>;
}

export function parseSpecs(specsRoot: string): Promise<Result<readonly SpecEntry[], SpecParseError>>;
```

**`grade-parser.mts`:**
```typescript
export type GradeParseError =
  | { readonly code: "file-read-failed"; readonly path: string; readonly detail: string }
  | { readonly code: "missing-grade-id" }
  | { readonly code: "malformed-json" };

export interface GradeEntry {
  readonly sliceId: GradeId;
  readonly data: Record<string, unknown>;
}

export function parseGrades(gradesRoot: string): Promise<Result<readonly GradeEntry[], GradeParseError>>;
```

#### Side Effects

- **Observability:** For every parse invocation, log at `info` level: `"Parsing ${module} from ${path}"` (or similar). On error, log at `warn` level: `"Parse error (${code}): ${detail}"`. On success, log at `debug` level: `"Parsed ${count} entries"`.
- **No filesystem writes.** No stdout writes except through the log system.
- **Result propagation:** Return `Result` to callers; do not throw on parse failure. Throw only on infrastructure boundaries (file-not-found at a required path, JSON.parse on a corrupted system file that should not be corrupted — these are escalations to the CLI boundary handler).

---

### Part 4: Gate Retrofit — Return Result<GateOutcome, GateError>

#### Input Types (per gate)

- **`validation-gate.mts`:** slice file path, required evidence entries
- **`phase-gate.mts`:** current loop state, phase transition request
- **`walker-gates.mts`:** slice / feature object, gate context

#### Output Types

Each gate exports an error type, an outcome type, and a `Result`-bearing gate function:

**`validation-gate.mts`:**
```typescript
export type GateError =
  | { readonly code: "missing-evidence"; readonly required: readonly string[] }
  | { readonly code: "validation-skipped"; readonly reason: string }
  | { readonly code: "no-validator-attestation" };

export type GateOutcome = {
  readonly status: "pass";
  readonly evidence: readonly string[];
};

export function deriveValidationGate(/* args */): Result<GateOutcome, GateError>;
```

**`phase-gate.mts`:**
```typescript
export type PhaseGateError =
  | { readonly code: "incompatible-state"; readonly currentPhase: string }
  | { readonly code: "prerequisite-incomplete"; readonly required: string };

export type PhaseOutcome = {
  readonly status: "pass";
};

export function checkPhaseGate(/* args */): Result<PhaseOutcome, PhaseGateError>;
```

**`walker-gates.mts`:**
```typescript
export type WalkerGateError =
  | { readonly code: "missing-handoff" }
  | { readonly code: "no-review-pass" }
  | { readonly code: "validation-fail"; readonly detail: string };

export type WalkerGateOutcome = {
  readonly status: "pass";
};

export function evaluateWalkerGate(/* args */): Result<WalkerGateOutcome, WalkerGateError>;
```

#### Side Effects

- **Observability:** Log at `info` level on gate evaluation entry: `"Gate ${gateName} evaluating..."`. On gate rejection, log at `warn` level: `"Gate ${gateName} rejected: ${code} — ${detail}"`. On pass, log at `debug` level: `"Gate ${gateName} passed"`.
- **No filesystem writes.** Propagate `Result` to callers.

---

### Part 5: Call-Site Migration — Wrap Raw IDs

#### Scope
~80 call sites across:
- `backlog-parser.mts`, `backlog-writer.mts`, `backlog-pm-write.mts`
- `brief.mts`, `slice-linker/*`
- `decisions-store.mts`, `release-planner.mts`, `pm-scorer.mts`
- `grade-parser.mts`, `grade-trend.mts`, `grade-writer.mts`
- `linkage.mts`, `slice-plan.mts`, `spec-parser.mts`, `spec-decomposer.mts`

#### Pattern

**Before:**
```typescript
interface BacklogEntry {
  id: string;  // "FEAT-042" as raw string
  status: string;
}

const entry: BacklogEntry = { id: "FEAT-042", status: "pending" };
```

**After:**
```typescript
import type { FeatId } from "./ids.mjs";
import { FeatId as FeatIdCtor } from "./ids.mjs";

interface BacklogEntry {
  id: FeatId;
  status: string;
}

// At the parse boundary (e.g., reading from YAML frontmatter):
const rawId = parsedData.id;
if (typeof rawId !== "string" || !rawId.match(/^FEAT-\d{3,}$/)) {
  // Return parse error or throw at CLI boundary
  throw new Error(`missing or invalid FEAT id: ${rawId}`);
}
const entry: BacklogEntry = { id: FeatIdCtor(rawId), status: "pending" };
```

**Observability:**
- Log at `debug` level when wrapping an ID: `"Branded ID constructed: ${brand} ${id}"`.
- Wrap failures are already logged by the ID constructor (see Part 2).

---

## Files to Create / Modify

### Create:
- `src/scripts/lib/result.mts` (60 lines)
- `src/scripts/lib/ids.mts` (70 lines)
- `src/tests/result.test.mts` (50 lines)
- `src/tests/ids.test.mts` (65 lines)

### Modify:
- `src/scripts/lib/frontmatter.mts` — change `parseFrontmatter` return type to `Result<ParsedFile, ParseError>` + update callers
- `src/scripts/lib/backlog-parser.mts` — change `parseBacklog` return type + wrap IDs + add observability
- `src/scripts/lib/spec-parser.mts` — change return type + wrap IDs
- `src/scripts/lib/grade-parser.mts` — change return type + wrap IDs
- `src/scripts/lib/validation-gate.mts` — change return type to `Result<GateOutcome, GateError>` + observability
- `src/scripts/lib/phase-gate.mts` — change return type + observability
- `src/scripts/lib/walker-gates.mts` — change return type + observability
- Caller sites in: `brief.mts`, `backlog-pm-write.mts`, `backlog-writer.mts`, `decisions-store.mts`, `grade-trend.mts`, `grade-writer.mts`, `linkage.mts`, `pm-scorer.mts`, `release-planner.mts`, `slice-linker.mts`, `slice-plan.mts`, `spec-decomposer.mts` — wrap Result unpacking (`.ok` checks) and branded ID construction

---

## Required Tests

### Test File 1: `src/tests/result.test.mts`

**Test 1.1 — ok constructor discriminates and carries value:**
```
Given: ok(42)
When: accessing result.ok and result.value
Then: result.ok === true, result.value === 42
```

**Test 1.2 — err constructor discriminates and carries error:**
```
Given: err({ code: "nope", detail: "boom" })
When: accessing result.ok and result.error
Then: result.ok === false, result.error.code === "nope"
```

**Test 1.3 — map applies function on ok, passes through on err:**
```
Given: map(ok(5), (n) => n * 2)
When: accessing the result
Then: result.ok === true, result.value === 10
```

**Test 1.4 — map short-circuits on err:**
```
Given: map(err("fail"), (n) => n * 2)
When: accessing the result
Then: result.ok === false, result.error === "fail"
```

**Test 1.5 — flatMap chains through ok:**
```
Given: flatMap(ok(3), (n) => ok(n * 3))
When: accessing the result
Then: result.ok === true, result.value === 9
```

**Test 1.6 — flatMap short-circuits on first err:**
```
Given: flatMap(ok(3), (_) => err("blocked"))
When: accessing the result
Then: result.ok === false, result.error === "blocked"
```

### Test File 2: `src/tests/ids.test.mts`

**Test 2.1 — FeatId validates canonical format:**
```
Given: FeatId("FEAT-042")
When: constructing
Then: no error, String(id) === "FEAT-042"
```

**Test 2.2 — FeatId rejects lowercase:**
```
Given: FeatId("feat-042")
When: constructing
Then: throws Error matching /FeatId expected \/\^FEAT-/
```

**Test 2.3 — FeatId rejects too-short numeric suffix:**
```
Given: FeatId("FEAT-1")
When: constructing
Then: throws Error matching /FeatId expected/
```

**Test 2.4 — SliceId validates canonical format:**
```
Given: SliceId("SLICE-68")
When: constructing
Then: no error, String(id) === "SLICE-68"
```

**Test 2.5 — SpecId rejects missing numeric suffix:**
```
Given: SpecId("SPEC-ABC")
When: constructing
Then: throws Error
```

**Test 2.6 — DecisionId validates /^DEC-\d{3,}$/ format:**
```
Given: DecisionId("DEC-001")
When: constructing
Then: no error
```

**Test 2.7 — GradeId uses same pattern as SliceId:**
```
Given: GradeId("SLICE-50")
When: constructing
Then: no error (GradeId accepts SLICE-NNN format)
```

### Test File 3: `src/tests/frontmatter.test.mts` (amendments)

**Test 3.1 — parseFrontmatter returns Result ok on valid input:**
```
Given: text = "---\nid: FEAT-001\n---\nbody text\n"
When: calling parseFrontmatter(text)
Then: result.ok === true, result.value.body === "body text"
```

**Test 3.2 — parseFrontmatter returns Result err when frontmatter missing:**
```
Given: text = "no yaml block\nbody"
When: calling parseFrontmatter(text)
Then: result.ok === false, result.error.code === "missing-frontmatter"
```

**Test 3.3 — parseFrontmatter returns Result err on malformed YAML:**
```
Given: text = "---\ninvalid: yaml: syntax: here\n---\nbody"
When: calling parseFrontmatter(text)
Then: result.ok === false, result.error.code === "malformed-yaml"
```

### Test File 4: Integration test in `src/tests/backlog-parser.test.mts` (amendments)

**Test 4.1 — parseBacklog returns Result with FeatId-typed entries:**
```
Given: fixture directory with FEAT-001.md (valid) and FEAT-002.md (valid)
When: calling parseBacklog(dir)
Then: result.ok === true, result.value[0].id is FeatId (typed), result.value[0].id === "FEAT-001" (value)
```

**Test 4.2 — parseBacklog returns Result err on missing required id:**
```
Given: fixture with a .md file missing 'id' field in frontmatter
When: calling parseBacklog(dir)
Then: result.ok === false, result.error.code === "missing-id"
```

**Test 4.3 — parseBacklog returns Result err on invalid id format:**
```
Given: fixture with a .md file having id: "invalid-format"
When: calling parseBacklog(dir)
Then: result.ok === false, result.error includes the file path and detail
```

---

## Acceptance Criteria

**AC-001: Result type and constructors are exported and tested**
```
Given: src/scripts/lib/result.mts is written
When: running node --test tests/result.test.mts
Then: all 6 test cases pass; no TypeScript errors
```

**AC-002: Branded ID types are exported and validated**
```
Given: src/scripts/lib/ids.mts is written
When: running node --test tests/ids.test.mts
Then: all 7 test cases pass; every invalid format rejects with Error; every valid format accepts
```

**AC-003: Branded ID constructors log at debug level on validation failure**
```
Given: calling FeatId("invalid")
When: constructor throws Error
Then: a debug-level log line appears in stderr/stdout matching pattern /ID validation failed.*FeatId/
```

**AC-004: Frontmatter parser returns Result<ParsedFile, ParseError>**
```
Given: src/scripts/lib/frontmatter.mts is retrofit
When: calling parseFrontmatter("---\nid: x\n---\nbody")
Then: return type is Result; result.ok === true; result.value.body === "body"
```

**AC-005: Frontmatter parser returns error Result on malformed input**
```
Given: calling parseFrontmatter("no yaml") (missing frontmatter)
When: executing
Then: result.ok === false; result.error.code === "missing-frontmatter"
```

**AC-006: Backlog parser wraps ID strings in FeatId constructors**
```
Given: fixture .md with valid id: "FEAT-042"
When: calling parseBacklog(dir)
Then: result.value[0].id is typed FeatId and equals "FEAT-042" at runtime
```

**AC-007: Backlog parser returns Result with error on invalid ID**
```
Given: fixture .md with id: "invalid"
When: calling parseBacklog(dir)
Then: result.ok === false; error includes "invalid" in detail
```

**AC-008: Gate functions return Result<GateOutcome, GateError>**
```
Given: validation-gate.mts, phase-gate.mts, walker-gates.mts are retrofit
When: calling any gate function
Then: return type is Result; callers use .ok check instead of .ok boolean flag
```

**AC-009: Gate functions log at warn level on rejection**
```
Given: a gate rejects (e.g., validation-gate with missing evidence)
When: deriveValidationGate() returns error Result
Then: a warn-level log line appears matching pattern /Gate.*rejected.*missing-evidence/
```

**AC-010: All call sites unpacking Result use the .ok discriminator**
```
Given: every file modified to call a Result-returning function
When: grep -r "\.ok ===" src/scripts
Then: at least 80 matches (one per wrapped call site); every .ok === true or .ok === false or !\.ok branch checks
```

**AC-011: All required tests pass and coverage is green**
```
Given: all test files created/amended
When: running npm run typecheck && npm run lint && npm test
Then: exit code 0; no test failures; no lint errors
```

---

## Verification Commands

**Typecheck clean:**
```bash
cd C:\work\mega\loop && npm run typecheck 2>&1 | tail -3
```
Expected: no output or "tsc: command not found" → exit 0.

**Lint clean:**
```bash
cd C:\work\mega\loop && npm run lint 2>&1 | tail -3
```
Expected: no output or clean exit code 0.

**All tests pass:**
```bash
cd C:\work\mega\loop && npm test 2>&1 | tail -20
```
Expected: all tests pass; summary line shows "passed" count > 0.

**Result module exports and tests:**
```bash
cd C:\work\mega\loop && npm run build && node --test tests/result.test.mjs 2>&1 | tail -10
```
Expected: "tests/result.test.mjs" passes all 6 subtests.

**Branded ID module exports and tests:**
```bash
cd C:\work\mega\loop && npm run build && node --test tests/ids.test.mjs 2>&1 | tail -10
```
Expected: "tests/ids.test.mjs" passes all 7 subtests.

**Frontmatter parser returns Result:**
```bash
cd C:\work\mega\loop && npm run build && node -e "import { parseFrontmatter } from './scripts/lib/frontmatter.mjs'; const r = parseFrontmatter('---\nid: x\n---\nbody'); console.log(r.ok ? 'ok' : 'err', r.ok ? r.value.body : r.error.code);" 2>&1
```
Expected: output "ok body".

**Backlog entries are FeatId-typed:**
```bash
cd C:\work\mega\loop && npm run build && npm test 2>&1 | grep -A 2 "FeatId-typed"
```
Expected: integration test for backlog entries passing.

**Observability: ID validation failures are logged:**
```bash
cd C:\work\mega\loop && npm run build && node -e "import { FeatId } from './scripts/lib/ids.mjs'; try { FeatId('invalid'); } catch(e) { console.log('threw:', e.message); }" 2>&1
```
Expected: error message matching /FeatId expected/.

**Full acceptance suite:**
```bash
cd C:\work\mega\loop && npm run typecheck && npm run lint && npm test && npm run format:check 2>&1 | tail -5
```
Expected: exit code 0; all checks pass.

---

## Notes on Observability

This slice includes observability requirements to address the weak observability dimension (0.66 grade signal):

1. **ID validation logging:** Every `FeatId()` / `SliceId()` / etc. constructor failure logs at `debug` level with the rejected value and expected pattern. This surfaces ID-format bugs early.

2. **Parser observability:** Each parser logs at `info` on entry, `debug` on successful parse, and `warn` on error with the error code and detail. Enables tracing of parse failures in production.

3. **Gate observability:** Each gate logs at `info` on entry, `debug` on pass, and `warn` on rejection with the reason code. Enables troubleshooting gate-based flow blocks.

4. **Debug-level call-site logging:** When wrapping a raw ID string in a branded constructor at parse boundaries, log at `debug`: `"Branded ID constructed: ${type} ${id}"`. This traces the validation boundary.

All logging is done via the existing telemetry / logger module (if present); if none, use `console.log` at the appropriate level (info, warn, debug are log level names).

---

## Rationale & Context

**Why Result<T, E> over throwing:** Domain operations (parsing, validation, gates) have expected failure modes. Using `Result` makes error cases explicit in the type signature, preventing accidental unhandled failures. Infrastructure failures (missing files, network issues) still throw — they are boundaries, not expected domain failures.

**Why branded IDs:** Raw string IDs invite mixing of ID types. A function expecting `(featId: FeatId, sliceId: SliceId)` can be called incorrectly with the strings swapped — the compiler cannot catch this. Branded types add a zero-cost (at runtime) type distinction, catching these bugs at compile time. The validation constructors ensure only canonical formats enter the system.

**Why this order:** Result types must be in place before parser retrofitting (Part 3). ID types must be in place before wrapping (Part 5). This preserves dependency order and enables incremental validation.

**Why observer logging is critical:** The loop plugin's observability grade is 0.66. Unlogged error paths are a risk — hard to diagnose why a parse or gate failed without logs. Every error Result and every ID validation failure must be logged.
