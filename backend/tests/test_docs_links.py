"""Keep relative links in the repository's markdown honest.

Three workstreams now share a documentation set, and a link that points at a
file that was renamed or never written is the cheapest way to lose a reader.
This checks relative links only: external URLs are not fetched (the CI job has
no network guarantee) and anchors are not resolved.
"""

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
LINK = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
FENCE = re.compile(r"```.*?```", re.DOTALL)
SKIP_SCHEMES = ("http://", "https://", "mailto:", "#")

# Directories that are not part of the documentation surface.
SKIP_DIRS = {".git", ".venv", "node_modules", "__pycache__", ".pytest_cache"}


def _markdown_files() -> list[Path]:
    files = []
    for path in REPO_ROOT.rglob("*.md"):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        files.append(path)
    return sorted(files)


def test_relative_markdown_links_resolve():
    assert _markdown_files(), "no markdown files found"

    broken = []
    for path in _markdown_files():
        text = FENCE.sub("", path.read_text(encoding="utf-8"))
        for target in LINK.findall(text):
            if target.startswith(SKIP_SCHEMES):
                continue
            relative = target.split("#")[0]
            if not relative:
                continue
            resolved = (path.parent / relative).resolve()
            if not resolved.exists():
                broken.append(f"{path.relative_to(REPO_ROOT)} -> {target}")

    assert not broken, "broken relative links:\n" + "\n".join(broken)
