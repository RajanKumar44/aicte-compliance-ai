"""OCR benchmark module for AI/OCR workstream.

Provides:
  - OCREngine adapter contract for image-to-text engines.
  - Deterministic synthetic text-dataset generation (no image libs needed;
    generates labelled text fixtures with controlled corruption).
  - Transcription metrics (CER via edit distance, WER via token edit distance,
    exact match).
  - Structured-field extraction scoring.
  - Dataset fingerprinting and held-out partition tracking.
  - Mock-based contract tests for engine compliance.
  - Explicit documentation of required external dependencies.

Note: This module does NOT install or invoke actual OCR engines (Tesseract,
EasyOCR, etc.) in this environment. It defines the interface and provides
mock-based contract tests. Real engine execution requires the dependencies
documented in the project README.

Metric definitions
------------------
CER (Character Error Rate):
    Levenshtein edit distance between reference and hypothesis strings,
    divided by the length of the reference. When the reference is empty
    and hypothesis is non-empty, CER = 1.0. Both empty = 0.0.

WER (Word Error Rate):
    Levenshtein edit distance between the whitespace-split token sequences
    of reference and hypothesis, divided by the number of reference tokens.
    Same empty-input conventions as CER.

Exact Transcription Rate:
    1.0 if reference == hypothesis, 0.0 otherwise.

Structured-field scoring:
    Per-field and micro-averaged precision/recall/F1 computed from TP/FP/FN
    across all fields and cases. The extractor receives the case ``text``
    (a string) and returns a dict of field names to values.
"""

from __future__ import annotations

import json
import random
import hashlib
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Optional, Tuple, List, Dict, Callable


# ---------------------------------------------------------------------------
# Edit-distance implementation (standard dynamic-programming Levenshtein)
# ---------------------------------------------------------------------------


def _levenshtein(seq_a: list | str, seq_b: list | str) -> int:
    """Compute the Levenshtein edit distance between two sequences.

    Works on both strings (character-level) and lists (token-level).
    Uses O(min(m, n)) space via a single-row DP approach.
    """
    m, n = len(seq_a), len(seq_b)

    # Ensure seq_a is the shorter sequence for space efficiency.
    if m > n:
        seq_a, seq_b = seq_b, seq_a
        m, n = n, m

    # previous_row[j] = edit distance from seq_a[:0..m] to seq_b[:j]
    previous_row = list(range(n + 1))

    for i in range(1, m + 1):
        current_row = [i] + [0] * n
        for j in range(1, n + 1):
            cost = 0 if seq_a[i - 1] == seq_b[j - 1] else 1
            current_row[j] = min(
                current_row[j - 1] + 1,      # insertion
                previous_row[j] + 1,          # deletion
                previous_row[j - 1] + cost,   # substitution
            )
        previous_row = current_row

    return previous_row[n]


# ---------------------------------------------------------------------------
# Engine adapter contract
# ---------------------------------------------------------------------------


class OCREngine(ABC):
    """Abstract base class for OCR engine adapters.

    Subclasses must implement :meth:`extract` so that the benchmark can
    invoke any registered engine through the same callable shape.

    The return dict shape mirrors the existing ``extract_institution_fields``
    output so that downstream scoring and field extraction can reuse the
    same pipelines without modification.

    **Interface note:** ``extract`` accepts ``image: Any`` because different
    engines accept different input representations (PIL Image, numpy array,
    file path, raw bytes, or plain text for text-based extractors). The
    concrete adapter is responsible for input conversion. For text-only
    synthetic benchmarks the input is a string; for image-level benchmarks
    it would be bytes or a PIL Image.
    """

    engine_name: str = "unknown"
    engine_version: Optional[str] = None
    supported_languages: Tuple[str, ...] = ("en",)

    @abstractmethod
    def extract(self, image: Any) -> dict[str, Any]:
        """Run OCR on *image* and return a dict of extracted fields.

        The returned dict should use the same key set as
        ``extract_institution_fields`` so that structured-field scoring can
        operate on the result directly.

        Parameters
        ----------
        image : Any
            Engine-specific image representation (e.g. PIL Image, numpy array,
            file path, or raw bytes).  The concrete adapter is responsible
            for conversion.

        Returns
        -------
        dict[str, Any]
            Mapping from field name to extracted value.  Confidence, if
            available, should be placed under a ``"confidence"`` key.
        """
        raise NotImplementedError

    # ------------------------------------------------------------------
    # Synthetic document data (text-only; no raster-image generation)
    # ------------------------------------------------------------------

    # Canonical label pool used for deterministic synthetic case generation.
    INSTITUTION_NAMES: Tuple[str, ...] = (
        "Alpha College",
        "Beta University",
        "Example Technical Institute",
        "Example College",
    )
    CERT_NUMBERS: Tuple[str, ...] = ("CERT/2026/0001", "CERT/2026/0099")
    VALID_UNTIL: Tuple[str, ...] = ("2027-04-30", "2028-01-31")
    ACADEMIC_YEARS: Tuple[str, ...] = ("2026/2027", "2025/2026")
    ISSUE_DATES: Tuple[str, ...] = ("2026-04-30", "2025-09-01")

    # -------------------------------------------------------------------------
    # Transcription metrics (using standard Levenshtein edit distance)
    # -------------------------------------------------------------------------

    @staticmethod
    def character_error_rate(reference: str, hypothesis: str) -> float:
        """Character error rate (CER) between *reference* and *hypothesis*.

        Uses standard Levenshtein edit distance divided by the reference
        length. Returns a value where 0 = identical.  CER can exceed 1.0
        when the hypothesis has many insertions beyond the reference length.

        Empty-reference / empty-prediction conventions:

        - Both empty         → 0.0
        - Reference empty     → 1.0
        - Hypothesis empty    → 1.0
        """
        if not reference and not hypothesis:
            return 0.0
        if not reference:
            return 1.0
        if not hypothesis:
            return 1.0
        distance = _levenshtein(reference, hypothesis)
        return distance / len(reference)

    @staticmethod
    def word_error_rate(reference: str, hypothesis: str) -> float:
        """Word error rate (WER) between *reference* and *hypothesis*.

        Splits on whitespace and applies Levenshtein edit distance at the
        token level, divided by the number of reference tokens. Returns
        a value where 0 = identical. WER can exceed 1.0 when the hypothesis
        has many extra tokens.

        Empty-reference / empty-prediction conventions (same as CER):

        - Both empty         → 0.0
        - Reference empty     → 1.0
        - Hypothesis empty    → 1.0
        """
        ref_words = reference.split()
        hyp_words = hypothesis.split()
        if not ref_words and not hyp_words:
            return 0.0
        if not ref_words:
            return 1.0
        if not hyp_words:
            return 1.0
        distance = _levenshtein(ref_words, hyp_words)
        return distance / len(ref_words)

    @staticmethod
    def exact_transcription_rate(reference: str, hypothesis: str) -> float:
        """Exact transcription rate: 1.0 if *reference* equals *hypothesis*, else 0.0."""
        return 1.0 if reference == hypothesis else 0.0

    # -------------------------------------------------------------------------
    # Deterministic synthetic text-dataset generation
    # -------------------------------------------------------------------------

    @staticmethod
    def _rng(seed: Optional[int] = None) -> random.Random:
        """Return a deterministic :class:`random.Random` instance."""
        return random.Random(seed)

    @classmethod
    def generate_synthetic_cases(
        cls,
        count: int = 30,
        *,
        seed: Optional[int] = None,
        languages: Tuple[str, ...] = ("en", "hi"),
    ) -> List[Dict[str, Any]]:
        """Generate *count* labelled synthetic OCR cases.

        Each case is a dict with keys:

        - ``case_id``: stable hash of generation params + index.
        - ``text``: the OCR input string (may include controlled corruption).
        - ``ground_truth``: dict mapping field names to expected values.
        - ``language``: selected from *languages*.
        - ``corruption_type``: one of ``None``, ``blur``, ``skew``,
          ``low_res``, ``compression``, ``low_contrast``, ``spacing``,
          ``latin_hindi_mix``, ``inserted_newline``, ``column_order``.
        - ``dataset_fingerprint``: SHA-256 of the generation seed + count.

        The *text* is constructed from template patterns; corruption is
        injected deterministically (e.g. character substitution, inserted
        newlines, swapped field order) so that ground-truth is known and
        reproducible.

        No raster images are produced — the ``text`` field is the OCR input
        that would be fed to an engine.  Real-image generation would require
        Pillow / ReportLab / a canvas library, which are optional dependencies.

        Returns
        -------
        list[dict[str, Any]]
            List of synthetic case dicts as described above.
        """
        rng = cls._rng(seed)
        cases: List[Dict[str, Any]] = []
        institution_names = cls.INSTITUTION_NAMES
        cert_numbers = cls.CERT_NUMBERS
        valid_until = cls.VALID_UNTIL
        academic_years = cls.ACADEMIC_YEARS
        issue_dates = cls.ISSUE_DATES

        corruption_types: List[Optional[str]] = [
            None,
            "blur",
            "skew",
            "low_res",
            "compression",
            "low_contrast",
            "spacing",
            "latin_hindi_mix",
            "inserted_newline",
            "column_order",
        ]

        dataset_fp = hashlib.sha256(
            f"{seed}:{count}".encode()
        ).hexdigest()[:16]

        for i in range(count):
            lang = languages[rng.randint(0, len(languages) - 1)]

            # Pick a canonical template and inject corruption.
            template_idx = rng.randint(0, len(institution_names) - 1)
            institution = institution_names[template_idx]
            cert = cert_numbers[rng.randint(0, len(cert_numbers) - 1)]
            vu = valid_until[rng.randint(0, len(valid_until) - 1)]
            ay = academic_years[rng.randint(0, len(academic_years) - 1)]
            idate = issue_dates[rng.randint(0, len(issue_dates) - 1)]

            corruption = corruption_types[i % len(corruption_types)]

            # Build a clean base text, then apply corruption.
            if lang == "hi" or rng.random() < 0.5:
                # Hindi-mixed pattern
                base = (
                    f"शैक्षणिक सत्र: {ay}\n"
                    f"प्रमाणपत्र संख्या: {cert}\n"
                    f"मान्यता तक: {vu}\n"
                    f"जारी करने की तिथि: {idate}\n"
                    f"Institut: {institution}"
                )
                if corruption == "inserted_newline":
                    base = base.replace("जारी करने की तिथि:", "जारी करने की तिथि:\n")
                elif corruption == "column_order":
                    base = (
                        f"शैक्षणिक सत्र: {ay}\n"
                        f"प्रमाणपत्र संख्या: {cert}\n"
                        f"जारी करने की तिथि: {idate}\n"
                        f"Institut: {institution}"
                    )
                elif corruption == "latin_hindi_mix":
                    base = base.replace("Institut:", "Insti4tute:")
            else:
                # English pattern
                base = (
                    f"Academic Year: {ay}\n"
                    f"Certificate Number: {cert}\n"
                    f"Valid Until: {vu}\n"
                    f"Issue Date: {idate}\n"
                    f"Institution: {institution}"
                )
                if corruption == "inserted_newline":
                    base = base.replace("Valid Until:", "Valid Until:\n")
                elif corruption == "column_order":
                    base = (
                        f"Academic Year: {ay}\n"
                        f"Certificate Number: {cert}\n"
                        f"Issue Date: {idate}\n"
                        f"Institution: {institution}"
                    )
                elif corruption == "latin_hindi_mix":
                    base = base.replace("Institution:", "Insti4tute:")

            # Deterministic case ID from seed and index
            case_id = hashlib.sha256(
                f"{seed}:{i}".encode()
            ).hexdigest()[:12]

            cases.append(
                {
                    "case_id": case_id,
                    "text": base,
                    "ground_truth": {
                        "academic_year": ay,
                        "certificate_number": cert,
                        "valid_until": vu,
                        "issue_date": idate,
                        "institution_name": institution,
                    },
                    "language": lang,
                    "corruption_type": corruption,
                    "dataset_fingerprint": dataset_fp,
                }
            )

        return cases

    # -------------------------------------------------------------------------
    # Corpus / dataset management
    # -------------------------------------------------------------------------

    @staticmethod
    def load_corpus(path: str | Path) -> List[Dict[str, Any]]:
        """Load a JSONL corpus from *path*.

        Unlike the canonical evaluator (``ai/evaluate_extraction.py``), this
        method performs basic validation:

        - Raises ``FileNotFoundError`` for a missing path.
        - Raises ``ValueError`` for malformed JSON lines.
        - Raises ``ValueError`` for duplicate ``case_id`` values.
        - Raises ``ValueError`` for an empty corpus.

        Returns
        -------
        list[dict[str, Any]]
            List of case dicts read from the file.
        """
        p = Path(path)
        if not p.is_file():
            raise FileNotFoundError(f"corpus not found: {path}")

        cases: List[Dict[str, Any]] = []
        seen_ids: set[str] = set()

        with p.open("r", encoding="utf-8") as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    record = json.loads(line)
                except json.JSONDecodeError as exc:
                    raise ValueError(
                        f"{path} line {line_num}: malformed JSON: {exc}"
                    ) from exc

                if not isinstance(record, dict):
                    raise ValueError(
                        f"{path} line {line_num}: record must be a JSON object, "
                        f"got {type(record).__name__}"
                    )

                case_id = record.get("case_id")
                if case_id is not None:
                    if not isinstance(case_id, str) or not case_id:
                        raise ValueError(
                            f"{path} line {line_num}: case_id must be a non-empty string"
                        )
                    if case_id in seen_ids:
                        raise ValueError(
                            f"{path} line {line_num}: duplicate case_id '{case_id}'"
                        )
                    seen_ids.add(case_id)

                cases.append(record)

        if not cases:
            raise ValueError(f"corpus is empty: {path}")

        return cases

    @staticmethod
    def write_jsonl(cases: List[Dict[str, Any]], path: str | Path) -> None:
        """Write *cases* to a JSONL file at *path*.

        Parameters
        ----------
        cases : list[dict[str, Any]]
            Case dicts to write.
        path : str | Path
            Output file path.
        """
        with open(path, "w", encoding="utf-8") as f:
            for case in cases:
                f.write(json.dumps(case, ensure_ascii=False) + "\n")

    @staticmethod
    def corpus_fingerprint(cases: List[Dict[str, Any]]) -> str:
        """Compute a SHA-256 fingerprint of the corpus content.

        The fingerprint is computed over the serialized case dicts so that
        any change to case content, order, or count produces a different hash.
        """
        h = hashlib.sha256()
        for case in cases:
            h.update(json.dumps(case, sort_keys=True, ensure_ascii=False).encode())
        return h.hexdigest()

    # -------------------------------------------------------------------------
    # Integration with existing extraction evaluator
    # -------------------------------------------------------------------------

    def score_transcription(
        self,
        cases: List[Dict[str, Any]],
        *,
        reference_key: str = "ground_truth",
        prediction_key: str = "predicted_text",
    ) -> Dict[str, float]:
        """Compute aggregate transcription metrics across *cases*.

        Both *reference_key* and *prediction_key* must point to **string**
        values for transcription scoring (character and word comparison).
        For structured-field scoring, use :meth:`score_structured_fields`.

        Returns a dict with keys:

        - ``"cer"``: mean character error rate.
        - ``"wer"``: mean word error rate.
        - ``"exact"``: mean exact transcription rate.
        - ``"samples"``: number of cases processed.

        Parameters
        ----------
        cases : list[dict[str, Any]]
            Cases must contain the *reference_key* (ground-truth text) and
            *prediction_key* (engine-predicted text).
        reference_key : str, optional
            Key in each case dict for the ground-truth text.
        prediction_key : str, optional
            Key in each case dict for the engine-predicted text.

        Returns
        -------
        dict[str, float]
            Aggregate metrics.
        """
        n = len(cases)
        if n == 0:
            return {"cer": 0.0, "wer": 0.0, "exact": 0.0, "samples": 0}

        cers: List[float] = []
        wers: List[float] = []
        exacts: List[float] = []

        for case in cases:
            ref = case.get(reference_key, "")
            hyp = case.get(prediction_key, "")
            # Coerce to strings for transcription scoring
            if not isinstance(ref, str):
                ref = ""
            if not isinstance(hyp, str):
                hyp = ""
            cers.append(self.character_error_rate(ref, hyp))
            wers.append(self.word_error_rate(ref, hyp))
            exacts.append(self.exact_transcription_rate(ref, hyp))

        return {
            "cer": sum(cers) / n,
            "wer": sum(wers) / n,
            "exact": sum(exacts) / n,
            "samples": n,
        }

    def score_structured_fields(
        self,
        cases: List[Dict[str, Any]],
        extractor: Callable[[str], dict[str, Any]],
        *,
        field_keys: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Score structured-field extraction across *cases* using *extractor*.

        The *extractor* callable must accept a **string** (the ``text``
        field from each case) and return a dict of extracted field values,
        matching the schema of ``extract_institution_fields``.

        Returns per-field precision, recall, F1, and a summary of errors.

        Parameters
        ----------
        cases : list[dict[str, Any]]
            Cases with ``ground_truth`` dicts and ``text`` strings.
        extractor : callable
            Function that takes a text string and returns extracted fields.
        field_keys : list[str], optional
            Which fields to score.  If ``None``, defaults to the standard
            institution fields.

        Returns
        -------
        dict[str, Any]
            Metrics dict with per-field and aggregate results.
        """
        if field_keys is None:
            field_keys = [
                "institution_name",
                "certificate_number",
                "valid_until",
                "issue_date",
                "academic_year",
            ]

        # Initialise counters.
        field_tp: Dict[str, int] = {k: 0 for k in field_keys}
        field_fp: Dict[str, int] = {k: 0 for k in field_keys}
        field_fn: Dict[str, int] = {k: 0 for k in field_keys}
        field_cm: Dict[str, Dict[str, int]] = {
            k: {"tp": 0, "fp": 0, "fn": 0, "wrong_value": 0} for k in field_keys
        }
        total_tp = 0
        total_fn = 0
        total_fp = 0
        errors: List[Dict[str, Any]] = []

        for case in cases:
            gt = case.get("ground_truth", {})
            text = case.get("text", "")
            predicted = extractor(text)

            for fld in field_keys:
                gt_val = gt.get(fld)
                pd_val = predicted.get(fld)

                if gt_val is None and pd_val is None:
                    # Both missing → true negative, skip.
                    continue

                if gt_val is not None and pd_val is not None and str(gt_val) == str(pd_val):
                    # Exact match.
                    field_tp[fld] += 1
                    field_cm[fld]["tp"] += 1
                    total_tp += 1
                elif gt_val is not None and pd_val is not None:
                    # Both present but different → wrong value.
                    field_fp[fld] += 1
                    field_fn[fld] += 1
                    total_fp += 1
                    total_fn += 1
                    field_cm[fld]["wrong_value"] += 1
                    errors.append(
                        {
                            "case_id": case.get("case_id", "?"),
                            "field": fld,
                            "expected": gt_val,
                            "got": pd_val,
                        }
                    )
                elif pd_val is not None:
                    # Spurious extraction → false positive.
                    field_fp[fld] += 1
                    total_fp += 1
                    field_cm[fld]["fp"] += 1
                    errors.append(
                        {
                            "case_id": case.get("case_id", "?"),
                            "field": fld,
                            "unexpected": pd_val,
                        }
                    )
                else:
                    # Missing extraction → false negative.
                    field_fn[fld] += 1
                    total_fn += 1
                    field_cm[fld]["fn"] += 1
                    errors.append(
                        {
                            "case_id": case.get("case_id", "?"),
                            "field": fld,
                            "missing": True,
                        }
                    )

        # Compute per-field precision, recall, F1.
        field_metrics: Dict[str, Dict[str, float]] = {}
        for fld in field_keys:
            tp = field_tp[fld]
            fp = field_fp[fld]
            fn = field_fn[fld]

            precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            f1 = (
                2 * precision * recall / (precision + recall)
                if (precision + recall) > 0
                else 0.0
            )

            field_metrics[fld] = {
                "precision": round(precision, 4),
                "recall": round(recall, 4),
                "f1": round(f1, 4),
                "tp": tp,
                "fp": fp,
                "fn": fn,
            }

        # Aggregate metrics from aggregate counts, not from a single field.
        agg_precision = (
            total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0.0
        )
        agg_recall = (
            total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0.0
        )
        agg_f1 = (
            2 * agg_precision * agg_recall / (agg_precision + agg_recall)
            if (agg_precision + agg_recall) > 0
            else 0.0
        )

        aggregate = {
            "precision": round(agg_precision, 4),
            "recall": round(agg_recall, 4),
            "f1": round(agg_f1, 4),
            "total_tp": total_tp,
            "total_fp": total_fp,
            "total_fn": total_fn,
            "total_errors": len(errors),
        }

        return {
            "field_metrics": field_metrics,
            "aggregate": aggregate,
            "errors": errors,
        }

    # -------------------------------------------------------------------------
    # Mock-based contract tests (engine-agnostic)
    # -------------------------------------------------------------------------

    def test_engine_contract(self, engine: OCREngine) -> List[Dict[str, Any]]:
        """Run a minimal contract test suite against *engine*.

        Checks that the engine's ``extract`` method:

        1. Returns a dict (never ``None``).
        2. Contains only string values (or None).
        3. Does not raise on a synthetic text input (passed as ``str``).

        Returns a list of test result dicts, each with keys:

        - ``"passed"``: bool
        - ``"detail"``: human-readable description
        - ``"engine"``: engine name
        - ``"case_id"``: the test case used
        """
        results: List[Dict[str, Any]] = []

        test_inputs: List[str] = [
            "Institution Name: Alpha College",
            "Certificate Number: CERT/2026/0099",
            "Valid Until: 2027-04-30",
            "Academic Year: 2026/2027",
            "Issue Date: 2026-04-30",
            "",  # empty input
        ]

        for idx, text in enumerate(test_inputs):
            case_id = f"contract_{idx}"
            try:
                result = engine.extract(text)
            except Exception as e:
                results.append(
                    {
                        "passed": False,
                        "detail": f"extract() raised {type(e).__name__}: {e}",
                        "engine": engine.engine_name,
                        "case_id": case_id,
                    }
                )
                continue

            # Check: result is a dict
            if not isinstance(result, dict):
                results.append(
                    {
                        "passed": False,
                        "detail": (
                            f"extract() returned {type(result).__name__}, "
                            "expected dict"
                        ),
                        "engine": engine.engine_name,
                        "case_id": case_id,
                    }
                )
                continue

            # Check: all values are strings or None
            bad_vals = [
                (k, v)
                for k, v in result.items()
                if v is not None and not isinstance(v, str)
            ]
            if bad_vals:
                k, v = bad_vals[0]
                results.append(
                    {
                        "passed": False,
                        "detail": f"extract()[{k!r}] = {v!r} is not str or None",
                        "engine": engine.engine_name,
                        "case_id": case_id,
                    }
                )
                continue

            results.append(
                {
                    "passed": True,
                    "detail": f"extract() returned dict with keys {sorted(result.keys())}",
                    "engine": engine.engine_name,
                    "case_id": case_id,
                }
            )

        return results

    # -------------------------------------------------------------------------
    # Convenience: synthetic case → predicted_text mapping
    # -------------------------------------------------------------------------

    def case_to_prediction_input(self, case: Dict[str, Any]) -> str:
        """Return the text that should be passed to an engine's ``extract``.

        By default this is the case's ``text`` field.  Subclasses may
        override to apply preprocessing or format conversion.
        """
        return case.get("text", "")

    # -------------------------------------------------------------------------
    # Held-out partition helpers
    # -------------------------------------------------------------------------

    @staticmethod
    def split_into_held_out(
        cases: List[Dict[str, Any]],
        hold_out_fraction: float = 0.2,
        *,
        seed: Optional[int] = None,
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Split *cases* into development and held-out partitions.

        The split is deterministic given *seed*.  Cases are shuffled using
        the seed before splitting.

        Parameters
        ----------
        cases : list[dict[str, Any]]
            Cases to split.
        hold_out_fraction : float
            Fraction of cases to hold out (0.0 to 1.0 exclusive).
        seed : int, optional
            Random seed for reproducibility.

        Returns
        -------
        (development, held_out) : tuple of list[dict]

        Raises
        ------
        ValueError
            If *hold_out_fraction* is outside (0, 1) or there are fewer
            than 2 cases to split.
        """
        if not 0.0 < hold_out_fraction < 1.0:
            raise ValueError(
                f"hold_out_fraction must be between 0 and 1 exclusive, "
                f"got {hold_out_fraction}"
            )
        if len(cases) < 2:
            raise ValueError(
                f"need at least 2 cases to split, got {len(cases)}"
            )

        rng = random.Random(seed)
        shuffled = list(cases)
        rng.shuffle(shuffled)

        n_hold = max(1, int(len(shuffled) * hold_out_fraction))
        held_out = shuffled[:n_hold]
        development = shuffled[n_hold:]
        return development, held_out

    @staticmethod
    def check_partition_integrity(
        development: List[Dict[str, Any]],
        held_out: List[Dict[str, Any]],
    ) -> List[str]:
        """Check that development and held-out partitions share no case IDs.

        Also checks for template leakage: warns if the same
        ``(corruption_type, dataset_fingerprint)`` pair appears in both
        partitions when the case count is small enough that this matters.

        Returns a list of warning strings (empty if integrity is sound).
        """
        warnings: List[str] = []

        dev_ids = {c["case_id"] for c in development if "case_id" in c}
        hold_ids = {c["case_id"] for c in held_out if "case_id" in c}
        overlap = dev_ids & hold_ids
        if overlap:
            warnings.append(
                f"Case ID overlap between partitions: {sorted(overlap)[:10]}"
            )

        # Check for template-level leakage: same text appearing in both.
        dev_texts = {c.get("text", "") for c in development}
        hold_texts = {c.get("text", "") for c in held_out}
        text_overlap = dev_texts & hold_texts
        if text_overlap:
            warnings.append(
                f"Identical text found in both partitions: "
                f"{len(text_overlap)} case(s)"
            )

        return warnings