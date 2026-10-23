import { cn } from "@/lib/utils";
import { AlertTriangle, Info, AlertCircle, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

type AlertVariant = "info" | "warning" | "error" | "success";

const STYLES: Record<AlertVariant, { container: string; icon: typeof Info }> = {
  info: { container: "bg-slate-50 border-slate-200 text-slate-800", icon: Info },
  warning: { container: "bg-amber-50 border-amber-200 text-amber-800", icon: AlertTriangle },
  error: { container: "bg-red-50 border-red-200 text-red-800", icon: AlertCircle },
  success: { container: "bg-green-50 border-green-200 text-green-800", icon: CheckCircle2 },
};

interface AlertProps {
  variant: AlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Alert({ variant, title, children, className }: AlertProps) {
  const { container, icon: Icon } = STYLES[variant];
  return (
    <div
      className={cn("flex gap-3 rounded-lg border p-4", container, className)}
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0">
        {title && <p className="text-sm font-semibold mb-1">{title}</p>}
        <div className="text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
