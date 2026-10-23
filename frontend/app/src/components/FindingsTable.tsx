import { FileX2, Clock } from "lucide-react";
import { Badge } from "./Badge";
import { humanizeDocName, formatDate } from "@/lib/utils";
import type { Finding } from "@/lib/api";

interface FindingsTableProps {
  findings: Finding[];
}

export function FindingsTable({ findings }: FindingsTableProps) {
  if (findings.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="py-3 pr-4 text-left font-medium text-slate-500">Type</th>
            <th className="py-3 pr-4 text-left font-medium text-slate-500">Document</th>
            <th className="py-3 pr-4 text-left font-medium text-slate-500">Details</th>
            <th className="py-3 text-left font-medium text-slate-500">Evidence</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {findings.map((f, i) => (
            <tr key={`${f.code}-${f.document_type}-${i}`} className="group">
              <td className="py-3 pr-4">
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
              <td className="py-3 pr-4 font-medium text-navy-900">
                {humanizeDocName(f.document_type)}
              </td>
              <td className="py-3 pr-4 text-slate-600">
                {f.message}
              </td>
              <td className="py-3 text-xs text-slate-500">
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
      </table>
    </div>
  );
}
