# Phase 4 — Security and Testing Preparation

**Snapshot date:** 2026-10-23  
**Status:** Requirements and test plan documented; implementation and verification pending.

## 1. Assets and trust boundaries

Assets: institutional membership/roles; uploaded files; extracted OCR text; rule/source versions; findings and reviewer outcomes; audit history; credentials; backups and logs.

Trust boundaries: browser→API; API→database; API→private storage; uploaded file→parser/OCR worker; rule catalogue→evaluator; application→external provider; CI→deployment credentials.

Threat-model method: STRIDE plus explicit asset, actor, impact and mitigation review. Update this model whenever architecture or external integrations change.

Reference: https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html

## 2. Threat register

| ID | Threat | Required mitigation |
|---|---|---|
| SEC-01 | Cross-institution record access | Server-side ownership checks on every read/write/download/export; negative tests |
| SEC-02 | Role escalation or forged identity | Validate identity and permissions server-side; deny by default |
| SEC-03 | Malicious/malformed PDF or image | Isolated parser/worker, patched libraries, scanning and bounded resources |
| SEC-04 | Oversized file/decompression bomb | Byte/page/pixel/time/memory limits at multiple layers |
| SEC-05 | Secrets leak through Git, logs or frontend | Secret manager, redaction, scanning and credential rotation |
| SEC-06 | OCR/AI output treated as proof | Advisory-only outputs, provenance and human review |
| SEC-07 | Reviewer changes a result without traceability | Attributable, versioned audit events and reviewer decisions |
| SEC-08 | Tenant filter omitted in a query/job | Central authorization pattern; optional PostgreSQL RLS as defense in depth |
| SEC-09 | Dependency/CI supply-chain compromise | Reviewed dependency changes, pinned CI actions, minimal CI permissions |
| SEC-10 | Prompt injection in uploaded document | Treat contents as untrusted; restrict tool access and validate outputs |
| SEC-11 | Logs/backups/exports disclose data | Minimize content, restrict access, encrypt and define retention |
| SEC-12 | Abuse exhausts API/OCR capacity | Rate limits, quotas, timeouts and bounded concurrency |

These are threats to test, not claims that exploitation has been observed.

## 3. Permissions and institution isolation

Proposed roles: Institution Admin, Compliance Reviewer, Institution Staff, Read-only Auditor and restricted Platform Administrator. Final approval authority must be explicitly assigned rather than inferred from role names.

Required rules:
- A caller-supplied institution ID never grants access.
- Membership and role must be derived from trusted server-side identity data.
- Enforce tenant scope on reads, updates, deletion, downloads, search, exports and background jobs.
- Recheck authorization before exposing worker results.
- Audit membership changes, downloads, deletion and assessment-state changes.
- Define multi-institution membership and revoked-session behavior.
- Test direct API calls, guessed IDs, role escalation, stale sessions, expired URLs and jobs completing after access revocation.

Release gate: no unresolved cross-tenant access failure.

## 4. Document security and initial limits

OWASP file-upload guidance: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html

Proposed prototype limits (not official requirements and not yet benchmarked):
- Allowed formats: PDF, JPEG, PNG.
- Maximum file size: 20 MiB.
- Maximum PDF pages: 200.
- Maximum image dimensions: 40 megapixels.
- Initial processing timeout target: 60 seconds per document.
- Bounded worker concurrency.
- Reject archives until a concrete need exists.
- Limit original filename length and use generated internal storage names.

Enforce byte, page, pixel, decompression and time limits before expensive processing. Validate file signature/content, not only extension or browser MIME. Store originals privately. Scan files where a suitable scanner is available. Run parsing/OCR in a restricted worker. Do not execute uploads. Use scoped, short-lived download URLs only after authorization. Never log document bytes, raw OCR text, tokens or unnecessary personal data.

Before real data: approve retention/deletion, backup/recovery, data classification, data residency, external OCR processing and incident-response policy.

## 5. Secrets management

- Never commit real secrets or expose privileged credentials in frontend assets.
- Keep local environment files out of Git; provide placeholder-only configuration examples.
- Use an approved secret store in production and separate credentials per environment/service.
- Redact authorization headers, tokens, passwords, document contents and sensitive OCR text from logs.
- Rotate exposed credentials and investigate usage; deleting a line alone does not remediate leaked Git history.
- Keep privileged deployment secrets unavailable to untrusted pull-request code.
- Test secret scanning, configuration validation and log redaction.

## 6. Test strategy

| Layer | Required coverage |
|---|---|
| Unit | Request validation, rule lifecycle, dates, permissions and metadata |
| API integration | Auth, database, storage access, errors and response contracts |
| Tenant isolation | Cross-tenant read/write/search/download/export/job tests |
| Migrations | Fresh database, upgrade path and recovery strategy |
| File security | Wrong type, oversized, corrupt and malformed files, parser failures |
| OCR | English/Hindi/bilingual quality, fields, page provenance and low confidence |
| Workflow | Upload → process → review → decision → audit |
| Regression | Previously identified defects and documented edge cases |
| Security | Static/dependency/secret scans and targeted abuse tests |
| Deployment smoke | Health, configuration, DB/storage connectivity and safe failure |

Acceptance criteria:
- Unauthorized users cannot access other institutions' records or privileged actions.
- Invalid and oversized uploads fail safely.
- Processing failures are explicit and never become success-shaped empty results.
- Retries do not duplicate records or decisions.
- Findings preserve source/rule versions and evidence references.
- Unresolved rules cannot activate or generate definitive adverse decisions.
- OCR uncertainty remains visible and human review is attributable.

## 7. Synthetic dataset

Use fictional institutions/users and generated documents only. Do not seed tests with real institutional records, identity numbers, signatures or confidential documents.

Include:
- Valid synthetic approval letters and certificates.
- Corrupt PDFs, wrong extensions, unsupported formats and boundary-size files.
- English, Hindi and bilingual OCR pages with known ground truth.
- Tables, poor scans, skew, stamps, unusual filenames and malformed metadata.
- Provisional/unresolved rule fixtures and audit-event histories.

Each fixture needs an ID, \`synthetic=true\`, intended outcome, generator/version, file format/size, language/layout labels, expected text/fields/page references and checksum. Keep tuning and evaluation sets separate. Measure character error rate, word error rate, structured-field accuracy, reading order, page references, latency, cost and failure rates. Do not remove difficult samples to inflate scores.

## 8. CI workflow

For pull requests:
1. Use a documented Python version and clean environment.
2. Install declared dependencies from the canonical lock/requirements process.
3. Run formatting/lint/type checks if adopted.
4. Run unit, integration, authorization and tenant-isolation tests.
5. Validate migrations against fresh and upgrade databases.
6. Run dependency and secret scans.
7. Build/start the app and run smoke tests.
8. Publish explicit pass/fail status without leaking sensitive data.

Security requirements:
- Minimal \`GITHUB_TOKEN\` permissions.
- Pin reviewed third-party actions to immutable SHAs where practical.
- Do not expose production secrets to untrusted pull-request code.
- Protect deployment workflows and review workflow changes.
- Do not cache secrets or sensitive test documents.
- Require appropriate checks and review before release.

Reference: https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions

## 9. Reproducible environment and compatibility

Observed direct declarations at the inspected branch:
- \`fastapi[standard]==0.161.0\`
- \`pydantic==2.14.1\`
- Development: \`pytest==9.1.1\`, \`httpx==0.28.1\` plus runtime requirements.

These declarations are not proof of successful install, transitive pinning or compatibility. No install was run for this preparation record.

Required:
- Select a supported Python version after deployment/dependency compatibility review.
- Choose one canonical fully reproducible dependency lock strategy.
- Separate runtime and development tools.
- Recreate the environment from scratch in CI.
- Test imports, startup, unit/integration suites and database migrations.
- Record supported OS/architecture when relevant.
- Review updates and rerun tests.
- Pin container base images if containers are used.
- Document setup, configuration, test and recovery instructions.

Reference: https://pip.pypa.io/en/stable/topics/repeatable-installs/

## Phase 4 outcome

Security and testing preparation is documented. Controls are not claimed implemented or verified. Upload thresholds, OCR engine, Python version, lock strategy, retention policy and production providers remain subject to evidence and approval.

## Follow-up implementation evidence — 2026-10-23

A GitHub Actions workflow was added at [`.github/workflows/backend-tests.yml`](../../.github/workflows/backend-tests.yml) on `research/grounded-foundation`. It installs `backend/requirements-dev.txt` with Python 3.12 and runs `python -m pytest -q`, with read-only repository permissions and a 10-minute job timeout. The workflow file was read back from GitHub. **No associated workflow run or status check was visible at the time of this review**, so this is CI configuration added, not a passing test result.

No authentication provider, server-side RBAC, tenant-bound database, upload endpoint, private object store, malware scanner, durable audit trail, or production secrets/retention configuration exists in the inspected prototype. Implementing those without approved identity, data lifecycle, hosting and operational constraints would risk creating false security. Phase 4 remains **NOT PASSED** until scoped controls are implemented and negative tests pass in an actual run.
