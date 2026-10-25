"""One-time installer for the repo-local Playwright + Chromium environment.

Run from the repository root:

    python frontend/tests/browser_e2e_setup.py

Creates ./pw-venv (VirtualEnv, local to the project) and installs Playwright
plus Chromium only. Does **not** touch the system Python, any global
toolchain, or any paid provider. After the shrink test run finishes you can
delete the folder:

    rm -rf pw-venv
"""

import subprocess
import sys
from pathlib import Path

PLAYWRIGHT_VERSION = "1.58.0"
VENV_DIR = Path(".pw-venv")


def main() -> None:
    base = sys.executable
    print("Creating local venv:", VENV_DIR)
    subprocess.run([base, "-m", "venv", str(VENV_DIR)], check=True)
    pip = VENV_DIR / "bin" / "pip"
    python = VENV_DIR / "bin" / "python"

    print("Installing playwright", PLAYWRIGHT_VERSION)
    subprocess.run(
        [str(pip), "install", "--no-cache-dir", f"playwright=={PLAYWRIGHT_VERSION}"],
        check=True,
        stdout=subprocess.DEVNULL,
    )

    print("Downloading pre-bundled Chromium shell ...")
    subprocess.run(
        [str(python), "-m", "playwright", "install", "--only-shell", "chromium"],
        check=True,
    )

    print("Done.", str(VENV_DIR), "committed? NO - it's local-only;")
    print("delete it with: rm -rf", str(VENV_DIR))


if __name__ == "__main__":
    main()
