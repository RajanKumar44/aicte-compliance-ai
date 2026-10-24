"""Document-text normalization for OCR evaluation (workstream C / ``ai/``).

Conservative, individually verifiable normalizations applied to OCR-shaped
text, each with provenance for every change. This module is an
**evaluation-side artifact**: it feeds diagnostics that quantify how much of a
corpus a preprocessing layer could repair. It is not a production extractor;
``backend/app/ocr_pipeline.py`` stays the production OCR code until a
separately reviewed migration (see ``WORKSTREAMS.md``, "OCR placement").

Deliberate scope limits — things a real preprocessing layer needs that this
library does **not** attempt:

- no label re-joining across line breaks (``Institution\\nName``);
- no column-aware re-ordering of flattened two-column text;
- no fuzzy label matching or OCR confusion correction (``Instituti0n``).

Fuzzy corrections are policy decisions about real documents; guessing them
would create wrong but plausible data. The rules below only remove characters
that are *never* meaningful or only standardize representation.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any

# Characters that carry no meaning and are never part of a legitimate field value.
REMOVE_ALWAYS = {
    "\u200b",  # zero-width space
    "\u200c",  # zero-width non-joiner
    "\u200d",  # zero-width joiner
    "\u2060",  # word joiner
    "\ufeff",  # byte-order mark / zero-width no-break space
    "\u00ad",  # soft hyphen
}


def _record(changes: list[dict[str, Any]], rule: str, instances: int, examples: list[str]) -> None:
    if instances:
        changes.append({"rule": rule, "instances": instances, "examples": examples[:3]})


def _line_separator_to_lf(text: str, changes: list[dict[str, Any]]) -> str:
    found = [ch for ch in text if ch in "\u2028\u2029"]
    out = text.replace("\u2028", "\n").replace("\u2029", "\n")
    if out != text:
        _record(
            changes,
            "line-separator-to-lf",
            len(found),
            [f"U+{ord(ch):04X} became LF" for ch in sorted(set(found))],
        )
    return out


def _crlf_to_lf(text: str, changes: list[dict[str, Any]]) -> str:
    out = text.replace("\r\n", "\n").replace("\r", "\n")
    if out != text:
        _record(changes, "crlf-to-lf", text.count("\r"), ["CRLF and stray CR became LF"])
    return out


def _remove_zero_width(text: str, changes: list[dict[str, Any]]) -> str:
    found = [ch for ch in text if ch in REMOVE_ALWAYS]
    out = "".join(ch for ch in text if ch not in REMOVE_ALWAYS)
    _record(
        changes,
        "remove-invisible-chars",
        len(found),
        [f"removed U+{ord(ch):04X} ({unicodedata.name(ch, 'UNKNOWN')})" for ch in found],
    )
    return out


def _remove_control_chars(text: str, changes: list[dict[str, Any]]) -> str:
    found = [
        ch
        for ch in text
        if unicodedata.category(ch) == "Cc" and ch not in "\n\t"
    ]
    out = "".join(ch for ch in text if not (unicodedata.category(ch) == "Cc" and ch not in "\n\t"))
    _record(
        changes,
        "remove-control-chars",
        len(found),
        [f"removed U+{ord(ch):04X} ({unicodedata.name(ch, 'UNKNOWN')})" for ch in found],
    )
    return out


def _nfkc(text: str, changes: list[dict[str, Any]]) -> str:
    out = unicodedata.normalize("NFKC", text)
    if out != text:
        _record(
            changes,
            "nfkc",
            1,
            ["NFKC composed decomposed forms / mapped compatibility characters"],
        )
    return out


def _strip_line_trailing(text: str, changes: list[dict[str, Any]]) -> str:
    lines = text.split("\n")
    out_lines = [line.rstrip(" \t") for line in lines]
    out = "\n".join(out_lines)
    if out != text:
        changed = [
            (index, lines[index], out_lines[index])
            for index in range(len(lines))
            if lines[index] != out_lines[index]
        ]
        _record(
            changes,
            "strip-trailing-whitespace",
            len(changed),
            [f"line {i + 1}: {a!r} -> {b!r}" for i, a, b in changed],
        )
    return out


_BLANK_RUN = re.compile(r"\n{3,}")


def _collapse_blank_lines(text: str, changes: list[dict[str, Any]]) -> str:
    out = _BLANK_RUN.sub("\n\n", text)
    if out != text:
        _record(
            changes,
            "collapse-blank-lines",
            len(_BLANK_RUN.findall(text)),
            ["3+ consecutive newlines became one blank line"],
        )
    return out


def normalize_text(text: str) -> tuple[str, list[dict[str, Any]]]:
    """Normalize OCR-shaped text; return the payload and per-change provenance.

    The return value is ``(normalized_text, changes)`` where ``changes`` lists
    every rule that fired with an instance count and up to three examples.
    Normalizing again is a no-op (idempotent).
    """
    changes: list[dict[str, Any]] = []
    out = _line_separator_to_lf(text, changes)
    out = _crlf_to_lf(out, changes)
    out = _remove_zero_width(out, changes)
    out = _remove_control_chars(out, changes)
    out = _nfkc(out, changes)
    out = _strip_line_trailing(out, changes)
    out = _collapse_blank_lines(out, changes)
    if out.lstrip() != out:
        _record(changes, "strip-edges", 1, ["leading whitespace trimmed"])
        out = out.lstrip()
    if out.rstrip() != out:
        _record(changes, "strip-edges", 1, ["trailing whitespace trimmed"])
        out = out.rstrip()
    return out, changes
