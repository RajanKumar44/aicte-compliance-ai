import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import type { RefObject } from "react";
import { HealthIndicator } from "./HealthIndicator";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/validate": "Document Validation",
  "/about": "About",
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
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          ref={menuButtonRef}
          onClick={onMenuClick}
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 lg:hidden"
          aria-label="Open navigation menu"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <p className="truncate text-lg font-semibold text-navy-900">{title}</p>
      </div>
      <HealthIndicator />
    </header>
  );
}
