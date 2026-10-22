# Reuse Assessment — Fake ID Screening

Date: 2026-10-23

## Source examined

- Repository: https://github.com/rajaryan1111/fake-id-screening
- Branch inspected: `main`
- Source OCR files reviewed: `ai/ocr/preprocessing.py`, `normalizer.py`, `field_extractor.py`, `ocr_pipeline.py`, `ocr_service.py`, and `schemas.py`.
- Source README: https://github.com/rajaryan1111/fake-id-screening/blob/main/README.md
- Source security policy: https://github.com/rajaryan1111/fake-id-screening/blob/main/SECURITY.md

The source tree has no root `LICENSE` file. Public visibility is not permission to copy code/data. Confirm authorship, third-party notices, commit history and asset provenance before copying source wholesale. This is an engineering provenance gate, not legal advice.

## Candidate assessment

| Source area | Potential value | Decision |
|---|---|---|
| Image preprocessing | grayscale, contrast enhancement, denoising, deskew | Reimplemented a smaller application-owned preprocessing path using optional Pillow; no source code copied |
| Date/text normalizer | normalized field values | Only strict ISO dates accepted by default; ambiguous slash/month formats remain unresolved |
| Field extractor | keyword/regex and confidence | Added conservative context-labelled institution-document extraction; excludes personal identity fields |
| OCR pipeline/service | engine orchestration | Added an engine-neutral pipeline and optional Tesseract adapter |
| Pydantic OCR schemas | structured output and confidence | Adapted existing app contract to retain confidence, evidence text, engine/version, page reference and source hash |
| Backend storage/API | upload/database patterns | Not copied; current app lacks auth, tenant isolation and secure persistent storage |
| Face verification | face matching | Not imported; not needed for institutional compliance documents and creates biometric privacy risk |
| Mobile frontend/assets | camera workflow | Not imported; current target is a backend prototype without approved UI scope |
| Datasets/model artifacts | possible benchmark material | Nothing copied; no dataset/model provenance or redistribution permission established |

## Implemented files

- `backend/app/ocr_adapter.py`: typed advisory result and strict ISO date candidate parser.
- `backend/app/ocr_pipeline.py`: image size/format/pixel limits, optional Tesseract adapter, grayscale/autocontrast/upscale preprocessing, context-labelled institution fields, source SHA-256 and mandatory human-review warnings.
- `backend/requirements-ocr.txt`: optional Python OCR dependencies, kept out of base requirements. Tesseract system binary/language packs must be installed separately.
- `backend/tests/test_ocr_adapter.py` and `backend/tests/test_ocr_pipeline.py`: regression tests using synthetic in-memory images and fake OCR engines.
- No OCR route was added to the public API; authentication, tenant-scoped persistence, private storage and malware scanning are not implemented, so exposing document upload now would be unsafe.

## Data safety

Do not copy real identity documents, live photos, personal information, student records, database exports, secrets, model caches or unknown binary assets. Use synthetic English/Hindi/bilingual institutional-document samples with known ground truth and a separate held-out evaluation set.

## Integration rules

1. OCR is advisory; it cannot determine authenticity or regulatory compliance.
2. Missing or ambiguous output is unresolved, not a fabricated value.
3. Only explicitly context-labelled institutional fields are extracted; personal name, DOB and student ID are excluded.
4. Tesseract is optional and lazy-loaded. Engine failures raise errors rather than becoming empty successful results.
5. Before enabling uploads, add authentication, server-side authorization, tenant isolation, private object storage, malware scanning, audit events and retention/deletion controls.
6. Before production use, review dependency and model licenses, language-pack availability, privacy/data residency and a labelled synthetic benchmark.
7. No regulatory rule is activated by this integration.

## Current outcome

The backend now has a callable OCR pipeline, but the public API does not expose it and the OCR engine has not yet been exercised against real Tesseract binaries or a labelled institutional-document benchmark. GitHub Actions results are the test authority; do not claim production readiness from unit tests alone.
