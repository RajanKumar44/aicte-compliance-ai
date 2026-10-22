# Reuse Assessment — Fake ID Screening

Date: 2026-10-23

## Source examined

- Repository: https://github.com/rajaryan1111/fake-id-screening
- Branch inspected: `main`
- Source README: https://github.com/rajaryan1111/fake-id-screening/blob/main/README.md
- Source security policy: https://github.com/rajaryan1111/fake-id-screening/blob/main/SECURITY.md
- Source contributing policy: https://github.com/rajaryan1111/fake-id-screening/blob/main/CONTRIBUTING.md

The public repository tree inspected through the GitHub API contains no root `LICENSE` file. This is not enough evidence to assume a license permits copying or redistributing code/data, even though the repository is owned by the same account. Confirm authorship, third-party notices, commit history and asset provenance before copying source wholesale. This report is an engineering provenance gate, not legal advice.

## Candidate reusable work

| Source area | Possible value for AICTE Compliance Assistant | Decision |
|---|---|---|
| `ai/ocr/preprocessing.py` | Image loading, resizing, contrast enhancement, denoising and deskewing | Review algorithm, dependencies and robustness; keep behind an adapter |
| `ai/ocr/normalizer.py` | Conservative date/text normalization | Suitable for independent tests; ambiguous dates must remain unresolved |
| `ai/ocr/schemas.py` | Structured OCR fields, per-field confidence and bounding boxes | Good design reference; adapt to page/source provenance and avoid student-ID assumptions |
| `ai/ocr/field_extractor.py` | Keyword/regex extraction with confidence scores | Do not use identity-card fields as compliance facts; adapt only after synthetic corpus tests |
| `ai/ocr/ocr_pipeline.py`, `ocr_service.py` | Multi-pass OCR orchestration and field extraction flow | Candidate integration after dependency/model licensing, runtime and benchmark review |
| `backend/` | FastAPI, validation, UUID file names and storage/API patterns described by README | Inspect exact code and tests before any reuse; do not copy storage/auth logic on claims alone |
| `app/`, `frontend/` | Camera capture and client workflow | Mostly out of current backend scope; revisit only if UI requirements warrant it |
| `tempering/` and other files/data | Unknown from current bounded review | Not imported; inspect provenance and purpose before any use |
| Test files | Potential patterns for synthetic OCR tests | Only reuse after excluding real personal data and confirming licensing |
| Datasets/assets/model files | Could help benchmark OCR if synthetic and redistributable | None copied; dataset/model provenance and license not established |

## Data safety

The source repository explicitly warns against committing real identity documents, live photos, personal information, credentials or production database data. Do not copy any real IDs, faces, student records, database exports, secrets, model caches or unknown binary assets into this project. Build a synthetic English/Hindi/bilingual benchmark with known ground truth and a separate held-out evaluation set.

## Integration rules

1. Keep all OCR code optional and behind a stable adapter; base checklist validation must work without OCR dependencies or model downloads.
2. OCR is advisory and cannot determine authenticity or regulatory compliance.
3. Persist source document/page references and per-field confidence once a reviewed upload/persistence design exists.
4. Missing or ambiguous output is an explicit unresolved finding—not a fabricated value or successful extraction.
5. Before enabling integration, record dependency versions/licenses, author/commit provenance, synthetic benchmark results and security review.
6. No regulatory rule is activated by this reuse assessment.

## Current outcome

This is a code-reuse candidate inventory only. No third-party code, dataset, model or binary was copied in this change. The source repo's visible tree lacks a root license file, and the available review has not established data/model provenance or an approved OCR runtime. Proceed with newly written interface/contracts and independent tests until the necessary rights/provenance checks are satisfied.
