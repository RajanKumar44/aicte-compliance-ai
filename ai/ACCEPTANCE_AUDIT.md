# AI/OCR acceptance audit — canonical requirement → evidence

Status as of 2026-10-24, branch `feature/ai-ocr-corruption-slice`, HEAD `8485526`
(after the shaping-validity milestone — update this line with each milestone).
Sources of truth: [`docs/canonical/prd.md`](../docs/canonical/prd.md),
[`docs/canonical/phases.md`](../docs/canonical/phases.md),
[`WORKSTREAMS.md`](../WORKSTREAMS.md), [`ai/EVALUATION.md`](EVALUATION.md),
[`ai/BACKEND_HANDOFF.md`](BACKEND_HANDOFF.md).

Labels: `PASS` (reproducible evidence), `PARTIAL`, `BLOCKED_EXTERNAL`,
`NOT_AVAILABLE` (external evidence absent, not implementable), `NOT_REQUIRED`.

## Workstream C deliverables (WORKSTREAMS.md)

| Requirement | Implementation | Evidence | Status |
|---|---|---|---|
| OCR adapters and engine integration | `ai/raster_benchmark.py` (`RealTesseractEngine`, `MockRasterOCREngine`, availability + language-pack checks), `backend` adapter consumed read-only | 67 raster tests; real Tesseract 5.5.3 artifacts in `ai/reports/` | PASS |
| Pre-processing and normalization | `ai/normalize.py` (evidence-only; deliberately scoped) + `--normalize` diagnosis in evaluator | evaluator tests; `--normalize` output documented in EVALUATION.md | PASS |
| Normalization contract tests | `ai/tests/test_normalize.py` | test suite | PASS |
| Confidence handling (never invented) | evaluator passes through engine-supplied confidences only; scorer never fabricates values | `ai/tests/test_evaluate.py` confidence passthrough tests | PASS |
| Evidence/provenance distinction | engine/version/report fields (`engine`, `engine_version`, `dataset_fingerprint`, `rendering`) in every raster report | report schema tests | PASS |
| Evaluation corpus and accuracy measurement | text corpora (56 extraction + 30 corruption cases) + evaluator; raster image benchmark with CER/WER/F1 | `ai/evaluate_extraction.py --check` exit 0; 244 AI tests | PASS |
| AI tests | `ai/tests/` | `pytest -q ai/tests` → 244 passed (2026-10-24) | PASS |

## Canonical gates (PRD / phases.md)

| Requirement | Evidence | Status |
|---|---|---|
| OCR engine/version selection via a labelled synthetic-data bake-off (PRD open blocker) | evaluation half exists (`--engine module:attribute` bake-off; real/mock raster benchmark with recorded engine/version/seeds); the *decision* of which engine/versions to adopt is an owner decision backed by real-engine bake-off artifacts | PARTIAL |
| Phase 6 gate: labelled synthetic corpus + OCR evaluation; claims supported by recorded measurements | corpora + evaluator + raster/multiseed artifacts; EVALUATION.md states exactly what each measurement does and does not mean; no unmeasured performance claim | PASS (with recorded synthetic-only scope) |
| Phase 6: performance observations | evaluator performance note measured (600 cases ≈ 0.08 s); no unmeasured claims elsewhere | PASS (scoped) |
| Phase 6: accessibility, demo script, deployment fallback | frontend/demo workstreams; not AI-owned | NOT_REQUIRED (other owner) |
| OCR text/confidence are observations, not proof (rules.md) | enforced structurally: synthetic-only corpora, explicit "What these numbers do not mean" section, `accuracy_invalid_languages` invalidation | PASS |

## Known limitations and blockers

| Item | Status | Detail |
|---|---|---|
| Faithful Devanagari shaping on this host | BLOCKED_EXTERNAL | Pinned Pillow 11.3.0 official macOS wheels do not bundle libraqm; no system libraqm. Fixing needs an authorized environment change (install libraqm + rebuild Pillow, or run corpora generation on a Linux manylinux-wheel environment). Reports now carry `rendering`/`accuracy_invalid_languages`/`accuracy_valid` so unavailable-shaping measurements are machine-detectable and flagged, never silently quoted. |
| Real-document accuracy | NOT_AVAILABLE | No human-labelled held-out set of representative scanned AICTE certificates exists. EVALUATION.md specifies what such a protocol requires; nothing synthetic is quoted as real-world accuracy. |
| Backend extraction/corruption gaps (17) | BLOCKED_EXTERNAL | Backend-owned (`backend/app/ocr_pipeline.py`); reproduced and documented with acceptance criteria in `ai/BACKEND_HANDOFF.md`. Unknown-gap count not fabricated beyond the reproduced 17. |
| Backend test font-path portability (`backend/tests/test_ocr_engine_integration.py`) | BLOCKED_EXTERNAL | Backend-owned; hard-coded Linux font path fails on macOS with Tesseract installed (`OSError: cannot open resource`). Documented 2026-10-24 in BACKEND_HANDOFF.md; repo suite is `1 failed, 224 passed` on this host. |
| Regulatory rule activation / Phase 0 research | BLOCKED_EXTERNAL | Not AI-owned; phases.md Phase 0 gate remains open; no rule activated. |

## Rule integrity (verified 2026-10-24)

- `git diff --check` clean; only `ai/**` files changed by the workstream.
- No backend/frontend/docs/.github file modified by AI/OCR work.
- Historical benchmark artifacts preserved; new artifacts use descriptive names.
