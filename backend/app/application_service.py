"""Application-centric checklist and preliminary rule engine.

This module connects the institution/application data model to the document
vault, OCR analysis, antivirus status and the validation pipeline.

Honesty contract
----------------
The checklist and rule identifiers below are **demo configuration for the
SYNTH 26261 prototype**, not verified AICTE rule definitions. Items that would
need official numeric thresholds (faculty/student ratios, cadre quotas,
infrastructure areas) are marked ``pending_configuration`` and are never
evaluated into pass/fail findings. Only structural checks that rely on
evidence actually submitted with the application are executed:

* missing mandatory documents
* expiry dates parsed from the submitted PDFs
* institution identifier / certificate-number consistency across documents
* duplicate content (same SHA-256) and duplicate certificate numbers
* antivirus / OCR status of the submitted evidence
* documents flagged for human review by the OCR pipeline

Every produced finding carries code, severity, rule id/version, explanation,
evidence and a suggested next action. A result with no failures means only
that these structural checks passed — it is not regulatory compliance and it
says nothing about document authenticity.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime
from typing import Any, Literal

# ---------------------------------------------------------------------------
# Checklist configuration
# ---------------------------------------------------------------------------

Severity = Literal["critical", "high", "medium", "info"]
ItemStatus = Literal["mandatory", "conditional", "not_applicable", "pending_configuration"]

RULE_VERSION = "demo-config-0.1.0"
RULE_SOURCE_NOTE = (
    "SYNTHETIC DEMO CONFIGURATION — NOT AN OFFICIAL AICTE CHECKLIST. "
    "Every item traces to demo rule ids only."
)


@dataclass(frozen=True)
class ChecklistItem:
    item_id: str
    label: str
    rule_id: str
    gmail_hint: str = ""  # ignored, kept out of schema
    base_status: ItemStatus = "mandatory"
    requires_params: tuple[str, ...] = ()
    requires_pdf_expiry: bool = False
    requires_pdf_certificate_number: bool = False
    description: str = ""

    @property
    def versioned_rule_id(self) -> str:
        return f"{self.rule_id}@{RULE_VERSION}"


CHECKLIST_ITEMS: tuple[ChecklistItem, ...] = (
    ChecklistItem(
        "application_form",
        "Application form (EoA)",
        "AICTE-EOA-DEMO-001",
        description="Mandatory application form for Extension of Approval.",
    ),
    ChecklistItem(
        "aicte_approval_certificate",
        "Previous AICTE approval / EoA letter",
        "AICTE-EOA-DEMO-002",
        requires_pdf_expiry=True,
        requires_pdf_certificate_number=True,
        description="Previous approval letter; expiry is compared with the evaluation date.",
    ),
    ChecklistItem(
        "mandatory_disclosure",
        "Mandatory disclosure package",
        "AICTE-EOA-DEMO-003",
        description="Statutory public disclosures for the academic year.",
    ),
    ChecklistItem(
        "fire_safety_noc",
        "Fire safety NOC",
        "AICTE-EOA-DEMO-004",
        base_status="conditional",
        requires_params=("hostel",),
        requires_pdf_expiry=True,
        description="Applies when the application declares on-campus hostel facilities.",
    ),
    ChecklistItem(
        "building_completion_certificate",
        "Building completion certificate",
        "AICTE-EOA-DEMO-005",
        base_status="conditional",
        requires_params=("new_building",),
        description="Applies when a newly constructed building is declared.",
    ),
    ChecklistItem(
        "faculty_fsr_statement",
        "Faculty / FSR compliance statement",
        "AICTE-EOA-DEMO-006",
        base_status="pending_configuration",
        description="Faculty-to-student ratio thresholds are NOT configured in this prototype.",
    ),
    ChecklistItem(
        "infrastructure_evidence",
        "Infrastructure evidence package",
        "AICTE-EOA-DEMO-007",
        base_status="pending_configuration",
        description="Infrastructure area norms are NOT configured in this prototype.",
    ),
)

BOOL_PARAM_KEYS = ("hostel", "new_building")


def build_checklist(params: dict[str, Any]) -> list[dict[str, Any]]:
    """Derive per-application checklist statuses from declaration params.

    The declared parameters decide conditional applicability only. Missing
    parameters leave the item ``pending_configuration`` rather than silently
    deciding mandatory/not-applicable.
    """
    checklist: list[dict[str, Any]] = []
    for item in CHECKLIST_ITEMS:
        status: ItemStatus
        if item.base_status == "conditional":
            if not item.requires_params:
                status = "pending_configuration"
            else:
                declared = [params.get(key) for key in item.requires_params]
                if any(value is None for value in declared):
                    status = item.base_status  # unresolved parameters keep the notice visible
                elif any(bool(value) for value in declared):
                    status = "mandatory"
                else:
                    status = "not_applicable"
        else:
            status = item.base_status
        checklist.append({
            "item_id": item.item_id,
            "label": item.label,
            "rule_id": item.rule_id,
            "rule_id_versioned": item.versioned_rule_id,
            "status": status,
            "requires_expiry": item.requires_pdf_expiry,
            "requires_certificate_number": item.requires_pdf_certificate_number,
            "description": item.description,
            "source_note": RULE_SOURCE_NOTE,
        })
    return checklist


def resolve_checklist(checklist_snapshot: list[dict[str, Any]], params: dict[str, Any]) -> list[dict[str, Any]]:
    """Re-resolve a stored checklist against updated declaration parameters."""
    if not isinstance(checklist_snapshot, list):
        return []
    return build_checklist(params)


# ---------------------------------------------------------------------------
# Findings
# ---------------------------------------------------------------------------

def _today() -> date:
    return datetime.now(UTC).date()


def _parse_iso(value: Any) -> date | None:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        return date.fromisoformat(value.strip()[:10])
    except ValueError:
        return None


def _finding(
    code: str,
    severity: Severity,
    rule_id: str,
    message: str,
    evidence: dict[str, Any],
    action: str,
) -> dict[str, Any]:
    return {
        "code": code,
        "severity": severity,
        "rule_id": f"{rule_id}@{RULE_VERSION}",
        "message": message,
        "evidence": evidence,
        "recommended_action": action,
        "status": "open",
    }


def document_extracted_fields(metadata: dict[str, Any]) -> dict[str, Any]:
    """Normalise stored ``extracted_metadata`` into candidate fields/dict info."""
    if not isinstance(metadata, dict):
        return {}
    fields = metadata.get("fields")
    fields = fields if isinstance(fields, dict) else {}
    candidates = metadata.get("candidate_fields")
    candidate_value = {}

    def field_value(name: str) -> Any:
        block = fields.get(name)
        if isinstance(block, dict):
            return block.get("value")
        return None

    if isinstance(candidates, dict):
        candidate_value = {key: candidates.get(key) for key in
                           ("expiry_date", "issue_date", "certificate_number", "issuing_authority", "institution_id")}
    else:
        candidate_value = {
            "expiry_date": field_value("expiry_date"),
            "issue_date": field_value("issue_date"),
            "certificate_number": field_value("certificate_number"),
            "issuing_authority": field_value("issuing_authority"),
        }
    if not candidate_value.get("institution_id"):
        raw_inst = fields.get("institution_id")
        candidate_value["institution_id"] = raw_inst.get("value") if isinstance(raw_inst, dict) else None
    return {
        "fields": fields,
        "candidates": candidate_value,
        "ocr_status": metadata.get("ocr_status", "not_needed"),
        "scan_status": metadata.get("scan_status", "scan_unavailable"),
        "requires_human_review": bool(metadata.get("requires_human_review", True)),
        "is_scanned_only": bool(metadata.get("is_scanned_only", False)),
        "page_count": metadata.get("page_count"),
        "sha256": metadata.get("sha256"),
        "filename": metadata.get("filename"),
    }


def field_value_names(fields: dict[str, Any]) -> tuple[tuple[str, Any], ...]:
    return tuple((name, block.get("value")) for name, block in fields.items() if isinstance(block, dict))


def generate_application_findings(
    *,
    application: dict[str, Any],
    checklist: list[dict[str, Any]],
    linked_documents: list[dict[str, Any]],
    institution_external_ref: str,
) -> list[dict[str, Any]]:
    """Run the demo rule engine over an application's linked documents.

    ``linked_documents`` rows must embed the document_versions row either
    directly or under ``documents`` (PostgREST embed shape).
    """
    findings: list[dict[str, Any]] = []
    today = _today()

    linked_item_ids: set[str] = set()
    docs: list[dict[str, Any]] = []
    for row in linked_documents:
        document = row.get("documents", row)
        if not isinstance(document, dict):
            continue
        item_id = row.get("checklist_item_id") or document.get("checklist_item_id")
        if isinstance(item_id, str) and item_id:
            linked_item_ids.add(item_id)
        merged = document_extracted_fields(document.get("extracted_metadata") or document)
        merged["id"] = document.get("id")
        merged["checklist_item_id"] = item_id
        merged["sha256"] = document.get("sha256") or merged.get("sha256")
        merged["filename"] = document.get("filename") or merged.get("filename")
        merged["filename"] = document.get("filename") or merged.get("filename")
        documents_page = document.get("storage_path") or merged.get("storage_path") or "stored document"
        merged["storage_ref"] = documents_page
        docs.append(merged)

    # Missing mandatory checklist items.
    for item in checklist:
        if item.get("status") not in ("mandatory", "conditional"):
            continue
        if item["item_id"] in linked_item_ids:
            continue
        if item.get("status") == "conditional" and item["item_id"] not in linked_item_ids:
            continue
        if item.get("status") == "mandatory" and item["item_id"] not in linked_item_ids:
            findings.append(_finding(
                code="MISSING_REQUIRED_DOCUMENT",
                severity="high",
                rule_id=item["rule_id"],
                message=(f"Mandatory checklist item '{item['label']}' ({item['item_id']}) "
                         "has no linked document."),
                evidence={"checklist_item": item["item_id"], "source": "application_checklist"},
                action="Upload the missing document or declare the parameter making it non-applicable.",
            ))

    # Per-document rule checks against extracted OCR fields.
    seen_sha256: dict[str, dict[str, Any]] = {}
    seen_certificate_no: dict[str, dict[str, Any]] = {}
    for doc in docs:
        doc_ref = doc.get("storage_ref") or doc.get("id") or "document"
        file_hint = doc.get("filename") or "document.pdf"

        candidates = doc.get("candidates") or {}
        sha256 = doc.get("sha256")
        if isinstance(sha256, str) and sha256:
            if sha256 in seen_sha256:
                findings.append(_finding(
                    code="DUPLICATE_DOCUMENT_SHA256",
                    severity="medium",
                    rule_id="DEMO-CONSIST-001",
                    message=(f"Document '{file_hint}' is content-identical to "
                             f"'{seen_sha256[sha256].get('filename', 'an earlier upload')}' "
                             f"(same SHA-256)."),
                    evidence={"sha256": sha256, "duplicate_of": seen_sha256[sha256].get("filename"), "finding_doc": doc_ref},
                    action="Review whether one copy should be withdrawn.",
                ))
            else:
                seen_sha256[sha256] = doc

        certificate_number = candidates.get("certificate_number")
        if isinstance(certificate_number, str) and certificate_number.strip():
            key = certificate_number.strip().lower()
            if key in seen_certificate_no and seen_certificate_no[key].get("id") != doc.get("id"):
                findings.append(_finding(
                    code="CERTIFICATE_NUMBER_CONFLICT",
                    severity="high",
                    rule_id="DEMO-CONSIST-002",
                    message=(f"Certificate number '{certificate_number}' appears on both "
                             f"'{seen_certificate_no[key].get('filename', 'another document')}' "
                             f"and '{file_hint}'."),
                    evidence={"certificate_number": certificate_number, "finding_doc": doc_ref},
                    action="Verify the correct issuing record with the authority.",
                ))
            else:
                seen_certificate_no[key] = doc

        institution_candidates = candidates.get("institution_id")
        extracted_institution_ids = [institution_candidates] if institution_candidates else []
        metadata_fields = doc.get("fields") if isinstance(doc.get("fields"), dict) else {}
        raw_inst = metadata_fields.get("institution_id")
        if isinstance(raw_inst, dict) and raw_inst.get("value"):
            extracted_institution_ids.append(raw_inst["value"])
        for extracted_id in extracted_institution_ids:
            if not isinstance(extracted_id, str) or not extracted_id.strip():
                continue
            if extracted_id.strip() != institution_external_ref.strip():
                findings.append(_finding(
                    code="INSTITUTION_ID_MISMATCH",
                    severity="high",
                    rule_id="DEMO-CONSIST-003",
                    message=(f"Document '{file_hint}' carries institution identifier "
                             f"'{extracted_id.strip()}' but the application belongs to "
                             f"'{institution_external_ref}'."),
                    evidence={"extracted_id": extracted_id.strip(),
                              "application_institution": institution_external_ref,
                              "finding_doc": doc_ref},
                    action="Upload the certificate actually issued to this institution.",
                ))

        expiry_value = candidates.get("expiry_date")
        if item_needs_expiry(checklist, doc):
            parsed_expiry = _parse_iso(expiry_value)
            if parsed_expiry is None:
                findings.append(_finding(
                    code="EXTRACTED_FIELD_INCOMPLETE",
                    severity="medium",
                    rule_id="DEMO-CONSIST-004",
                    message=(f"Document '{file_hint}' requires an expiry date but none "
                             "could be extracted from the OCR/PDF text."),
                    evidence={"missing_field": "expiry_date", "finding_doc": doc_ref},
                    action="Upload a legible scan or correct the extracted value during review.",
                ))
            elif parsed_expiry < today:
                findings.append(_finding(
                    code="DOCUMENT_EXPIRED",
                    severity="critical",
                    rule_id="DEMO-EXPIRY-001",
                    message=(f"Document '{file_hint}' expired on {parsed_expiry.isoformat()}, "
                             f"before the evaluation date {today.isoformat()}."),
                    evidence={"expiry_date": parsed_expiry.isoformat(),
                              "evaluation_date": today.isoformat(),
                              "finding_doc": doc_ref},
                    action="Upload a renewed certificate.",
                ))

        certificate_required = item_needs_certificate_number(checklist, doc)
        if certificate_required and not (isinstance(certificate_number, str) and certificate_number.strip()):
            findings.append(_finding(
                code="EXTRACTED_FIELD_INCOMPLETE",
                severity="medium",
                rule_id="DEMO-CONSIST-004",
                message=f"Document '{file_hint}' requires a certificate number but none was extracted.",
                evidence={"missing_field": "certificate_number", "finding_doc": doc_ref},
                action="Upload a legible copy or correct the extracted value during review.",
            ))

        scan_status = doc.get("scan_status")
        if scan_status == "infected":
            findings.append(_finding(
                code="MALWARE_SUSPECTED",
                severity="critical",
                rule_id="DEMO-SAFETY-001",
                message=f"Uploaded file '{file_hint}' was flagged by the antivirus scan.",
                evidence={"scan_status": "infected", "finding_doc": doc_ref},
                action="Withdraw the document and re-upload a clean copy.",
            ))
        elif scan_status == "scan_unavailable":
            findings.append(_finding(
                code="ANTIVIRUS_SCAN_UNAVAILABLE",
                severity="info",
                rule_id="DEMO-SAFETY-002",
                message=f"Antivirus scan of '{file_hint}' could not complete.",
                evidence={"scan_status": "scan_unavailable", "finding_doc": doc_ref},
                action="Treat as unverified until a scan completes.",
            ))
        ocr_status = doc.get("ocr_status")
        if ocr_status == "unavailable":
            findings.append(_finding(
                code="OCR_UNAVAILABLE",
                severity="info",
                rule_id="DEMO-OCR-001",
                message=f"OCR engine was unavailable for '{file_hint}'.",
                evidence={"ocr_status": "unavailable", "finding_doc": doc_ref},
                action="Retry once the OCR engine is deployed.",
            ))
        if doc.get("requires_human_review"):
            findings.append(_finding(
                code="EXTRACTED_FIELD_PENDING_REVIEW",
                severity="info",
                rule_id="DEMO-REVIEW-001",
                message=f"Fields extracted from '{file_hint}' still need human verification.",
                evidence={"requires_human_review": True, "finding_doc": doc_ref},
                action="Review and correct the extracted values.",
            ))
        if doc.get("is_scanned_only"):
            findings.append(_finding(
                code="LOW_CONFIDENCE_SCAN",
                severity="info",
                rule_id="DEMO-OCR-002",
                message=(f"Document '{file_hint}' contains little selectable text; "
                         "it is treated as a low-quality scan."),
                evidence={"is_scanned_only": True, "finding_doc": doc_ref},
                action="Upload a text-based PDF when possible; expect manual verification.",
            ))

    # Unconfigured rules: never evaluate, only surface.
    for item in checklist:
        if item.get("status") == "pending_configuration":
            findings.append(_finding(
                code="RULE_UNCONFIGURED",
                severity="info",
                rule_id=item["rule_id"],
                message=(f"Checklist item '{item['label']}' is pending rule configuration "
                         "and was NOT evaluated. No pass/fail is claimed."),
                evidence={"checklist_item": item["item_id"], "source": "rule_catalog"},
                action="Configure the rule from a verified source before relying on it.",
            ))

    return findings


def item_needs_expiry(checklist: list[dict[str, Any]], doc: dict[str, Any]) -> bool:
    for item in checklist:
        if item.get("requires_expiry"):
            return bool(checklist_item_matches(item, doc))
    return False


def item_needs_certificate_number(checklist: list[dict[str, Any]], doc: dict[str, Any]) -> bool:
    for item in checklist:
        if item.get("requires_certificate_number"):
            return bool(checklist_item_matches(item, doc))
    return False


def checklist_item_matches(item: dict[str, Any], doc: dict[str, Any]) -> bool:
    """Heuristic match of a linked document against a checklist item id."""
    item_id = item.get("item_id")
    if not item_id:
        return False
    linked_marker = doc.get("checklist_item_id") or doc.get("document_type") or ""
    words = item_id.replace("_", " ")
    return item_id in linked_marker or words in linked_marker or words in (doc.get("filename") or "").lower()


def overall_application_status(findings: list[dict[str, Any]]) -> str:
    blocking = {"critical", "high", "medium"}
    if any(f.get("severity") in blocking for f in findings):
        return "attention_required"
    return "preliminary_checks_passed"


def report_payload(
    *,
    application: dict[str, Any],
    institution: dict[str, Any],
    checklist: list[dict[str, Any]],
    findings: list[dict[str, Any]],
    reviews: list[dict[str, Any]],
    audit_events: list[dict[str, Any]],
    documents: list[dict[str, Any]],
) -> dict[str, Any]:
    """Build the downloadable preliminary scrutiny report."""
    now = datetime.now(UTC).isoformat()
    return {
        "report_kind": "preliminary_scrutiny_report",
        "report_version": RULE_VERSION,
        "generated_at": now,
        "disclaimer": (
            "Preliminary decision support only. This report does not verify document "
            "authenticity, institutional status or regulatory compliance. The final "
            "decision rests with competent AICTE authorities."
        ),
        "application": {
            "id": application.get("id"),
            "institution_id": application.get("institution_id"),
            "institution_external_ref": application.get("institution_external_ref"),
            "application_type": application.get("application_type"),
            "academic_year": application.get("academic_year"),
            "status": application.get("status"),
            "created_at": application.get("created_at"),
            "params": application.get("params"),
        },
        "institution": {
            "id": institution.get("id"),
            "external_ref": institution.get("external_ref"),
            "display_name": institution.get("display_name"),
        },
        "checklist": checklist,
        "rules_applied": {
            "rule_source": RULE_SOURCE_NOTE,
            "rule_version": RULE_VERSION,
            "evaluated_checks": [
                "missing_required_document",
                "document_expired",
                "institution_id_mismatch",
                "certificate_number_conflict",
                "duplicate_document_sha256",
                "malware_scan_status",
                "ocr_status",
                "extracted_field_incomplete",
                "extracted_field_pending_review",
                "low_confidence_scan",
                "rule_unconfigured (informational, never evaluated)",
            ],
        },
        "documents_checked": [
            {
                "id": d.get("id"),
                "filename": d.get("filename"),
                "sha256": (d.get("extracted_metadata") or {}).get("sha256"),
                "scan_status": d.get("scan_status"),
                "ocr_status": (d.get("extracted_metadata") or {}).get("ocr_status"),
                "checklist_link": (d.get("link") or {}).get("checklist_item_id"),
            }
            for d in documents
        ],
        "findings": findings,
        "review_decisions": reviews,
        "audit_history": audit_events,
    }
