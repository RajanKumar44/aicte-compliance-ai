"""Tests for `frontend.tools.map_errors.map_validation_errors`.

Test cases are built from:

-  The real 422 fixtures in `frontend/fixtures/validate-422-*.json`.
-  Synthetic bodies for edge cases: unknown `loc`, missing `detail`,
   malformed shapes, and multiple errors.

These tests verify display-mapping only.  `map_validation_errors` must
**never** interpret a message for logic, compliance decisions or severity.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from frontend.tools.map_errors import map_validation_errors  # noqa: E402

FIXTURE_DIR = REPO_ROOT / "frontend" / "fixtures"


def _load_fixture(name: str) -> dict:
    """Load a fixture file and return its `expected_response`."""
    path = FIXTURE_DIR / name
    data = json.loads(path.read_text(encoding="utf-8"))
    return data["expected_response"]


# ── Real fixture tests ──────────────────────────────────────────────


class TestFromFixtures:
    """Tests driven by real 422 fixtures captured from the running API."""

    def test_missing_fields(self):
        """validate-422-missing-fields.json: two missing required fields."""
        body = _load_fixture("validate-422-missing-fields.json")
        result = map_validation_errors(body)
        # Both application_type and required_documents are missing.
        assert "application_type" in result
        assert result["application_type"] == "Field required"
        assert "required_documents" in result
        assert result["required_documents"] == "Field required"
        # No _unknown bucket for well-formed errors.
        assert "_unknown" not in result

    def test_empty_checklist(self):
        """validate-422-empty-checklist.json: list too short."""
        body = _load_fixture("validate-422-empty-checklist.json")
        result = map_validation_errors(body)
        assert "required_documents" in result
        assert result["required_documents"] == (
            "List should have at least 1 item after validation, not 0"
        )
        assert "_unknown" not in result

    def test_duplicate_documents(self):
        """validate-422-duplicate-documents.json: value_error for duplicates."""
        body = _load_fixture("validate-422-duplicate-documents.json")
        result = map_validation_errors(body)
        assert "required_documents" in result
        assert result["required_documents"] == (
            "Value error, Document names must not contain duplicates."
        )
        assert "_unknown" not in result

    def test_messages_are_verbatim(self):
        """The mapper must preserve `detail[].msg` exactly, never rephrase."""
        body = _load_fixture("validate-422-missing-fields.json")
        result = map_validation_errors(body)
        # Check against the raw fixture value.
        for entry in body["detail"]:
            field = entry["loc"][-1]
            assert result[field] == entry["msg"]


# ── Edge-case / synthetic tests ─────────────────────────────────────


class TestEdgeCases:
    """Synthetic bodies covering the robustness requirements."""

    def test_no_detail_key(self):
        """Body without `detail` returns empty dict."""
        assert map_validation_errors({}) == {}
        assert map_validation_errors({"error": "something"}) == {}

    def test_detail_is_none(self):
        """`detail` present but None."""
        assert map_validation_errors({"detail": None}) == {}

    def test_detail_is_string(self):
        """`detail` is a string instead of a list."""
        assert map_validation_errors({"detail": "bad request"}) == {}

    def test_detail_is_dict(self):
        """`detail` is a dict instead of a list."""
        assert map_validation_errors({"detail": {"msg": "bad"}}) == {}

    def test_non_dict_body(self):
        """Completely non-dict body returns empty dict."""
        assert map_validation_errors(None) == {}
        assert map_validation_errors("string") == {}
        assert map_validation_errors(42) == {}
        assert map_validation_errors([]) == {}

    def test_entry_without_msg(self):
        """Entry missing `msg` is skipped."""
        body = {"detail": [{"loc": ["body", "field_a"], "type": "missing"}]}
        result = map_validation_errors(body)
        assert result == {}

    def test_entry_with_non_string_msg(self):
        """Entry where `msg` is not a string is skipped."""
        body = {"detail": [{"loc": ["body", "x"], "msg": 123}]}
        assert map_validation_errors(body) == {}

    def test_entry_without_loc(self):
        """Entry missing `loc` → _unknown bucket."""
        body = {"detail": [{"msg": "Something went wrong", "type": "value_error"}]}
        result = map_validation_errors(body)
        assert result == {"_unknown": "Something went wrong"}

    def test_entry_with_empty_loc(self):
        """Entry with empty `loc` list → _unknown bucket."""
        body = {"detail": [{"loc": [], "msg": "Empty loc"}]}
        result = map_validation_errors(body)
        assert result == {"_unknown": "Empty loc"}

    def test_entry_with_non_list_loc(self):
        """Entry where `loc` is not a list → _unknown bucket."""
        body = {"detail": [{"loc": "body.field", "msg": "Bad loc type"}]}
        result = map_validation_errors(body)
        assert result == {"_unknown": "Bad loc type"}

    def test_entry_with_integer_loc_tail(self):
        """`loc` ending with an integer (list index) → _unknown bucket."""
        body = {"detail": [{"loc": ["body", "items", 0], "msg": "Item invalid"}]}
        result = map_validation_errors(body)
        assert result == {"_unknown": "Item invalid"}

    def test_non_dict_entry_in_detail(self):
        """A non-dict entry in `detail` → _unknown bucket."""
        body = {"detail": ["unexpected string entry"]}
        result = map_validation_errors(body)
        assert result == {"_unknown": "unexpected string entry"}

    def test_unknown_loc_field_name(self):
        """A `loc` referencing a field not in the contract → mapped normally.

        The mapper does not validate field names against the contract; it
        maps whatever `loc[-1]` provides.  Unknown field names are still
        valid mapping targets.
        """
        body = {
            "detail": [
                {
                    "loc": ["body", "totally_unknown_field"],
                    "msg": "This field is mysterious",
                    "type": "value_error",
                }
            ]
        }
        result = map_validation_errors(body)
        assert result == {"totally_unknown_field": "This field is mysterious"}


class TestMultipleErrors:
    """Bodies with several errors, testing aggregation behaviour."""

    def test_multiple_distinct_fields(self):
        """Multiple errors for different fields all appear."""
        body = {
            "detail": [
                {"loc": ["body", "institution_id"], "msg": "Field required", "type": "missing"},
                {"loc": ["body", "application_type"], "msg": "Field required", "type": "missing"},
                {"loc": ["body", "required_documents"], "msg": "Field required", "type": "missing"},
            ]
        }
        result = map_validation_errors(body)
        assert len(result) == 3
        assert result["institution_id"] == "Field required"
        assert result["application_type"] == "Field required"
        assert result["required_documents"] == "Field required"

    def test_same_field_last_message_wins(self):
        """Multiple errors for the same field: last message wins."""
        body = {
            "detail": [
                {"loc": ["body", "institution_id"], "msg": "Field required", "type": "missing"},
                {"loc": ["body", "institution_id"], "msg": "Must not be blank", "type": "value_error"},
            ]
        }
        result = map_validation_errors(body)
        assert result["institution_id"] == "Must not be blank"

    def test_mix_of_valid_and_malformed(self):
        """A mix of well-formed and malformed entries: each handled correctly."""
        body = {
            "detail": [
                {"loc": ["body", "application_type"], "msg": "Field required", "type": "missing"},
                {"msg": "No loc here", "type": "value_error"},
                "a bare string",
                {"loc": ["body", "institution_id"], "msg": "Too long", "type": "value_error"},
            ]
        }
        result = map_validation_errors(body)
        assert result["application_type"] == "Field required"
        assert result["institution_id"] == "Too long"
        # _unknown gets the last value assigned to it (the bare string, then "No loc here")
        assert "_unknown" in result
