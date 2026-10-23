import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { HealthIndicator } from "./HealthIndicator";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/validate": "Document Validation",
  "/about": "About",
};

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] || "AICTE Compliance AI";

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-navy-900">{title}</h1>
      </div>
      <HealthIndicator />
    </header>
  );
}
