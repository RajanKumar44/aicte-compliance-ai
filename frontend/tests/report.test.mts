import test from "node:test";
import assert from "node:assert/strict";
import { createValidationCsv, validationReportFilename } from "../app/src/lib/report.ts";
import type { ValidationRequest, ValidationResponse } from "../app/src/lib/api.ts";

const request: ValidationRequest = {
  institution_id: "=SYNTH-001",
  application_type: "eoa",
  required_documents: ["Fire safety, certificate", "Land \"record\""],
  submitted_documents: ["Fire safety, certificate"],
  expiry_dates: { "Fire safety, certificate": "2030-01-31" },
};

const response: ValidationResponse = {
  institution_id: "=SYNTH-001",
  application_type: "eoa",
  status: "attention_required",
  validation_scope: "caller_supplied_checklist_only",
  missing_documents: ["Land \"record\""],
  expired_documents: [],
  findings: [{
    code: "MISSING_DOCUMENT",
    document_type: "Land \"record\"",
    message: "Missing, with comma, quote \"and\" newline\nsecond line — परीक्षण",
    evidence: { source: "submitted_document_list", observed: "not_submitted" },
  }],
  checked_at: "2026-10-24T12:30:00+00:00",
  source: "synthetic_demo_input",
  notice: "Preliminary comparison only",
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted && character === '"' && text[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (!quoted && character === ",") {
      row.push(field);
      field = "";
    } else if (!quoted && character === "\r" && text[index + 1] === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      index += 1;
    } else {
      field += character;
    }
  }
  assert.equal(quoted, false);
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

test("CSV exports request, response, timestamps, evidence, and safe spreadsheet cells", () => {
  const csv = createValidationCsv(request, response, "2026-10-24T12:40:00.000Z");
  assert.match(csv, /record_type/);
  assert.match(csv, /"'\=SYNTH-001"/);
  assert.match(csv, /"2026-10-24T12:30:00\+00:00"/);
  assert.match(csv, /"2026-10-24T12:40:00\.000Z"/);
  assert.match(csv, /"Land ""record"""/);
  assert.match(csv, /Missing, with comma/);
  assert.match(csv, /тест|परीक्षण/);
  assert.match(csv, /"\{""source"":""submitted_document_list"",""observed"":""not_submitted""\}"/);
  assert.match(csv, /caller_supplied_checklist_only/);
  const rows = parseCsv(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].length, 17);
  assert.equal(rows[1].length, 17);
  assert.equal(rows[1][15], response.findings[0].message);
  assert.equal(rows[1][16], JSON.stringify(response.findings[0].evidence));
});

test("CSV protects formula initiators after leading spaces and handles zero findings", () => {
  const formulaRequest = { ...request, institution_id: "  +SUM(1,2)" };
  const noFindings = { ...response, institution_id: formulaRequest.institution_id, status: "preliminary_checks_passed" as const, findings: [], missing_documents: [], notice: "=Do not execute" };
  const csv = createValidationCsv(formulaRequest, noFindings, "2026-10-24T12:40:00.000Z");
  assert.match(csv, /"'  \+SUM\(1,2\)"/);
  assert.match(csv, /"summary"/);
  assert.match(csv, /"'\=Do not execute"/);
  assert.equal(csv.endsWith("\r\n"), true);
  assert.equal(parseCsv(csv).length, 2);
  assert.equal(validationReportFilename(response.checked_at), "preliminary-validation-2026-10-24.csv");
  assert.equal(validationReportFilename("invalid"), "preliminary-validation-undated.csv");
});
