# Phase 2 — Regulatory Research System

**Snapshot date:** 2026-10-23  
**Status:** Research workflow documented; regulatory verification still open.

## Objective

Use separate discovery and document-analysis workflows, preserve claim-level provenance, and never fill gaps in official documents with assumptions.

## Prompt A — Claude Desktop: document inspection and reconciliation

Use this prompt when official documents or research dossiers are available to inspect:

> You are the source-analysis reviewer for the SIH26261 AICTE Compliance Assistant. Treat every provided document as evidence to inspect, not as unquestionable truth. Do not invent missing text, clauses, dates, page numbers, applicability, or legal effect.
>
> For each source, record the exact title, issuing authority, publication/reference number if visible, publication date, effective date if stated, academic year/category, official URL or supplied filename, retrieval date, file hash when available, and pages actually inspected.
>
> Extract each candidate claim separately. Record the exact clause and printed/PDF page, a short faithful quotation or precise paraphrase, applicability conditions, exceptions, effective period, source location, and what the source does not establish.
>
> Compare the claim against later circulars, corrigenda, amendments and relevant official instructions. Preserve disagreements between sources or researchers. Never resolve a conflict by guessing. Mark unavailable source content as UNRESOLVED and identify the exact evidence needed to close it.
>
> Classify each claim as VERIFIED, PROVISIONAL, or UNRESOLVED. VERIFIED requires a directly inspected authoritative source, confirmed applicability/effective period, conflict review, and independent human review. A source title, search snippet, mirror, cached listing, or hash alone is not sufficient.
>
> Do not activate a rule, generate a definitive checklist, infer document authenticity, or make an official compliance decision. Return a claim ledger, source register, conflict register, unresolved blockers and recommended next evidence retrieval.

## Prompt B — Perplexity: official-source discovery

Use this prompt for finding primary sources, not for final rule interpretation:

> Research SIH26261 and the AICTE Extension of Approval requirements for the relevant academic year. Prioritize official AICTE, SIH, Gazette, Ministry or other issuing-authority sources. Search for the complete 1 April 2024 document titled “Revised set of Documents for scrutiny for various categories under chapter I & II”, official publication and effective status of any 2026–27 addendum/corrigendum, the applicable AICTE Approval Process Handbook, amendments, and the official SIH problem statement/deadline.
>
> For every result, provide exact title, issuing authority, direct URL, publication/reference number, publication/effective date if visible, relevant clause/page, and whether the actual document was opened and read. Separate official primary sources from mirrors, cached pages, commentary and search snippets.
>
> Do not infer that a document is draft/final from formatting alone. Do not infer that an API does not exist because a search found none. If a source is inaccessible or its status is unclear, mark it UNRESOLVED and explain exactly what official evidence would settle it. Do not invent or fill missing requirements.

## Source register fields

- Source ID; title; issuing authority.
- Official URL; local filename; retrieval timestamp; file hash.
- Publication/reference number; publication and effective dates.
- Academic year, application category and jurisdiction.
- Access status: opened/read, partial, listing only, mirror only, inaccessible.
- Clauses/pages actually inspected.
- Claims supported; claims not established.
- Related amendments/corrigenda and conflicts.
- Reviewer, review date and disposition.

## Claim evidence ledger fields

- Claim ID and exact claim text.
- Status: VERIFIED, PROVISIONAL or UNRESOLVED.
- Source ID, exact clause/page and short supporting extract.
- Applicability conditions, exceptions and effective interval.
- Contradicting/overriding sources and unresolved interpretation.
- Required positive, negative, boundary and exception tests.
- Human reviewer, review timestamp and activation decision.

## Status policy

**VERIFIED:** Primary authoritative content has been directly inspected; exact clause/page and applicability are recorded; amendment/conflict review is complete; a human reviewer approves the interpretation and tests exist.

**PROVISIONAL:** Plausible candidate evidence exists, but one or more checks remain incomplete. Must not be treated as an active mandatory rule.

**UNRESOLVED:** Required source content, effective status, applicability or interpretation cannot be established. No assumptions may substitute for evidence.

## Current unresolved regulatory baseline

The source register and verification report identify these open items:
1. Complete official 1 April 2024 scrutiny document has not been retrieved and reconciled.
2. Official publication, finality and effective date of the circulating 2026–27 addendum remain unresolved.
3. Annexure-2 §2.1 pagination and Clause 7.17 cross-reference need direct official-PDF verification.
4. NBA-validity wording through 30 April 2025 remains unresolved for AY 2026–27.
5. Official SIH26261 statement, theme, constraints and deadline have not been directly confirmed; the reported deadline is mirror-reported only.
6. AICTE API/integration availability is not researched/confirmed, not proven absent.
7. Candidate code/data reuse remains blocked pending licensing, authorship and personal-data/history review.

Primary project records: [source register](../research/source-register.md), [reconciliation](../research/reconciliation.md), [official-source verification report](../research/official-source-verification-report.md).

## Repeatable workflow

Discover official sources → capture source metadata and hashes → inspect exact passages → create claim-level evidence records → compare versions/amendments → preserve conflicts → obtain human review → classify status → add tests → activate only approved verified rules.

## Phase 2 outcome

The research method and reusable prompts are documented. This does **not** mean the regulatory research is complete. The EOA checklist must remain inactive while required source gaps remain open.