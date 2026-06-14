---
findings: "🔴:2,🟡:2,❓:0"
status: completed
---
# Review Result: SLICE-128 security+production-readiness review

- Created: 2026-06-13T15:50:56.514Z
- Reviewer: inspector
- Decision: rejected
- Status: completed
- Summary: REJECT — two HIGH-severity prompt-injection / GITHUB_OUTPUT-injection vulnerabilities in crew-pr-comment.yml block merge; all TypeScript modules are clean.
- Evidence Checked:
  - 1. CRITICAL prompt-injection: line 40 sets COMMENT_BODY via ${{ github.event.comment.body }} — a GitHub Actions expression that injects the raw comment body directly into the YAML env block without quoting the expression
  - allowing an attacker to break out of the string and inject arbitrary shell or YAML. 2. HIGH GITHUB_OUTPUT injection: lines 54-55 write 'intent=$intent' and 'body=$body' via bare 'echo' to $GITHUB_OUTPUT — if intent or body contain a newline the attacker controls the next output key
  - enabling step-output hijack. 3. actions/checkout@v5 does not exist at GA; latest is v4 — workflow will fail at runtime. 4. TypeScript modules: no process.exit(N) calls (uses process.exitCode correctly)
  - imports use node: prefix (no .mjs cross-imports needed in these stand-alone modules)
  - error handling is graceful (missing/corrupt JSON falls back to empty state). 5. Rate-limiter TOCTOU: read-check-write is not atomic (no file lock or tmp-swap)
  - but in a single-runner GH Actions environment this is acceptable — documented LOW finding. 6. gh-reply-formatter link construction uses '.../$path' with a leading '...' that produces an invalid relative link — not a security issue but a functional bug.
- Files Reviewed:
  - src/scripts/lib/gh-mention-parser.mts
  - src/scripts/lib/gh-reply-formatter.mts
  - src/scripts/lib/gh-rate-limiter.mts
  - .github/workflows/crew-pr-comment.yml
  - docs/integrations/github-pr-comment-teammate.md
  - src/tests/gh-mention-parser.test.mts
  - src/tests/gh-rate-limiter.test.mts
- Test Adequacy: 11 parser tests + 8 rate-limiter tests added; behavior-descriptive names; no gh-reply-formatter tests (formatter is pure function, LOW gap); TDD posture adequate for this surface.
- Risks: Prompt injection via comment body could allow arbitrary command execution in the GH Actions runner. GITHUB_OUTPUT injection could allow an attacker to overwrite step outputs and hijack subsequent steps. Both are exploitable by any GitHub user who can comment on a PR in a public repo.
- Required Follow-up: Fix 1 (CRITICAL): Replace line 40 '${{ github.event.comment.body }}' with toJSON: use 'COMMENT_BODY: ${{ toJSON(github.event.comment.body) }}' or pass via github.event object file rather than env. Fix 2 (HIGH): Replace lines 54-55 bare-echo pattern with heredoc delimiters per GitHub docs: 'echo "intent<<EOF", echo "$intent", echo "EOF" >> $GITHUB_OUTPUT'. Fix 3 (HIGH): Pin actions/checkout@v4 (v5 does not exist). Fix 4 (MEDIUM): Repair the artifact link in gh-reply-formatter.mts line 44 — the '.../path' prefix produces a broken URL; use a repo-root-anchored path or document that callers supply the full URL prefix.

