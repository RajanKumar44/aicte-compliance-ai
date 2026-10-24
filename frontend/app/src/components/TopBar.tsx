import { Menu, ChevronRight } from "lucide-react";
import { useLocation } from "react-router-dom";
import type { RefObject } from "react";
import { HealthIndicator } from "./HealthIndicator";
import { Badge } from "./Badge";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/validate": "Validate documents",
  "/about": "About this tool",
};

interface TopBarProps {
  onMenuClick: () => void;
  menuOpen: boolean;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
}

export function TopBar({ onMenuClick, menuOpen, menuButtonRef }: TopBarProps) {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] || "AICTE Compliance AI";

  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          ref={menuButtonRef}
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 lg:hidden"
          aria-label="Open navigation menu"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="hidden text-slate-500 sm:inline">AICTE Compliance</span>
          <ChevronRight className="hidden h-4 w-4 text-slate-300 sm:inline" aria-hidden="true" />
          <p className="truncate font-semibold text-navy-900">{title}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <Badge variant="neutral" className="hidden sm:inline-flex">Contract 0.1.0-draft</Badge>
        <HealthIndicator />
      </div>
    </header>
  );
}
