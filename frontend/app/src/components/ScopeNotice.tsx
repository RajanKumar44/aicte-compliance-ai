import { useState } from "react";
import { Shield } from "lucide-react";
import { Alert } from "./Alert";

function getInitialDismissed(dismissible: boolean): boolean {
  if (!dismissible) return false;
  try {
    return sessionStorage.getItem("scopeNoticeDismissed") === "true";
  } catch {
    return false;
  }
}

export function ScopeNotice({ dismissible = true }: { dismissible?: boolean }) {
  const [dismissed, setDismissed] = useState(() => getInitialDismissed(dismissible));

  const handleDismiss = () => {
    setDismissed(true);
    if (dismissible) {
      try {
        sessionStorage.setItem("scopeNoticeDismissed", "true");
      } catch {
        // Ignore storage errors
      }
    }
  };

  if (dismissed) return null;

  return (
    <Alert
      variant="info"
      icon={<Shield className="h-5 w-5" />}
      dismissible={dismissible}
      onDismiss={handleDismiss}
      className="animate-slide-up max-w-4xl"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-body leading-relaxed">
            This is a <strong>preliminary check prototype</strong>. Results are advisory and require human review before any
            compliance decisions are made.
          </p>
          <p className="mt-2 text-sm text-text-muted leading-relaxed">
            The API compares caller-supplied document lists and expiry dates. It does not load an authoritative AICTE
            checklist or verify document authenticity, content accuracy, or regulatory completeness.
          </p>
        </div>
      </div>
    </Alert>
  );
}
