import json

from backend.app import ocr_cli
from backend.app.ocr_adapter import OCRDocumentResult, OCRField


def test_cli_processes_local_image_and_emits_advisory_json(tmp_path, monkeypatch, capsys):
    image_path = tmp_path / "synthetic.png"
    image_path.write_bytes(b"synthetic image bytes")
    captured = {}

    class FakeAdapter:
        def __init__(self, language, max_bytes):
            captured["language"] = language
            captured["max_bytes"] = max_bytes

    result = OCRDocumentResult(
        fields={"institution_name": OCRField("Example Institute", 0.9, 1, "Institution Name: Example Institute")},
        engine="fake-engine",
        engine_version="1.0",
        source_sha256="a" * 64,
    )

    def fake_process(payload, engine):
        captured["payload"] = payload
        captured["engine"] = engine
        return result

    monkeypatch.setattr(ocr_cli, "TesseractOCRAdapter", FakeAdapter)
    monkeypatch.setattr(ocr_cli, "process_institution_document", fake_process)

    assert ocr_cli.main([str(image_path), "--language", "eng"]) == 0
    output = json.loads(capsys.readouterr().out)
    assert output["requires_human_review"] is True
    assert output["fields"]["institution_name"]["value"] == "Example Institute"
    assert output["notice"].startswith("OCR output is advisory")
    assert captured["payload"] == b"synthetic image bytes"
    assert captured["language"] == "eng"


def test_cli_rejects_missing_local_file(tmp_path, capsys):
    missing = tmp_path / "missing.png"
    assert ocr_cli.main([str(missing)]) == 2
    assert "existing regular file" in capsys.readouterr().err


def test_cli_rejects_byte_limit_above_hard_cap(tmp_path):
    image_path = tmp_path / "image.png"
    image_path.write_bytes(b"x")
    try:
        ocr_cli.main([str(image_path), "--max-bytes", "10485761"])
    except SystemExit as exc:
        assert exc.code == 2
    else:
        raise AssertionError("argparse should reject a limit above the hard cap")
