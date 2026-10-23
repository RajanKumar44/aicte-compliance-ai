import { Check, FileX2, Clock, File } from "lucide-react";
import { Badge } from "./Badge";
import { humanizeDocName } from "@/lib/utils";
import type { ValidationResponse } from "@/lib/api";

interface DocumentChecklistProps {
  data: ValidationResponse;
}

export function DocumentChecklist({ data }: DocumentChecklistProps) {
  // Build a unified view from all document lists
  const allDocs = new Set<string>();
  // We only know the documents mentioned across the response
  data.missing_documents.forEach((d) => allDocs.add(d));
  data.expired_documents.forEach((d) => allDocs.add(d));
  // Add findings document_types
  data.findings.forEach((f) => allDocs.add(f.document_type));

  // Determine submitted documents by exclusion:
  // Documents that are not missing are considered submitted.
  // (The API doesn't return submitted_documents in response)

  if (allDocs.size === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
        <Check className="h-4 w-4" />
        No missing or expired items were returned for the supplied checklist.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Array.from(allDocs).map((doc) => {
        const isMissing = data.missing_documents.includes(doc);
        const isExpired = data.expired_documents.includes(doc);

        return (
          <div
            key={doc}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className={
                isMissing ? "text-red-500" :
                isExpired ? "text-amber-500" :
                "text-slate-400"
              }>
                {isMissing ? <FileX2 className="h-4 w-4" /> :
                 isExpired ? <Clock className="h-4 w-4" /> :
                 <File className="h-4 w-4" />}
              </div>
              <span className="text-sm font-medium text-navy-900">
                {humanizeDocName(doc)}
              </span>
            </div>
            {isMissing && <Badge variant="error">Not Submitted</Badge>}
            {isExpired && !isMissing && <Badge variant="warning">Expired</Badge>}
          </div>
        );
      })}
    </div>
  );
}
