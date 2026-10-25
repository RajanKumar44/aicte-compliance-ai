# Frontend workstream

**Owner:** workstream A — **contributor not yet named** (see
[`../WORKSTREAMS.md`](../WORKSTREAMS.md)).
**Boundary:** this contributor works only in `frontend/` during independent development.
**Status:** React/TypeScript/Vite application implemented on the frontend feature branch.
The active UI is under [`app/`](app/), with synthetic fixtures and state checks under
[`fixtures/`](fixtures/) and [`tools/`](tools/).

## Scope

- Applicant and reviewer interface, navigation, forms and document/status views.
- A clear distinction between preliminary automated checks, OCR observations and
  human-approved decisions. The UI must never imply that an automated result is an
  approval.
- Evidence display, validation feedback, accessibility and responsive layout.
- Frontend unit/component tests and synthetic mock data.

## Rules

- Do not edit `backend/`, `ai/`, root configuration, `docs/` or `.github/` as part of
  independent work. Propose shared changes in a separate PR.
- Use mocked API responses until the backend owner publishes an agreed contract. The
  contract is [`../docs/development/API_CONTRACT.md`](../docs/development/API_CONTRACT.md);
  endpoints it marks **blocked** must not be mocked as if they exist.
- Never treat client-side checks as authorization or compliance decisions. The server is
  the only authority.
- Do not include real institutional documents or personal data in fixtures.
- Shared API changes go through a contract change and a separate integration PR.

## Integration note

The frontend consumes the agreed `0.1.0-draft` contract in
[`../docs/development/API_CONTRACT.md`](../docs/development/API_CONTRACT.md), including
`preliminary_checks_passed` and `validation_scope`. The older backend currently present
on `main` returns `checklist_complete` and does not return `validation_scope`; this branch
does not change backend semantics to hide that difference. End-to-end integration requires
the approved backend contract change or a separate integration change.

## Local checks

From `frontend/app/`:

```bash
npm ci
npm run lint
npm run build
npm run test
```

`npm run test` uses Node's built-in test runner and TypeScript type stripping; use Node.js
22.6 or newer. No frontend test dependency is added.

## First task

[`../docs/development/STARTER_TASKS.md`](../docs/development/STARTER_TASKS.md) — task A1.
