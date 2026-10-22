"""Local-only CLI for reviewing OCR extraction on a document image.

Usage from the repository root:
    python -m backend.app.ocr_cli path/to/synthetic-document.png --language eng

This tool reads a local file and writes advisory extracted fields to stdout.
It does not upload, persist, authenticate or decide regulatory compliance.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from backend.app.ocr_pipeline import (
    MAX_UPLOAD_BYTES,
    TesseractOCRAdapter,
    process_institution_document,
)


def _result_payload(result: object) -> dict:
    return {
        "engine": result.engine,
        "engine_version": result.engine_version,
        "source_sha256": result.source_sha256,
        "requires_human_review": result.requires_human_review,
        "fields": {
            key: {
                "value": field.value,
                "confidence": field.confidence,
                "page_number": field.page_number,
                "evidence_text": field.evidence_text,
            }
            for key, field in result.fields.items()
        },
        "warnings": list(result.warnings),
        "notice": "OCR output is advisory; verify all values against the original document.",
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run local advisory OCR on an institutional document image.")
    parser.add_argument("image", type=Path, help="Path to a local PNG/JPEG/TIFF/WEBP image")
    parser.add_argument("--language", default="eng", help="Installed Tesseract language code, e.g. eng or hin+eng")
    parser.add_argument("--max-bytes", type=int, default=MAX_UPLOAD_BYTES, help="Maximum image bytes (capped at 10 MiB)")
    args = parser.parse_args(argv)

    if not 1 <= args.max_bytes <= MAX_UPLOAD_BYTES:
        parser.error("--max-bytes must be between 1 and 10485760")
    try:
        if not args.image.is_file():
            raise ValueError("image path must point to an existing regular file")
        if args.image.stat().st_size > args.max_bytes:
            raise ValueError("image exceeds the configured byte limit")
        image_bytes = args.image.read_bytes()
        result = process_institution_document(
            image_bytes,
            TesseractOCRAdapter(language=args.language, max_bytes=args.max_bytes),
        )
    except (OSError, ValueError, RuntimeError) as exc:
        print(f"OCR failed: {exc}", file=sys.stderr)
        return 2

    print(json.dumps(_result_payload(result), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
