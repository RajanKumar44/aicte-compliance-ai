import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";
import { humanizeDocName } from "@/lib/utils";

const getToday = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

export interface DocumentChecklistProps {
  requiredDocs: string[];
  submittedDocs: string[];
  expiryDates: Record<string, string>;
  missingDocs?: string[];
  expiredDocs?: string[];
}

export function DocumentChecklist({ requiredDocs, submittedDocs, expiryDates, missingDocs, expiredDocs }: DocumentChecklistProps) {
  const today = getToday();

  return (
    <div className="space-y-2" role="list" aria-label="Document checklist">
      {requiredDocs.map((doc) => {
        const isMissing = missingDocs?.includes(doc) ?? !submittedDocs.includes(doc);
        const isExpiredFinding = expiredDocs?.includes(doc) ?? false;
        const expiry = expiryDates[doc];
        const isExpired = expiry && expiry < today;

        let status: "submitted" | "missing" | "expired" = "submitted";
        if (isMissing) status = "missing";
        else if (isExpiredFinding || isExpired) status = "expired";

        const statusConfig = {
          submitted: {
            icon: <CheckCircle2 className="h-5 w-5 text-success-text" aria-hidden="true" />,
            badge: <span className="rounded-md border border-success-border bg-success-bg px-2.5 py-0.5 text-xs font-medium text-success-text">Submitted</span>,
          },
          missing: {
            icon: <XCircle className="h-5 w-5 text-error-text" aria-hidden="true" />,
            badge: <span className="rounded-md border border-error-border bg-error-bg px-2.5 py-0.5 text-xs font-medium text-error-text">Missing</span>,
          },
          expired: {
            icon: <AlertTriangle className="h-5 w-5 text-warning-text" aria-hidden="true" />,
            badge: (
              <span className="flex items-center gap-1.5 rounded-md border border-warning-border bg-warning-bg px-2.5 py-0.5 text-xs font-medium text-warning-text">
                <Clock className="h-3 w-3" aria-hidden="true" />
                Expired {expiry && `(${expiry})`}
              </span>
            ),
          },
        };

        const { icon, badge } = statusConfig[status];

        return (
          <div
            key={doc}
            className={cn(
              "flex items-center gap-3 p-3 bg-bg-3/50 border border-border rounded-lg animate-slide-up",
              "transition-colors hover:bg-bg-2/50"
            )}
            role="listitem"
          >
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-bg-2">
              {icon}
            </div>
            <span className="flex-1 text-sm font-medium text-text-body truncate">
              {humanizeDocName(doc)}
            </span>
            {badge}
          </div>
        );
      })}
    </div>
  );
}
