"""Map FastAPI 422 validation errors to field-level display messages.

This module provides a single pure function that turns a `{"detail": [...]}`
error body into a `{field: message}` dictionary suitable for field-level UI
feedback.

Design rules (from `docs/development/API_CONTRACT.md` and `STARTER_TASKS.md`):

- Messages come from `detail[].msg` **verbatim** -- do not rephrase, translate
  or interpret them.  They are for *display only*, never for logic or compliance
  decisions.
- Unknown or unrecognised `loc` shapes land in the `"_unknown"` bucket.
- The function never raises on malformed input: missing `detail`, wrong types,
  empty `loc`, or completely unexpected structures all produce a safe result.
- No imports outside the Python standard library.
"""

from __future__ import annotations


def map_validation_errors(body: dict) -> dict[str, str]:
    """Map a 422 error body to `{field_name: message}` for display.

    Parameters
    ----------
    body:
        The parsed JSON body of a 422 response.  Expected shape::

            {"detail": [{"loc": [...], "msg": "...", ...}, ...]}

    Returns
    -------
    dict[str, str]
        A mapping from the final `loc` element (the field name) to the
        verbatim `msg`.  If a `loc` is missing, empty, or contains
        non-string elements at the tail, the message is collected under
        the `"_unknown"` key.  When multiple errors share a key the
        last message wins (display-only -- ordering is server-defined).
    """
    if not isinstance(body, dict):
        return {}

    detail = body.get("detail")
    if not isinstance(detail, list):
        return {}

    result: dict[str, str] = {}

    for entry in detail:
        if not isinstance(entry, dict):
            # Completely unexpected shape -- collect under _unknown.
            result["_unknown"] = str(entry)
            continue

        msg = entry.get("msg")
        if not isinstance(msg, str):
            # No usable message; skip silently rather than invent text.
            continue

        loc = entry.get("loc")
        if not isinstance(loc, list) or len(loc) == 0:
            result["_unknown"] = msg
            continue

        # The last element of `loc` is the field name (e.g. "application_type"
        # from `["body", "application_type"]`).  Non-string tails (unusual but
        # possible with list-index locs) are bucketed as _unknown.
        field = loc[-1]
        if not isinstance(field, str):
            result["_unknown"] = msg
            continue

        result[field] = msg

    return result
