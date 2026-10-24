import { useState, useRef, type KeyboardEvent, type ChangeEvent } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface DocumentTagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  onDuplicate?: () => void;
  placeholder?: string;
  error?: boolean | string;
  disabled?: boolean;
  label?: string;
  hint?: string;
  required?: boolean;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

export function DocumentTagInput({
  value,
  onChange,
  onDuplicate,
  placeholder = "Type a name and press Enter...",
  error,
  disabled,
  label,
  hint,
  required,
  id,
  "aria-describedby": describedBy,
  "aria-invalid": ariaInvalid,
}: DocumentTagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [flashingTag, setFlashingTag] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizeTag = (tag: string) => tag.trim();

  const addTag = (tag: string) => {
    const normalized = normalizeTag(tag);
    if (!normalized) return;
    if (value.some((v) => v.trim() === normalized)) {
      flashTag(normalized);
      onDuplicate?.();
      return;
    }
    onChange([...value, normalized]);
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((v) => v !== tag));
  };

  const flashTag = (tag: string) => {
    setFlashingTag(tag);
    window.setTimeout(() => setFlashingTag((current) => current === tag ? null : current), 350);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (inputValue.trim()) addTag(inputValue);
      setInputValue("");
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleBlur = () => setFocused(false);

  const handleFocus = () => setFocused(true);

  const handleContainerClick = () => inputRef.current?.focus();

  return (
    <div className="space-y-1.5">
      {(label || required) && (
        <label htmlFor={id} className="block text-sm font-medium text-text-secondary">
          {label}
          {required && <span className="ml-1 text-error-text" aria-hidden="true">*</span>}
        </label>
      )}
      {hint && <span className="text-xs text-text-muted">{hint}</span>}

      <div
        ref={containerRef}
        onClick={handleContainerClick}
        className={cn(
          "app-control flex flex-wrap items-center gap-2 min-h-11 bg-bg-3 border rounded-lg transition-all duration-200",
          "focus-within:ring-2 focus-within:ring-primary-500/30 focus-within:border-primary-500",
          error && "border-error-border focus-within:ring-error-text/30 focus-within:border-error-text",
          disabled && "opacity-50 cursor-not-allowed",
          focused && "border-border-hover"
        )}
        role="group"
        aria-label={label}
        aria-describedby={describedBy}
        aria-invalid={ariaInvalid || !!error}
      >
        {value.map((tag) => (
          <span
            key={tag}
            data-tag={tag}
            className={cn(
              "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-md border border-primary-700 bg-primary-900/30 px-2.5 py-0.5 text-xs font-medium text-primary-300",
              "animate-scale-in",
              flashingTag === tag && "animate-tag-pulse",
              "transition-colors"
            )}
          >
            <span className="min-w-0 break-all">{tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => {
                  removeTag(tag);
                }}
                className="flex h-11 w-11 items-center justify-center rounded-md transition-colors hover:bg-primary-700/50"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </span>
        ))}

        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? placeholder : ""}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={ariaInvalid || !!error}
          className={cn(
            "flex-1 min-w-[120px] bg-transparent border-0 outline-none text-text-body placeholder:text-text-muted",
            "text-sm h-8 px-1"
          )}
        />
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-error-text animate-slide-up">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error === true ? "Invalid input" : error}
        </p>
      )}
    </div>
  );
}
