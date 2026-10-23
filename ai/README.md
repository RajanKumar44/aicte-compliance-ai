# AI and document intelligence workstream

**Owner:** workstream C — **contributor not yet named** (see
[`../WORKSTREAMS.md`](../WORKSTREAMS.md)).
**Boundary:** this contributor works only in `ai/` during independent development.
**Status:** deterministic evaluation support is implemented here: a clean labelled corpus,
a separate realistic OCR-corruption slice, a reproducible multi-corpus scorer with corpus
fingerprints, per-category coverage, machine-readable per-case results, baseline
comparison (`--compare`), engine-swap evaluation (`--engine module:attribute`) for the
canonical synthetic-data bake-off, confidence passthrough, and an evidence-only
preprocessing diagnosis built on the conservative normalization library
[`ai/normalize.py`](normalize.py). An OCR benchmark module
([`ai/ocr_benchmark.py`](ocr_benchmark.py)) provides the engine adapter contract,
transcription metrics (CER, WER, exact match), structured-field scoring,
deterministic synthetic data generation, held-out partitioning, and mock-based
engine contract tests. The working OCR implementation is still in `backend/`
(see the OCR placement rule); no model or external provider is introduced by this work.

## Scope

- OCR engine adapters and document pre-processing.
- Institutional-field extraction, conservative normalization and provenance/evidence.
- Confidence signals, unresolved-field handling and human-review support.
- Synthetic labelled fixtures, regression tests and a held-out evaluation methodology.
- Transcription and structured-field extraction metrics.
- OCR benchmark infrastructure: adapter contract, synthetic data generation, and
  engine contract tests.
- Optional model/AI components only where a deterministic baseline and its limitations are
  documented.

## Module reference

| Module | Purpose |
|---|---|
| [`evaluate_extraction.py`](evaluate_extraction.py) | Corpus-driven extraction scorer with CLI (`--check`, `--json`, `--compare`, `--engine`, `--normalize`). |
| [`ocr_benchmark.py`](ocr_benchmark.py) | OCR engine adapter contract (`OCREngine` ABC), transcription metrics (CER, WER), structured-field scoring, synthetic case generation, corpus I/O, and held-out partitioning. |
| [`normalize.py`](normalize.py) | Conservative text normalization with provenance (zero-width removal, NFKC, line-break unification). |
| [`corpus/extraction_cases.jsonl`](corpus/extraction_cases.jsonl) | 56 labelled extraction cases (54 scored, 2 documented known gaps). |
| [`corpus/ocr_corruption_cases.jsonl`](corpus/ocr_corruption_cases.jsonl) | 30 OCR corruption cases (15 scored, 15 documented known gaps). |
| [`tests/test_evaluate.py`](tests/test_evaluate.py) | Tests for the extraction evaluator, corpus validation, and scoring semantics. |
| [`tests/test_ocr_benchmark.py`](tests/test_ocr_benchmark.py) | Tests for the OCR benchmark module: metrics, generation, scoring, contracts, corpus loading, partitioning. |
| [`EVALUATION.md`](EVALUATION.md) | What the evaluation measures, its limitations, and how to run it. |
| [`BACKEND_HANDOFF.md`](BACKEND_HANDOFF.md) | 17 documented extraction defects owned by the backend workstream. |

## OCR benchmark: metric definitions

**Character Error Rate (CER):** Levenshtein edit distance between reference and
hypothesis strings, divided by the reference length. CER = 0 for identical strings,
CER > 1 possible when the hypothesis has many extra characters.

**Word Error Rate (WER):** Levenshtein edit distance between the whitespace-split
token sequences of reference and hypothesis, divided by the number of reference tokens.
Same empty-input conventions as CER.

**Exact Transcription Rate:** 1.0 if reference == hypothesis, 0.0 otherwise.

**Structured-field scoring:** Per-field and micro-averaged precision/recall/F1 from
aggregate TP, FP, FN counts. The extractor receives the case `text` (a string) and
returns a dict of field names to values.

Empty-input conventions: both empty → 0.0; reference empty → 1.0; hypothesis empty → 1.0.

## OCR benchmark: text vs. image evaluation

The current benchmark operates on **text only**. The synthetic case generator
produces labelled text fixtures with controlled corruption types (inserted
newlines, misread characters, Latin-Hindi mixing, column reordering). No raster
images, scans, or real OCR engine invocations are involved.

**Image-level evaluation** (blur, skew, resolution, compression, contrast on
actual rendered document images) requires:
1. Image generation dependencies (e.g. Pillow, ReportLab) — not yet approved.
2. A real OCR engine (Tesseract, EasyOCR) — optional and engine-specific.
3. Authorization to add or modify shared dependency manifests.

Until those dependencies are approved, the benchmark measures text-to-structured-field
extraction only. It is **not** an image OCR benchmark and must not be described as one.

## Running tests and evaluations

```bash
# AI/OCR tests (benchmark + evaluator)
python -m pytest -q ai/tests

# Extraction evaluation (human-readable)
python ai/evaluate_extraction.py

# Multi-corpus evaluation with check mode
python ai/evaluate_extraction.py \
  --corpus ai/corpus/extraction_cases.jsonl \
  --corpus ai/corpus/ocr_corruption_cases.jsonl --check

# Baseline comparison
python ai/evaluate_extraction.py --json baseline.json
python ai/evaluate_extraction.py --compare baseline.json

# Engine bake-off
python ai/evaluate_extraction.py --engine module:attribute

# Preprocessing diagnosis
python ai/evaluate_extraction.py --corpus ai/corpus/ocr_corruption_cases.jsonl --normalize

# Lint
ruff check ai/
```

## Rules

- Do not edit `frontend/` or `backend/` during independent work.
- Do not move or change the current `backend/app/ocr_pipeline.py` as part of folder setup.
  Any migration needs a separate PR, rewritten import paths and a reviewed interface; see
  [`../WORKSTREAMS.md`](../WORKSTREAMS.md#ocr-placement--stays-in-backend-until-an-approved-migration).
- Use synthetic documents only; never commit real institutional or personal data.
- Reject malformed, unsupported, oversized and excessive-pixel inputs before expensive
  processing.
- Do not guess ambiguous dates or missing values. Keep uncertain output unresolved.
- OCR results are advisory evidence, not proof of authenticity or compliance.
- Synthetic CI success is not a claim of real-world OCR accuracy. No accuracy number may be
  published without a labelled, held-out evaluation and a stated method.

## Known gaps and limitations

- The 17 backend-owned extraction defects are documented in [`BACKEND_HANDOFF.md`](BACKEND_HANDOFF.md).
- No raster-image evaluation capability exists yet (blocked on dependency approval).
- The synthetic corpus is not representative of real AICTE documents.
- No held-out split exists for the extraction corpus (cases were written alongside patterns).
- Hindi coverage is limited to five label variants.

## First task

[`../docs/development/STARTER_TASKS.md`](../docs/development/STARTER_TASKS.md) — task C1.
