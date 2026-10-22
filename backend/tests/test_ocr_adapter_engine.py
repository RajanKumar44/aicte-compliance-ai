"""Adapter-level regression tests for optional Tesseract handling.

A stub ``pytesseract`` module is injected, so these tests exercise our own error
mapping and result validation only. They are not a real-engine or accuracy test;
that smoke test lives in ``test_ocr_engine_integration.py``.
"""
from __future__ import annotations

import io
import sys
import types

import pytest
from PIL import Image

from backend.app.ocr_pipeline import OCRInputError, TesseractOCRAdapter


def image_bytes(format_name: str = "PNG", size: tuple[int, int] = (80, 60)) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", size, "white").save(buffer, format=format_name)
    return buffer.getvalue()


@pytest.fixture
def install_stub(monkeypatch):
    def install(**overrides):
        module = types.ModuleType("pytesseract")
        module.Output = types.SimpleNamespace(DICT="dict")
        module.get_tesseract_version = lambda: "5.3.0"
        module.image_to_data = lambda *args, **kwargs: {
            "text": [],
            "conf": [],
            "page_num": [],
            "line_num": [],
        }
        for name, value in overrides.items():
            setattr(module, name, value)
        monkeypatch.setitem(sys.modules, "pytesseract", module)
        return module

    return install


def test_non_finite_negative_and_malformed_confidence_is_dropped(install_stub):
    install_stub(
        image_to_data=lambda *args, **kwargs: {
            "text": ["Institution", "Name:", "Example", "College", "Extra"],
            "conf": [float("nan"), float("inf"), "-1", "55", "not-a-number"],
            "page_num": [1, 1, 1, 1, 1],
            "line_num": [1, 1, 1, 1, 1],
        }
    )

    result = TesseractOCRAdapter().recognize(image_bytes())

    assert [(word.text, word.confidence) for word in result.words] == [("College", 0.55)]
    assert result.engine == "tesseract"
    assert result.engine_version == "5.3.0"


def test_out_of_range_engine_confidence_is_clamped_to_contract(install_stub):
    install_stub(
        image_to_data=lambda *args, **kwargs: {
            "text": ["Institution"],
            "conf": ["150"],
            "page_num": [1],
            "line_num": [1],
        }
    )

    result = TesseractOCRAdapter().recognize(image_bytes())

    assert result.words[0].confidence == 1.0


def test_malformed_page_and_line_numbers_fall_back_to_one(install_stub):
    install_stub(
        image_to_data=lambda *args, **kwargs: {
            "text": ["Institution"],
            "conf": ["90"],
            "page_num": ["bad"],
            "line_num": [None],
        }
    )

    result = TesseractOCRAdapter().recognize(image_bytes())

    assert (result.words[0].page_number, result.words[0].line_number) == (1, 1)


def test_truncated_image_is_an_input_error_and_never_reaches_the_engine(install_stub):
    calls: list[int] = []
    install_stub(image_to_data=lambda *args, **kwargs: calls.append(1) or {})

    payload = image_bytes("JPEG", (200, 200))
    truncated = payload[: len(payload) // 2]

    with pytest.raises(OCRInputError, match="decoded safely"):
        TesseractOCRAdapter().recognize(truncated)

    assert calls == []


def test_engine_failure_is_reported_as_engine_failure_not_input_error(install_stub):
    def boom(*args, **kwargs):
        raise RuntimeError("tesseract binary unavailable")

    install_stub(image_to_data=boom)

    with pytest.raises(RuntimeError, match="Tesseract OCR failed"):
        TesseractOCRAdapter().recognize(image_bytes())


@pytest.mark.parametrize("language", ["", "e", "en g", "../eng", "eng;rm -rf /"])
def test_adapter_rejects_unsafe_language_codes(language):
    with pytest.raises(ValueError, match="language"):
        TesseractOCRAdapter(language=language)
