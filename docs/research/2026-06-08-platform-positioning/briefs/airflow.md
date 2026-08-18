---
competitor: Apache Airflow
category: workflow-platform
sources:
  - https://airflow.apache.org/
  - https://airflow.apache.org/docs/apache-airflow/stable/index.html
  - https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/overview.html
  - https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/sensors.html
  - https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/security/access-control.html
  - https://airflow.apache.org/docs/apache-airflow-providers/
  - https://github.com/apache/airflow
  - https://github.com/astronomer/airflow-ai-sdk
  - https://github.com/astronomer/ai-sdk-examples
date: 2026-06-08
confidence: medium-high
---

## Identity

General-purpose **DAG scheduler** (stable 3.2.2, LTS 2.11.2). Python, Apache-licensed. Mature web UI, scheduler, executor pool. Provider ecosystem (~90+ providers including GitHub, Slack, HTTP, Jira, OpenAI). Third-party `airflow-ai-sdk` (Astronomer) exposes `@task.llm` / `@task.agent` decorators backed by Pydantic-AI. NOT coding-agent platform — scored from "could team build Crew/Loop-equivalent on top?"

## Scores

| Axis | Score | Evidence |
| --- | --- | --- |
| Planning | 1 | DAG itself is plan, no pre-flight spec/decomposition phase exists. Hand-author planning DAG. README notes Airflow best for "mostly static and slowly changing" workflows. |
| Multi-Agent | 2 | `airflow-ai-sdk` `@task.agent` orchestrates single agent with tools; multi-agent achievable by chaining `@task.agent` tasks across DAG. No native team-of-agents abstraction. Pydantic-AI backed so multi-model trivial. |
| Shared Memory | 2 | XCom (cross-task) + Variables + Connections persist in metadata DB across tasks/DAG runs. No semantic memory layer — key/value blobs only. |
| Workflow Visibility | 3 | Rich web UI: Grid, Graph, Gantt, per-task logs, real-time scheduler state. README: "rich user interface makes it easy to visualize pipelines running in production." |
| Knowledge Base | 0 | No structured repo-knowledge layer. Anything persistent is BYO (XCom, external DB, S3). |
| Human Approval Gates | 2 | No named "approval" primitive, but `Sensor` (`poke`/`reschedule`/deferrable modes) blocks on external condition; pattern is gate on manual signal (file drop, API flag, `dag_run.conf`). `ShortCircuitOperator` + trigger-rules give branch control. Hand-built UX. |
| GitHub Integration | 2 | First-class `apache-airflow-providers-github` provider (hooks/operators/sensors for repos, issues, tags). No PR / sub-issue first-class abstraction — operators wrap REST API thinly. |
| Linear Integration | 0 | No Linear provider in official provider list. Custom `SimpleHttpOperator` work. |
| Architecture Governance | 1 | Airflow uses AIPs (Improvement Proposals) on Confluence for its own development; platform offers no ADR primitive. DAG-as-code gives git-tracked structural decisions — convention, not feature. |
| Standards Enforcement | 1 | None at platform level. Conventions live in CI on DAG repo. `airflow dags test` + DAG-validity checks, no content-length / convention gates. |
| Learning From Past Runs | 1 | Historical run metadata + task duration retained in metadata DB, surfaced in UI (Gantt, duration charts). No grade/retro feedback into next-run planning. |
| Cost Tracking | 0 | No native cost tracking. Token/dollar accounting BYO; instrument inside each `@task.llm`. |
| Agent Analytics | 1 | Per-task duration, success/failure counts, logs are first-class. With AI SDK you'd see latency; token counts not surfaced as first-class metrics unless logged manually. OpenLineage gives lineage but not agent analytics. |
| Loop Execution | 3 | Core competency: scheduler walks DAGs autonomously, retries, backfills, catches up. `schedule`/cron/`Trigger`/dataset-based scheduling autonomous. No human poke once DAG unpaused. |
| Self-Healing | 3 | Mature: per-task `retries` + `retry_delay` + `retry_exponential_backoff`, on-failure/on-retry callbacks, SLA misses, deferrable operators, sensor reschedule mode, automatic task rescheduling on worker death. |
| Enterprise Readiness | 3 | FAB-based RBAC with roles/permissions (Airflow 3.x split into pluggable auth-manager); pluggable auth (OAuth, LDAP, Kerberos via FAB historically); audit-log table in metadata DB; on-prem first (self-hosted default); managed offerings via Astronomer, AWS MWAA, GCP Cloud Composer with SOC2/SSO. Apache 2.0. |

**Total: 25 / 48**

## Strengths (top 3)
1. **Battle-tested scheduler + retry / self-healing semantics.** Per-task `retries`, exponential backoff, deferrable operators, sensor reschedule mode, SLA callbacks — exactly the primitives Loop emulates by hand. Airflow 3.x task SDK + executor separation is production-grade.
2. **Workflow visibility UI is gold standard.** Grid + Graph + Gantt + per-task log view = what Crew/Loop users keep asking for — real-time picture of where slice is stuck. Anything we build should aspire to this legibility.
3. **Provider ecosystem + AI SDK on top.** ~90+ providers (GitHub, Slack, HTTP, Jira, OpenAI, Anthropic via Pydantic-AI) means developer can wire coding-agent loop. Astronomer `airflow-ai-sdk` with `@task.llm`, `@task.agent`, `@task.llm_branch`, `@task.embed` is credible on-ramp.

## Weaknesses (top 3)
1. **Not coding-agent platform — zero opinion on slices, reviews, approvals.** No PR/issue/architecture-decision primitives, no Linear, no grades, no convention enforcement. Everything that makes Crew+Loop a *methodology* would be BYO Python in DAG.
2. **"Mostly static" assumption fights dynamic agent work.** README: Airflow works best when "DAG structure is similar from one run to next." Coding-agent runs inherently dynamic — slices appear, decompose, branch on architect output. Heavy dynamic-DAG generation fights grain.
3. **Operational cost is high.** Scheduler + webserver + executor (Celery/K8s) + Postgres metadata DB + Redis (Celery) = lot of infrastructure for solo developer running 4-slice feature. Compare to Crew/Loop: `node scripts/loop.mjs` + git.

## Features Crew/Loop should NOT copy (and why)
- **DAG-as-Python-file model.** Authoring topology in code *before* knowing slice shape is opposite of Loop's `spec-decompose` → `slice-from-feature` flow. Loop emits slices dynamically from architect output; static DAG forces rewrite per FEAT.
- **XCom for state passing.** Small-payload key/value in metadata DB is known footgun (size limits, opaque serialization). Loop already prefers artifact files under `.claude/artifacts/loop/`.
- **Heavy infra footprint (scheduler + webserver + executor + DB + Redis).** Loop's zero-infra "cron + git + Claude Code session" stance is *strength* against Airflow. Do not adopt long-lived scheduler daemon.
- **FAB-based RBAC + per-role UI.** Massive complexity for single-developer plugin. Loop's audit story is `auto-dispatch.jsonl` + git history — flat-file, not RBAC matrix.
- **Sensors-as-approval-gate pattern.** Polling flag file is wrong abstraction. Halt-badges in `snapshot.*` are richer (cross-plugin contract per SPEC-003).

## Open questions / low-confidence cells
- **Multi-Agent** — `airflow-ai-sdk` exposes `@task.agent`; whether SDK supports agent-to-agent handoff inside single task or only chain agents across tasks unverified. Worth 10-min `agent.py` dive if axis matters.
- **Architecture Governance** — AIPs are Airflow's own governance for codebase. Community-built ADR-tracking provider unverified; absence in official provider list suggests no.
- **Agent Analytics** — whether OpenLineage + Airflow surfaces per-task token counts when wired through `airflow-ai-sdk` unverified. Suspected no; OpenLineage integration deserves closer look.
- **Airflow 3.x auth-manager plugin maturity** — 3.x split FAB into pluggable auth-manager. Which auth-manager plugins are GA vs beta on 3.2.2 unverified — relevant for scoring SSO depth precisely.
- **Linear integration** — confirmed not in official provider list; may exist as community PyPI package — not searched exhaustively.
