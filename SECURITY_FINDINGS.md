# SECURITY & VULNERABILITY AUDIT REPORT — AICTE COMPLIANCE AI
**Audit Standard:** OWASP Top 10 (2021) & CWE/SANS Top 25 Enterprise Security Verification  
**Audit Date:** October 31, 2026  
**Auditor:** Principal DevSecOps Lead & Independent Security Auditor  
**Scope:** Authentication Flow, Database Triggers, Row-Level Security, File Upload Pipeline, Malware Scanning & API Boundaries  

---

## 1. Executive Security Summary

The second-pass security audit identified **1 High-Severity Vulnerability**, **2 Medium-Severity Architectural Deficiencies**, and **3 Low-Severity Hardening Gaps**.

| ID | Title | OWASP / CWE Category | Severity | Current Status |
|---|---|---|:---:|:---:|
| **SEC-01** | Unauthenticated Email Auto-Confirmation Vulnerability | CWE-287: Improper Authentication | **HIGH** | Active in Database Trigger |
| **SEC-02** | Absence of ClamAV Daemon in Production | CWE-509: Replicating Code Execution | **MEDIUM** | Operating in Advisory Fallback |
| **SEC-03** | Lack of Rate-Limiting on In-Memory PDF Extraction | CWE-400: Uncontrolled Resource Consumption | **MEDIUM** | Vulnerable to CPU / Memory DoS |
| **SEC-04** | Cold-Start Request Dropping on Free Tier Worker | CWE-755: Improper Handling of Exceptional Conditions | **LOW** | 18s Latency Spikes |
| **SEC-05** | Lack of Tesseract Binary for Scanned Document OCR | CWE-390: Detection of Error Condition Without Action | **LOW** | Advisory Fallback Active |
| **SEC-06** | Database Query Result Set Bounding | CWE-770: Allocation of Resources Without Limits | **LOW** | Mitigated on runs; pending on documents |

---

## 2. In-Depth Security Findings

### SEC-01: Insecure User Auto-Confirmation Trigger (CWE-287)
- **Severity:** **HIGH** (CVSS 3.1 Base Score: **7.5** `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N`)
- **Vulnerable Artifact:** [supabase/migrations/20261031000001_auto_confirm_users.sql](file:///c:/Users/Rajan/OneDrive/Desktop/aicte-compliance-ai/supabase/migrations/20261031000001_auto_confirm_users.sql#L1-L25)
- **Mechanism:**
  ```sql
  create or replace function public.auto_confirm_new_user()
  returns trigger as $$
  begin
    if new.email_confirmed_at is null then
      new.email_confirmed_at = now();
    end if;
    return new;
  end;
  $$ language plpgsql security definer;

  create trigger on_auth_user_auto_confirm
    before insert on auth.users
    for each row execute function public.auto_confirm_new_user();

  update auth.users
  set email_confirmed_at = now()
  where email_confirmed_at is null;
  ```
- **Exploitation & Risk Vector:**
  1. **Pre-Registration & Identity Hijacking:** Anyone can register an account using an arbitrary institutional email address (e.g., `principal@engineeringcollege.edu.in`). Because the database trigger immediately stamps `email_confirmed_at = now()`, Supabase treats the user as fully verified without sending or requiring a verification email.
  2. **Account Squatting:** If the legitimate institution administrator subsequently attempts to register, they will be blocked with *"User already registered"*, locking out legitimate institutional authorities.
  3. **No Domain Verification:** No domain verification or MX record check occurs, permitting disposable and malicious email addresses to register.
- **Root Cause:** Introduced as a quick workaround to bypass Supabase's default free-tier rate limit of ~3 transactional emails per hour (`over_email_send_rate_limit`).
- **Remediation Requirement:**
  1. **Drop Trigger Immediately in Production:**
     ```sql
     drop trigger if exists on_auth_user_auto_confirm on auth.users;
     drop function if exists public.auto_confirm_new_user();
     ```
  2. **Configure Dedicated Custom SMTP:**
     In the Supabase Dashboard (`Project Settings -> Authentication -> SMTP Settings`), configure a transactional email provider (such as Resend, Brevo/Sendinblue, or SendGrid) with a verified institutional sender identity.
  3. **Do not disable email verification in production to bypass rate limits.**

---

### SEC-02: Missing ClamAV Antivirus Daemon in Serverless Environment (CWE-509)
- **Severity:** **MEDIUM**
- **Vulnerable Artifact:** [backend/app/antivirus_scanner.py](file:///c:/Users/Rajan/OneDrive/Desktop/aicte-compliance-ai/backend/app/antivirus_scanner.py#L52-L66)
- **Finding:**
  The backend code attempts to connect to a local or networked ClamAV daemon via TCP port 3310 or `/var/run/clamav/clamd.ctl`.
  In the Vercel Serverless environment (`api/index.py`), no ClamAV daemon is running. Consequently, all legitimate uploads fall through to:
  ```python
  return ScanResult(
      status="scan_unavailable",
      scanner_name="ClamAV (Not Configured)",
      details="Antivirus daemon not reachable in this environment. File stored with unverified status.",
      scanned_at=now,
  )
  ```
- **Defense-in-Depth Analysis:**
  The scanner correctly rejects the 68-byte EICAR test string via an in-memory python byte check (`EICAR_SIGNATURE in content`), and blocks corrupted files missing `%PDF-`. However, polymorphic malware or malicious embedded JavaScript inside genuine PDF structures will bypass the in-memory checks because ClamAV is offline.
- **Remediation Requirement:**
  Deploy ClamAV as a containerized sidecar or separate microservice on Render, or utilize a cloud file-scanning API (AWS GuardDuty for S3 / VirusTotal Enterprise) to scan files asynchronously upon upload.

---

### SEC-03: Lack of Rate-Limiting on In-Memory PDF Extraction (CWE-400)
- **Severity:** **MEDIUM**
- **Vulnerable Artifact:** [backend/app/main.py](file:///c:/Users/Rajan/OneDrive/Desktop/aicte-compliance-ai/backend/app/main.py#L357-L375) (`POST /api/v1/documents/analyze`)
- **Finding:**
  The `POST /api/v1/documents/analyze` endpoint accepts multipart uploads up to 10 MiB and parses them in-memory using `pypdf`.
  This endpoint does not require authentication and has no IP-based rate limiting. An attacker can repeatedly submit 10 MiB complex PDFs with thousands of objects, exhausting memory and CPU in the serverless instance and leading to Denial of Service (DoS) for legitimate users.
- **Remediation Requirement:**
  1. Add FastAPI rate-limiting middleware (e.g. `slowapi` with a limit of 10 requests per minute per IP).
  2. Require an authenticated user token (`Authorization: Bearer <token>`) for PDF analysis.

---

### SEC-04: Multi-Tenant Row-Level Security (RLS) Verification
- **Severity:** **INFORMATIONAL (STRENGTH)**
- **Artifact:** [supabase/migrations/20261024000000_validation_history.sql](file:///c:/Users/Rajan/OneDrive/Desktop/aicte-compliance-ai/supabase/migrations/20261024000000_validation_history.sql#L70-L100)
- **Evaluation:**
  - The PostgreSQL function `public.has_institution_role(target_institution, allowed_roles)` is declared as `security definer` with `set search_path = ''` (preventing search path hijacking).
  - All public tables (`institutions`, `institution_memberships`, `validation_runs`, `institution_documents`) have RLS enabled with explicit `grant` statements limited to `authenticated`.
  - All PostgREST queries pass the user's Supabase JWT; no `service_role` key is embedded in frontend client code or exposed in the repository.
- **Verdict:** **PASS.** Multi-tenant tenant isolation is implemented securely.

---

### SEC-05: Privilege Escalation Prevention in Onboarding
- **Severity:** **INFORMATIONAL (STRENGTH)**
- **Artifact:** [supabase/migrations/20261025000000_auth_onboarding.sql](file:///c:/Users/Rajan/OneDrive/Desktop/aicte-compliance-ai/supabase/migrations/20261025000000_auth_onboarding.sql#L47-L50)
- **Evaluation:**
  When a newly authenticated user onboards an institution via `public.onboard_applicant(p_external_ref, p_display_name)`, the role is hardcoded to `'applicant'`:
  ```sql
  insert into public.institution_memberships (institution_id, user_id, role)
  values (v_institution_id, v_user_id, 'applicant')
  on conflict (institution_id, user_id) do nothing;
  ```
  Users cannot self-assign `'institution_admin'` or `'reviewer'` roles through the public RPC interface.
- **Verdict:** **PASS.** Privilege escalation is prevented at the database layer.

