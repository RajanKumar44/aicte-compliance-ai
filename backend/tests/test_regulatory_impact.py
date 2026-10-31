"""Unit and Integration Tests for Regulatory Change Impact Analyzer (Feature 3)."""
from __future__ import annotations

import asyncio

from backend.app.regulatory_impact import (
    ChangeReviewRequest,
    ImpactGenerateRequest,
    ImpactReviewRequest,
    SourceCreateRequest,
    VersionCompareRequest,
    compare_regulatory_versions,
    create_impact_assessment,
    create_regulatory_source,
    get_regulatory_change_detail,
    get_regulatory_dashboard,
    get_version_clauses,
    list_compliance_requirements,
    list_regulatory_changes,
    list_regulatory_documents,
    list_regulatory_sources,
    review_institutional_impact,
    review_regulatory_change,
)


def test_regulatory_sources_and_documents():
    """Verify registry listing and new source creation."""
    async def _run():
        sources = await list_regulatory_sources()
        assert len(sources) >= 2
        assert any("Approval Process Handbook" in s["name"] for s in sources)

        new_src = await create_regulatory_source(
            SourceCreateRequest(
                name="State Department of Technical Education Portal",
                official_url="https://dte.state.gov.in/notifications",
                publisher="State Technical Education Directorate",
                category="state_policy",
                source_type="regulatory_board",
            )
        )
        assert new_src["id"] is not None
        assert new_src["verification_status"] == "verified"

        docs = await list_regulatory_documents()
        assert len(docs) >= 1
        assert any("APH 2024" in d["title"] for d in docs)

    asyncio.run(_run())


def test_version_clause_extraction_and_comparison():
    """Verify clause retrieval and deterministic comparison diff between versions."""
    async def _run():
        clauses = await get_version_clauses("ver-26")
        assert len(clauses) >= 3
        assert any(c["clause_number"] == "Annexure 5" for c in clauses)

        # Compare ver-26 against ver-24
        comp = await compare_regulatory_versions(
            "ver-26",
            VersionCompareRequest(target_version_id="ver-26", base_version_id="ver-24"),
        )
        assert comp["total_changes"] >= 2
        clause_types = [c["change_type"] for c in comp["changes"]]
        assert "modified" in clause_types
        assert "added" in clause_types

    asyncio.run(_run())


def test_regulatory_change_review():
    """Verify reviewer confirmation of proposed changes."""
    async def _run():
        changes = await list_regulatory_changes()
        assert len(changes) >= 3

        detail = await get_regulatory_change_detail("chg-01")
        assert detail["id"] == "chg-01"
        assert "mapped_requirements" in detail

        reviewed = await review_regulatory_change(
            "chg-01",
            ChangeReviewRequest(
                review_status="confirmed",
                comments="Verified against official Gazette publication",
            ),
        )
        assert reviewed["review_status"] == "confirmed"

    asyncio.run(_run())


def test_institutional_impact_generation_and_review():
    """Verify generation of institutional impact records and review decisions."""
    async def _run():
        reqs = await list_compliance_requirements()
        assert len(reqs) >= 3

        impact = await create_impact_assessment(
            ImpactGenerateRequest(
                change_id="chg-01",
                institution_id="INST-SAMPLE-01",
                requirement_id="req-01",
                impact_category="requirement_review_required",
                impact_severity="high",
                explanation="1:20 UG Engineering norm confirmed with Diploma exemption.",
                recommended_action="Update Faculty Cadre breakdown in Institutional Portal.",
            )
        )
        assert impact["id"] is not None
        assert impact["impact_severity"] == "high"

        # Review institutional impact
        rev = await review_institutional_impact(
            impact["id"],
            ImpactReviewRequest(review_status="acknowledged", comments="Noted for next intake review"),
        )
        assert rev["review_status"] == "acknowledged"

        # Verify dashboard
        dash = await get_regulatory_dashboard("INST-SAMPLE-01")
        assert dash["total_sources"] >= 2
        assert dash["confirmed_changes"] >= 2
        assert dash["active_academic_year"] == "2026-27"

    asyncio.run(_run())
