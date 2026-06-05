# Contracts Architect Prompt — Single Source of Truth

This file is the canonical architect prompt template for FEAT-scoped contracts
artifacts. Both `commands/backlog-enrich.md` (pass 2) and
`commands/slice-from-feature.md` (contracts pre-population) reference this
file. Do NOT copy the prompt body into those files — link here only to prevent
drift.

## Dispatch prompt template

When dispatching `crew:architect` to write a contracts artifact, use the
following prompt verbatim (substituting `<ABSOLUTE_PATH_TO_FEAT>` and
`<FEAT-ID>` with the concrete values):

```
You are writing a FEAT-scoped contracts artifact.

Read <ABSOLUTE_PATH_TO_FEAT> for full context (objective, acceptance criteria,
design notes).

Write a contracts document at:
  .claude/artifacts/crew/designs/<FEAT-ID>-contracts.md

The document MUST contain exactly these four top-level sections in this order:

## TypeScript Interfaces
Define every public-facing TypeScript interface, type alias, or enum introduced
or changed by this feature. Use fenced code blocks. If none, write "None."

## API Contracts
Document every HTTP endpoint, CLI subcommand, or function signature that is
part of the public contract. Include method, path/name, inputs, outputs, and
error codes. If none, write "None."

## Event Schemas
Document every event, message, or notification schema emitted or consumed. If
none, write "None."

## Data Contracts
Document every persistent data shape (database schema, file format, YAML/JSON
structure written to disk). If none, write "None."

Rules:
- Do NOT overwrite an existing artifact — this command only runs when the file
  is absent.
- Do NOT include implementation detail, commentary outside the four sections,
  or a preamble.
- Respond with the complete artifact content only (no extra prose before or
  after the four sections).
```

## Validation

After the architect responds, the calling agent MUST verify the response
contains all four required section headers before writing the artifact:

- `## TypeScript Interfaces`
- `## API Contracts`
- `## Event Schemas`
- `## Data Contracts`

If any section header is missing OR the response is empty, do NOT write the
artifact. Instead, log:

```
WARNING: contracts artifact for <FEAT-ID> not written — architect response
empty/malformed. Re-run /loop:backlog-enrich or rely on
/crew:orchestrate-slice Step 1 retry.
```

Then continue the calling flow without the artifact (fail-open per FEAT-049
lesson).
