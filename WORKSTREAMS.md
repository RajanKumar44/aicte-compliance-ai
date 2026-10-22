# Workstreams — authoritative ownership contract

**Status:** three workstreams are defined and independently workable. This is **not** a
claim that three applications exist: only `backend/` contains code. `frontend/` and
`ai/` contain no implementation on this branch (see [Current reality](#current-reality)).

**Scope:** ownership, edit permissions, shared-file rules, integration and escalation.
This file is the single source of truth for *who may edit what*.
It is **not** the source of truth for integration contracts or gate status — those live in
[`docs/development/API_CONTRACT.md`](docs/development/API_CONTRACT.md) and
[`docs/development/INTEGRATION_CHECKLIST.md`](docs/development/INTEGRATION_CHECKLIST.md).
Process details (branch names, worktrees, PR mechanics) are in
[`docs/development/PARALLEL_WORKFLOW.md`](docs/development/PARALLEL_WORKFLOW.md).

Anything not written down here is **not** permission. Ask before assuming.

## Current reality

| Area | Location | State |
|---|---|---|
| Checklist validation API | `backend/app/main.py` | Implemented (`/health`, `/api/v1/validate`) |
| OCR contract + pipeline + adapter | `backend/app/ocr_adapter.py`, `ocr_pipeline.py` | Implemented, synthetic tests only |
| Local OCR CLI | `backend/app/ocr_cli.py` | Implemented |
| Rule catalogue + activation gate | `backend/app/rule_catalog.py` | Implemented; **no rule defined or active**, no evaluator |
| Backend tests | `backend/tests/` | Implemented |
| Frontend application | `frontend/` | **Does not exist** |
| AI/OCR service | `ai/` | **Does not exist** |
| Persistence, auth, storage, audit | — | **Does not exist** |

The `ai/` and `frontend/` directories are created by the folder-scaffolding change set,
not by this document. If they are absent on your branch, that is expected, not a bug.

## Workstreams

| Workstream | Owns | Deliverables | Unassigned until |
|---|---|---|---|
| **A — Frontend** | `frontend/` | Applicant/reviewer UI, forms and validation feedback, loading/error/empty/success states, accessibility, mock fixtures, frontend tests, API client against the approved contract | an owner names the contributor |
| **B — Backend / Platform** | `backend/` | FastAPI endpoints, request/response schemas, validation and service boundaries, auth/RBAC, tenant isolation, upload security, persistence, audit, error contract, backend tests | an owner names the contributor |
| **C — AI / OCR** | `ai/` | OCR adapters and engine integration, normalization and confidence handling, evidence/provenance, evaluation corpus and accuracy measurement, AI tests | an owner names the contributor |

**Contributor names are deliberately unassigned.** Record the assignment in this table
(one line, with the date) when the owner provides it; do not infer it from commit authors.

## Allowed and prohibited paths

| Path | Owner | Others may |
|---|---|---|
| `frontend/**` | A | not edit |
| `backend/app/**`, `backend/tests/**`, `backend/requirements*.txt` | B (see exceptions) | not edit |
| `ai/**` | C | not edit |
| `docs/**` | shared | propose via separate PR |
| `.github/**` | shared | propose via separate PR |
| root files (`README.md`, `pyproject.toml`, `.gitignore`, `.env.example`, `.python-version`) | shared | propose via separate PR |
| `WORKSTREAMS.md` | shared | propose via separate PR |

**OCR exception.** `backend/app/ocr_*.py`, `backend/tests/test_ocr_*.py` and
`backend/tests/fixtures/institution_ocr_cases.jsonl` are the *current* OCR implementation
and are owned by **B** until a migration is approved. Workstream C may propose changes to
them, but must not land them alone. See
[OCR placement](#ocr-placement--stays-in-backend-until-an-approved-migration).

**Prohibited for everyone:** pushing to `main`; force-pushing a shared branch; editing
another workstream's directory; adding real institutional or personal documents;
committing secrets or `.env` files; activating a regulatory rule; adding a public upload
route; weakening a test to make CI pass.

## Shared files and how they are coordinated

Shared files are the ones that break two people at once. Rule: **one nominated owner per
change, the other workstreams review.**

| Shared surface | Nominated owner for change | Reviewers |
|---|---|---|
| `docs/development/API_CONTRACT.md` | B | A, C |
| `README.md` | B | A, C |
| `.github/workflows/**` | B | A, C |
| root config (`pyproject.toml`, `.gitignore`, `.env.example`, `.python-version`) | B | A, C |
| dependency manifests `backend/requirements*.txt` | B | A, C |
| OCR interface + shared fixtures | B (until migration) | C |
| `docs/**` research and pre-coding records | the author of the change | one other |

A change to `docs/development/API_CONTRACT.md` is a **contract change**. It needs its own
PR, merged before dependent implementation starts. Do not change a contract and a
consumer in the same PR.

## Dependency and integration rules

1. Each workstream works on its own branch in its own directory. No shared feature branch.
2. Contract before implementation: agreed request/response and evidence shapes first,
   mocks or stubs second, real integration last.
3. Cross-directory wiring happens only in a **separate integration PR** that all three
   owners review.
4. Frontend consumes only the contract. It must not invent endpoints or infer response
   shapes that `docs/development/API_CONTRACT.md` marks `proposed` or `blocked`.
5. Backend must not change a response shape a merged frontend depends on without bumping
   the contract version.
6. OCR output stays advisory. No workstream may present extracted text as verified
   evidence or as regulatory compliance.
7. Regulatory rules stay inactive until an owner records official-source verification,
   applicability, effective dates and reviewer identity. The gate in
   `backend/app/rule_catalog.py` enforces the mechanical part; it does not verify sources.
8. Never resolve a conflict by discarding the other side. Compare, record the decision,
   and keep the losing branch recoverable (see
   [`RECOVERY_AND_BACKUP.md`](docs/development/RECOVERY_AND_BACKUP.md)).

## OCR placement — stays in `backend/` until an approved migration

The OCR pipeline currently lives in `backend/`. Moving it to `ai/` would change import
paths used by six test modules, the CI smoke-test job and the documented CLI command.

If C wants the OCR implementation in `ai/`, that requires its own migration PR that:

1. states the new import path and keeps or rewrites every existing OCR test;
2. keeps `Pillow`/`pytesseract` optional and out of `backend/requirements.txt`;
3. re-verifies both CI jobs and the CLI command;
4. says whether `backend/` keeps a thin adapter or loses OCR entirely.

**Do not create empty placeholder applications or move files to make the layout look
complete.** A folder containing only a README is an honest placeholder; a folder
containing a stub that fakes persistence, auth or compliance is not.

## Handoff and escalation

**Handoff** — before you stop working on a shared surface, push the branch, update the PR
description with the exact head SHA and what you verified, and state what the next person
must do. A handoff without a pushed SHA has not happened.

**Escalate to the repository owner** when a decision changes ownership, a shared
contract, PR topology, branch protection, or anything security- or regulation-shaped.
Escalation is a PR comment naming the decision and the options — not a silent change.

Escalate immediately if you find: a real credential or personal document in the tree, a
security control claimed but not implemented, a rule that looks active, or two
workstreams having edited the same file.

## Integration process

1. Each owner commits only within their directory and opens a PR against
   `research/grounded-foundation`.
2. All three review shared-contract and dependency changes.
3. A separate integration PR handles cross-folder wiring, root config and CI.
4. Run the checks in [`INTEGRATION_CHECKLIST.md`](docs/development/INTEGRATION_CHECKLIST.md)
   and record the exact head SHA that passed.
5. CI must be green on the exact head SHA being merged — not on an earlier commit and not
   on a different PR.
6. No automatic merging, no automatic deployment, no production enablement.

## Gates this document does not satisfy

Ownership rules do not make the project production-ready. Authentication,
authorization, tenant isolation, private storage, malware scanning, durable audit,
retention/deletion, authenticated reviewer identity and official-source rule verification
are all **unimplemented**. Production remains **NO-GO**.
