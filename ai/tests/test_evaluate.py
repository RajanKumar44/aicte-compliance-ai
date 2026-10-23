"""Tests for the synthetic extraction corpus and its scorer.

Run: `python -m pytest -q ai/tests`

They check three separate things:

1. the scorer's arithmetic is right, on hand-worked examples;
2. the corpus is well formed and its expected values actually match the extractor,
   with known gaps reported rather than silently accepted;
3. the CLI behaves (exit codes, `--check`, JSON output) and always prints the
   synthetic-corpus caveat.
"""

from __future__ import annotations

import json
import subprocess
import sys
import unicodedata
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ai.evaluate_extraction import (  # noqa: E402
    BANNER,
    CORPUS_PATH,
    CaseResult,
    evaluate_case,
    load_corpus,
    run,
    run_corpora,
    score,
    _print_human as print_human,
)

SCRIPT = REPO_ROOT / "ai" / "evaluate_extraction.py"
CORRUPTION_CORPUS_PATH = REPO_ROOT / "ai" / "corpus" / "ocr_corruption_cases.jsonl"
TEXT_FIELDS = {
    "institution_name",
    "certificate_number",
    "application_reference",
    "issue_date",
    "valid_until",
    "academic_year",
}


def result(case_id: str, expected: dict, extracted: dict, known_gap: bool = False) -> CaseResult:
    return CaseResult(
        case_id=case_id,
        category="test",
        expected=expected,
        extracted=extracted,
        known_gap=known_gap,
    )


# --- scorer arithmetic ----------------------------------------------------


def test_perfect_case_scores_one():
    report = score([result("a", {"institution_name": "X"}, {"institution_name": "X"})])
    assert report["per_field"]["institution_name"]["tp"] == 1
    assert report["per_field"]["institution_name"]["fp"] == 0
    assert report["per_field"]["institution_name"]["fn"] == 0
    assert report["micro"]["f1"] == 1.0
    assert report["exact_match_count"] == 1


def test_missing_field_is_a_false_negative_not_a_pass():
    report = score([result("a", {"valid_until": "2027-04-30"}, {})])
    assert report["per_field"]["valid_until"]["fn"] == 1
    assert report["per_field"]["valid_until"]["precision"] == 0.0
    assert report["per_field"]["valid_until"]["recall"] == 0.0
    assert report["exact_match_count"] == 0


def test_wrong_value_counts_as_false_positive_and_is_listed():
    report = score([result("a", {"issue_date": "2026-01-01"}, {"issue_date": "2026-01-02"})])
    field = report["per_field"]["issue_date"]
    assert (field["tp"], field["fp"], field["fn"]) == (0, 1, 0)
    assert field["wrong_value"] == 1
    assert report["wrong_values"] == [
        {"case_id": "a", "field": "issue_date", "expected": "2026-01-01", "extracted": "2026-01-02"}
    ]


def test_spurious_field_is_reported_for_a_negative_case():
    report = score([result("neg", {}, {"institution_name": "Invented College"})])
    assert report["negative_cases"] == 1
    assert report["negative_false_positives"] == ["neg"]
    assert report["negative_false_positive_count"] == 1
    assert report["per_field"]["institution_name"]["fp"] == 1


def test_precision_and_recall_are_computed_from_the_confusion_matrix():
    results = [
        result("1", {"institution_name": "A"}, {"institution_name": "A"}),  # tp
        result("2", {"institution_name": "B"}, {}),  # fn
        result("3", {}, {"institution_name": "C"}),  # fp
        result("4", {"institution_name": "D"}, {}),  # fn
    ]
    report = score(results)
    field = report["per_field"]["institution_name"]
    assert (field["tp"], field["fp"], field["fn"]) == (1, 1, 2)
    assert field["precision"] == pytest.approx(0.5)
    assert field["recall"] == pytest.approx(1 / 3, abs=1e-4)
    assert field["f1"] == pytest.approx(0.4, abs=1e-4)


def test_micro_averages_across_fields_rather_than_per_case():
    results = [
        result("1", {"institution_name": "A", "issue_date": "2026-01-01"},
               {"institution_name": "A"}),
    ]
    report = score(results)
    assert report["micro"]["tp"] == 1
    assert report["micro"]["fn"] == 1
    assert report["micro"]["precision"] == 1.0
    assert report["micro"]["recall"] == 0.5


def test_a_raising_case_is_counted_as_a_failure_not_skipped():
    case = {
        "case_id": "boom",
        "category": "limit",
        "text": "x" * 100_001,  # over MAX_OCR_TEXT_CHARS: extraction raises
        "expected": {"institution_name": "A"},
    }
    outcome = evaluate_case(case)
    assert outcome.error is not None and "ValueError" in outcome.error
    assert outcome.extracted == {}
    assert not outcome.exact_match
    report = score([outcome])
    assert report["errors"][0]["case_id"] == "boom"
    assert report["per_field"]["institution_name"]["fn"] == 1


# --- corpus integrity -----------------------------------------------------


def test_corpus_is_loadable_and_large_enough():
    cases = load_corpus()
    assert len(cases) >= 40, "the corpus is meant to cover meaningful variation"
    ids = [case["case_id"] for case in cases]
    assert len(ids) == len(set(ids))


def test_corpus_covers_the_documented_field_set_and_negative_cases():
    cases = load_corpus()
    covered = {name for case in cases for name in case["expected"]}
    assert covered == TEXT_FIELDS
    negatives = [case for case in cases if not case["expected"] and not case.get("known_gap")]
    assert len(negatives) >= 15, "negative cases must be a real part of the corpus"


def test_corpus_categories_include_the_hard_scenarios():
    categories = {case.get("category") for case in load_corpus()}
    for required in {
        "clean-label-en",
        "clean-label-hi",
        "ambiguous-date",
        "invalid-date",
        "ocr-corruption",
        "noise",
        "duplicate-labels",
        "boundary",
        "personal-data",
        "multi-field",
    }:
        assert required in categories, f"missing corpus category {required}"


def test_corruption_slice_is_labelled_and_keeps_negative_cases():
    cases = load_corpus(CORRUPTION_CORPUS_PATH)
    assert len(cases) == 30
    assert {
        "ocr-inserted-newline",
        "ocr-misread-label",
        "ocr-latin-hindi-mix",
        "ocr-column-order",
    } <= {case["category"] for case in cases}
    negatives = [case for case in cases if not case["expected"] and not case.get("known_gap")]
    assert len(negatives) == 7
    assert len(negatives) >= len(cases) // 4
    assert len([c for c in cases if c.get("known_gap")]) == 15
    # Unicode decomposition must be present explicitly, not by accident of encoding.
    decomposed = [case for case in cases if case["case_id"] == "CLH-007"]
    assert all(unicodedata.normalize("NFC", case["text"]) != case["text"] for case in decomposed)


def test_multiple_corpora_are_scored_as_separate_slices():
    reports = run_corpora([CORPUS_PATH, CORRUPTION_CORPUS_PATH])

    assert [report["corpus"] for report in reports] == [
        str(CORPUS_PATH.resolve().relative_to(REPO_ROOT)),
        str(CORRUPTION_CORPUS_PATH.resolve().relative_to(REPO_ROOT)),
    ]
    assert [report["cases"] for report in reports] == [54, 15]
    assert [report["exact_match_count"] for report in reports] == [54, 15]
    assert reports[0]["negative_false_positive_count"] == 0
    assert reports[1]["negative_false_positive_count"] == 0
    assert len(reports[1]["known_gaps"]) == 15


def test_corpus_contains_no_real_or_personal_data():
    text = CORPUS_PATH.read_text(encoding="utf-8")
    # Synthetic markers only; nothing that looks like a real identifier.
    assert "Example" in text
    for marker in ("@", "http://", "https://", "Aadhaar", "aadhaar", "PAN "):
        assert marker not in text, f"corpus must not contain {marker!r}"


def test_scored_cases_pass_and_known_gaps_are_reported_as_failing():
    report = run()
    assert report["errors"] == [], "no scored case may raise"
    assert report["negative_false_positive_count"] == 0
    assert report["exact_match_count"] == report["cases"]
    assert report["known_gaps"], "known defects must stay documented"
    assert all(gap["still_failing"] for gap in report["known_gaps"]), (
        "a known gap that now passes should have its known_gap flag removed"
    )
    assert all(gap["note"] for gap in report["known_gaps"])


# --- honesty --------------------------------------------------------------


def test_banner_warns_that_the_numbers_are_not_real_world_accuracy():
    for phrase in ("SYNTHETIC", "NOT A REAL-WORLD BENCHMARK", "not OCR accuracy"):
        assert phrase in BANNER
    assert BANNER in run()["banner"]


def test_cli_prints_the_banner_and_a_summary():
    completed = subprocess.run(
        [sys.executable, str(SCRIPT), "--quiet"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert completed.returncode == 0, completed.stderr
    assert "synthetic corpus" in completed.stdout
    assert "known gaps" in completed.stdout


def test_cli_json_output_is_machine_readable(tmp_path: Path):
    output = tmp_path / "report.json"
    completed = subprocess.run(
        [sys.executable, str(SCRIPT), "--json", str(output), "--quiet"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert completed.returncode == 0, completed.stderr
    report = json.loads(output.read_text(encoding="utf-8"))
    assert report["cases"] >= 40
    assert "micro" in report and "per_field" in report and "known_gaps" in report


def test_cli_reports_repeated_corpora_without_merging_them(tmp_path: Path):
    output = tmp_path / "reports.json"
    completed = subprocess.run(
        [
            sys.executable,
            str(SCRIPT),
            "--corpus",
            str(CORPUS_PATH),
            "--corpus",
            str(CORRUPTION_CORPUS_PATH),
            "--json",
            str(output),
            "--quiet",
        ],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )

    assert completed.returncode == 0, completed.stderr
    report = json.loads(output.read_text(encoding="utf-8"))
    assert len(report["corpora"]) == 2
    assert [slice_report["cases"] for slice_report in report["corpora"]] == [54, 15]
    assert completed.stdout.count("synthetic corpus") == 2


def test_check_mode_fails_when_a_negative_case_extracts_something(tmp_path: Path):
    corpus = tmp_path / "bad.jsonl"
    corpus.write_text(
        json.dumps(
            {
                "case_id": "neg-spurious",
                "category": "noise",
                # A real label, but the case is labelled as expecting nothing.
                "text": "Institution Name: Unexpected College",
                "expected": {},
            }
        )
        + "\n",
        encoding="utf-8",
    )
    completed = subprocess.run(
        [sys.executable, str(SCRIPT), "--corpus", str(corpus), "--check", "--quiet"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert completed.returncode == 1
    assert "must leave unresolved values unresolved" in completed.stderr


def test_check_mode_fails_when_a_scored_case_mismatches(tmp_path: Path):
    corpus = tmp_path / "mismatch.jsonl"
    corpus.write_text(
        json.dumps(
            {
                "case_id": "positive-mismatch",
                "category": "clean-label-en",
                "text": "Issue Date: 2026-04-30",
                "expected": {"issue_date": "2027-04-30"},
            }
        )
        + "\n",
        encoding="utf-8",
    )
    completed = subprocess.run(
        [sys.executable, str(SCRIPT), "--corpus", str(corpus), "--check", "--quiet"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )

    assert completed.returncode == 1
    assert "scored cases did not match exactly" in completed.stderr


def test_load_corpus_rejects_duplicate_ids(tmp_path: Path):
    corpus = tmp_path / "dup.jsonl"
    line = json.dumps({"case_id": "same", "text": "x", "expected": {}})
    corpus.write_text(f"{line}\n{line}\n", encoding="utf-8")
    with pytest.raises(SystemExit):
        load_corpus(corpus)


# --- invalid input, report handling and determinism -----------------------


@pytest.mark.parametrize(
    ("payload", "name", "message"),
    [
        # A corpus that does not exist must fail loudly, not return zero cases.
        (None, "absent.jsonl", "corpus not found"),
        # Malformed JSONL must report the offending line.
        ('{"case_id": "x", "text": "unterminated string\n', "broken.jsonl", "line 1"),
        # Whitespace-only corpora are rejected rather than scoring an empty set.
        ("\n\n", "empty.jsonl", "is empty"),
        # A case without the required expected map is a schema error.
        (
            json.dumps({"case_id": "a", "text": "x"}) + "\n",
            "missing-field.jsonl",
            "missing 'expected'",
        ),
        # expected must be an object, not a list of field names.
        (
            json.dumps({"case_id": "a", "text": "x", "expected": ["institution_name"]})
            + "\n",
            "wrong-type.jsonl",
            "expected must be an object",
        ),
    ],
)
def test_cli_exits_nonzero_with_a_clear_error_on_invalid_input(
    tmp_path: Path, payload: str | None, name: str, message: str
):
    path = tmp_path / name
    if payload is not None:
        path.write_text(payload, encoding="utf-8")
    completed = subprocess.run(
        [sys.executable, str(SCRIPT), "--corpus", str(path), "--quiet"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert completed.returncode == 1
    assert message in completed.stderr


def test_cli_json_report_replaces_any_previous_report(tmp_path: Path):
    """A new run must fully replace a report file, never merge with stale data."""
    output = tmp_path / "report.json"
    output.write_text('{"stale": true}\n', encoding="utf-8")
    completed = subprocess.run(
        [sys.executable, str(SCRIPT), "--json", str(output), "--quiet"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert completed.returncode == 0, completed.stderr
    payload = json.loads(output.read_text(encoding="utf-8"))
    assert "stale" not in payload
    assert "cases" in payload and "micro" in payload and "known_gaps" in payload


def test_cli_output_is_deterministic_across_runs(tmp_path: Path):
    first, second = tmp_path / "one.json", tmp_path / "two.json"
    runs = [
        subprocess.run(
            [sys.executable, str(SCRIPT), "--json", str(target), "--quiet"],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        for target in (first, second)
    ]
    for completed in runs:
        assert completed.returncode == 0, completed.stderr
    assert runs[0].stdout == runs[1].stdout
    assert first.read_bytes() == second.read_bytes()


def test_human_report_shows_an_extraction_error_inside_a_known_gap(capsys):
    """A raising gap case must not look like an ordinary mismatch in human output."""
    report = {
        "corpus": "synthetic",
        "cases": 1,
        "exact_match_count": 0,
        "exact_match_rate": 0.0,
        "per_field": {},
        "micro": {"tp": 0, "fp": 0, "fn": 0, "wrong_value": 0,
                  "precision": 0.0, "recall": 0.0, "f1": 0.0},
        "negative_cases": 0,
        "negative_false_positives": [],
        "negative_false_positive_count": 0,
        "wrong_values": [],
        "errors": [],
        "known_gaps": [{
            "case_id": "GAP-RAISE-001",
            "category": "ocr-misread-label",
            "expected": {},
            "extracted": {},
            "exact_match": False,
            "known_gap": True,
            "error": "ValueError: OCR text exceeds the 100000-character processing limit",
            "still_failing": True,
            "note": "a gap that raises",
        }],
    }
    print_human(report, show_banner=False)
    out = capsys.readouterr().out
    assert "GAP-RAISE-001: STILL FAILING" in out
    assert "extraction raised: ValueError" in out
    assert "a gap that raises" in out


def test_check_mode_tolerates_errors_inside_documented_known_gaps(tmp_path: Path):
    """Only scored cases may fail --check; documented gaps stay exempt."""
    corpus = tmp_path / "gap-raise.jsonl"
    corpus.write_text(
        json.dumps(
            {
                "case_id": "GAP-RAISE-002",
                "category": "ocr-misread-label",
                "known_gap": True,
                "notes": "a deliberate gap that raises during extraction",
                "text": "x" * 100_001,
                "expected": {"institution_name": "Example Technical Institute"},
            }
        )
        + "\n",
        encoding="utf-8",
    )
    completed = subprocess.run(
        [sys.executable, str(SCRIPT), "--corpus", str(corpus), "--check", "--quiet"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert completed.returncode == 0, completed.stderr


# --- report hardening: fingerprint, coverage, per-case results -------------


def test_report_records_corpus_fingerprint_and_category_coverage():
    import hashlib

    report = run(CORRUPTION_CORPUS_PATH)
    assert report["corpus_sha256"] == hashlib.sha256(
        CORRUPTION_CORPUS_PATH.read_bytes()
    ).hexdigest()
    coverage = report["by_category"]["ocr-misread-label"]
    assert coverage == {"cases": 2, "exact_match_count": 2, "failing_cases": []}
    ids = [case["case_id"] for case in report["case_results"]]
    assert len(ids) == report["cases"] == len(set(ids))


def test_case_results_agree_with_the_report_metrics():
    report = run(CORRUPTION_CORPUS_PATH)
    exact = sum(1 for case in report["case_results"] if case["exact_match"])
    assert exact == report["exact_match_count"]
    gap_ids = {gap["case_id"] for gap in report["known_gaps"]}
    scored_ids = {case["case_id"] for case in report["case_results"]}
    assert gap_ids.isdisjoint(scored_ids)
    for case in report["case_results"]:
        if case["exact_match"]:
            assert case["error"] is None and case["extracted"] == case["expected"]


# --- baseline comparison ---------------------------------------------------


def test_compare_is_quiet_for_identical_runs_and_never_touches_the_baseline(tmp_path: Path):
    baseline = tmp_path / "base.json"
    current = tmp_path / "current.json"
    for output in (baseline, current):
        completed = subprocess.run(
            [sys.executable, str(SCRIPT), "--json", str(output), "--quiet"],
            cwd=REPO_ROOT, capture_output=True, text=True, check=False,
        )
        assert completed.returncode == 0, completed.stderr
    untouched = baseline.read_bytes()
    completed = subprocess.run(
        [sys.executable, str(SCRIPT), "--compare", str(baseline), "--quiet"],
        cwd=REPO_ROOT, capture_output=True, text=True, check=False,
    )
    assert completed.returncode == 0
    assert "NEW REGRESSIONS" not in completed.stdout
    assert baseline.read_bytes() == untouched


def test_compare_flags_a_newly_failing_case_and_fails_the_run(tmp_path: Path):
    corpus = tmp_path / "mini.jsonl"
    stable = json.dumps({"case_id": "M-001", "category": "clean-label-en",
                         "text": "Institution Name: Example College",
                         "expected": {"institution_name": "Example College"}})
    tightened = json.dumps({"case_id": "M-001", "category": "clean-label-en",
                            "text": "Institution Name: Example College",
                            "expected": {"institution_name": "Different College"}})
    corpus.write_text(stable + "\n", encoding="utf-8")
    baseline = tmp_path / "base.json"
    first = subprocess.run(
        [sys.executable, str(SCRIPT), "--corpus", str(corpus), "--json", str(baseline),
         "--quiet"],
        cwd=REPO_ROOT, capture_output=True, text=True, check=False,
    )
    assert first.returncode == 0, first.stderr
    corpus.write_text(tightened + "\n", encoding="utf-8")
    completed = subprocess.run(
        [sys.executable, str(SCRIPT), "--corpus", str(corpus),
         "--compare", str(baseline), "--quiet"],
        cwd=REPO_ROOT, capture_output=True, text=True, check=False,
    )
    assert completed.returncode == 1
    assert "NEW REGRESSIONS" in completed.stdout
    assert "M-001" in completed.stdout
    assert "corpus bytes changed" in completed.stdout
    assert "nothing compared" not in completed.stdout


def test_compare_reports_a_corpus_missing_from_the_baseline(tmp_path: Path):
    corpus = tmp_path / "elsewhere.jsonl"
    corpus.write_text(
        json.dumps({"case_id": "M-001", "category": "clean-label-en",
                    "text": "Institution Name: Example College",
                    "expected": {"institution_name": "Example College"}}) + "\n",
        encoding="utf-8",
    )
    # A real baseline that covers neither corpus the current run uses.
    other = tmp_path / "unrelated-corpus.json"
    unrelated = tmp_path / "unrelated-corpus.jsonl"
    unrelated.write_text(
        json.dumps({"case_id": "U-001", "category": "clean-label-en",
                    "text": "Institution Name: Other College",
                    "expected": {"institution_name": "Other College"}}) + "\n",
        encoding="utf-8",
    )
    seeded = subprocess.run(
        [sys.executable, str(SCRIPT), "--corpus", str(unrelated),
         "--json", str(other), "--quiet"],
        cwd=REPO_ROOT, capture_output=True, text=True, check=False,
    )
    assert seeded.returncode == 0, seeded.stderr
    completed = subprocess.run(
        [sys.executable, str(SCRIPT), "--corpus", str(corpus),
         "--compare", str(other), "--quiet"],
        cwd=REPO_ROOT, capture_output=True, text=True, check=False,
    )
    assert completed.returncode == 0
    assert "no matching corpus in the baseline" in completed.stdout


@pytest.mark.parametrize(
    ("content", "message"),
    [(None, "baseline not found"), ("{}", "baseline does not look like an evaluator report")],
)
def test_compare_rejects_missing_or_invalid_baseline_files(
    tmp_path: Path, content: str | None, message: str
):
    corpus = tmp_path / "mini.jsonl"
    corpus.write_text(
        json.dumps({"case_id": "M-001", "category": "clean-label-en",
                    "text": "Institution Name: Example College",
                    "expected": {"institution_name": "Example College"}}) + "\n",
        encoding="utf-8",
    )
    baseline = tmp_path / "baseline.json"
    if content is not None:
        baseline.write_text(content, encoding="utf-8")
    completed = subprocess.run(
        [sys.executable, str(SCRIPT), "--corpus", str(corpus),
         "--compare", str(baseline), "--quiet"],
        cwd=REPO_ROOT, capture_output=True, text=True, check=False,
    )
    assert completed.returncode == 1
    assert message in completed.stderr


def test_compare_matches_both_slices_of_a_multi_corpus_run(tmp_path: Path):
    baseline = tmp_path / "multi.json"
    first = subprocess.run(
        [sys.executable, str(SCRIPT), "--json", str(baseline), "--quiet"],
        cwd=REPO_ROOT, capture_output=True, text=True, check=False,
    )
    assert first.returncode == 0, first.stderr
    completed = subprocess.run(
        [sys.executable, str(SCRIPT),
         "--compare", str(baseline), "--quiet"],
        cwd=REPO_ROOT, capture_output=True, text=True, check=False,
    )
    assert completed.returncode == 0, completed.stderr
    assert "no matching corpus" not in completed.stdout
    assert "NEW REGRESSIONS" not in completed.stdout
