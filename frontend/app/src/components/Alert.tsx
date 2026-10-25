import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { X, Info, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "warning" | "error" | "success";
  title?: string;
  description?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: ReactNode;
}

const variants = {
  info: "app-alert-info",
  warning: "app-alert-warning",
  error: "app-alert-error",
  success: "app-alert-success",
};

const icons = {
  info: <Info className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
  warning: <AlertTriangle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
  error: <XCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
  success: <CheckCircle2 className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
};

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      variant = "info",
      title,
      description,
      dismissible = false,
      onDismiss,
      icon,
      children,
      role = "alert",
      ...props
    },
    ref
  ) => {
    const Icon = icon ?? icons[variant];

    return (
      <div
        ref={ref}
        role={role}
        className={cn(
          "app-alert relative border-l-3 p-4 animate-slide-up",
          variants[variant],
          className
        )}
        {...props}
      >
        <div className="flex gap-3">
          <div className="flex-shrink-0 pt-0.5" aria-hidden="true">
            {Icon}
          </div>
          <div className="flex-1 min-w-0">
            {title && (
              <h4 className="font-medium text-text-heading">{title}</h4>
            )}
            {(description || children) && (
              <div className={cn("mt-1 text-sm text-text-secondary", title && "mt-2")}>
                {description ?? children}
              </div>
            )}
          </div>
          {dismissible && onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors text-text-muted hover:text-text-body"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    );
  }
);

Alert.displayName = "Alert";
