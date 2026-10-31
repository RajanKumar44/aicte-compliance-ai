# Team Development Guide — AICTE Compliance AI

## Introduction
This guide is the master reference for all software engineers, QA testers, and DevOps specialists working on the AICTE Compliance AI platform.

---

## 1. Local Machine Setup

Every contributor must match these runtime versions:
- **Node.js:** v22.x (Run `nvm use` to auto-read `.nvmrc`)
- **Python:** v3.12.x (Run `pyenv local` or Python 3.12 virtualenv)
- **Git:** Autocrlf disabled (`git config core.autocrlf false`)

```bash
git clone https://github.com/RajanKumar44/aicte-compliance-ai.git
cd aicte-compliance-ai
npm --prefix frontend/app install
python -m venv .venv
# Activate .venv
pip install -r backend/requirements.txt -r backend/requirements-dev.txt
```

---

## 2. Daily Engineering Flow

1. **Pull latest production code:**
   ```bash
   git checkout main
   git pull --ff-only origin main
   ```
2. **Branch off `main`:**
   ```bash
   git checkout -b feature/<descriptive-name>
   ```
3. **Run local quality checks before push:**
   ```bash
   # Frontend:
   npm --prefix frontend/app run lint
   npm --prefix frontend/app test
   npm --prefix frontend/app run build

   # Backend:
   python -m ruff check backend/app
   python -m pytest -q backend/tests
   ```
4. **Push branch:**
   ```bash
   git push -u origin feature/<descriptive-name>
   ```
5. **Open Pull Request on GitHub:**
   - Base: `main` &larr; Compare: `feature/<descriptive-name>`
   - Inspect the automated **Vercel Preview** deployment.
   - Wait for CI checks to pass.
   - Request review from `@RajanKumar44`.

---

## 3. Session Sanity Testing
When testing authentication on your laptop or preview deployment:
1. Navigate to `/session-check` in your browser.
2. Confirm the green badge: **"Real Supabase Session Verified Server-Side"**.
3. Verify that User ID and database RLS membership match your credentials.
