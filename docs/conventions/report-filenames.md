# Report Filename Convention

Single source of truth for the unified artifact filename pattern used across
`.claude/artifacts/crew/**` and `.claude/artifacts/loop/**`.

## Why

Legacy filenames use ~6 conventions. Hyphens inside tokens (`SLICE-93`,
`FEAT-060`, `2026-06-04`, `cost-report-slice`, `agent-report`) prevent clean
tag extraction via `filename.split('-')`. This convention eliminates intra-token
hyphens so every `-`-separated segment is exactly one semantic tag.

---

## Grammar

```
{compactTs}-[{phase}-]{kind}-[{featId}-]{sliceId}[-{titleCamel}].{ext}
```

| Segment | Format | Example |
|---------|--------|---------|
| `compactTs` | `YYYYMMDDTHHMMSSZ` | `20260611T123843Z` |
| `kind` | camelCase single token (see Kind Registry) | `costReportSlice` |
| `featId` | `feat` + digits (tight, no dash) | `feat187` |
| `sliceId` | `slice` + digits (tight, no dash) | `slice96` |
| `titleCamel` | optional camelCase token, max 24 chars; **omit on overflow** | `healthPage` |
| `ext` | file extension without leading dot | `md`, `json` |

### Optional segments

- `phase` segment (`phaseN`) may appear between `compactTs` and `kind` when a
  phase is present: `20260611T123843Z-phaseN-kind-featId-sliceId.ext`
- `featId` is omitted when `featureId` is null (legacy slices without a feature)
- `sliceId` is required
- `titleCamel` is omitted when the camelCase coercion overflows 24 characters

### Tag extraction contract

```ts
path.basename(f, path.extname(f)).split('-')
// yields: ["20260611T123843Z", "costReportSlice", "feat187", "slice96"]
// every element is one semantic tag — no intra-token hyphens
```

---

## Kind Registry (17 canonical kinds)

| camelCase kind | Legacy kebab equivalent | Artifact type |
|----------------|------------------------|---------------|
| `agentReport` | `agent-report` | Agent transcript summary |
| `costReportSlice` | `cost-report-slice` | Per-slice cost breakdown |
| `costReportAggregate` | `cost-report-aggregate` | Aggregate cost rollup |
| `costAdvise` | `cost-advise` | Cost advisory note |
| `reviewResult` | `review-result` | Reviewer output |
| `validationResult` | `validation-result` | Validator output |
| `finalSynthesis` | `final-synthesis` | Slice-close synthesis |
| `pmReview` | `pm-review` | PM scoring artifact |
| `autoRun` | `auto-run` | Autonomous loop run record |
| `handoff` | `handoff` | Agent handoff artifact |
| `grade` | `grade` | Slice grade artifact |
| `plan` | `plan` | Slice plan artifact |
| `retro` | `retro` | Retrospective |
| `trajectory` | `trajectory` | Trajectory events |
| `fanoutMarker` | `fanout-marker` | Post-builder fanout marker |
| `shapeMarker` | `shape-marker` | Slice shape classification marker |
| `design` | `design` | Design artifact |

---

## Example transforms (old to new)

### 1. cost-report-slice (crew-owned, timestamped)

```
Before: 20260611T123843Z-cost-report-slice-feat181-slice95.md
After:  20260611T123843Z-costReportSlice-feat181-slice95.md
```

Tags: ["20260611T123843Z", "costReportSlice", "feat181", "slice95"]

### 2. agent-report (loop-owned, timestamped)

```
Before: 20260611T123843Z-agent-report-feat181-slice95.md
After:  20260611T123843Z-agentReport-feat181-slice95.md
```

Tags: ["20260611T123843Z", "agentReport", "feat181", "slice95"]

### 3. review-result (crew-owned, timestamped)

```
Before: 20260611T090146Z-feat166-slice91-review-result.md
After:  20260611T090146Z-reviewResult-feat166-slice91.md
```

Tags: ["20260611T090146Z", "reviewResult", "feat166", "slice91"]

### 4. grade (loop-owned, timestamped)

```
Before: 20260611T123843Z-feat181-slice95-grade.md
After:  20260611T123843Z-grade-feat181-slice95.md
```

Tags: ["20260611T123843Z", "grade", "feat181", "slice95"]

### 5. SLICE-NN.json fanout marker (loop-owned, no timestamp)

```
Before: SLICE-95.json
After:  20260611T123843Z-fanoutMarker-feat181-slice95.json
```

Tags: ["20260611T123843Z", "fanoutMarker", "feat181", "slice95"]

### 6. Trailing title slug (junk-segment elimination)

```
Before: 20260611T090146Z-agent-report-feat166-slice91-expose-checkpointdue-sliceclosessincecheckpo.md
After:  20260611T090146Z-agentReport-feat166-slice91-exposeCheckpointDue.md
```

Tags: ["20260611T090146Z", "agentReport", "feat166", "slice91", "exposeCheckpointDue"]

---

## buildArtifactFilename helper

All new writers MUST use `buildArtifactFilename` from
`src/scripts/lib/artifact-naming.mts`:

```ts
import { buildArtifactFilename, KIND_REGISTRY } from "./artifact-naming.mjs";

const filename = buildArtifactFilename({
  ts: "20260611T123843Z",
  kind: "costReportSlice",   // must be in KIND_REGISTRY
  featureId: "FEAT-187",
  sliceId: "SLICE-96",
  ext: "md"
});
// => "20260611T123843Z-costReportSlice-feat187-slice96.md"
```

- `kind` MUST match `/^[a-z][a-zA-Z0-9]*$/` (camelCase, no hyphens)
- `kind` MUST be in `KIND_REGISTRY` -- add new kinds there before using them
- `title` (optional) is coerced to camelCase via `camelTight()`, max 24 chars;
  omitted entirely when the coercion would overflow

---

## Migration scope

Writer flips are tracked in `docs/conventions/report-filenames-writer-audit.md`.
SLICE-B handles the easy-flip writers; SLICE-C handles on-disk migration.
