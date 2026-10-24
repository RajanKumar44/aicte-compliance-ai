import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-5 sm:p-6", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn("mb-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: CardProps) {
  return (
    <h2 className={cn("text-base font-semibold text-navy-900", className)}>
      {children}
    </h2>
  );
}

export function CardDescription({ children, className }: CardProps) {
  return (
    <p className={cn("mt-1 text-sm text-slate-500", className)}>
      {children}
    </p>
  );
}
