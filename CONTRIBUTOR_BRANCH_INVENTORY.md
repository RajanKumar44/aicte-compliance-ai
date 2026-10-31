# Contributor Branch Inventory & Reconciliation Matrix

**Audit Date:** October 31, 2026  
**Canonical Repository:** `https://github.com/RajanKumar44/aicte-compliance-ai`  
**Base Head Commit:** `d7b82d3` (`main`)  

---

## 1. Remote Branch Inventory (`origin`)

| Branch | Contributor / Team | Latest Commit | Ahead of `main` | Behind `main` | Status / Recommendation |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `main` | Production Core Team | `d7b82d3` | 0 | 0 | **CANONICAL PRODUCTION** — Protected branch |
| `gap-impl` | Full-Stack Integration | `15be83f` | 0 (Content Merged) | 5 | **FULLY INTEGRATED** — Auth hardening cherry-picked in `8ff79dc`, application workflow merged in PR #6 (`b2b34c9`) |
| `feat/action-planner-regulatory-impact` | Feature Architecture Team | `49e0a40` | 0 (Content Merged) | 2 | **FULLY INTEGRATED** — Merged into `main` in `4dad1b8` |
| `devops/fix-cicd-pipeline` | DevOps Team | `e1ab4c8` | 0 | 6 | **FULLY INTEGRATED** — Merged into `main` in `0c3ea60` |
| `feature/frontend-error-mapping` | UI/UX Team | `bac04c8` | 0 | 22 | **FULLY INTEGRATED** — Merged in PR #1, #2, #3 |
| `feature/restore-original-ui` | Frontend Design Lead | `eca4c9c` | 0 | 14 | **FULLY INTEGRATED** — Merged in PR #5 |
| `fix/master-restore-integrate` | Full-Stack Team | `fb2d8af` | 0 | 10 | **FULLY INTEGRATED** — Merged into `main` |
| `freebuff/0bb99989c675069fcd423fd5` | E2E Testing Lead | `0e1c410` | 0 | 19 | **FULLY INTEGRATED** — Playwright E2E integration verified |
| `work/prod-deploy-finish` | Release Engineer | `16a7561` | 0 | 18 | **FULLY INTEGRATED** — Merged in PR #4 |
| `feature/sih-complete-compliance-platform` | SIH Team (`rajaryan1111`) | `9da226c` | 56 | 41 | **SUPERSEDED** — Early monolithic fork from Oct 28. Features superseded by modern modular Document Vault, Action Planner, and EoA Application workflows. |

---

## 2. Upstream Branch Inventory (`rajaryan1111/aicte-compliance-ai`)

| Upstream Branch | Owner / Author | Status & Content Analysis |
| :--- | :--- | :--- |
| `upstream/main` (`93b7850`) | `rajaryan1111` | Baseline commit `93b7850` merged PR #19 ("Security: require authenticated users for consistency API"). Superseded on `origin/main` by real Supabase auth, full Vault, and Action Planner. |
| `upstream/feat/complete-intelligent-compliance-gap-analyzer` (`a152ca4`) | `rajaryan1111` | PR #20 (Draft): Requirement-level compliance gap documentation. Work stream reconciled into `origin/main` applications workflow. |
| `upstream/release/phase-1-remediation-plans` (`5413c11`) | `rajaryan1111` | PR #18: Server-side remediation plans draft. Fully superseded by Feature 2 (Compliance Action Planner) on `origin/main`. |
| `upstream/hardening/regulatory-verification-governance` (`09a929a`) | `rajaryan1111` | PR #16 / #17: Merged into upstream base before canonical split. |
| `upstream/arena/*` | Arena Automated Agents | Benchmark test branches from early pre-coding phase. Inactive. |

---

## 3. Discovered Contributors & Roles

| Contributor / GitHub Handle | Email | Primary Responsibilities | Repository Role |
| :--- | :--- | :--- | :--- |
| **`RajanKumar44`** | `sujalambuj99733@gmail.com` | Lead Full-Stack Architect, Release Manager, Repository Administrator | `admin` (Owner) |
| **`ravikantraj25`** | `ravikantraj384@gmail.com` | Backend Engineer, Infrastructure & Storage Systems | `write` (Collaborator) |
| **`rajaryan1111`** | `207074069+rajaryan1111@users.noreply.github.com` | Frontend Engineer, AICTE Regulatory Rules, UI Consistency | Collaborator |
