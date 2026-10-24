import test from "node:test";
import assert from "node:assert/strict";
import { hasTrimmedDuplicates, validateCompleteRequest, validateValidationStep } from "../app/src/lib/form-validation.ts";
import type { ValidationRequest } from "../app/src/lib/api.ts";

const completeRequest: ValidationRequest = {
  institution_id: "SYNTH-001",
  application_type: "eoa",
  required_documents: ["Fire Safety"],
  submitted_documents: ["Fire Safety"],
  expiry_dates: {},
};

test("step validation checks context and document requirements at the relevant step", () => {
  assert.deepEqual(validateValidationStep({ ...completeRequest, institution_id: " " }, 0), {
    institution_id: "Institution ID is required.",
  });
  assert.deepEqual(validateValidationStep({ ...completeRequest, required_documents: [] }, 1), {
    required_documents: "Add at least one required document.",
  });
  assert.deepEqual(validateValidationStep(completeRequest, 2), {});
});

test("duplicate check matches backend trim-only, case-sensitive comparison", () => {
  assert.equal(hasTrimmedDuplicates(["Land", " Land "]), true);
  assert.equal(hasTrimmedDuplicates(["Land", "land"]), false);
  assert.equal(hasTrimmedDuplicates(["Fire safety", "Fire_safety"]), false);
});

test("final request validation reports all required fields without changing the request", () => {
  const invalidRequest = { ...completeRequest, institution_id: "", required_documents: [] };
  const before = structuredClone(invalidRequest);
  assert.deepEqual(validateCompleteRequest(invalidRequest), {
    institution_id: "Institution ID is required.",
    required_documents: "At least one required document is required.",
  });
  assert.deepEqual(invalidRequest, before);
});
