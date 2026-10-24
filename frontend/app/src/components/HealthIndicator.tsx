import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { checkHealth } from "@/lib/api";
import { cn } from "@/lib/utils";

type Status = "checking" | "healthy" | "unhealthy";

export function HealthIndicator() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let mounted = true;
    async function check() {
      const result = await checkHealth();
      if (mounted) {
        setStatus(result.ok ? "healthy" : "unhealthy");
      }
    }
    check();
    const interval = setInterval(check, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
        status === "healthy" && "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300",
        status === "unhealthy" && "border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300",
        status === "checking" && "border border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800"
      )}
      role="status"
      aria-label={`API status: ${status}`}
    >
      <Activity className="h-3.5 w-3.5" />
      {status === "healthy" && "API System Connected"}
      {status === "unhealthy" && "API System Unavailable"}
      {status === "checking" && "Checking…"}
    </div>
  );
}
