import React, { forwardRef, useId, type HTMLAttributes, type ReactNode, type InputHTMLAttributes, type ReactElement, isValidElement, cloneElement } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

type FormControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  error?: boolean;
};

export interface FormFieldProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  htmlFor?: string;
}

export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, label, hint, error, required, children, htmlFor, ...props }, ref) => {
    const generatedId = useId();
    const fieldId = htmlFor || generatedId;
    const errorId = error ? `${fieldId}-error` : undefined;
    const hintId = hint ? `${fieldId}-hint` : undefined;

    const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

    return (
      <div ref={ref} className={cn("space-y-1.5", className)} {...props}>
        <label
          htmlFor={fieldId}
          className={cn(
            "block text-sm font-medium text-text-secondary",
            "text-text-secondary"
          )}
        >
          {label}
          {required && (
            <span className="ml-1 text-error-text" aria-hidden="true">*</span>
          )}
        </label>
        {hint && (
          <span id={hintId} className="text-xs text-text-muted">
            {hint}
          </span>
        )}
        <div
          className={cn("relative", error && "animate-shake")}
        >
          {isValidElement(children)
            ? cloneElement(children as ReactElement<FormControlProps>, {
                id: fieldId,
                "aria-describedby": describedBy,
                "aria-invalid": !!error,
                error: !!error,
              })
            : children}
        </div>
        {error && (
          <p
            id={errorId}
            role="alert"
            className="flex items-center gap-1.5 text-xs text-error-text animate-slide-up"
          >
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftElement?: ReactNode;
  rightElement?: ReactNode;
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftElement, rightElement, disabled, error, ...props }, ref) => {
    const hasLeft = !!leftElement;
    const hasRight = !!rightElement;

    return (
      <div className="relative">
        {hasLeft && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            {leftElement}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            "app-control w-full bg-bg-3 border border-border rounded-lg placeholder:text-text-muted",
            "text-text-body",
            "transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "h-11 px-3",
            hasLeft && "pl-10",
            hasRight && "pr-10",
            error && "border-error-border focus:ring-error-text/30 focus:border-error-text",
            className
          )}
          disabled={disabled}
          aria-invalid={!!error}
          {...props}
        />
        {hasRight && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            {rightElement}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export interface SelectProps extends Omit<HTMLAttributes<HTMLSelectElement>, "onChange"> {
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, error, onChange, disabled, value, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          value={value}
          className={cn(
            "app-control w-full bg-bg-3 border border-border rounded-lg appearance-none",
            "text-text-body",
            "transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "h-11 px-3 pr-10",
            error && "border-error-border focus:ring-error-text/30 focus:border-error-text",
            className
          )}
          disabled={disabled}
          aria-invalid={!!error}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange?.(e.target.value)}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>
    );
  }
);

Select.displayName = "Select";
