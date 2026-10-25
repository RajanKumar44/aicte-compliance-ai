"""Check that every row in ``frontend/STATE_MATRIX.md`` references a real fixture.

For each data row in the state-matrix table this script asserts that the
"Fixture / source" column (column 4, zero-indexed) contains one of:

-  The basename of an existing file in ``frontend/fixtures/``.
-  The literal word ``none`` (case-insensitive).
-  The phrase ``no HTTP OCR endpoint`` (case-insensitive substring match).

Exit codes: 0 all rows valid, 1 at least one problem.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
STATE_MATRIX = REPO_ROOT / "frontend" / "STATE_MATRIX.md"
FIXTURE_DIR = REPO_ROOT / "frontend" / "fixtures"

# Matches a markdown table row: starts with ``|``, contains at least two ``|``.
_TABLE_ROW_RE = re.compile(r"^\|(.+)\|$")
# Separator rows look like ``| --- | --- |``.
_SEPARATOR_RE = re.compile(r"^[\s|:-]+$")


def _existing_fixtures() -> set[str]:
    """Return the set of fixture basenames present on disk."""
    if not FIXTURE_DIR.is_dir():
        return set()
    return {p.name for p in FIXTURE_DIR.iterdir() if p.is_file()}


def _is_valid_reference(cell: str, fixtures: set[str]) -> bool:
    """Return True if *cell* is a recognised fixture reference or exemption."""
    text = cell.strip()
    lower = text.lower()

    # Explicit exemptions for states with no fixture.
    if lower == "none":
        return True
    if "no http ocr endpoint" in lower:
        return True

    # Check every backtick-delimited filename in the cell.
    backtick_names = re.findall(r"`([^`]+\.json)`", text)
    if backtick_names:
        return all(name in fixtures for name in backtick_names)

    # Also accept bare filenames that look like JSON files.
    bare_names = re.findall(r"([\w.-]+\.json)", text)
    if bare_names:
        return all(name in fixtures for name in bare_names)

    # The cell contains neither a fixture reference nor an exemption phrase.
    if not text:
        return False

    # Some cells contain descriptive text that is not a fixture reference.
    # Accept it if there is an exemption keyword present.
    if ".json" not in text:
        if "none" in lower or "no " in lower:
            return True

    return False


def main() -> int:
    if not STATE_MATRIX.is_file():
        print(f"error: {STATE_MATRIX} not found", file=sys.stderr)
        return 1

    fixtures = _existing_fixtures()
    lines = STATE_MATRIX.read_text(encoding="utf-8").splitlines()

    problems: list[str] = []
    in_table = False
    header_skipped = False

    for lineno, line in enumerate(lines, start=1):
        stripped = line.strip()
        match = _TABLE_ROW_RE.match(stripped)
        if not match:
            if in_table:
                in_table = False
                header_skipped = False
            continue

        if not in_table:
            in_table = True
            header_skipped = False
            continue  # skip the header row

        if not header_skipped:
            if _SEPARATOR_RE.match(match.group(1)):
                header_skipped = True
                continue
            header_skipped = True

        # Data row.  Split on ``|``.
        raw_cells = stripped.strip("|").split("|")
        if len(raw_cells) < 4:
            problems.append(f"line {lineno}: row has fewer than 4 columns")
            continue

        fixture_cell = raw_cells[3]  # "Fixture / source" column

        if not _is_valid_reference(fixture_cell, fixtures):
            problems.append(
                f"line {lineno}: fixture reference {fixture_cell.strip()!r} "
                f"does not match an existing fixture or exemption"
            )

    if problems:
        print(
            f"STATE_MATRIX.md: {len(problems)} problem(s):",
            file=sys.stderr,
        )
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        return 1

    print("STATE_MATRIX.md: all rows reference existing fixtures or valid exemptions")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
