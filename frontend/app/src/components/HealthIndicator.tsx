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
        status === "healthy" && "bg-teal-50 text-teal-800",
        status === "unhealthy" && "bg-red-50 text-red-700",
        status === "checking" && "bg-slate-100 text-slate-500"
      )}
      role="status"
      aria-label={`API status: ${status}`}
    >
      <Activity className="h-3.5 w-3.5" />
      {status === "healthy" && "API Connected"}
      {status === "unhealthy" && "API Unavailable"}
      {status === "checking" && "Checking…"}
    </div>
  );
}
