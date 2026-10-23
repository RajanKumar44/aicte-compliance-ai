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
```

The scorer imports `extract_institution_fields` from `backend.app.ocr_pipeline`
**read-only**. It does not modify, wrap or reimplement backend code, and no OCR engine is
required — the input is text, so Tesseract is irrelevant here.

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
| boundary | 7 | 3- and 160-character names, 2-character certificate, leap day |
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

A useful developer loop after touching anything the extractor depends on:

```bash
# before the change
python ai/evaluate_extraction.py --json /tmp/before.json
# after the change
python ai/evaluate_extraction.py --json /tmp/after.json --compare /tmp/before.json
```

Performance note (2026-10-23, this MacBook, .venv): a 600-case synthetic corpus scores in
~0.08 s wall time including interpreter startup. No optimisation is warranted or claimed.

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
