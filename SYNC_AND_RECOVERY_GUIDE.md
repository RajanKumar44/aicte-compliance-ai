# Contributor Synchronization & Recovery Guide

## Purpose
If your local working tree is out of date, has merge conflicts, has failing tests, or has unpushed edits, use this guide to restore clean synchronization with the canonical production repository (`RajanKumar44/aicte-compliance-ai`).

---

## 1. Golden Synchronization Checklist for Every Contributor

Run these commands in your local project root:

```bash
# Step 1: Ensure remotes point to the canonical repository
git remote -v
# If origin is not pointing to RajanKumar44:
git remote set-url origin https://github.com/RajanKumar44/aicte-compliance-ai.git

# Step 2: Fetch all remote refs and prune dead branches
git fetch origin --prune

# Step 3: Switch to main and pull latest production changes
git checkout main
git pull --ff-only origin main

# Step 4: Verify working tree is clean
git status
```

---

## 2. Recovering an Existing Local Feature Branch

If you started working on a feature branch (`feature/my-work`) and need to bring it up to date with `main`:

```bash
# 1. Stash or commit any uncommitted edits
git add .
git commit -m "wip: save local progress before sync"

# 2. Fetch latest changes from origin
git fetch origin

# 3. Merge origin/main into your feature branch
git merge origin/main

# 4. If conflicts occur:
# Inspect the conflicted files. Do NOT delete or overwrite your new logic.
# Resolve the conflicts, preserving both the canonical imports and your new feature.

# 5. Run tests to confirm integrity:
npm --prefix frontend/app test
python -m pytest -q backend/tests

# 6. Commit and push your updated feature branch:
git add .
git commit -m "chore: sync feature branch with canonical main"
git push -u origin feature/my-work
```

---

## 3. Resolving Laptop-Specific Environment Desyncs

### A. Frontend: "Node version mismatch" or "npm install fails"
```bash
# Ensure Node 22 is active (using nvm)
nvm use 22 || nvm install 22

# Clean node_modules and reinstall cleanly
cd frontend/app
rm -rf node_modules package-lock.json
npm install
npm test
```

### B. Backend: "ModuleNotFoundError: No module named 'fastapi'" or ruff fails
```bash
# Activate your virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Reinstall pinned requirements
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt -r backend/requirements-dev.txt
python -m pytest -q backend/tests
```

### C. Authentication: "Browser shows signed in, but backend returns 401"
1. Visit `http://localhost:5173/session-check` in your browser.
2. If the status says **"Session Rejected"**, sign out and sign in with a genuine Supabase account.
3. Fake sessions minted under old code are automatically dropped on load.

---

## 4. Emergency State Reset (Save Local Edits Without Losing Work)

If your local branch is hopelessly tangled with old commits:

```bash
# 1. Create a backup branch of your current work
git branch backup/my-work-safe

# 2. Reset your main branch to match origin/main exactly
git checkout main
git fetch origin
git reset --hard origin/main

# 3. Create a clean branch from modern main
git checkout -b feature/my-work-clean

# 4. Cherry-pick or re-apply only your specific feature commits
git cherry-pick <your-commit-sha>
```
Your work is 100% preserved in `backup/my-work-safe` while allowing clean PR creation from `feature/my-work-clean`.
