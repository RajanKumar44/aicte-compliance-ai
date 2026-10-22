# Parallel development workflow

How three workstreams work at the same time without overwriting each other. Ownership is
defined in [`../../WORKSTREAMS.md`](../../WORKSTREAMS.md); contracts in
[`API_CONTRACT.md`](API_CONTRACT.md); gates in
[`INTEGRATION_CHECKLIST.md`](INTEGRATION_CHECKLIST.md).

## Branch topology

```text
main                                 968ddcf  stable base; nothing lands here yet
└── research/grounded-foundation     014403a  INTEGRATION BASE — all PRs target this
    ├── feature/frontend-<task>                workstream A
    ├── feature/backend-<task>                 workstream B
    ├── feature/ai-ocr-<task>                  workstream C
    └── docs/<topic>, fix/<issue>              anyone
```

- **Do not branch from `main`.** `main` does not contain the prototype or the CI workflow
  fix, so a branch cut from `main` has no tests to run against.
- **Do not branch from another feature branch** unless your PR description says it depends
  on that PR and why. Stacked PRs are allowed but must be declared.
- One branch per task. Never a shared branch for two people.

## Before you start

Re-verify the live state instead of trusting this file's numbers:

```bash
git fetch origin --prune
git rev-parse origin/main origin/research/grounded-foundation
gh pr list --state open --json number,isDraft,baseRefName,headRefOid
gh api repos/rajaryan1111/aicte-compliance-ai/commits/$(git rev-parse origin/research/grounded-foundation)/check-runs \
  --jq '.check_runs[] | [.name,.conclusion] | @tsv'
```

If `research/grounded-foundation` has moved, rebase before starting work rather than after.

## Isolated workspaces

Three agents must not share one working directory. Use a separate `git worktree` per
person (same clone, different directories, no re-clone needed):

```bash
# from an existing clone of the repository
cd aicte-compliance-ai
git fetch origin --prune

git worktree add ../aicte-frontend -b feature/frontend-<task> origin/research/grounded-foundation
git worktree add ../aicte-backend  -b feature/backend-<task>  origin/research/grounded-foundation
git worktree add ../aicte-ai       -b feature/ai-ocr-<task>   origin/research/grounded-foundation

git worktree list          # confirm three separate working trees
```

Each directory has its own `.venv` and its own checked-out branch. Deleting a worktree
when finished: `git worktree remove ../aicte-frontend` (refuses if it has uncommitted
changes — that refusal is the point).

## Setup (identical for all three workstreams)

Verified on Linux with Python 3.11.2; CI uses Python 3.12.

```bash
cd ../aicte-backend                   # your worktree
python3 -m venv .venv
. .venv/bin/activate                  # Windows: .venv\Scripts\activate
python -m pip install -r backend/requirements-dev.txt
python -m pip check                   # expect: "No broken requirements found"
```

Optional OCR engine (workstream C, and anyone touching OCR):

```bash
sudo apt-get install tesseract-ocr tesseract-ocr-eng   # Debian/Ubuntu
brew install tesseract                                  # macOS
tesseract --version
python -m pip install -r backend/requirements-ocr.txt
```

**No environment variables are read by the application today.** `.env.example` documents
planned settings as comments only. Do not create a real `.env` with credentials, and never
commit one — `.gitignore` covers `.env` and `.env.*` while keeping `.env.example` tracked.

## Run the checks

```bash
python -m pytest -q                                   # whole suite
pytest -q                                             # equivalent (pyproject.toml)
ruff check backend/                                   # lint
python -m compileall -q backend/app backend/tests     # import/compile check
```

Workstream subsets:

```bash
# backend / platform
python -m pytest -q backend/tests/test_validation.py backend/tests/test_validation_security.py
python -m pytest -q backend/tests/test_rule_catalog.py backend/tests/test_rule_activation.py

# ai / ocr
python -m pytest -q backend/tests/test_ocr_pipeline.py backend/tests/test_ocr_adapter_engine.py \
  backend/tests/test_ocr_image_validation.py backend/tests/test_ocr_fixture_corpus.py
python -m pytest -q backend/tests/test_ocr_engine_integration.py   # needs Tesseract installed

# frontend — no implementation exists yet, so there is no build, lint or test command
```

A skipped test is not a pass. `test_ocr_engine_integration.py` skips when Tesseract is
missing; say so explicitly in your PR.

## Commit and push

```bash
git status --short                    # inspect before staging
git add <explicit paths>              # avoid `git add -A` when anything unrelated exists
git diff --cached                     # review exactly what will be committed
git commit -m "feat(backend): <what and why>"
git push -u origin HEAD
git rev-parse HEAD                    # record this SHA in the PR description
```

Never commit: `.env`, real documents, caches, `.venv`, `__pycache__`, generated binaries.
`.gitignore` covers these; check `git status --ignored` if unsure.

## Pull requests

Open against **`research/grounded-foundation`**, never `main`:

```bash
gh pr create --base research/grounded-foundation --draft \
  --title "feat(backend): <scope>" --body-file .github/pull_request_template.md
```

The template asks for: scope, ownership, exact head SHA, commands run and observed
results, skipped tests and why, contract version targeted, dependency on another PR, and
a security/regulatory checklist. Fill it in — an inaccurate PR description is treated as a
failed check in review.

Keep PRs **draft** until the owner marks them ready. Creating or marking a PR ready is an
owner action, not a convenience.

## Integration sequencing

1. Foundation branch verified and its CI green on its exact head.
2. Shared contract change merged (`API_CONTRACT.md`) — before any consumer codes against it.
3. Backend implementation + tests.
4. Frontend implementation against the agreed contract or clearly labelled mocks.
5. OCR/AI behind the stable interface.
6. One integration PR per workstream, not one giant PR.
7. Overlapping changes resolved by explicit comparison, never by silent replacement.
8. Cross-workstream tests, then the full regression suite.
9. CI green on the exact final head SHA.
10. Update the evidence in the integration docs.
11. Production stays disabled.

## Conflict resolution

```bash
git fetch origin --prune
git merge-tree --write-tree --name-only origin/research/grounded-foundation HEAD   # dry-run
git rebase origin/research/grounded-foundation
```

Rules:

- Resolve in favour of the version the **owner decided**, and say which that was.
- Never resolve by deleting the other side without recording why.
- If the conflict spans another workstream's directory, **stop** and escalate: you are
  probably editing a file you do not own.
- After a rebase and force-push (`--force-with-lease` only), CI re-runs on the new head.
  Old checks do not carry over.

## Recovery

See [`RECOVERY_AND_BACKUP.md`](RECOVERY_AND_BACKUP.md). Summary: commits are recoverable
for weeks via `git reflog` and branch SHAs recorded in PRs; uncommitted work is not —
commit or stash before any history-rewriting operation.

## Prohibited operations

`git reset --hard` on a shared branch · `git clean -fd` · force-push to a shared branch ·
force-push without `--force-with-lease` · rewriting history on
`research/grounded-foundation` or `main` · pushing directly to `main` · merging a PR
without the owner · enabling branch protection bypass · deleting another person's branch.
