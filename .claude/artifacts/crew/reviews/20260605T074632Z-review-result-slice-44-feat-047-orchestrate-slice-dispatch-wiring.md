# Review Result: SLICE-44 / FEAT-047: orchestrate-slice dispatch wiring

- Created: 2026-06-05T07:46:32.243Z
- Reviewer: reviewer
- Decision: rejected
- Summary: Version constant ORCHESTRATE_SLICE_MIN_CREW_VERSION='0.10.0' is wrong — orchestrate-slice shipped in crew v0.11.0, not v0.10.0; users on 0.10.x would receive an orchestrate-slice dispatch instruction for a command that does not exist.
- Evidence Checked:
  - 1. crew 0.13.1 CHANGELOG: v0.11.0 entry reads 'New command: /crew:orchestrate-slice'; v0.10.0 entry covers only UX validation gate. 2. Constant set to 0.10.0 means any crew >= 0.10.0 triggers the orchestrate path — but 0.10.x does not have the command. 3. --id flag format: orchestrate-slice.md is LLM-driven; --id is parsed from natural language context consistent with how /loop:slice-start --id is handled; design spec explicitly specifies '/crew:orchestrate-slice --id SLICE-NN'; no structural concern. 4. checkOrchestrateSliceSupport null/undefined seam: versionOverride !== undefined correctly bypasses filesystem read; null flows through to the !version false guard — semantics correct. 5. Fallback path: legacy 'Dispatch crew:builder subagent' text remains intact when useOrchestrateSlice=false; tests AC-3 and the renamed legacy test confirm it. 6. AC-3 wording discrepancy: FEAT-047 says 'falls back to /crew:build' but implementation falls back to 'Dispatch crew:builder subagent' — functional difference is minor (same agent
  - different surface syntax) but mismatches the written spec. 7. MIN_CREW_VERSION=0.3.6 untouched — correct; it gates artifact-writer flags unrelated to orchestrate-slice. 8. manifests OK
  - content-length OK
  - 733 tests pass/0 fail (pre-dispatch)
  - lint clean
  - format clean
  - typecheck clean.
- Files Reviewed:
  - src/scripts/lib/plugin-identity.mts
  - src/scripts/lib/slice-linker/dispatch.mts
  - src/scripts/lib/slice-linker/start-slice.mts
  - src/tests/slice-start.test.mts
- Test Adequacy: 2 new tests added (AC-1: crew 0.10.0 emits orchestrate; AC-3: crew 0.9.9 falls back); 2 existing tests pinned to _crewVersionOverride 0.9.0. Tests validate the wiring logic but the version boundary they test (0.10.0) is off-by-one — tests will pass even after the fix since they use explicit version overrides, not the real constant.
- Risks: Any deployment with crew 0.10.x installed silently emits a dispatch instruction for /crew:orchestrate-slice which does not exist in that crew version, causing the instruction to fail or be silently ignored at runtime. Fix is a one-line constant change to 0.11.0.
- Required Follow-up: Fix: change ORCHESTRATE_SLICE_MIN_CREW_VERSION from '0.10.0' to '0.11.0' in src/scripts/lib/plugin-identity.mts. Update test overrides that use '0.10.0' as the boundary to '0.11.0' (or add a test at exactly '0.10.9' to prove fallback). Re-run npm test to confirm. Also consider whether AC-3 fallback text should match the FEAT-047 spec wording (/crew:build) or whether spec should be amended.

