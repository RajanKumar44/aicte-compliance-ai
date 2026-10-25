import test from "node:test";
import assert from "node:assert/strict";
import { filterAndSortFindings } from "../app/src/lib/findings.ts";
import type { Finding } from "../app/src/lib/api.ts";

const findings: Finding[] = [
  { code: "DOCUMENT_EXPIRED", document_type: "fire_certificate", message: "Expiry date is past", evidence: { expiry_date: "2020-01-01" } },
  { code: "MISSING_DOCUMENT", document_type: "land_record", message: "Required document was not submitted", evidence: { observed: "not_submitted" } },
  { code: "MISSING_DOCUMENT", document_type: "building_plan", message: "Required document was not submitted", evidence: { observed: "not_submitted" } },
];

test("findings search composes with finding-code filters", () => {
  const result = filterAndSortFindings(findings, "not submitted", "MISSING_DOCUMENT", "document");
  assert.deepEqual(result.map(({ finding }) => finding.document_type), ["building_plan", "land_record"]);
  assert.deepEqual(filterAndSortFindings(findings, "fire", "MISSING_DOCUMENT", "document"), []);
});

test("finding search includes document, message, and code and does not mutate source", () => {
  const snapshot = structuredClone(findings);
  const result = filterAndSortFindings(findings, "document_expired", "all", "code");
  assert.deepEqual(result.map(({ finding }) => finding.code), ["DOCUMENT_EXPIRED"]);
  assert.deepEqual(findings, snapshot);
});
