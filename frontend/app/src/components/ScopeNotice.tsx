import { Alert } from "./Alert";

export function ScopeNotice() {
  return (
    <Alert variant="info" title="Validation Scope">
      This tool evaluates only the checklist and dates you supply. It does not load
      an authoritative AICTE ruleset, verify document authenticity, or establish
      regulatory compliance.
    </Alert>
  );
}
