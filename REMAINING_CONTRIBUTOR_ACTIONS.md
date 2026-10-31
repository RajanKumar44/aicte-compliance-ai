# Remaining Contributor Actions & Handoff Checklist

This document details the specific actions required from each contributor to ensure seamless synchronization with the canonical repository.

---

## 1. Action Items for Rajan Kumar Singh (`RajanKumar44`)

- [x] **Branch Protection Active:** GitHub branch protection rule enabled on `main`.
- [x] **Canonical Commit Pushed:** HEAD commit `d7b82d3` pushed to `origin/main`.
- [ ] **Supabase Migrations Check:** Verify that the following migrations are applied to your Supabase project:
  - `20261031000001_auto_confirm_users.sql` (Auto-confirms new users)
  - `20261031010000_action_planner_and_regulatory_impact.sql` (Action Planner & Regulatory Diffs)
  - `20261101000000_applications_workflow.sql` (Application workflow & findings)
- [ ] **Vercel Project Settings:** Confirm that Vercel is connected to `RajanKumar44/aicte-compliance-ai` and tracking the `main` branch with root directory `./`.

---

## 2. Action Items for Ravikant Raj (`ravikantraj25`)

- [ ] **Sync Local Repository:**
  ```bash
  git checkout main
  git fetch origin
  git reset --hard origin/main
  ```
- [ ] **Render Service Backend:** Confirm that Render tracks `RajanKumar44/aicte-compliance-ai`, branch `main`, build command `pip install -r backend/requirements.txt`, start command `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`.

---

## 3. Action Items for Raj Aryan (`rajaryan1111`)

- [ ] **Sync Upstream Fork (`rajaryan1111/aicte-compliance-ai`):**
  If continuing to use the fork, synchronize it directly with canonical `origin/main`:
  ```bash
  git remote add canonical https://github.com/RajanKumar44/aicte-compliance-ai.git
  git fetch canonical
  git checkout main
  git merge --ff-only canonical/main
  git push origin main
  ```
- [ ] **Draft PR #20 Reconciliation:** Close or rebase draft PR #20 on upstream against `canonical/main`, as application workflow and findings persistence are now live on `main`.

---

## 4. Unpushed / Local-Only Work Checklist for Any Contributor

If you have uncommitted or unpushed work on your laptop:
```bash
# 1. DO NOT delete your working directory!
# 2. Check your current status:
git status

# 3. Create a clean feature branch:
git checkout -b feature/my-saved-work

# 4. Commit your changes:
git add .
git commit -m "feat: my local work"

# 5. Push to canonical origin:
git push -u origin feature/my-saved-work

# 6. Open a Pull Request targeting main on RajanKumar44/aicte-compliance-ai.
```
