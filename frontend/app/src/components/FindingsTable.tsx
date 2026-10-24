import { Fragment, useState } from "react";
import { cn } from "@/lib/utils";
import { FileX2, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { humanizeDocName } from "@/lib/utils";

export interface Finding {
  code: "MISSING_DOCUMENT" | "DOCUMENT_EXPIRED";
  document_type: string;
  message: string;
  evidence: Record<string, string>;
}

export interface FindingsTableProps {
  findings: Finding[];
}

export function FindingsTable({ findings }: FindingsTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (docType: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(docType)) next.delete(docType);
      else next.add(docType);
      return next;
    });
  };

  if (!findings.length) return null;

  return (
    <div className="bg-bg-1 border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full" role="table">
          <thead>
            <tr className="bg-bg-2 border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider w-12">Severity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Document</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Message</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider w-12">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {findings.map((finding, index) => {
              const isExpanded = expanded.has(finding.document_type);
              const isMissing = finding.code === "MISSING_DOCUMENT";

              return (
                <Fragment key={`${finding.document_type}-${index}`}>
                  <tr
                    className={cn(
                      "transition-colors hover:bg-bg-2/50",
                      isExpanded && "bg-bg-2/50"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div
                        className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-full",
                          isMissing ? "bg-error-bg/30" : "bg-warning-bg/30"
                        )}
                        aria-hidden="true"
                      >
                        {isMissing ? (
                          <FileX2 className="h-4 w-4 text-error-text" />
                        ) : (
                          <Clock className="h-4 w-4 text-warning-text" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold",
                          isMissing
                            ? "bg-error-bg text-error-text border border-error-border"
                            : "bg-warning-bg text-warning-text border border-warning-border"
                        )}
                      >
                        {finding.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-text-body">
                        {humanizeDocName(finding.document_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {finding.message}
                    </td>
                    <td className="px-4 py-3">
                      {Object.keys(finding.evidence).length > 0 && (
                        <button
                          onClick={() => toggle(finding.document_type)}
                          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-bg-3 transition-colors text-text-muted hover:text-text-body"
                          aria-expanded={isExpanded}
                          aria-controls={`evidence-${finding.document_type}-${index}`}
                          aria-label={isExpanded ? "Hide evidence" : "Show evidence"}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && Object.keys(finding.evidence).length > 0 && (
                    <tr>
                      <td colSpan={5} className="p-0">
                        <div
                          id={`evidence-${finding.document_type}-${index}`}
                          className={cn(
                            "px-4 pb-4 bg-bg-2/50 border-t border-border animate-slide-up",
                            "overflow-hidden"
                          )}
                          role="region"
                          aria-label={`Evidence for ${humanizeDocName(finding.document_type)}`}
                        >
                          <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2 text-sm">
                            {Object.entries(finding.evidence).map(([key, value]) => (
                              <div key={key} className="bg-bg-3 p-3 rounded-lg border border-border">
                                <div className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">
                                  {key.replace(/_/g, " ")}
                                </div>
                                <code className="text-text-body font-mono text-xs break-all bg-bg-1 px-2 py-1 rounded block">
                                  {value}
                                </code>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <section className="print-evidence" aria-label="Finding evidence">
        <h4 className="mb-3 text-base font-semibold">Finding evidence</h4>
        <div className="space-y-4">
          {findings.map((finding, index) => (
            <article className="print-evidence-item" key={`${finding.document_type}-${index}`}>
              <h5 className="font-semibold">{humanizeDocName(finding.document_type)} · {finding.code}</h5>
              <p>{finding.message}</p>
              {Object.keys(finding.evidence).length > 0 && (
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  {Object.entries(finding.evidence).map(([key, value]) => (
                    <div className="min-w-0" key={key}>
                      <dt className="font-medium">{key.replace(/_/g, " ")}</dt>
                      <dd className="break-words">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
