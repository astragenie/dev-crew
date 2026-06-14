# Task Handoff: SLICE-123: Linear teammate webhook handler + mention parser

- Created: 2026-06-13T14:22:26.422Z
- From: fullstack-dev
- To: lead
- Objective: Phase 1 foundation layer shipped: Linear webhook payload types, @crew mention parser, webhook router, 8 fixture-based unit tests, and setup guide doc.
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - scripts/linear-sync/linear-types.mts
  - scripts/linear-sync/mention-parser.mts
  - scripts/linear-sync/webhook-handler.mts
  - src/tests/linear-webhook.test.mts
  - docs/integrations/linear-teammate.md
- Confidence: high
- Risks: scripts/linear-sync/ is outside tsc rootDir (intentional — files use @ts-nocheck); tsconfig TS2688 @types/node error is pre-existing not introduced here; LinearProvider stub at src/scripts/lib/task-store/providers/linear-provider.mts exists from FEAT-024 — not modified (follow-on slice concern); eslint bunx fails on Node due to missing @eslint/js package (pre-existing env issue; scripts/ is in ignores anyway); 1 pre-existing fail in full suite (slice-complete.test.mts path not found — unchanged)
- Suggested Next Handoff: SLICE-124: HTTP webhook server (bun serve) + Linear API reply client — POST /webhook/linear, signature verification via LOOP_LINEAR_WEBHOOK_SECRET, dispatch crew:builder on @crew build mention

