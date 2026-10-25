import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "./Button";
import { LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ButtonProps & { label: string };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-4",
        className
      )}
    >
      <div className="mb-6 p-4 bg-bg-2 rounded-2xl border border-border">
        <Icon className="h-12 w-12 text-text-muted" aria-hidden="true" />
      </div>
      <h3 className="text-xl font-semibold text-text-heading mb-2">{title}</h3>
      {description && (
        <p className="text-text-secondary max-w-xs mb-6">{description}</p>
      )}
      {action && (
        <Button {...action} className={cn("mt-2", action.className)}>
          {action.label}
        </Button>
      )}
    </div>
  );
}