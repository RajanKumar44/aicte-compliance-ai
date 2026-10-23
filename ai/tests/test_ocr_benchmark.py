"""Comprehensive tests for ai/ocr_benchmark.py.

Covers:
  - Levenshtein edit-distance implementation.
  - CER, WER, exact-match metrics with hand-calculated examples.
  - Empty strings, Unicode/Hindi, insertions/deletions/substitutions.
  - Synthetic case generation, schema validity, and reproducibility.
  - Corruption types and their actual behavior.
  - Structured-field scoring: precision, recall, F1, TP, FP, FN, wrong-value.
  - Engine contract tests.
  - Corpus loading: validation, error handling, duplicate detection.
  - Fingerprinting stability.
  - Held-out partitioning: determinism, disjoint IDs, fraction validation.
  - Regression tests for every Phase A defect.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path
from typing import Any

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ai.ocr_benchmark import OCREngine, _levenshtein  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class StubEngine(OCREngine):
    """Minimal concrete engine for testing."""

    engine_name = "stub"
    engine_version = "1.0"

    def __init__(self, responses: dict[str, dict[str, Any]] | None = None):
        self.responses = responses or {}

    def extract(self, image: Any) -> dict[str, Any]:
        if isinstance(image, str) and image in self.responses:
            return self.responses[image]
        return {}

    @property
    def dataset_fingerprint(self) -> str:
        return "stub-fp"


class RaisingEngine(OCREngine):
    """Engine that always raises."""

    engine_name = "raiser"

    def extract(self, image: Any) -> dict[str, Any]:
        raise RuntimeError("engine failure")

    @property
    def dataset_fingerprint(self) -> str:
        return "raiser-fp"


class BadReturnEngine(OCREngine):
    """Engine that returns non-dict."""

    engine_name = "bad_return"

    def extract(self, image: Any) -> dict[str, Any]:
        return "not a dict"  # type: ignore[return-value]

    @property
    def dataset_fingerprint(self) -> str:
        return "bad-fp"


class BadValueEngine(OCREngine):
    """Engine that returns dict with non-string values."""

    engine_name = "bad_value"

    def extract(self, image: Any) -> dict[str, Any]:
        return {"field": 42}  # type: ignore[dict-item]

    @property
    def dataset_fingerprint(self) -> str:
        return "badval-fp"


# ---------------------------------------------------------------------------
# Levenshtein edit distance
# ---------------------------------------------------------------------------


class TestLevenshtein:
    def test_identical_strings(self):
        assert _levenshtein("abc", "abc") == 0

    def test_empty_both(self):
        assert _levenshtein("", "") == 0

    def test_empty_reference(self):
        assert _levenshtein("", "abc") == 3

    def test_empty_hypothesis(self):
        assert _levenshtein("abc", "") == 3

    def test_single_substitution(self):
        assert _levenshtein("abc", "axc") == 1

    def test_single_insertion(self):
        assert _levenshtein("abc", "abxc") == 1

    def test_single_deletion(self):
        assert _levenshtein("abc", "ac") == 1

    def test_completely_different(self):
        assert _levenshtein("abc", "xyz") == 3

    def test_prefix_insertion(self):
        # "abc" -> "xabc" requires 1 insertion
        assert _levenshtein("abc", "xabc") == 1

    def test_known_example(self):
        # "kitten" -> "sitting" = 3 edits (k->s, e->i, +g)
        assert _levenshtein("kitten", "sitting") == 3

    def test_token_level(self):
        # Token-level edit distance
        a = ["the", "cat", "sat"]
        b = ["the", "dog", "sat"]
        assert _levenshtein(a, b) == 1

    def test_token_insertion(self):
        a = ["the", "cat"]
        b = ["the", "fat", "cat"]
        assert _levenshtein(a, b) == 1

    def test_unicode(self):
        assert _levenshtein("शैक्षिक", "शैक्षणिक") > 0
        assert _levenshtein("शैक्षिक", "शैक्षिक") == 0


# ---------------------------------------------------------------------------
# CER (Character Error Rate)
# ---------------------------------------------------------------------------


class TestCER:
    def test_identical(self):
        assert OCREngine.character_error_rate("hello", "hello") == 0.0

    def test_both_empty(self):
        assert OCREngine.character_error_rate("", "") == 0.0

    def test_empty_reference(self):
        assert OCREngine.character_error_rate("", "abc") == 1.0

    def test_empty_hypothesis(self):
        assert OCREngine.character_error_rate("abc", "") == 1.0

    def test_single_substitution(self):
        # "abc" -> "axc": 1 edit / 3 chars = 1/3
        cer = OCREngine.character_error_rate("abc", "axc")
        assert math.isclose(cer, 1.0 / 3.0, rel_tol=1e-9)

    def test_insertion_at_start(self):
        # "abc" -> "xabc": 1 insertion / 3 ref chars = 1/3
        # This is the key regression test for the positional comparison bug.
        cer = OCREngine.character_error_rate("abc", "xabc")
        assert math.isclose(cer, 1.0 / 3.0, rel_tol=1e-9)

    def test_insertion_in_middle(self):
        # "abc" -> "abxc": 1 edit / 3 = 1/3
        cer = OCREngine.character_error_rate("abc", "abxc")
        assert math.isclose(cer, 1.0 / 3.0, rel_tol=1e-9)

    def test_deletion(self):
        # "abc" -> "ac": 1 deletion / 3 ref chars = 1/3
        cer = OCREngine.character_error_rate("abc", "ac")
        assert math.isclose(cer, 1.0 / 3.0, rel_tol=1e-9)

    def test_completely_different(self):
        # "abc" -> "xyz": 3 edits / 3 ref chars = 1.0
        cer = OCREngine.character_error_rate("abc", "xyz")
        assert math.isclose(cer, 1.0, rel_tol=1e-9)

    def test_can_exceed_one(self):
        # "a" -> "xyz": 3 edits / 1 ref char = 3.0
        cer = OCREngine.character_error_rate("a", "xyz")
        assert cer > 1.0

    def test_hindi_text(self):
        # Same Hindi string should have CER 0
        assert OCREngine.character_error_rate("शैक्षिक", "शैक्षिक") == 0.0
        # Different Hindi strings should have CER > 0
        assert OCREngine.character_error_rate("शैक्षिक", "शैक्षणिक") > 0.0


# ---------------------------------------------------------------------------
# WER (Word Error Rate)
# ---------------------------------------------------------------------------


class TestWER:
    def test_identical(self):
        assert OCREngine.word_error_rate("the cat sat", "the cat sat") == 0.0

    def test_both_empty(self):
        assert OCREngine.word_error_rate("", "") == 0.0

    def test_empty_reference(self):
        assert OCREngine.word_error_rate("", "the cat") == 1.0

    def test_empty_hypothesis(self):
        assert OCREngine.word_error_rate("the cat", "") == 1.0

    def test_single_word_substitution(self):
        # "the cat sat" -> "the dog sat": 1 token edit / 3 ref tokens = 1/3
        wer = OCREngine.word_error_rate("the cat sat", "the dog sat")
        assert math.isclose(wer, 1.0 / 3.0, rel_tol=1e-9)

    def test_token_insertion(self):
        # "the cat" -> "the fat cat": 1 token edit / 2 ref tokens = 1/2
        wer = OCREngine.word_error_rate("the cat", "the fat cat")
        assert math.isclose(wer, 1.0 / 2.0, rel_tol=1e-9)

    def test_token_deletion(self):
        # "the fat cat" -> "the cat": 1 deletion / 3 ref tokens = 1/3
        wer = OCREngine.word_error_rate("the fat cat", "the cat")
        assert math.isclose(wer, 1.0 / 3.0, rel_tol=1e-9)

    def test_denominator_is_token_count_not_char_count(self):
        # Regression test: WER denominator must be len(ref_words), not len(hypothesis)
        # "a b" -> "x y": 2 word edits / 2 ref tokens = 1.0
        wer = OCREngine.word_error_rate("a b", "x y")
        assert math.isclose(wer, 1.0, rel_tol=1e-9)

    def test_whitespace_only(self):
        # Whitespace-only strings split to empty token lists
        assert OCREngine.word_error_rate("   ", "   ") == 0.0

    def test_mixed_whitespace(self):
        # "a  b" splits to ["a", "b"], same as "a b"
        assert OCREngine.word_error_rate("a  b", "a b") == 0.0


# ---------------------------------------------------------------------------
# Exact transcription rate
# ---------------------------------------------------------------------------


class TestExactTranscription:
    def test_identical(self):
        assert OCREngine.exact_transcription_rate("abc", "abc") == 1.0

    def test_different(self):
        assert OCREngine.exact_transcription_rate("abc", "abd") == 0.0

    def test_both_empty(self):
        assert OCREngine.exact_transcription_rate("", "") == 1.0

    def test_one_empty(self):
        assert OCREngine.exact_transcription_rate("abc", "") == 0.0


# ---------------------------------------------------------------------------
# Synthetic case generation
# ---------------------------------------------------------------------------


class TestSyntheticCaseGeneration:
    def test_generates_requested_count(self):
        cases = OCREngine.generate_synthetic_cases(10, seed=42)
        assert len(cases) == 10

    def test_zero_count(self):
        cases = OCREngine.generate_synthetic_cases(0, seed=42)
        assert len(cases) == 0

    def test_case_schema(self):
        cases = OCREngine.generate_synthetic_cases(5, seed=42)
        required_keys = {"case_id", "text", "ground_truth", "language",
                         "corruption_type", "dataset_fingerprint"}
        for case in cases:
            assert required_keys <= set(case.keys())
            assert isinstance(case["case_id"], str)
            assert len(case["case_id"]) == 12
            assert isinstance(case["text"], str)
            assert isinstance(case["ground_truth"], dict)
            assert isinstance(case["language"], str)
            assert isinstance(case["dataset_fingerprint"], str)

    def test_ground_truth_has_expected_fields(self):
        cases = OCREngine.generate_synthetic_cases(5, seed=42)
        expected_fields = {"academic_year", "certificate_number",
                           "valid_until", "issue_date", "institution_name"}
        for case in cases:
            assert expected_fields == set(case["ground_truth"].keys())

    def test_deterministic_with_same_seed(self):
        a = OCREngine.generate_synthetic_cases(10, seed=42)
        b = OCREngine.generate_synthetic_cases(10, seed=42)
        assert a == b

    def test_different_seeds_produce_different_cases(self):
        a = OCREngine.generate_synthetic_cases(10, seed=42)
        b = OCREngine.generate_synthetic_cases(10, seed=99)
        # Case IDs differ because they incorporate the seed
        assert [c["case_id"] for c in a] != [c["case_id"] for c in b]

    def test_unique_case_ids(self):
        cases = OCREngine.generate_synthetic_cases(30, seed=42)
        ids = [c["case_id"] for c in cases]
        assert len(ids) == len(set(ids))

    def test_corruption_types_cycle(self):
        cases = OCREngine.generate_synthetic_cases(20, seed=42)
        types = [c["corruption_type"] for c in cases]
        # First 10 should cycle through all corruption types
        expected_cycle = [
            None, "blur", "skew", "low_res", "compression",
            "low_contrast", "spacing", "latin_hindi_mix",
            "inserted_newline", "column_order",
        ]
        assert types[:10] == expected_cycle

    def test_fingerprint_is_stable(self):
        cases = OCREngine.generate_synthetic_cases(10, seed=42)
        fps = {c["dataset_fingerprint"] for c in cases}
        assert len(fps) == 1  # All cases from the same generation share a fingerprint

    def test_inserted_newline_corruption(self):
        cases = OCREngine.generate_synthetic_cases(20, seed=42)
        newline_cases = [c for c in cases if c["corruption_type"] == "inserted_newline"]
        assert len(newline_cases) > 0
        for case in newline_cases:
            # The text should contain the corruption
            assert "\n" in case["text"]

    def test_column_order_corruption(self):
        cases = OCREngine.generate_synthetic_cases(20, seed=42)
        col_cases = [c for c in cases if c["corruption_type"] == "column_order"]
        assert len(col_cases) > 0


# ---------------------------------------------------------------------------
# Transcription scoring
# ---------------------------------------------------------------------------


class TestTranscriptionScoring:
    def test_empty_cases(self):
        engine = StubEngine()
        result = engine.score_transcription([])
        assert result["samples"] == 0
        assert result["cer"] == 0.0

    def test_perfect_match(self):
        engine = StubEngine()
        cases = [
            {"ground_truth": "hello world", "predicted_text": "hello world"},
        ]
        result = engine.score_transcription(
            cases, reference_key="ground_truth", prediction_key="predicted_text"
        )
        assert result["cer"] == 0.0
        assert result["wer"] == 0.0
        assert result["exact"] == 1.0
        assert result["samples"] == 1

    def test_non_string_values_coerced(self):
        engine = StubEngine()
        cases = [
            {"ground_truth": {"not": "a string"}, "predicted_text": "text"},
        ]
        # Non-string ground truth should be coerced to empty string
        result = engine.score_transcription(
            cases, reference_key="ground_truth", prediction_key="predicted_text"
        )
        assert result["samples"] == 1
        # "" ref vs "text" hyp → CER 1.0
        assert result["cer"] == 1.0

    def test_aggregates_across_cases(self):
        engine = StubEngine()
        cases = [
            {"ground_truth": "abc", "predicted_text": "abc"},
            {"ground_truth": "abc", "predicted_text": "xyz"},
        ]
        result = engine.score_transcription(
            cases, reference_key="ground_truth", prediction_key="predicted_text"
        )
        assert result["samples"] == 2
        # Case 1: CER 0.0, Case 2: CER 1.0 → mean 0.5
        assert math.isclose(result["cer"], 0.5, rel_tol=1e-9)


# ---------------------------------------------------------------------------
# Structured-field scoring
# ---------------------------------------------------------------------------


class TestStructuredFieldScoring:
    def test_perfect_extraction(self):
        engine = StubEngine()
        cases = [
            {
                "text": "Institution Name: Alpha College",
                "ground_truth": {"institution_name": "Alpha College"},
            },
        ]

        def extractor(text: str) -> dict[str, Any]:
            return {"institution_name": "Alpha College"}

        result = engine.score_structured_fields(
            cases, extractor, field_keys=["institution_name"]
        )
        assert result["aggregate"]["total_tp"] == 1
        assert result["aggregate"]["total_fp"] == 0
        assert result["aggregate"]["total_fn"] == 0
        assert result["aggregate"]["f1"] == 1.0

    def test_wrong_value_counts_as_fp_and_fn(self):
        engine = StubEngine()
        cases = [
            {
                "text": "Institution Name: Alpha",
                "ground_truth": {"institution_name": "Alpha College"},
            },
        ]

        def extractor(text: str) -> dict[str, Any]:
            return {"institution_name": "Alpha"}

        result = engine.score_structured_fields(
            cases, extractor, field_keys=["institution_name"]
        )
        assert result["aggregate"]["total_tp"] == 0
        assert result["aggregate"]["total_fp"] == 1
        assert result["aggregate"]["total_fn"] == 1
        assert len(result["errors"]) == 1
        assert result["errors"][0]["expected"] == "Alpha College"
        assert result["errors"][0]["got"] == "Alpha"

    def test_missing_field_is_fn(self):
        engine = StubEngine()
        cases = [
            {
                "text": "nothing here",
                "ground_truth": {"institution_name": "Alpha"},
            },
        ]

        def extractor(text: str) -> dict[str, Any]:
            return {}

        result = engine.score_structured_fields(
            cases, extractor, field_keys=["institution_name"]
        )
        assert result["aggregate"]["total_fn"] == 1
        assert result["aggregate"]["total_tp"] == 0
        assert result["aggregate"]["total_fp"] == 0

    def test_spurious_extraction_is_fp(self):
        engine = StubEngine()
        cases = [
            {
                "text": "nothing here",
                "ground_truth": {},
            },
        ]

        def extractor(text: str) -> dict[str, Any]:
            return {"institution_name": "Fake"}

        result = engine.score_structured_fields(
            cases, extractor, field_keys=["institution_name"]
        )
        assert result["aggregate"]["total_fp"] == 1
        assert result["aggregate"]["total_tp"] == 0
        assert result["aggregate"]["total_fn"] == 0

    def test_aggregate_f1_uses_aggregate_counts(self):
        """Regression test: aggregate F1 must not use a single field's metrics."""
        engine = StubEngine()
        cases = [
            {
                "text": "multi field",
                "ground_truth": {
                    "institution_name": "Alpha",
                    "certificate_number": "CERT/001",
                },
            },
        ]

        def extractor(text: str) -> dict[str, Any]:
            return {
                "institution_name": "Alpha",  # correct
                "certificate_number": "WRONG",  # wrong
            }

        result = engine.score_structured_fields(
            cases, extractor,
            field_keys=["institution_name", "certificate_number"],
        )
        agg = result["aggregate"]
        # TP=1 (institution), FP=1 (cert wrong), FN=1 (cert expected)
        assert agg["total_tp"] == 1
        assert agg["total_fp"] == 1
        assert agg["total_fn"] == 1
        # Precision = 1/(1+1) = 0.5, Recall = 1/(1+1) = 0.5, F1 = 0.5
        assert math.isclose(agg["precision"], 0.5, rel_tol=1e-3)
        assert math.isclose(agg["recall"], 0.5, rel_tol=1e-3)
        assert math.isclose(agg["f1"], 0.5, rel_tol=1e-3)

    def test_empty_cases(self):
        engine = StubEngine()
        result = engine.score_structured_fields([], lambda t: {})
        assert result["aggregate"]["total_tp"] == 0
        assert result["aggregate"]["total_fp"] == 0
        assert result["aggregate"]["total_fn"] == 0
        assert result["aggregate"]["f1"] == 0.0

    def test_extractor_receives_text_string(self):
        """The extractor must receive the case's text (a string), not
        a dict or other structure."""
        engine = StubEngine()
        received_inputs: list = []

        def capturing_extractor(text: str) -> dict[str, Any]:
            received_inputs.append(text)
            return {}

        cases = [
            {"text": "Hello World", "ground_truth": {}},
        ]
        engine.score_structured_fields(
            cases, capturing_extractor, field_keys=["institution_name"]
        )
        assert received_inputs == ["Hello World"]

    def test_multiple_fields_multiple_cases(self):
        engine = StubEngine()

        def extractor(text: str) -> dict[str, Any]:
            if "alpha" in text.lower():
                return {
                    "institution_name": "Alpha",
                    "certificate_number": "CERT/001",
                }
            return {}

        cases = [
            {
                "text": "alpha document",
                "ground_truth": {
                    "institution_name": "Alpha",
                    "certificate_number": "CERT/001",
                },
            },
            {
                "text": "empty document",
                "ground_truth": {
                    "institution_name": "Beta",
                },
            },
        ]
        result = engine.score_structured_fields(
            cases, extractor,
            field_keys=["institution_name", "certificate_number"],
        )
        # Case 1: institution TP, cert TP = 2 TP
        # Case 2: institution FN (expected Beta, got nothing)
        assert result["aggregate"]["total_tp"] == 2
        assert result["aggregate"]["total_fn"] == 1
        assert result["aggregate"]["total_fp"] == 0


# ---------------------------------------------------------------------------
# Engine contract tests
# ---------------------------------------------------------------------------


class TestEngineContract:
    def test_good_engine_passes_all(self):
        stub = StubEngine()
        results = stub.test_engine_contract(stub)
        assert all(r["passed"] for r in results)
        assert len(results) == 6  # One per test input

    def test_raising_engine_fails(self):
        stub = StubEngine()
        raiser = RaisingEngine()
        results = stub.test_engine_contract(raiser)
        assert all(not r["passed"] for r in results)

    def test_bad_return_type_fails(self):
        stub = StubEngine()
        bad = BadReturnEngine()
        results = stub.test_engine_contract(bad)
        assert all(not r["passed"] for r in results)
        assert any("expected dict" in r["detail"] for r in results)

    def test_bad_value_type_fails(self):
        stub = StubEngine()
        bad = BadValueEngine()
        results = stub.test_engine_contract(bad)
        assert any(not r["passed"] for r in results)
        assert any("not str or None" in r["detail"] for r in results)

    def test_no_duplicate_executions(self):
        """Each test input should result in exactly one contract check."""
        stub = StubEngine()
        results = stub.test_engine_contract(stub)
        case_ids = [r["case_id"] for r in results]
        assert len(case_ids) == len(set(case_ids))


# ---------------------------------------------------------------------------
# Corpus loading
# ---------------------------------------------------------------------------


class TestCorpusLoading:
    def test_load_valid_corpus(self, tmp_path):
        corpus = tmp_path / "test.jsonl"
        corpus.write_text(
            '{"case_id": "a", "text": "hello"}\n'
            '{"case_id": "b", "text": "world"}\n',
            encoding="utf-8",
        )
        cases = OCREngine.load_corpus(corpus)
        assert len(cases) == 2
        assert cases[0]["case_id"] == "a"

    def test_missing_file_raises(self):
        with pytest.raises(FileNotFoundError, match="corpus not found"):
            OCREngine.load_corpus("/nonexistent/path.jsonl")

    def test_malformed_json_raises(self, tmp_path):
        corpus = tmp_path / "bad.jsonl"
        corpus.write_text('{"case_id": "a"}\nnot json\n', encoding="utf-8")
        with pytest.raises(ValueError, match="malformed JSON"):
            OCREngine.load_corpus(corpus)

    def test_duplicate_ids_raise(self, tmp_path):
        corpus = tmp_path / "dup.jsonl"
        corpus.write_text(
            '{"case_id": "a", "text": "x"}\n'
            '{"case_id": "a", "text": "y"}\n',
            encoding="utf-8",
        )
        with pytest.raises(ValueError, match="duplicate case_id"):
            OCREngine.load_corpus(corpus)

    def test_empty_corpus_raises(self, tmp_path):
        corpus = tmp_path / "empty.jsonl"
        corpus.write_text("\n\n", encoding="utf-8")
        with pytest.raises(ValueError, match="corpus is empty"):
            OCREngine.load_corpus(corpus)

    def test_non_object_record_raises(self, tmp_path):
        corpus = tmp_path / "list.jsonl"
        corpus.write_text('[1, 2, 3]\n', encoding="utf-8")
        with pytest.raises(ValueError, match="record must be a JSON object"):
            OCREngine.load_corpus(corpus)

    def test_empty_case_id_raises(self, tmp_path):
        corpus = tmp_path / "empty_id.jsonl"
        corpus.write_text('{"case_id": "", "text": "x"}\n', encoding="utf-8")
        with pytest.raises(ValueError, match="case_id must be a non-empty string"):
            OCREngine.load_corpus(corpus)

    def test_blank_lines_skipped(self, tmp_path):
        corpus = tmp_path / "blanks.jsonl"
        corpus.write_text(
            '\n{"case_id": "a", "text": "x"}\n\n{"case_id": "b", "text": "y"}\n\n',
            encoding="utf-8",
        )
        cases = OCREngine.load_corpus(corpus)
        assert len(cases) == 2


# ---------------------------------------------------------------------------
# JSONL write and roundtrip
# ---------------------------------------------------------------------------


class TestWriteJsonl:
    def test_write_and_load(self, tmp_path):
        cases = [
            {"case_id": "a", "text": "hello"},
            {"case_id": "b", "text": "world"},
        ]
        path = tmp_path / "out.jsonl"
        OCREngine.write_jsonl(cases, path)
        loaded = OCREngine.load_corpus(path)
        assert loaded == cases


# ---------------------------------------------------------------------------
# Corpus fingerprinting
# ---------------------------------------------------------------------------


class TestCorpusFingerprint:
    def test_stable_fingerprint(self):
        cases = [{"case_id": "a", "text": "x"}]
        fp1 = OCREngine.corpus_fingerprint(cases)
        fp2 = OCREngine.corpus_fingerprint(cases)
        assert fp1 == fp2
        assert len(fp1) == 64  # SHA-256 hex

    def test_different_content_different_fingerprint(self):
        fp1 = OCREngine.corpus_fingerprint([{"case_id": "a", "text": "x"}])
        fp2 = OCREngine.corpus_fingerprint([{"case_id": "a", "text": "y"}])
        assert fp1 != fp2

    def test_order_matters(self):
        a = [{"case_id": "a"}, {"case_id": "b"}]
        b = [{"case_id": "b"}, {"case_id": "a"}]
        assert OCREngine.corpus_fingerprint(a) != OCREngine.corpus_fingerprint(b)


# ---------------------------------------------------------------------------
# Held-out partitioning
# ---------------------------------------------------------------------------


class TestHeldOutPartitioning:
    def test_basic_split(self):
        cases = OCREngine.generate_synthetic_cases(20, seed=42)
        dev, held = OCREngine.split_into_held_out(cases, 0.2, seed=42)
        assert len(dev) + len(held) == 20
        assert len(held) >= 1

    def test_deterministic_split(self):
        cases = OCREngine.generate_synthetic_cases(20, seed=42)
        dev1, held1 = OCREngine.split_into_held_out(cases, 0.2, seed=42)
        dev2, held2 = OCREngine.split_into_held_out(cases, 0.2, seed=42)
        assert dev1 == dev2
        assert held1 == held2

    def test_different_seeds_produce_different_splits(self):
        cases = OCREngine.generate_synthetic_cases(20, seed=42)
        _, held1 = OCREngine.split_into_held_out(cases, 0.2, seed=42)
        _, held2 = OCREngine.split_into_held_out(cases, 0.2, seed=99)
        held1_ids = {c["case_id"] for c in held1}
        held2_ids = {c["case_id"] for c in held2}
        # With different seeds, the held-out sets should differ
        # (not guaranteed but overwhelmingly likely with 20 cases)
        assert held1_ids != held2_ids

    def test_disjoint_case_ids(self):
        cases = OCREngine.generate_synthetic_cases(30, seed=42)
        dev, held = OCREngine.split_into_held_out(cases, 0.3, seed=42)
        dev_ids = {c["case_id"] for c in dev}
        held_ids = {c["case_id"] for c in held}
        assert len(dev_ids & held_ids) == 0

    def test_invalid_fraction_zero(self):
        cases = OCREngine.generate_synthetic_cases(10, seed=42)
        with pytest.raises(ValueError, match="between 0 and 1"):
            OCREngine.split_into_held_out(cases, 0.0, seed=42)

    def test_invalid_fraction_one(self):
        cases = OCREngine.generate_synthetic_cases(10, seed=42)
        with pytest.raises(ValueError, match="between 0 and 1"):
            OCREngine.split_into_held_out(cases, 1.0, seed=42)

    def test_invalid_fraction_negative(self):
        cases = OCREngine.generate_synthetic_cases(10, seed=42)
        with pytest.raises(ValueError, match="between 0 and 1"):
            OCREngine.split_into_held_out(cases, -0.1, seed=42)

    def test_insufficient_cases(self):
        cases = [{"case_id": "only_one"}]
        with pytest.raises(ValueError, match="at least 2 cases"):
            OCREngine.split_into_held_out(cases, 0.5, seed=42)

    def test_empty_cases(self):
        with pytest.raises(ValueError, match="at least 2 cases"):
            OCREngine.split_into_held_out([], 0.5, seed=42)


# ---------------------------------------------------------------------------
# Partition integrity
# ---------------------------------------------------------------------------


class TestPartitionIntegrity:
    def test_no_warnings_for_clean_split(self):
        cases = OCREngine.generate_synthetic_cases(20, seed=42)
        dev, held = OCREngine.split_into_held_out(cases, 0.2, seed=42)
        warnings = OCREngine.check_partition_integrity(dev, held)
        assert warnings == []

    def test_detects_case_id_overlap(self):
        overlap_case = {"case_id": "shared", "text": "overlap"}
        dev = [{"case_id": "a", "text": "x"}, overlap_case]
        held = [{"case_id": "b", "text": "y"}, overlap_case]
        warnings = OCREngine.check_partition_integrity(dev, held)
        assert any("Case ID overlap" in w for w in warnings)

    def test_detects_text_leakage(self):
        dev = [{"case_id": "a", "text": "same text"}]
        held = [{"case_id": "b", "text": "same text"}]
        warnings = OCREngine.check_partition_integrity(dev, held)
        assert any("Identical text" in w for w in warnings)

    def test_detects_identical_references_with_different_ids(self):
        """Regression/leakage check: different IDs and corrupted text, but identical ground truth."""
        shared_gt = {"institution_name": "Alpha", "certificate_number": "CERT/001"}
        dev = [{"case_id": "dev_001", "text": "Alpha College Clean", "ground_truth": shared_gt}]
        held = [{"case_id": "held_002", "text": "Alpha C0llege Corrupt", "ground_truth": shared_gt}]
        warnings = OCREngine.check_partition_integrity(dev, held)
        assert any("Identical ground-truth reference" in w for w in warnings)

    def test_shared_dataset_fingerprints_is_valid_provenance_not_leakage(self):
        """Intentional provenance: cases from the same generated dataset share a fingerprint.
        Sharing fingerprint alone is NOT a warning when cases have disjoint IDs, text, and ground truth."""
        shared_fp = "sha256_batch_fingerprint_123"
        dev = [{
            "case_id": "dev_001",
            "text": "Institution Name: Alpha",
            "ground_truth": {"institution_name": "Alpha"},
            "dataset_fingerprint": shared_fp,
        }]
        held = [{
            "case_id": "held_001",
            "text": "Institution Name: Beta",
            "ground_truth": {"institution_name": "Beta"},
            "dataset_fingerprint": shared_fp,
        }]
        warnings = OCREngine.check_partition_integrity(dev, held)
        assert warnings == []

    def test_detects_empty_partitions(self):
        warnings = OCREngine.check_partition_integrity([], [{"case_id": "a"}])
        assert any("Partition is empty" in w for w in warnings)

        warnings2 = OCREngine.check_partition_integrity([{"case_id": "a"}], [])
        assert any("Partition is empty" in w for w in warnings2)

    def test_detects_malformed_partitions(self):
        warnings = OCREngine.check_partition_integrity("not a list", [])  # type: ignore[arg-type]
        assert any("Malformed partition" in w for w in warnings)

        warnings2 = OCREngine.check_partition_integrity([1, 2], [{"case_id": "a"}])  # type: ignore[list-item]
        assert any("must be dictionaries" in w for w in warnings2)


# ---------------------------------------------------------------------------
# Regression tests for Phase A defects
# ---------------------------------------------------------------------------


class TestPhaseARegressions:
    """Each test here directly validates the fix for a specific defect
    identified in the Phase A audit."""

    def test_cer_uses_edit_distance_not_positional(self):
        """Regression: old CER used positional comparison which gave
        maximum error for a single prefix insertion."""
        # "abc" -> "xabc" should be 1 edit, not 3 diffs
        cer = OCREngine.character_error_rate("abc", "xabc")
        assert math.isclose(cer, 1.0 / 3.0, rel_tol=1e-9)

    def test_wer_denominator_is_token_count(self):
        """Regression: old WER divided word edits by len(hypothesis)
        (character count) instead of len(hyp_words) (token count)."""
        # "hello world" -> "hello earth": 1 word edit / 2 ref tokens = 0.5
        wer = OCREngine.word_error_rate("hello world", "hello earth")
        assert math.isclose(wer, 0.5, rel_tol=1e-9)

    def test_aggregate_f1_not_from_single_field(self):
        """Regression: old aggregate F1 was hardcoded from institution_name."""
        engine = StubEngine()
        # Two fields: one perfect, one completely wrong
        cases = [
            {
                "text": "test",
                "ground_truth": {
                    "institution_name": "correct",
                    "valid_until": "2027-04-30",
                },
            },
        ]

        def extractor(text: str) -> dict[str, Any]:
            return {
                "institution_name": "correct",  # TP
                "valid_until": "WRONG",          # FP+FN
            }

        result = engine.score_structured_fields(
            cases, extractor,
            field_keys=["institution_name", "valid_until"],
        )
        # TP=1, FP=1, FN=1
        # P = 1/2, R = 1/2, F1 = 0.5
        assert math.isclose(result["aggregate"]["f1"], 0.5, rel_tol=1e-3)

    def test_held_out_actually_shuffles(self):
        """Regression: old split_into_held_out didn't use its RNG,
        so the split was always the sorted-first N elements."""
        cases = OCREngine.generate_synthetic_cases(30, seed=42)
        # With seed=1 vs seed=2, held-out should contain different elements
        _, held1 = OCREngine.split_into_held_out(cases, 0.3, seed=1)
        _, held2 = OCREngine.split_into_held_out(cases, 0.3, seed=2)
        held1_ids = {c["case_id"] for c in held1}
        held2_ids = {c["case_id"] for c in held2}
        assert held1_ids != held2_ids

    def test_corpus_loading_rejects_missing_file(self):
        """Regression: old load_corpus returned empty list for missing files."""
        with pytest.raises(FileNotFoundError):
            OCREngine.load_corpus("/nonexistent.jsonl")

    def test_corpus_loading_rejects_malformed_json(self, tmp_path):
        """Regression: old load_corpus silently skipped malformed lines."""
        f = tmp_path / "bad.jsonl"
        f.write_text("not json at all\n", encoding="utf-8")
        with pytest.raises(ValueError, match="malformed JSON"):
            OCREngine.load_corpus(f)

    def test_lint_clean(self):
        """Regression: verify no ruff violations remain in ocr_benchmark.py."""
        import subprocess
        result = subprocess.run(
            [sys.executable, "-m", "ruff", "check", "ai/ocr_benchmark.py"],
            capture_output=True, text=True,
            cwd=str(REPO_ROOT),
        )
        assert result.returncode == 0, f"ruff violations:\n{result.stdout}"
