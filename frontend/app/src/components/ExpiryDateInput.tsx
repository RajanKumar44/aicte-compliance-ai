import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";
import { humanizeDocName } from "@/lib/utils";

const getToday = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
};

export interface ExpiryDateInputProps {
  documents: string[];
  values: Record<string, string>;
  onChange: (doc: string, date: string) => void;
  disabled?: boolean;
}

export function ExpiryDateInput({ documents, values, onChange, disabled }: ExpiryDateInputProps) {
  const today = getToday();

  if (!documents.length) return null;

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-text-secondary">
        Expiry Dates
        <span className="ml-2 text-xs text-text-muted font-normal">(Optional)</span>
      </label>
      <div className="bg-bg-3 border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-1 gap-1 border-b border-border px-3 py-2 text-xs font-medium text-text-secondary uppercase tracking-wider bg-bg-2 sm:grid-cols-[minmax(0,1fr)_10rem] sm:gap-3">
          <span>Document</span>
          <span className="sm:text-right">Expiry Date</span>
        </div>
        <div className="divide-y divide-border">
          {documents.map((doc, index) => {
            const expiry = values[doc] || "";
            const isExpired = expiry && expiry < today;

            return (
              <div
                key={doc}
                className={cn(
                  "grid grid-cols-1 items-start gap-2 px-3 py-3 transition-colors sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-center sm:gap-3",
                  index % 2 === 0 ? "bg-bg-3/50" : "bg-bg-2/50"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CalendarDays className="h-4 w-4 text-text-muted flex-shrink-0" aria-hidden="true" />
                  <span className="text-sm text-text-body truncate font-medium">
                    {humanizeDocName(doc)}
                  </span>
                </div>
                <input
                  type="date"
                  value={expiry}
                  onChange={(e) => onChange(doc, e.target.value)}
                  disabled={disabled}
                  className={cn(
                    "app-control h-11 w-full bg-bg-1 border border-border rounded-lg text-text-body sm:w-40",
                    "placeholder:text-text-muted",
                    "focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "text-sm transition-colors",
                    isExpired && "text-warning-text border-warning-border"
                  )}
                  aria-label={`Expiry date for ${humanizeDocName(doc)}`}
                />
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-text-muted">
        Dates in the past are highlighted. Leave blank if not applicable.
      </p>
    </div>
  );
}
