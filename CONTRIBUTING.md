# Contributing to AICTE Compliance AI

Thank you for contributing to the **AICTE Compliance AI Platform**!

To ensure consistency, security, and smooth releases across all developer laptops, all contributors must follow this standardized collaboration protocol.

---

## 1. Canonical Repository & Golden Rules

- **Canonical Repository:** `https://github.com/RajanKumar44/aicte-compliance-ai`
- **Default Production Branch:** `main`
- **Rule 1:** NEVER commit fake sessions or plain-text credentials to localStorage.
- **Rule 2:** NEVER force-push (`git push -f`) to `main`.
- **Rule 3:** ALL work lands on `main` via reviewed Pull Requests with passing CI quality gates.
- **Rule 4:** Keep database changes traceable in `supabase/migrations/` with unique timestamps.

---

## 2. Setting Up Your Development Environment

### Prerequisites
- **Node.js:** v22.x (see `.nvmrc`)
- **Python:** v3.12.x (see `.python-version`)
- **Git:** Ensure LF normalization is active (`git config --global core.autocrlf false`)
- **Package Manager:** `npm` v10+

### Step-by-Step Setup
```bash
# 1. Clone the canonical repository
git clone https://github.com/RajanKumar44/aicte-compliance-ai.git
cd aicte-compliance-ai

# 2. Check remote configuration
git remote -v
# origin should point to https://github.com/RajanKumar44/aicte-compliance-ai.git

# 3. Install frontend dependencies
npm --prefix frontend/app install

# 4. Set up Python virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# 5. Install backend dependencies
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt -r backend/requirements-dev.txt

# 6. Set up local environment files
cp .env.example .env
cp .env.example frontend/app/.env.local
```

---

## 3. Daily Contributor Workflow

### A. Before Starting New Work
Always start from the latest production code:
```bash
git checkout main
git pull --ff-only origin main
git checkout -b feature/your-feature-name
# Or: git checkout -b fix/issue-description
```

### B. While Developing
Write code and verify locally:
```bash
# Frontend checks:
npm --prefix frontend/app run lint
npm --prefix frontend/app test
npm --prefix frontend/app run build

# Backend checks:
python -m ruff check backend/app
python -m pytest -q backend/tests

# Contract check:
python frontend/tools/verify_fixtures.py
```

### C. Committing and Pushing
Follow conventional commits:
```bash
git add .
git commit -m "feat(module): describe what you built"
git push -u origin feature/your-feature-name
```

### D. Creating a Pull Request
1. Open GitHub: `https://github.com/RajanKumar44/aicte-compliance-ai/pulls`
2. Select **Base:** `main` &larr; **Compare:** `feature/your-feature-name`.
3. Complete the Pull Request template.
4. Verify that the **Vercel Preview** deployment generates a functional test link.
5. Wait for all 3 required GitHub Actions status checks to turn **green**.
6. Request a code review from `@RajanKumar44` or the appropriate Code Owner.

---

## 4. Resolving Conflicts
If `main` has advanced while you were working:
```bash
git checkout feature/your-feature-name
git fetch origin
git merge origin/main

# Resolve any file conflicts, verify all tests pass, then:
git commit -m "merge: resolve conflicts with origin/main"
git push origin feature/your-feature-name
```

---

## 5. Deployment Lifecycle

| Action | Target Environment | Automation Trigger |
| :--- | :--- | :--- |
| **Push to feature branch** | Vercel Preview | Automatic Vercel Git integration |
| **Open / Update PR** | Vercel Preview + GitHub CI | Automatic CI check runs |
| **Merge PR into `main`** | **Production** (`https://aicte-compliance-ai.vercel.app`) | GitHub Actions &rarr; Vercel & Render production deployments |
