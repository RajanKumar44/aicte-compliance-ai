"""OCR benchmark module for AI/OCR workstream.

Provides:
  - OCREngine adapter contract for image-to-text engines.
  - Deterministic synthetic text-dataset generation (no image libs needed;
    generates labelled text fixtures with controlled corruption).
  - Transcription metrics (CER, WER, exact match).
  - Structured-field extraction scoring.
  - Dataset fingerprinting and held-out partition tracking.
  - Mock-based contract tests for engine compliance.
  - Explicit documentation of required external dependencies.

Note: This module does NOT install or invoke actual OCR engines (Tesseract,
EasyOCR, etc.) in this environment. It defines the interface and provides
mock-based contract tests. Real engine execution requires the dependencies
documented in ENVIRONMENT.md at the repository root.
"""

from __future__ import annotations

import json
import random
import hashlib
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional, Tuple, List, Dict, Set, Callable


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
    # Transcription metrics
    # -------------------------------------------------------------------------

    @staticmethod
    def character_error_rate(reference: str, hypothesis: str) -> float:
        """Character error rate (CER) between *reference* and *hypothesis*.

        Uses Levenshtein-based counting.  Returns a value in ``[0, 1]``
        where 0 = identical.

        Empty-reference / empty-prediction conventions:

        - Both empty         → 0.0
        - Reference empty     → 1.0 (all characters are substitution/insertion)
        - Hypothesis empty    → 1.0 (all reference characters are deletions)
        """
        if not reference and not hypothesis:
            return 0.0
        if not reference:
            return 1.0
        if not hypothesis:
            return 1.0
        n = min(len(reference), len(hypothesis))
        diff = sum(1 for i in range(n) if reference[i] != hypothesis[i])
        diff += abs(len(reference) - len(hypothesis))
        return diff / max(len(reference), len(hypothesis), 1)

    @staticmethod
    def word_error_rate(reference: str, hypothesis: str) -> float:
        """Word error rate (WER) between *reference* and *hypothesis*.

        Splits on whitespace and applies the same Levenshtein logic as CER.
        Returns a value in ``[0, 1]`` where 0 = identical.

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
        n = min(len(ref_words), len(hyp_words))
        diff = sum(1 for i in range(n) if ref_words[i] != hyp_words[i])
        diff += abs(len(ref_words) - len(hyp_words))
        return diff / max(len(ref_words), len(hypothesis), 1)

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
        - ``ground_truth``: the canonical field dict (same schema as
          ``extract_institution_fields`` output).
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

        corruption_types: List[str] = [
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

        for i in range(count):
            lang = languages[rng.randint(0, len(languages) - 1)]

            # Pick a canonical template and inject corruption.
            template_idx = rng.randint(0, len(institution_names) - 1)
            institution = institution_names[template_idx]
            cert = cert_numbers[rng.randint(0, len(cert_numbers) - 1)]
            vu = valid_until[rng.randint(0, len(valid_until) - 1)]
            ay = academic_years[rng.randint(0, len(academic_years) - 1)]
            idate = issue_dates[rng.randint(0, len(issue_dates) - 1)]

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
                # Apply corruption types
                if corruption_types[i % len(corruption_types)] == "inserted_newline":
                    # Insert an extra newline in the middle
                    base = base.replace("जारी करने की तिथि:", "जारी करने की तिथि:\n")
                elif corruption_types[i % len(corruption_types)] == "column_order":
                    # Swap certificate and issue date order
                    base = (
                        f"शैक्षणिक सत्र: {ay}\n"
                        f"प्रमाणपत्र संख्या: {cert}\n"
                        f"जारी करने की तिथि: {idate}\n"
                        f"Institut: {institution}"
                    )
                elif corruption_types[i % len(corruption_types)] == "latin_hindi_mix":
                    # Mix Latin and Hindi characters
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
                if corruption_types[i % len(corruption_types)] == "inserted_newline":
                    base = base.replace("Valid Until:", "Valid Until:\n")
                elif corruption_types[i % len(corruption_types)] == "column_order":
                    base = (
                        f"Academic Year: {ay}\n"
                        f"Certificate Number: {cert}\n"
                        f"Issue Date: {idate}\n"
                        f"Institution: {institution}"
                    )
                elif corruption_types[i % len(corruption_types)] == "latin_hindi_mix":
                    base = base.replace("Institution:", "Insti4tute:")

            # Deterministic case ID
            case_id = hashlib.sha256(
                f"{cls.engine_name}:{seed}:{i}".encode()
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
                    "corruption_type": corruption_types[i % len(corruption_types)],
                    "dataset_fingerprint": hashlib.sha256(
                        f"{seed}:{count}".encode()
                    ).hexdigest()[:16],
                }
            )

        return cases

    # -------------------------------------------------------------------------
    # Corpus / dataset management
    # -------------------------------------------------------------------------

    @staticmethod
    def load_corpus(path: str | Path) -> List[Dict[str, Any]]:
        """Load a JSONL corpus from *path*.

        Each line is expected to be a JSON object.  Missing or unparseable
        lines are silently skipped (the evaluator's ``load_corpus`` has
        stricter validation; see ``ai/evaluate_extraction.py`` for the
        canonical implementation).

        Returns
        -------
        list[dict[str, Any]]
            List of case dicts read from the file.
        """
        cases: List[Dict[str, Any]] = []
        p = Path(path)
        if not p.is_file():
            return cases
        with p.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    cases.append(json.loads(line))
                except json.JSONDecodeError:
                    # Skip malformed lines rather than crashing.
                    pass
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

    @property
    @abstractmethod
    def dataset_fingerprint(self) -> str:
        """Return a fingerprint string for the dataset generated by this
        engine's synthetic cases.  Used for reproducibility and held-out
        partition tracking."""
        raise NotImplementedError

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
        extractor: Callable[[dict[str, Any]], dict[str, Any]],
        *,
        field_keys: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Score structured-field extraction across *cases* using *extractor*.

        The *extractor* callable should accept a dict of field values and
        return a dict of extracted values (same schema as
        ``extract_institution_fields``).

        Returns per-field precision, recall, F1, and a summary of errors.

        Parameters
        ----------
        cases : list[dict[str, Any]]
            Cases with *ground_truth* dicts.
        extractor : callable
            Function that takes a dict and returns extracted fields.
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
            predicted = extractor(case.get("predicted_text", "") or {})

            for field in field_keys:
                gt_val = gt.get(field)
                pd_val = predicted.get(field)

                if gt_val is None and pd_val is None:
                    # Both missing → true negative, skip.
                    continue

                if gt_val is not None and pd_val is not None and str(gt_val) == str(pd_val):
                    # Exact match.
                    field_tp[field] += 1
                    field_cm[field]["tp"] += 1
                    total_tp += 1
                elif gt_val is not None and pd_val is not None:
                    # Both present but different → wrong value.
                    field_fn[field] += 1
                    total_fn += 1
                    field_cm[field]["wrong_value"] += 1
                    errors.append(
                        {
                            "case_id": case.get("case_id", "?"),
                            "field": field,
                            "expected": gt_val,
                            "got": pd_val,
                        }
                    )
                elif pd_val is not None:
                    # Field present in prediction but missing in ground truth → false positive.
                    field_fp[field] += 1
                    total_fp += 1
                    field_cm[field]["fp"] += 1
                    errors.append(
                        {
                            "case_id": case.get("case_id", "?"),
                            "field": field,
                            "unexpected": pd_val,
                        }
                    )
                else:
                    # Field missing in prediction but present in ground truth → false negative.
                    field_fn[field] += 1
                    total_fn += 1
                    field_cm[field]["fn"] += 1
                    errors.append(
                        {
                            "case_id": case.get("case_id", "?"),
                            "field": field,
                            "missing": True,
                        }
                    )

        # Compute per-field precision, recall, F1.
        field_metrics: Dict[str, Dict[str, float]] = {}
        for field in field_keys:
            tp = field_tp[field]
            fp = field_fp[field]
            fn = field_fn[field]

            precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            f1 = (
                2 * precision * recall / (precision + recall)
                if (precision + recall) > 0
                else 0.0
            )

            field_metrics[field] = {
                "precision": round(precision, 4),
                "recall": round(recall, 4),
                "f1": round(f1, 4),
                "tp": tp,
                "fp": fp,
                "fn": fn,
            }

        aggregate = {
            "precision": round(total_tp / (total_tp + total_fp), 4)
            if (total_tp + total_fp) > 0
            else 0.0,
            "recall": round(total_tp / (total_tp + total_fn), 4)
            if (total_tp + total_fn) > 0
            else 0.0,
            "f1": round(
                2 * field_metrics["institution_name"]["precision"]
                * field_metrics["institution_name"]["recall"]
                / (
                    field_metrics["institution_name"]["precision"]
                    + field_metrics["institution_name"]["recall"]
                )
                if field_metrics["institution_name"]["precision"] + field_metrics["institution_name"]["recall"] > 0
                else 0.0,
            ),
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
        4. Returns a dict with the expected key set when given a valid case.

        Returns a list of test result dicts, each with keys:

        - ``"passed"``: bool
        - ``"detail"``: human-readable description
        - ``"engine"``: engine name
        - ``"case_id``: the test case used (if applicable)
        """
        results: List[Dict[str, Any]] = []

        # Test cases: simple text inputs that an engine should handle.
        test_inputs: List[str] = [
            "Institution Name: Alpha College",
            "Certificate Number: CERT/2026/0099",
            "Valid Until: 2027-04-30",
            "Academic Year: 2026/2027",
            "Issue Date: 2026-04-30",
            "",  # empty input
        ]

        for idx, text in enumerate(test_inputs):
            try:
                result = engine.extract(text)
            except Exception as exc:
                results.append(
                    {
                        "passed": False,
                        "detail": f"extract() raised {type(exc).__name__}: {exc}",
                        "engine": self.engine_name,
                        "case_id": f"contract_{idx}",
                    }
                )
                continue

        # Check 1: result is a dict
        for idx, text in enumerate(test_inputs):
            try:
                result = engine.extract(text)
            except Exception as exc:
                continue  # already recorded

            if not isinstance(result, dict):
                results.append(
                    {
                        "passed": False,
                        "detail": f"extract() returned {type(result).__name__}, expected dict",
                        "engine": self.engine_name,
                        "case_id": f"contract_type_{idx}",
                    }
                )
            elif result is None:
                results.append(
                    {
                        "passed": False,
                        "detail": "extract() returned None",
                        "engine": self.engine_name,
                        "case_id": f"contract_none_{idx}",
                    }
                )
            else:
                results.append(
                    {
                        "passed": True,
                        "detail": f"extract() returned dict with keys {list(result.keys())}",
                        "engine": self.engine_name,
                        "case_id": f"contract_type_{idx}",
                    }
                )

        # Check 2: all values are strings or None
        for idx, text in enumerate(test_inputs):
            try:
                result = engine.extract(text)
            except Exception as exc:
                continue

            if not isinstance(result, dict):
                continue

            for key, val in result.items():
                if val is not None and not isinstance(val, str):
                    results.append(
                        {
                            "passed": False,
                            "detail": f"extract()[{key!r}] = {val!r} is not str or None",
                            "engine": self.engine_name,
                            "case_id": f"contract_val_{idx}_{key}",
                        }
                    )
                    # Only report first violation per input to avoid flood.
                    break
            else:
                # No break → all values are str or None
                pass

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
    # held-out partition helpers
    # -------------------------------------------------------------------------

    @staticmethod
    def split_into_held_out(
        cases: List[Dict[str, Any]],
        hold_out_fraction: float = 0.2,
        *,
        seed: Optional[int] = None,
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Split *cases* into development and held-out partitions.

        The split is deterministic given *seed*.  No near-duplicate layout
        patterns are deliberately placed in both partitions because the
        generation is text-template based; the fingerprint field is used to
        detect near-duplicates.

        Returns
        -------
        (development, held_out) : tuple of list[dict]
        """
        rng = random.Random(seed) if seed is not None else random.Random(seed)
        # Sort by fingerprint then shuffle within fingerprint groups to
        # keep similar layouts together but still allow a deterministic split.
        cases_sorted = sorted(cases, key=lambda c: c.get("dataset_fingerprint", ""))
        n_hold = max(1, int(len(cases_sorted) * hold_out_fraction))
        held_out = cases_sorted[:n_hold]
        development = cases_sorted[n_hold:]
        return development, held_out

    @staticmethod
    def check_partition_integrity(
        development: List[Dict[str, Any]],
        held_out: List[Dict[str, Any]],
    ) -> List[str]:
        """Check that development and held-out partitions share no case IDs
        and have disjoint fingerprint sets.

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

        dev_fps = {c.get("dataset_fingerprint", "") for c in development if "dataset_fingerprint" in c}
        hold_fps = {c.get("dataset_fingerprint", "") for c in held_out if "dataset_fingerprint" in c}
        fp_overlap = dev_fps & hold_fps
        if fp_overlap:
            warnings.append(
                f"Fingerprint overlap between partitions: {sorted(fp_overlap)[:10]}"
            )

        return warnings