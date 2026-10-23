"""Tests for the raster image OCR benchmark module (ai/raster_benchmark.py).

Covers:
  - Genuine pixel modification by all supported corruptions.
  - Synthetic document generation across languages and layouts.
  - Traceability and pairing of clean and corrupted images.
  - Transcription and structured-field metrics calculation.
  - Real Tesseract engine availability detection.
  - Mock engine calibration and degradation delta measurement.
  - Machine-readable benchmark report generation and CLI execution.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ai.raster_benchmark import (  # noqa: E402
    MockRasterOCREngine,
    RasterBenchmarkScorer,
    RasterDocumentGenerator,
    RealTesseractEngine,
    SUPPORTED_IMAGE_CORRUPTIONS,
    apply_gaussian_blur,
    apply_jpeg_compression,
    apply_low_contrast,
    apply_low_resolution,
    apply_noise,
    apply_raster_corruption,
    apply_rotation,
    apply_skew,
    character_error_rate,
    word_error_rate,
)


# ---------------------------------------------------------------------------
# Test Pixel Transformations
# ---------------------------------------------------------------------------


class TestPixelTransformations:
    @classmethod
    def _create_sample_image(cls) -> Image.Image:
        img = Image.new("RGB", (300, 100), "white")
        # Draw some high-contrast black shapes and lines so transforms alter pixels
        for x in range(30, 270, 20):
            for y in range(20, 80):
                img.putpixel((x, y), (0, 0, 0))
        return img

    def test_gaussian_blur_modifies_pixels(self):
        original = self._create_sample_image()
        blurred = apply_gaussian_blur(original, radius=2.0)
        assert blurred.tobytes() != original.tobytes()
        assert blurred.size == original.size

    def test_skew_modifies_pixels(self):
        original = self._create_sample_image()
        skewed = apply_skew(original, angle_degrees=4.0)
        assert skewed.tobytes() != original.tobytes()
        assert skewed.size == original.size

    def test_low_resolution_modifies_pixels(self):
        original = self._create_sample_image()
        low_res = apply_low_resolution(original, scale_factor=0.3)
        assert low_res.tobytes() != original.tobytes()
        assert low_res.size == original.size

    def test_jpeg_compression_modifies_pixels(self):
        original = self._create_sample_image()
        compressed = apply_jpeg_compression(original, quality=10)
        assert compressed.tobytes() != original.tobytes()
        assert compressed.size == original.size

    def test_low_contrast_modifies_pixels(self):
        original = self._create_sample_image()
        faded = apply_low_contrast(original, factor=0.2)
        assert faded.tobytes() != original.tobytes()
        assert faded.size == original.size

    def test_noise_modifies_pixels(self):
        original = self._create_sample_image()
        noisy = apply_noise(original, intensity=0.08, seed=42)
        assert noisy.tobytes() != original.tobytes()
        assert noisy.size == original.size

    def test_noise_is_deterministic_with_seed(self):
        original = self._create_sample_image()
        noisy1 = apply_noise(original, intensity=0.05, seed=99)
        noisy2 = apply_noise(original, intensity=0.05, seed=99)
        assert noisy1.tobytes() == noisy2.tobytes()

    def test_rotation_modifies_pixels_and_dimensions(self):
        original = self._create_sample_image()  # 300 x 100
        rotated = apply_rotation(original, degrees=90)
        assert rotated.tobytes() != original.tobytes()
        # 90-degree expansion swaps width and height
        assert rotated.size == (100, 300)

    def test_all_supported_corruptions_modify_pixels(self):
        original = self._create_sample_image()
        for corr_type in SUPPORTED_IMAGE_CORRUPTIONS:
            if corr_type == "none":
                continue
            corrupted, meta = apply_raster_corruption(original, corr_type, params={"seed": 123})
            assert corrupted.tobytes() != original.tobytes(), f"{corr_type} failed to modify pixels"
            assert meta["corruption_type"] == corr_type


# ---------------------------------------------------------------------------
# Test Document Image Generation
# ---------------------------------------------------------------------------


class TestRasterDocumentGeneration:
    def test_generate_english_certificate(self):
        doc = RasterDocumentGenerator.generate_document(
            case_idx=1, language="en", layout="certificate", seed=42
        )
        assert isinstance(doc["image"], Image.Image)
        assert doc["image"].size == (1200, 600)
        assert "ALL INDIA COUNCIL" in doc["transcription_ground_truth"]
        assert doc["ground_truth"]["certificate_number"] == "CERT/2026/0002"
        assert doc["language"] == "en"

    def test_generate_hindi_certificate(self):
        doc = RasterDocumentGenerator.generate_document(
            case_idx=2, language="hi", layout="certificate", seed=42
        )
        assert isinstance(doc["image"], Image.Image)
        assert "अखिल भारतीय तकनीकी शिक्षा परिषद" in doc["transcription_ground_truth"]
        assert "शैक्षणिक सत्र" in doc["transcription_ground_truth"]
        assert doc["language"] == "hi"

    def test_generate_bilingual_certificate(self):
        doc = RasterDocumentGenerator.generate_document(
            case_idx=3, language="bilingual", layout="certificate", seed=42
        )
        assert "AICTE APPROVAL" in doc["transcription_ground_truth"]
        assert doc["language"] == "bilingual"

    def test_generate_two_column_layout(self):
        doc = RasterDocumentGenerator.generate_document(
            case_idx=4, language="en", layout="two_column", seed=42
        )
        assert "AICTE SUMMARY VERIFICATION TABLE" in doc["transcription_ground_truth"]
        assert "Institution Name:" in doc["transcription_ground_truth"]
        assert doc["layout"] == "two_column"

    def test_deterministic_generation_with_seed(self):
        doc1 = RasterDocumentGenerator.generate_document(case_idx=5, seed=100)
        doc2 = RasterDocumentGenerator.generate_document(case_idx=5, seed=100)
        assert doc1["ground_truth"] == doc2["ground_truth"]
        assert doc1["transcription_ground_truth"] == doc2["transcription_ground_truth"]
        assert doc1["image"].tobytes() == doc2["image"].tobytes()


# ---------------------------------------------------------------------------
# Test Dataset Generation & Traceability
# ---------------------------------------------------------------------------


class TestBenchmarkDataset:
    def test_dataset_generation_count_and_keys(self):
        cases = RasterDocumentGenerator.generate_benchmark_dataset(count=8, seed=42)
        assert len(cases) == 8

        required_keys = {
            "case_id",
            "language",
            "layout",
            "corruption_type",
            "corruption_params",
            "clean_image_bytes",
            "corrupted_image_bytes",
            "ground_truth",
            "transcription_ground_truth",
            "dataset_fingerprint",
        }
        for c in cases:
            assert required_keys <= set(c.keys())
            assert isinstance(c["clean_image_bytes"], bytes)
            assert isinstance(c["corrupted_image_bytes"], bytes)
            assert len(c["clean_image_bytes"]) > 0
            assert len(c["corrupted_image_bytes"]) > 0

    def test_clean_vs_corrupted_bytes_differ_for_corruptions(self):
        cases = RasterDocumentGenerator.generate_benchmark_dataset(count=16, seed=42)
        corrupted_cases = [c for c in cases if c["corruption_type"] != "none"]
        assert len(corrupted_cases) > 0
        for c in corrupted_cases:
            assert c["clean_image_bytes"] != c["corrupted_image_bytes"]

    def test_dataset_fingerprint_stability(self):
        cases1 = RasterDocumentGenerator.generate_benchmark_dataset(count=6, seed=77)
        cases2 = RasterDocumentGenerator.generate_benchmark_dataset(count=6, seed=77)
        assert cases1[0]["dataset_fingerprint"] == cases2[0]["dataset_fingerprint"]


# ---------------------------------------------------------------------------
# Test Metrics and Scorer
# ---------------------------------------------------------------------------


class TestRasterScorer:
    def test_perfect_transcription_and_fields(self):
        result = RasterBenchmarkScorer.evaluate_case(
            predicted_text="hello world",
            expected_text="hello world",
            predicted_fields={"inst": "Alpha"},
            expected_fields={"inst": "Alpha"},
        )
        assert result["cer"] == 0.0
        assert result["wer"] == 0.0
        assert result["exact_transcription"] == 1.0
        assert result["f1"] == 1.0
        assert result["tp"] == 1
        assert result["fp"] == 0
        assert result["fn"] == 0

    def test_character_and_word_error_rates(self):
        assert character_error_rate("cat", "cut") == 1 / 3
        assert word_error_rate("the cat sat", "the dog sat") == 1 / 3
        assert character_error_rate("", "") == 0.0
        assert character_error_rate("abc", "") == 1.0

    def test_benchmark_run_with_mock_engine(self):
        cases = RasterDocumentGenerator.generate_benchmark_dataset(count=8, seed=42)
        engine = MockRasterOCREngine()
        report = RasterBenchmarkScorer.run_benchmark(cases, engine)

        assert report["available"] is True
        assert report["engine"] == "mock_calibrated"
        assert report["sample_size"] == 8

        # Clean baseline should have near-perfect accuracy with mock engine
        clean = report["clean_baseline"]
        assert math.isclose(clean["cer"], 0.0, abs_tol=1e-3)
        assert math.isclose(clean["f1"], 1.0, abs_tol=1e-3)

        # Corrupted evaluation should demonstrate measurable degradation
        corrupted = report["corrupted_evaluation"]
        assert corrupted["cer"] > clean["cer"]
        assert corrupted["f1"] < clean["f1"]

        # Delta must reflect positive degradation
        delta = report["degradation_delta"]
        assert delta["cer_increase"] > 0
        assert delta["f1_drop"] > 0

        # Breakdowns must exist
        assert "by_corruption_type" in report
        assert "by_language" in report

    def test_real_tesseract_engine_availability_check(self):
        engine = RealTesseractEngine()
        # On this system tesseract is not in PATH
        if not engine.is_available():
            cases = RasterDocumentGenerator.generate_benchmark_dataset(count=2, seed=42)
            report = RasterBenchmarkScorer.run_benchmark(cases, engine)
            assert report["available"] is False
            assert "unavailable" in report["error"]


# ---------------------------------------------------------------------------
# Test CLI Functionality
# ---------------------------------------------------------------------------


class TestRasterBenchmarkCLI:
    def test_cli_generates_json_report(self, tmp_path):
        json_out = tmp_path / "report.json"
        img_dir = tmp_path / "images"

        import subprocess

        cmd = [
            sys.executable,
            "ai/raster_benchmark.py",
            "--count",
            "4",
            "--seed",
            "123",
            "--json",
            str(json_out),
            "--output-images",
            str(img_dir),
        ]
        res = subprocess.run(cmd, cwd=str(REPO_ROOT), capture_output=True, text=True)
        assert res.returncode == 0, f"CLI failed: {res.stderr}"

        # Verify JSON report
        assert json_out.is_file()
        data = json.loads(json_out.read_text(encoding="utf-8"))
        assert data["sample_size"] == 4
        assert "clean_baseline" in data
        assert "corrupted_evaluation" in data

        # Verify image files
        saved_images = list(img_dir.glob("*.png"))
        assert len(saved_images) == 8  # 4 clean + 4 corrupted
