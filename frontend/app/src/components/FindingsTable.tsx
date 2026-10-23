import { FileX2, Clock } from "lucide-react";
import { Badge } from "./Badge";
import { humanizeDocName, formatDate } from "@/lib/utils";
import type { Finding } from "@/lib/api";

interface FindingsTableProps {
  findings: Finding[];
}

export function FindingsTable({ findings }: FindingsTableProps) {
  if (findings.length === 0) return null;

  const groups = [
    {
      code: "MISSING_DOCUMENT" as const,
      label: "Missing documents",
      items: findings.filter((finding) => finding.code === "MISSING_DOCUMENT"),
    },
    {
      code: "DOCUMENT_EXPIRED" as const,
      label: "Expired documents",
      items: findings.filter((finding) => finding.code === "DOCUMENT_EXPIRED"),
    },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">Validation findings and supplied evidence</caption>
        <thead>
          <tr className="border-b border-slate-200">
            <th scope="col" className="py-3 pr-4 text-left font-medium text-slate-600">Type</th>
            <th scope="col" className="py-3 pr-4 text-left font-medium text-slate-600">Document</th>
            <th scope="col" className="py-3 pr-4 text-left font-medium text-slate-600">Details</th>
            <th scope="col" className="py-3 text-left font-medium text-slate-600">Evidence</th>
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.code} className="divide-y divide-slate-100">
            <tr className="bg-slate-50">
              <th colSpan={4} scope="rowgroup" className="py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
                {group.label}
              </th>
            </tr>
            {group.items.map((f, i) => (
              <tr key={`${f.code}-${f.document_type}-${i}`} className="group">
                <td className="py-3 pr-4 align-top">
                  {f.code === "MISSING_DOCUMENT" ? (
                    <Badge variant="error">
                      <FileX2 className="h-3 w-3" />
                      Missing
                    </Badge>
                  ) : (
                    <Badge variant="warning">
                      <Clock className="h-3 w-3" />
                      Expired
                    </Badge>
                  )}
                </td>
                <td className="py-3 pr-4 align-top font-medium text-navy-900">
                  {humanizeDocName(f.document_type)}
                </td>
                <td className="py-3 pr-4 align-top text-slate-600">
                  {f.message}
                </td>
                <td className="py-3 align-top text-xs text-slate-600">
                  {f.code === "DOCUMENT_EXPIRED" && f.evidence.expiry_date && (
                    <span>
                      Expired {formatDate(f.evidence.expiry_date)} &middot;
                      Checked {formatDate(f.evidence.evaluation_date)}
                    </span>
                  )}
                  {f.code === "MISSING_DOCUMENT" && (
                    <span>Source: {f.evidence.source?.replace(/_/g, " ")}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
