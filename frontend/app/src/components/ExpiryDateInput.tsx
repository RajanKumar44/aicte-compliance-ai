import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "./FormField";
import { Button } from "./Button";

interface ExpiryDateInputProps {
  documents: string[];
  value: Record<string, string>;
  onChange: (dates: Record<string, string>) => void;
  disabled?: boolean;
}

export function ExpiryDateInput({
  documents,
  value,
  onChange,
  disabled = false,
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
        <div key={doc} className="flex items-center gap-2">
          <span className="min-w-[140px] text-sm text-navy-800 truncate">{doc}</span>
          <Input
            type="date"
            value={date}
            onChange={(e) => updateDate(doc, e.target.value)}
            disabled={disabled}
            className="max-w-[180px]"
          />
          <button
            type="button"
            onClick={() => removeDate(doc)}
            disabled={disabled}
            className="rounded-md p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-50"
            aria-label={`Remove expiry for ${doc}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      {availableDocs.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={selectedDoc}
            onChange={(e) => setSelectedDoc(e.target.value)}
            disabled={disabled}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
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
