import json
from pathlib import Path

from backend.app.ocr_pipeline import extract_institution_fields


FIXTURE_PATH = Path(__file__).parent / "fixtures" / "institution_ocr_cases.jsonl"


def test_synthetic_institution_ocr_corpus():
    cases = [json.loads(line) for line in FIXTURE_PATH.read_text().splitlines() if line.strip()]
    assert len(cases) >= 7
    for case in cases:
        extracted = extract_institution_fields(case["text"])
        actual = {key: field.value for key, field in extracted.items()}
        assert actual == case["expected_fields"], case["case_id"]
