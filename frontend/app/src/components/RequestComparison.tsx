import type { ValidationRequest } from "@/lib/api";

interface RequestComparisonProps {
  request: ValidationRequest;
  missingDocuments: string[];
  expiredDocumentCount: number;
}

export function RequestComparison({
  request,
  missingDocuments,
  expiredDocumentCount,
}: RequestComparisonProps) {
  const requiredDocuments = request.required_documents;
  const requiredSet = new Set(requiredDocuments);
  const submittedSet = new Set(request.submitted_documents);
  const missingSet = new Set(missingDocuments);
  const missingCount = requiredDocuments.filter((document) => missingSet.has(document)).length;
  const submittedCount = requiredDocuments.filter((document) => submittedSet.has(document)).length;
  const responseMatchesRequest =
    requiredDocuments.length > 0 &&
    missingCount + submittedCount === requiredDocuments.length &&
    missingDocuments.length === missingCount &&
    missingDocuments.every((document) => requiredSet.has(document));

  return (
    <section aria-labelledby="request-comparison-title" className="space-y-4">
      <div>
        <h3 id="request-comparison-title" className="text-lg font-semibold text-text-heading">
          Required-list comparison
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-text-secondary">
          This visual summarizes list presence for this request. It is not a compliance score.
        </p>
      </div>

      {responseMatchesRequest ? (
        <figure className="space-y-4" aria-describedby="request-comparison-summary">
          <p id="request-comparison-summary" className="text-sm text-text-body">
            Of {requiredDocuments.length} required document names, {submittedCount} also appear in the submitted list and {missingCount} are reported missing.
          </p>

          <div
            className="flex h-5 w-full overflow-hidden border border-border bg-bg-1"
            aria-hidden="true"
          >
            <span
              className="h-full bg-primary-400"
              style={{ width: `${(submittedCount / requiredDocuments.length) * 100}%` }}
            />
            <span
              className="h-full border-l border-border bg-error-bg"
              style={{ width: `${(missingCount / requiredDocuments.length) * 100}%` }}
            />
          </div>

          <ul className="grid gap-3 sm:grid-cols-2" aria-label="Required-list comparison counts">
            <li className="flex items-center justify-between gap-3 border-l-2 border-primary-500 pl-3">
              <span className="text-sm text-text-secondary">Present in submitted list</span>
              <strong className="font-semibold tabular-nums text-text-heading">{submittedCount}</strong>
            </li>
            <li className="flex items-center justify-between gap-3 border-l-2 border-error-border pl-3">
              <span className="text-sm text-text-secondary">Reported missing</span>
              <strong className="font-semibold tabular-nums text-text-heading">{missingCount}</strong>
            </li>
          </ul>

          <p className="text-xs leading-relaxed text-text-secondary">
            Expired date findings ({expiredDocumentCount}) are reported separately. They can overlap with listed documents and may include submitted names outside the required list.
          </p>
        </figure>
      ) : (
        <p className="border-l-2 border-info-border pl-3 text-sm leading-relaxed text-text-secondary" role="status">
          A list comparison graphic is unavailable for this response. Review the findings below.
        </p>
      )}
    </section>
  );
}
