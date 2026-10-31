"""Regression tests for the CI trigger configuration.

These ensure the active workflow checks pull requests to ``main`` and runs the
backend, frontend, fixture, and deployment-configuration gates used by the repo.

The repository avoids adding a YAML parser just for this, so the workflow is read
as text and only the few keys that matter are inspected. A failure here means the
CI contract changed, not that the YAML is invalid.
"""

import re
from pathlib import Path

WORKFLOW_PATH = (
    Path(__file__).resolve().parents[2] / ".github" / "workflows" / "ci.yml"
)

DEPLOYMENT_BRANCHES = {"main"}


def _workflow_lines() -> list[str]:
    assert WORKFLOW_PATH.is_file(), f"missing workflow file: {WORKFLOW_PATH}"
    lines = [
        line.rstrip()
        for line in WORKFLOW_PATH.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]
    assert lines, "workflow file is empty"
    return lines


def _find_block(lines: list[str], key: str) -> tuple[str, list[str]]:
    """Return the inline value and the nested lines for a ``key:`` mapping key."""
    pattern = re.compile(r"^(\s*)" + re.escape(key) + r":\s*(.*)$")
    for index, line in enumerate(lines):
        match = pattern.match(line)
        if match is None:
            continue
        indent = len(match.group(1))
        nested: list[str] = []
        for candidate in lines[index + 1 :]:
            current = len(candidate) - len(candidate.lstrip())
            if current <= indent:
                break
            nested.append(candidate)
        return match.group(2).strip(), nested
    raise AssertionError(f"workflow has no {key!r} key")


def _trigger_branches(trigger: str) -> set[str]:
    _, on_block = _find_block(_workflow_lines(), "on")
    _, trigger_block = _find_block(on_block, trigger)
    inline, nested = _find_block(trigger_block, "branches")
    # Supports both `branches: ["main", "x"]` and a nested `- main` list.
    text = inline + " " + " ".join(
        line.strip().lstrip("-").strip() for line in nested
    )
    return {value.strip('"').strip("'") for value in re.findall(r"[\w./-]+", text)}


def test_workflow_file_is_present():
    assert WORKFLOW_PATH.is_file()


def test_pull_requests_targeting_main_are_checked():
    assert _trigger_branches("pull_request") == DEPLOYMENT_BRANCHES


def test_pushes_to_main_are_checked():
    assert _trigger_branches("push") == DEPLOYMENT_BRANCHES


def test_workflow_never_uses_pull_request_target():
    # pull_request_target runs with repository secrets on untrusted code.
    text = WORKFLOW_PATH.read_text(encoding="utf-8")
    assert "pull_request_target" not in text


def test_workflow_permissions_are_read_only():
    _, permissions = _find_block(_workflow_lines(), "permissions")
    assert "  contents: read" in permissions
    assert not any("write" in line for line in permissions), permissions


def test_full_suite_runs_in_ci():
    text = WORKFLOW_PATH.read_text(encoding="utf-8")
    assert "python -m pytest -q" in text


def test_workstream_checks_cannot_be_silently_dropped_from_ci():
    """Each workstream's own check must stay wired into the workflow.

    Removing a step is the quietest way to make a red check disappear, so the
    step text is asserted rather than trusted.
    """
    text = WORKFLOW_PATH.read_text(encoding="utf-8")
    required_commands = {
        "backend suite": "python -m pytest -q",
        "frontend fixture verification": "python frontend/tools/verify_fixtures.py",
        "frontend lint": "npm --prefix frontend/app run lint",
        "frontend unit tests": "npm --prefix frontend/app test",
        "frontend production build": "npm --prefix frontend/app run build",
        "OpenAPI validation": "app.openapi()",
    }
    missing = [name for name, command in required_commands.items() if command not in text]
    assert not missing, f"CI no longer runs: {missing}"


def test_workflow_declares_no_secrets_and_no_upload_steps():
    text = WORKFLOW_PATH.read_text(encoding="utf-8")
    for forbidden in ("secrets.", "upload-artifact", "pull_request_target", "contents: write"):
        assert forbidden not in text, f"workflow must not use {forbidden!r}"
