import { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { checkHealth, API_BASE } from "@/lib/api";

export function HealthIndicator() {
  const [status, setStatus] = useState<"checking" | "connected" | "unreachable">("checking");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const mountedRef = useRef(false);

  const check = useCallback(async () => {
    const result = await checkHealth();
    if (!mountedRef.current) return;
    if (result.ok && result.data.status === "ok") {
      setStatus("connected");
    } else {
      setStatus("unreachable");
    }
    setLastChecked(new Date());
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const initialCheck = () => {
      check();
    };
    queueMicrotask(initialCheck);
    const interval = setInterval(check, 30_000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [check]);

  let targetHost = "same-origin / dev proxy";
  try {
    if (API_BASE) {
      targetHost = new URL(API_BASE).hostname;
    }
  } catch {
    targetHost = API_BASE;
  }

  const config = {
    checking: {
      icon: <Loader2 className="h-4 w-4 animate-spin-slow text-warning-text" />,
      bg: "bg-warning-bg/50",
      text: "Checking…",
      border: "border-warning-border/50",
      dotColor: "bg-warning-text",
    },
    connected: {
      icon: <Wifi className="h-4 w-4 text-success-text" />,
      bg: "bg-success-bg/50",
      text: "API Connected",
      border: "border-success-border/50",
      dotColor: "bg-success-text",
    },
    unreachable: {
      icon: <WifiOff className="h-4 w-4 text-error-text" />,
      bg: "bg-error-bg/50",
      text: "Unavailable",
      border: "border-error-border/50",
      dotColor: "bg-error-text",
    },
  };

  const current = config[status];

  return (
    <div className="relative" role="status" aria-live="polite">
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
          current.bg,
          current.text,
          current.border
        )}
        aria-label={`API status: ${current.text}`}
        title={`API Status: ${current.text} • Target: ${targetHost}${lastChecked ? ` • Last checked: ${lastChecked.toLocaleTimeString()}` : ""}`}
      >
        <span className={cn("w-2 h-2 rounded-full", current.dotColor)} aria-hidden="true" />
        {current.icon}
        <span>{current.text}</span>
      </div>
    </div>
  );
}
