# Deployment Architecture — AICTE Compliance AI

## Overview
This document specifies the deployment infrastructure, hosting environments, routing rules, and domain topology across Vercel, Render, and Supabase.

---

## 1. Hosting Infrastructure

| Service | Host Provider | Canonical URL / Domain | Git Branch Tracked |
| :--- | :--- | :--- | :--- |
| **Primary Frontend** | Vercel | `https://aicte-compliance-ai.vercel.app` | `main` |
| **Preview Frontends** | Vercel | `https://aicte-compliance-ai-git-<branch>-<user>.vercel.app` | Any PR / Feature Branch |
| **Primary Backend** | Render / Vercel Serverless | `https://aicte-compliance-backend-live.vercel.app` | `main` |
| **Database & Auth** | Supabase | `https://<project-ref>.supabase.co` | Managed via `supabase/migrations/` |

---

## 2. Environment Variables & Secrets Routing

### Production Environment Variables
| Variable | Used By | Description | Source |
| :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Frontend | Supabase Project API URL | Vercel Dashboard |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Supabase Publishable / Anon Key | Vercel Dashboard |
| `VITE_API_URL` | Frontend | Target FastAPI Backend Base URL | Vercel Dashboard |
| `SUPABASE_URL` | Backend | Supabase Project API URL | Render Dashboard |
| `SUPABASE_PUBLISHABLE_KEY` | Backend | Supabase Publishable Key | Render Dashboard |
| `CORS_ALLOW_ORIGINS` | Backend | Permitted Cross-Origin URLs | Render Dashboard |

---

## 3. Storage & Database Migration Pipeline

- **Migration Folder:** `supabase/migrations/`
- **Current Active Migrations:**
  1. `20261024000000_validation_history.sql` (History, Institutions, Memberships, Scopes)
  2. `20261025000000_auth_onboarding.sql` (onboard_applicant security definer RPC)
  3. `20261025010000_institution_documents.sql` (Document storage and metadata)
  4. `20261031000001_auto_confirm_users.sql` (Auto-confirm auth trigger for smooth registration)
  5. `20261031010000_action_planner_and_regulatory_impact.sql` (Actions, Evidence, Diffs, Impacts, Notifications)
  6. `20261101000000_applications_workflow.sql` (EoA Applications, Checklist, Findings, Scrutiny Reports)
