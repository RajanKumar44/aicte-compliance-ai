# Phase 3 — Technology Decisions

**Snapshot date:** 2026-10-23  
**Status:** Options compared; recommendations provisional; no technology is locked.  
**Constraint:** No dependency installation or application changes are authorized by this record.

## Decision principles

Prefer the smallest maintainable stack that meets privacy, tenant isolation, traceability, recoverability and testability needs. A proposed option is not a final decision until requirements, compatibility, cost and operational constraints are reviewed and explicitly approved.

## ADR-001 — Database and migrations

| Option | Strengths | Trade-offs |
|---|---|---|
| PostgreSQL | Transactions, relational integrity, indexing, mature backup ecosystem, row-level security | Requires managed-service or database operations and recovery planning |
| SQLite | Simple local tests and demos | Not the preferred central multi-user production database |
| MongoDB | Flexible document-shaped records | No demonstrated advantage for relational application, rule-version and audit relationships |
| Managed PostgreSQL platform | Reduces operations burden and can integrate identity/storage | Provider coupling, pricing, region and access-policy review |

**Preferred candidate:** PostgreSQL for shared application data. SQLAlchemy + Alembic is the preferred migration path, subject to dependency compatibility review. SQLite may be used for isolated tests, but PostgreSQL-specific behavior requires PostgreSQL integration tests. Migrations must be versioned and reviewed; do not rely on application startup table creation as the production migration strategy.

Reference: https://www.postgresql.org/docs/current/ddl-rowsecurity.html and https://alembic.sqlalchemy.org/

**Open before lock:** hosting/region, budget, concurrency, backup/restore objective, tenant model and PostgreSQL integration test environment.

## ADR-002 — Authentication and roles

| Option | Strengths | Trade-offs |
|---|---|---|
| Managed OIDC/auth provider | Outsources identity lifecycle and may support MFA/recovery | Pricing, provider coupling and integration work |
| Supabase Auth | Managed identity integrated with PostgreSQL ecosystem | RLS and privileged service-key handling need careful review |
| Custom FastAPI authentication | Full control | Password/session lifecycle, recovery, MFA, token security and operational responsibility remain with the team |
| Institutional SSO | Fits institutions that require central identity | Must confirm institutional IdP and onboarding requirements |

**Preferred direction:** managed identity where requirements and cost support it, with server-side authorization and explicit application roles. Candidate roles: Institution Admin, Compliance Reviewer, Institution Staff, Read-only Auditor, and restricted Platform Administrator. These are proposed product roles, not asserted AICTE-mandated roles.

Required controls: deny by default, verify identity server-side, authorize every resource operation, enforce tenant scope, audit sensitive changes, protect signing keys and privileged credentials, and test revocation and privilege escalation.

References: https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/ and https://supabase.com/docs/guides/auth

**Open before lock:** single/multi-institution scope, SSO/MFA needs, membership onboarding, final-approval authority and account recovery policy.

## ADR-003 — Private document storage

| Option | Strengths | Trade-offs |
|---|---|---|
| Amazon S3 | Mature object storage and access controls | IAM, cost and cloud configuration |
| Supabase Storage | Integrated permissions and PostgreSQL ecosystem | Provider coupling, quotas and policy review |
| Cloudflare R2 | S3-compatible interface and temporary presigned access | Provider-specific operational considerations |
| Local filesystem | Useful for controlled local development | Not a reliable shared production store without persistence and backup design |
| Database BLOBs | Data can participate in database transactions | Large files increase database and backup load |

**Preferred direction:** private object storage; PostgreSQL stores metadata, hashes, opaque object keys, ownership, versions, upload state and retention state. Use short-lived scoped URLs only after server authorization. Do not make buckets public.

References: https://docs.aws.amazon.com/AmazonS3/latest/userguide/security.html, https://supabase.com/docs/guides/storage, https://developers.cloudflare.com/r2/api/s3/presigned-urls/

**Open before lock:** provider/region, residency and contractual requirements, costs, backup/restore, malware scanning and retention/deletion behavior.

## ADR-004 — OCR and language support

| Option | Strengths | Trade-offs |
|---|---|---|
| Tesseract | Open source, self-hostable, supports English/Hindi language data | Quality varies with scans, tables, layout and image quality |
| Google Cloud Vision | Managed OCR and documented language support | Cost and external processing/privacy review |
| Amazon Textract | Managed document extraction features | Must verify actual language support and suitability; do not assume Hindi capability |
| Manual-only extraction | No OCR dependency for a tiny prototype | Not scalable to general institutional uploads |

**Decision:** benchmark Tesseract against at least one suitable managed candidate using the same synthetic English, Hindi and bilingual corpus. Measure character/word error, structured-field accuracy, table/layout preservation, page references, latency, cost and failure rates. Preserve engine/version and source page references. Low-confidence extraction requires human review. OCR is not proof of authenticity.

References: https://tesseract-ocr.github.io/tessdoc/Command-Line-Usage and https://docs.cloud.google.com/vision/docs/languages

**Open before lock:** representative test corpus, privacy approval for any external OCR, accuracy thresholds and operating cost.

## ADR-005 — Frontend, backend and deployment

**Backend candidate:** retain FastAPI because the current repository is Python/FastAPI. This is not a claim that the backend is production-ready.

**Frontend candidate:** evaluate React + Vite for a separate dashboard. Consider Next.js only if SSR/framework capabilities justify the additional architecture. Confirm whether a frontend already exists before selecting.

**Deployment candidates:** Render, a managed container platform such as Cloud Run, or a managed VPS. Compare cost, regional availability, secrets, persistent storage, database, workers, backups, observability and recovery. Do not store production uploads only on an ephemeral service filesystem.

References: https://fastapi.tiangolo.com/deployment/concepts/, https://vite.dev/guide/build, https://render.com/docs/service-types and https://render.com/docs/disks

**Open before lock:** demo date, budget, domain, data residency, uptime and deployment ownership.

## ADR-006 — Background processing

| Option | Strengths | Trade-offs |
|---|---|---|
| Synchronous request | Simple for small fast tasks | Long OCR tasks risk request timeouts and resource exhaustion |
| FastAPI BackgroundTasks | Convenient for small post-response tasks | Not a durable distributed job queue |
| RQ + Redis | Simple Python queue model | Adds Redis and worker operations |
| Celery + broker | Mature distributed task processing and retry configuration | More operational complexity |
| Managed task queue | Less queue infrastructure to manage | Provider coupling and cost |

**Decision:** do not introduce a queue until representative OCR timings, concurrency and retry/recovery requirements are measured. If needed, create durable job states, bounded retries, idempotency, timeouts and isolated workers.

## Consolidated decision register

| ID | Area | Candidate direction | Status |
|---|---|---|---|
| ADR-001 | Database/migrations | PostgreSQL; SQLAlchemy + Alembic | Proposed, pending approval |
| ADR-002 | Authentication/roles | Managed identity + server-side authorization | Provisional |
| ADR-003 | Document storage | Private object storage | Provisional |
| ADR-004 | OCR | Benchmark Tesseract vs managed OCR | Provisional |
| ADR-005 | Frontend/backend/deployment | Evaluate React + Vite; retain FastAPI; provider undecided | Provisional |
| ADR-006 | Background processing | Add worker/queue only if measured need justifies it | Provisional |

No ADR is marked LOCKED. Final selection requires evidence, explicit approval and a documented rollback/migration path.