import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "./FormField";
import { Button } from "./Button";
import { humanizeDocName } from "@/lib/utils";

interface ExpiryDateInputProps {
  documents: string[];
  value: Record<string, string>;
  onChange: (dates: Record<string, string>) => void;
  disabled?: boolean;
  id?: string;
  describedBy?: string;
  error?: boolean;
}

export function ExpiryDateInput({
  documents,
  value,
  onChange,
  disabled = false,
  id = "expiry_dates",
  describedBy,
  error = false,
}: ExpiryDateInputProps) {
  const [selectedDoc, setSelectedDoc] = useState("");

  const availableDocs = documents.filter((d) => !(d in value));

  function addExpiryDate() {
    if (selectedDoc && !(selectedDoc in value)) {
      onChange({ ...value, [selectedDoc]: "" });
      setSelectedDoc("");
    }
  }

  function updateDate(doc: string, date: string) {
    onChange({ ...value, [doc]: date });
  }

  function removeDate(doc: string) {
    const next = { ...value };
    delete next[doc];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {Object.entries(value).map(([doc, date]) => (
        <div key={doc} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 sm:flex">
          <label htmlFor={`${id}-${doc}`} className="min-w-0 truncate text-sm text-navy-800">
            {humanizeDocName(doc)}
          </label>
          <Input
            id={`${id}-${doc}`}
            type="date"
            value={date}
            onChange={(e) => updateDate(doc, e.target.value)}
            disabled={disabled}
            aria-invalid={error || undefined}
            aria-describedby={describedBy}
            className="w-full sm:max-w-[180px]"
          />
          <button
            type="button"
            onClick={() => removeDate(doc)}
            disabled={disabled}
            className="rounded-md p-2 text-slate-500 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 disabled:opacity-50"
            aria-label={`Remove expiry for ${doc}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      {availableDocs.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            id={id}
            value={selectedDoc}
            onChange={(e) => setSelectedDoc(e.target.value)}
            disabled={disabled}
            aria-describedby={describedBy}
            aria-invalid={error || undefined}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-navy-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700 sm:max-w-xs"
          >
            <option value="">Select document…</option>
            {availableDocs.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <Button
            type="button"
            variant="ghost"
            onClick={addExpiryDate}
            disabled={disabled || !selectedDoc}
            className="gap-1 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Date
          </Button>
        </div>
      )}
    </div>
  );
}
