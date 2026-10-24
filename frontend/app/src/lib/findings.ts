import type { Finding } from "@/lib/api";

export type FindingFilter = "all" | Finding["code"];
export type FindingSort = "document" | "code";

export function filterAndSortFindings(
  findings: Finding[],
  query: string,
  filter: FindingFilter,
  sort: FindingSort,
): Array<{ finding: Finding; index: number }> {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return findings
    .map((finding, index) => ({ finding, index }))
    .filter(({ finding }) => {
      const matchesFilter = filter === "all" || finding.code === filter;
      const searchable = `${finding.document_type} ${finding.message} ${finding.code}`.toLocaleLowerCase();
      return matchesFilter && searchable.includes(normalizedQuery);
    })
    .sort((a, b) => {
      const compare = sort === "code"
        ? a.finding.code.localeCompare(b.finding.code)
        : a.finding.document_type.localeCompare(b.finding.document_type, undefined, { sensitivity: "base" });
      return compare || a.index - b.index;
    });
}
