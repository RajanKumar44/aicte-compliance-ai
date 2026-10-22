# Reuse Assessment — Fake ID Screening

Date: 2026-10-23

## Source examined

- Repository: https://github.com/rajaryan1111/fake-id-screening
- Branch inspected: main
- Source OCR files reviewed: ai/ocr/preprocessing.py, normalizer.py, field_extractor.py, ocr_pipeline.py, ocr_service.py, and schemas.py.
- Source README: https://github.com/rajaryan1111/fake-id-screening/blob/main/README.md
- Source security policy: https://github.com/rajaryan1111/fake-id-screening/blob/main/SECURITY.md

The source tree has no root LICENSE file. Public visibility is not permission to copy code/data. Confirm authorship, third-party notices, commit history and asset provenance before copying source wholesale. This is an engineering provenance gate, not legal advice.

## Candidate assessment

| Source area | Potential value | Decision |
|---|---|---|
| Image preprocessing | grayscale, contrast enhancement, denoising, deskew | Reimplemented a smaller application-owned preprocessing path using optional Pillow; no source code copied |
| Date/text normalizer | normalized field values | Only strict ISO dates accepted by default; ambiguous date formats remain unresolved |
| Field extractor | keyword/regex and confidence | Added conservative context-labelled institutional field extraction in English and selected Hindi labels; personal identity fields are excluded |
| OCR pipeline/service | engine orchestration | Added an engine-neutral pipeline and optional Tesseract adapter |
| Pydantic OCR schemas | structured output and confidence | Adapted existing app contract to retain confidence, evidence text, engine/version, page reference and source hash |
| Backend storage/API | upload/database patterns | Not copied; current app lacks auth, tenant isolation and secure persistent storage |
| Face verification | face matching | Not imported; not needed for institutional compliance documents and creates biometric privacy risk |
| Mobile frontend/assets | camera workflow | Not imported; current target is a backend prototype without approved UI scope |
| Datasets/model artifacts | possible benchmark material | Nothing copied; no dataset/model provenance or redistribution permission established |

## Implemented files

- backend/app/ocr_adapter.py: typed advisory result and strict ISO date candidate parser.
- backend/app/ocr_pipeline.py: image size/format/pixel limits, optional Tesseract adapter, grayscale/autocontrast/upscale preprocessing, English and selected Hindi context labels, source SHA-256 and mandatory human-review warnings.
- backend/app/ocr_cli.py: local-only CLI to run the pipeline on a selected local image and emit advisory JSON; it does not upload or persist files.
- backend/requirements-ocr.txt: optional Python OCR dependencies, kept out of base requirements. Tesseract binary and required language packs must be installed separately. For Hindi OCR, use language code hin+eng only after installing both packs.
- backend/tests/test_ocr_adapter.py, backend/tests/test_ocr_pipeline.py, backend/tests/test_ocr_cli.py, backend/tests/test_ocr_fixture_corpus.py, and backend/tests/fixtures/institution_ocr_cases.jsonl: synthetic-only regression tests/corpus, not production training data.
- backend/tests/test_ocr_engine_integration.py: synthetic image smoke test run in a CI job with Tesseract installed.
- No OCR route was added to the public API; authentication, tenant-scoped persistence, private storage and malware scanning are not implemented, so exposing document upload now would be unsafe.

## Data safety

Do not copy real identity documents, live photos, personal information, student records, database exports, secrets, model caches or unknown binary assets. The synthetic corpus contains no real institution or personal records and is for regression testing only. It is not a representative accuracy benchmark; create a reviewed, labelled, held-out corpus before measuring accuracy.

## Integration rules

1. OCR is advisory; it cannot determine authenticity or regulatory compliance.
2. Missing or ambiguous output is unresolved, not a fabricated value.
3. Only explicitly context-labelled institutional fields are extracted; personal name, DOB and student ID are excluded.
4. Tesseract is optional and lazy-loaded. Engine failures raise errors rather than becoming empty successful results.
5. Before enabling uploads, add authentication, server-side authorization, tenant isolation, private object storage, malware scanning, audit events and retention/deletion controls.
6. Before production use, review dependency and model licenses, language-pack availability, privacy/data residency and a labelled synthetic benchmark.
7. No regulatory rule is activated by this integration.

## CI evidence

GitHub Actions run [#56](https://github.com/rajaryan1111/aicte-compliance-ai/actions/runs/39864149659) completed successfully:
- Backend suite: **54 passed, 1 skipped in 0.60s**. The skipped test is the optional Tesseract smoke test in the base job.
- Optional OCR integration: **1 passed in 0.54s** with Tesseract installed; uses a generated synthetic English image.
This confirms the tests and a basic English engine smoke test, not production accuracy or Hindi OCR accuracy.

## Current outcome

The backend has a callable OCR pipeline and local-only CLI. The public API does not expose OCR because secure upload/storage/auth are not implemented. The smoke test is not a representative accuracy benchmark. Do not claim production readiness.
