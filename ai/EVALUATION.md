# Extraction evaluation — synthetic corpus

A reproducible measurement of the institutional-field extractor against a synthetic
labelled corpus. **It is not a benchmark and not an accuracy claim.** Read
[What these numbers do not mean](#what-these-numbers-do-not-mean) before quoting anything.

## Run it

```bash
python -m pip install -r backend/requirements-dev.txt     # the only dependency set used
python ai/evaluate_extraction.py                          # human-readable report
python ai/evaluate_extraction.py --json report.json       # machine-readable
python ai/evaluate_extraction.py --check                  # exit 1 on any scored mismatch
python ai/evaluate_extraction.py \
  --corpus ai/corpus/extraction_cases.jsonl \
  --corpus ai/corpus/ocr_corruption_cases.jsonl --check   # separate slice reports
python -m pytest -q ai/tests                              # corpus and scorer tests (also runs in CI)
python ai/evaluate_extraction.py --json b.json --compare b.json  # compare against a baseline
python ai/evaluate_extraction.py --engine module:attribute ...    # evaluate a candidate engine (bake-off)
python ai/evaluate_extraction.py --corpus ai/corpus/ocr_corruption_cases.jsonl --normalize
                                                                 # evidence-only preprocessing diagnosis
```

By default the scorer imports `extract_institution_fields` from `backend.app.ocr_pipeline`
**read-only**. It does not modify, wrap or reimplement backend code, and no OCR engine is
required — the input is text, so Tesseract is irrelevant here. `--engine module:attribute`
substitutes any callable with the same input/output shape (`str` in, mapping of
field-name → `OCRField`-like object or plain value out) so candidate engines can be scored
against the same corpora without touching `backend/`. Invalid specs (`malformed`,
missing module, missing attribute) exit 1 with a clear error.

The loader validates each corpus before scoring: a missing path, malformed JSONL, a
missing or non-object `expected`, an empty file, or duplicate `case_id`s fails the run
with exit 1 and a message naming the file (and line). Each `--json` run fully replaces
its report file; it never merges with a previous report. Results are deterministic:
identical inputs and corpus produce byte-identical reports.

## What is measured

Label corpus: `ai/corpus/extraction_cases.jsonl` — 56 cases, 54 scored, 2 documented known gaps.
Corruption slice: `ai/corpus/ocr_corruption_cases.jsonl` — 30 cases, 15 scored, 15 documented
known gaps. When more than one `--corpus` is supplied, the scorer reports each slice
independently and never combines their denominators.

| Category | Count | What it exercises |
|---|---|---|
| clean-label-en | 16 | every English label variant, `:` and `-` separators, spacing |
| clean-label-hi | 5 | Hindi labels for institution, certificate, dates, session |
| multi-field | 3 | realistic certificates with 3–5 fields |
| noise | 6 | surrounding prose, label without separator, empty value, unrelated text |
| ocr-corruption | 4 | doubled spaces, all-caps, mixed case, trailing punctuation |
| ambiguous-date | 6 | `DD/MM/YYYY`, long-form months, reversed/equal/multi-year sessions |
| invalid-date | 2 | impossible day (`2026-02-30`), impossible month (`2026-13`) |
| duplicate-labels | 3 | first label wins, deterministically |
| boundary | 6 | 3- and 160-character names, 2-character certificate, leap day |
| personal-data | 2 | applicant name and DOB must **not** be extracted |
| table-like | 1 | spaced columns |
| known-gap | 2 | behaviour the extractor is known to get wrong (see below) |

The corruption slice categories are:

| Category | Count | What it exercises |
|---|---:|---|
| ocr-inserted-newline | 7 | labels and values split across OCR lines; CRLF line endings |
| ocr-misread-label | 9 | character substitutions, separator doubling and replacement, zero-width noise |
| ocr-latin-hindi-mix | 7 | Hindi labels with Latin values, mixed context, NFD-decomposed accent data |
| ocr-column-order | 7 | flattened, reordered or merged column output; order-independent labelled lines |

Per case, each expected field is compared **exactly** (string equality after the
extractor's own normalisation). Outcomes are true positives, false positives (wrong value
or unexpected field), and false negatives (expected but absent). For a case labelled `{}`,
*any* extracted field is a false positive. A case that raises is counted as a failure —
never skipped.

Reported: per-field precision/recall/F1, micro average, case exact-match rate, the number
of negative cases and how many produced a spurious extraction, and every wrong value.

## Current result

Run on 2026-10-23:

```
micro (all fields)  tp=45  fp=0  fn=0   precision 1.000  recall 1.000  f1 1.000
case exact-match:   54/54
negative cases:     19, with a spurious extraction: 0
known gaps:         2 (both still failing)
```

The separate corruption slice currently reports:

```
corruption slice:    15 scored cases, exact-match 15/15
negative cases:      7, with a spurious extraction: 0
known gaps:          15 (all still failing)
```

The 15 corruption-slice known gaps are deliberately excluded from its scored denominator.
They record recovery behaviour that is desirable but not implemented; they are not evidence
that the current extractor handles those corruptions.

**A perfect score here is expected and nearly meaningless.** The cases were written from
the extractor's documented behaviour on clean synthetic text. What this proves is that the
extractor still does what its documentation says, and that it refuses to guess on ambiguous
dates, reversed academic years, and personal data. It says nothing about a photographed,
skewed, low-resolution AICTE certificate.

## Known gaps (documented, not hidden)

Both are reported in a separate section of the output and are excluded from the scored set,
so they cannot inflate the numbers. If either starts passing, the report says
**"FIXED — remove the known_gap flag"**.

| Case | Defect | Owner |
|---|---|---|
| `BND-002` | The documented minimum of 3 characters for `institution_name` is not enforced: `Institution Name: AB` extracts `AB`, because the `\s*` before the capture group backtracks and lets `. {3,160}` consume the leading space. | backend workstream (OCR file) |
| `HI-005` | The common Hindi spelling `शैक्षणिक सत्र` is not matched; only `शैक्षिक सत्र` is in the pattern. | backend workstream (OCR file) |

Neither was fixed here: `ai/**` must not edit `backend/**` (see
[`../WORKSTREAMS.md`](../WORKSTREAMS.md)), and both changes deserve their own reviewed PR
with OCR regression tests.

## Report fields and baseline comparison

Beyond the printed table, every report (human or `--json`) carries:

| Field | Meaning |
|---|---|
| `corpus` / `corpus_sha256` | Which corpus produced the numbers, and the exact bytes of it |
| `case_results` | Every scored case with its expected/extracted values, match status, error and category — the machine-readable failure artifact |
| `by_category` | Scored-case coverage per category: cases, exact matches and failing case ids |
| `known_gaps` | Documented broken behaviour, each with `still_failing` and its own `error` when it raises |
| `engine` | Which extractor produced the numbers (default `backend.app.ocr_pipeline:extract_institution_fields`); set by `--engine` |
| `confidences` (per case) | Field→confidence as reported by the engine (`OCRField.confidence`), present only when the engine supplies them; the scorer never invents confidence values |

To compare a change against a stored result, capture a baseline once and compare later:

```bash
python ai/evaluate_extraction.py --json baseline.json --quiet      # store a baseline
python ai/evaluate_extraction.py --compare baseline.json          # compare a current run
```

`--compare` reads the baseline only — it never writes to it. It reports, per corpus:
corpus-byte changes (a sha256 mismatch is shown explicitly; case ids are still compared),
scored cases that appear or disappear, **newly failing scored cases** (`NEW REGRESSIONS`,
exit 1), newly passing cases, known-gap flips in either direction, new/removed documented
gaps, new negative false positives (exit 1), and the micro-F1 delta. A corpus absent from
the baseline reports `no matching corpus in the baseline` and does not gate the run.
Multi-corpus baselines (`{"corpora": [...]}`) compare slice by slice, never as one merged
score.

### Exit-code policy for `--compare`

The command exits 1 (baseline verification failed) exactly when:

1. a case that scored success in the baseline now fails (mismatch or
   extraction error) - reported as `NEW REGRESSIONS`;
2. a slice with no baseline negative false positives now reports one -
   reported as `NEW REGRESSIONS`;
3. the stored baseline cannot be read or parsed.

Everything else is a visible note with exit 0: corpus-byte changes,
known-gap flags appearing or disappearing, cases added or removed, the
micro-F1 delta, and newly added cases that fail - no baseline result yet -
capture the next baseline with `--check` so they become protected).
A corpus absent from the baseline never gates the run. A
gapped case that starts passing is reported as `FIXED - remove the
known_gap flag` so a human reviews the flag before the case enters the
scored denominator.

A useful developer loop after touching anything the extractor depends on:

```bash
# before the change
python ai/evaluate_extraction.py --json /tmp/before.json
# after the change
python ai/evaluate_extraction.py --json /tmp/after.json --compare /tmp/before.json
```

Performance note (2026-10-23, this MacBook, .venv): a 600-case synthetic corpus scores in
~0.08 s wall time including interpreter startup. No optimisation is warranted or claimed.


## Engine bake-offs and preprocessing diagnosis

Canonical `docs/canonical/prd.md` requires OCR engine selection "via a labelled
synthetic-data bake-off". `--engine module:attribute` implements the evaluation half of
that requirement: any candidate callable is scored on the same corpora with the same
semantics, and the report names the engine it measured.

`--normalize` prints an **evidence-only** preprocessing diagnosis after the report: it
re-extracts every known-gap case from conservatively normalized text
(`ai/normalize.py`) and reports which gaps normalization alone would exact-match, plus
the rules that fired and `extraction_raised` ids. On the current corruption corpus it
fixes exactly `1/15` (`CMIS-009`, `remove-invisible-chars`) — the diagnosis quantifies
what preprocessing can and cannot contribute, it scores nothing and changes no exit
code. Deliberate scope limits of `ai/normalize.py` (each with provenance in its
docstring): it removes only characters that are never meaningful (zero-width/soft
hyphen/control characters), unifies representations (CRLF, U+2028/U+2029, NFKC,
whitespace) and does **not** attempt label re-joining, column reordering or fuzzy OCR
confusion correction — those need real policy decisions and belong to the backend-owned
extraction fix (`ai/BACKEND_HANDOFF.md`).

`ai/tests` runs in the shared `backend-tests` CI workflow; any regression the evaluator can
detect is therefore also a pull-request gate without an AI-specific configuration change.

## What these numbers do not mean

- **Not OCR accuracy.** The corpus is text. No image, scan, skew, blur, compression
  artefact, DPI variation or handwriting is involved. Real OCR errors are the hard part and
  are entirely absent.
- **Not a held-out evaluation.** The cases were written alongside the extractor's patterns.
  There is no train/test split, no independent annotator, and no inter-annotator agreement.
- **Not representative.** One synthetic institution naming convention, one date format
  family, five Hindi labels. Regional languages other than Hindi are uncovered.
- **Not compliance.** Extracting a date or a certificate number is evidence for a human
  reviewer; it proves neither authenticity nor regulatory compliance.
- **Not a regression guarantee for the engine.** `backend/tests/test_ocr_engine_integration.py`
  exercises Tesseract and skips when it is absent; the evaluator here never runs an engine.

A real accuracy statement needs a labelled, held-out set of representative scanned
documents with a stated annotation protocol, per-field metrics and error analysis. That does
not exist yet, so no percentage may be quoted anywhere.

## Adding cases

1. Append one JSON object per line to the appropriate corpus:
   `ai/corpus/extraction_cases.jsonl` for clean label behaviour or
   `ai/corpus/ocr_corruption_cases.jsonl` for realistic corruption:
   `{"case_id", "category", "notes", "text", "expected": {field: value, ...}}`.
   Use `"known_gap": true` only for behaviour you are deliberately documenting as broken.
2. Never include a real institution, person, certificate number or document — synthetic
   markers only (`ai/tests/test_evaluate.py` enforces this).
3. Run `python ai/evaluate_extraction.py --corpus <each corpus>`; a case that fails is a
   finding, not something to delete. Use repeated `--corpus` arguments to compare slices,
   not to create one merged score.
4. Run `python -m pytest -q ai/tests`.

Target the failure modes, not the count: duplicate near-identical clean-label cases add
nothing.

## OCR benchmark module (`ai/ocr_benchmark.py`)

A separate benchmark infrastructure module provides:

- **`OCREngine` abstract base class:** Adapter contract for image-to-text engines.
  Concrete subclasses implement `extract(image) -> dict[str, Any]`.
- **Transcription metrics:** Character Error Rate (CER) and Word Error Rate (WER)
  computed via standard Levenshtein edit distance. CER divides character-level edits by
  reference length; WER divides token-level edits by reference token count. Both return
  0.0 for identical inputs and 1.0 when either input is empty.
- **Structured-field scoring:** Per-field and micro-averaged precision/recall/F1 from
  aggregate TP, FP, FN counts. The extractor receives the case `text` string and returns
  a dict of field values.
- **Synthetic case generation:** Deterministic, seeded generation of labelled text
  fixtures with controlled corruption types (none, blur, skew, low_res, compression,
  low_contrast, spacing, latin_hindi_mix, inserted_newline, column_order).
- **Corpus I/O:** JSONL loading with strict validation (missing files, malformed JSON,
  duplicate case IDs, empty corpora all raise actionable errors) and writing.
- **Held-out partitioning:** Deterministic seed-based shuffled split with configurable
  fraction. Validates fraction bounds and minimum case count. Partition integrity checks
  detect case-ID overlap and text-level leakage.
- **Engine contract tests:** Mock-based checks that an engine returns dicts with
  string-or-None values without raising.

### Text-only vs. image-level evaluation

The current benchmark operates on **text only**. The synthetic case generator produces
labelled text, not raster images. Image-level evaluation (blur, skew, resolution,
compression, contrast on rendered documents) requires image generation and OCR engine
dependencies that are not yet approved. Until then, the benchmark is a
**text-to-structured-field extraction benchmark**, not an image OCR benchmark.

### Running benchmark tests

```bash
python -m pytest -q ai/tests/test_ocr_benchmark.py   # 97 tests
python -m pytest -q ai/tests                          # all AI/OCR tests
```

