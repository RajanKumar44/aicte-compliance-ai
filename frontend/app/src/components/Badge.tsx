import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "error" | "info" | "neutral";
  size?: "sm" | "md";
  dot?: boolean;
  icon?: ReactNode;
}

const variants = {
  success: "bg-success-bg text-success-text border border-success-border",
  warning: "bg-warning-bg text-warning-text border border-warning-border",
  error: "bg-error-bg text-error-text border border-error-border",
  info: "bg-info-bg text-info-text border border-info-border",
  neutral: "bg-bg-2 text-text-secondary border border-border",
};

const sizes = {
  sm: "px-2.5 py-0.5 text-[11px] gap-1",
  md: "px-3 py-1 text-xs gap-1.5",
};

const iconMap = {
  success: <CheckCircle2 className="h-3 w-3" aria-hidden="true" />,
  warning: <AlertTriangle className="h-3 w-3" aria-hidden="true" />,
  error: <XCircle className="h-3 w-3" aria-hidden="true" />,
  info: <Info className="h-3 w-3" aria-hidden="true" />,
  neutral: <span className="h-3 w-3" aria-hidden="true" />,
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "neutral", size = "md", dot = false, icon, children, ...props }, ref) => {
    const showIcon = icon ?? (dot ? iconMap[variant] : null);

    return (
      <span
        ref={ref}
        className={cn(
          "app-badge inline-flex items-center rounded-md border font-semibold tracking-wide transition-colors",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {showIcon && <span className="flex-shrink-0" aria-hidden="true">{showIcon}</span>}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export const StatusBadge = ({
  status,
  size = "md",
}: { status: "preliminary_checks_passed" | "attention_required"; size?: "sm" | "md" }) => {
  if (status === "preliminary_checks_passed") {
    return (
      <Badge variant="success" size={size} dot>
        All Preliminary Checks Passed
      </Badge>
    );
  }
  return (
    <Badge variant="warning" size={size} dot>
      Attention Required
    </Badge>
  );
};
