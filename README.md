# AICTE Compliance Assistant

A prototype for preliminary AICTE application-checklist validation and advisory institutional-document OCR.

## Current scope

- FastAPI validation checks only the checklist and dates supplied by the caller.
- Optional local OCR extracts a small set of context-labelled fields for human review.
- A rule-catalogue schema records proposed rule metadata; it does not activate or execute official AICTE requirements.

## Important limitations

This prototype does **not** authenticate documents, establish regulatory compliance, or independently verify an institution's status. Regulatory applicability and source versions remain subject to official-source review. OCR output is advisory and must be checked against the original document.

Public document uploads and production use remain blocked until authentication/authorization, tenant isolation, private storage, malware scanning, persistent audit, retention/deletion controls, and the applicable official-source review are implemented and tested.

See the open pull requests and research notes for implementation status, validation evidence, and remaining gates.