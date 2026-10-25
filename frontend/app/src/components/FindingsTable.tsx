import { Fragment, useMemo, useState } from "react";
import { cn, humanizeDocName } from "@/lib/utils";
import { FileX2, Clock, ChevronDown, ChevronUp, Search } from "lucide-react";
import type { Finding } from "@/lib/api";
import { filterAndSortFindings, type FindingFilter, type FindingSort } from "@/lib/findings";

export interface FindingsTableProps {
  findings: Finding[];
}

export function FindingsTable({ findings }: FindingsTableProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FindingFilter>("all");
  const [sort, setSort] = useState<FindingSort>("document");

  const visibleFindings = useMemo(
    () => filterAndSortFindings(findings, query, filter, sort),
    [findings, query, filter, sort],
  );

  const toggle = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <section aria-label="Validation findings" className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_12rem]">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-text-secondary">Search findings</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Document name or message"
              className="app-control h-11 w-full border border-border bg-bg-3 pl-9 pr-3 text-sm text-text-body placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
            />
          </span>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-text-secondary">Finding code</span>
          <select value={filter} onChange={(event) => setFilter(event.target.value as FindingFilter)} className="app-control h-11 w-full border border-border bg-bg-3 px-3 text-sm text-text-body focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500">
            <option value="all">All codes</option>
            <option value="MISSING_DOCUMENT">Missing document</option>
            <option value="DOCUMENT_EXPIRED">Expired document</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-text-secondary">Sort by</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as FindingSort)} className="app-control h-11 w-full border border-border bg-bg-3 px-3 text-sm text-text-body focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500">
            <option value="document">Document name</option>
            <option value="code">Finding code</option>
          </select>
        </label>
      </div>

      <p className="text-sm text-text-secondary" aria-live="polite" aria-atomic="true">
        Showing {visibleFindings.length} of {findings.length} findings
      </p>

      {visibleFindings.length === 0 ? (
        <div className="border border-border bg-bg-2 px-4 py-6 text-sm text-text-secondary" role="status">
          No findings match the current search and filter. Adjust either control to see the response findings.
        </div>
      ) : (
        <div className="overflow-hidden border border-border bg-bg-1">
          <div className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500" tabIndex={0} role="region" aria-label="Scrollable findings table">
            <table className="w-full min-w-[48rem]">
              <caption className="sr-only">Validation findings returned by the API</caption>
              <thead>
                <tr className="border-b border-border bg-bg-2">
                  <th scope="col" className="w-14 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Type</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Finding code</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Document</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Message</th>
                  <th scope="col" className="w-24 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleFindings.map(({ finding, index }) => {
                  const isExpanded = expanded.has(index);
                  const isMissing = finding.code === "MISSING_DOCUMENT";
                  const evidenceId = `evidence-${index}`;
                  return (
                    <Fragment key={`${finding.document_type}-${finding.code}-${index}`}>
                      <tr className={cn("transition-colors hover:bg-bg-2/50", isExpanded && "bg-bg-2/50")}>
                        <td className="px-4 py-3">
                          <span className={cn("flex h-8 w-8 items-center justify-center border", isMissing ? "border-error-border bg-error-bg/30" : "border-warning-border bg-warning-bg/30")} aria-label={isMissing ? "Missing document" : "Expired document"}>
                            {isMissing ? <FileX2 className="h-4 w-4 text-error-text" aria-hidden="true" /> : <Clock className="h-4 w-4 text-warning-text" aria-hidden="true" />}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-text-body">{finding.code}</td>
                        <td className="max-w-48 break-words px-4 py-3 font-medium text-text-body">{humanizeDocName(finding.document_type)}</td>
                        <td className="max-w-xl break-words px-4 py-3 text-sm text-text-secondary">{finding.message}</td>
                        <td className="px-4 py-3">
                          {Object.keys(finding.evidence).length > 0 && (
                            <button type="button" onClick={() => toggle(index)} className="inline-flex min-h-11 items-center gap-1 border border-border px-2 text-xs font-medium text-text-body hover:bg-bg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500" aria-expanded={isExpanded} aria-controls={evidenceId}>
                              {isExpanded ? "Hide" : "View"}
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
                              <span className="sr-only"> evidence for {humanizeDocName(finding.document_type)}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && Object.keys(finding.evidence).length > 0 && (
                        <tr>
                          <td colSpan={5} className="p-0">
                            <div id={evidenceId} className="border-t border-border bg-bg-2/50 px-4 pb-4 pt-3" role="region" aria-label={`Evidence for ${humanizeDocName(finding.document_type)}`}>
                              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                                {Object.entries(finding.evidence).map(([key, value]) => (
                                  <div key={key} className="min-w-0 border border-border bg-bg-3 p-3">
                                    <dt className="mb-1 text-xs font-medium uppercase tracking-wider text-text-secondary">{key.replace(/_/g, " ")}</dt>
                                    <dd className="break-all font-mono text-xs text-text-body">{value}</dd>
                                  </div>
                                ))}
                              </dl>
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
        </div>
      )}

      <section className="print-evidence" aria-label="Finding evidence">
        <h4 className="mb-3 text-base font-semibold">Finding evidence</h4>
        <div className="space-y-4">
          {findings.map((finding, index) => (
            <article className="print-evidence-item" key={`${finding.document_type}-${finding.code}-${index}`}>
              <h5 className="font-semibold">{humanizeDocName(finding.document_type)} · {finding.code}</h5>
              <p>{finding.message}</p>
              {Object.keys(finding.evidence).length > 0 && (
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  {Object.entries(finding.evidence).map(([key, value]) => <div className="min-w-0" key={key}><dt className="font-medium">{key.replace(/_/g, " ")}</dt><dd className="break-words">{value}</dd></div>)}
                </dl>
              )}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
