import { useLocation } from "react-router-dom";
import { HealthIndicator } from "./HealthIndicator";
import { useTheme, type ThemeName } from "./ThemeContext";
import { Shield, ChevronRight, LayoutDashboard, ClipboardCheck, Info, FileLock2, FileText, Menu, X } from "lucide-react";

const pageTitles: Record<string, { title: string; description: string; icon: React.ReactNode }> = {
  "/": {
    title: "Dashboard",
    description: "Request overview",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  "/validate": {
    title: "Validate",
    description: "Document validation workspace",
    icon: <ClipboardCheck className="h-5 w-5" />,
  },
  "/about": {
    title: "About",
    description: "Documentation and API reference",
    icon: <Info className="h-5 w-5" />,
  },
  "/privacy": {
    title: "Privacy notice",
    description: "Prototype policy draft",
    icon: <FileLock2 className="h-5 w-5" />,
  },
  "/terms": {
    title: "Terms and conditions",
    description: "Prototype terms draft",
    icon: <FileText className="h-5 w-5" />,
  },
};

export function TopBar({ onMenuToggle, mobileMenuOpen }: { onMenuToggle: () => void; mobileMenuOpen: boolean }) {
  const location = useLocation();
  const page = pageTitles[location.pathname] || pageTitles["/"];
  const { theme, setTheme } = useTheme();

  return (
    <header className="app-topbar sticky top-0 z-30 h-16 border-b border-border bg-bg-0/95">
      <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-2 hover:text-text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 lg:hidden"
            onClick={onMenuToggle}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
          <div className="flex items-center gap-2 text-text-secondary">
            <Shield className="h-5 w-5 text-primary-400" aria-hidden="true" />
            <span className="font-semibold text-text-heading hidden sm:block">AICTE Compliance AI</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-text-muted">{page.icon}</span>
              <ChevronRight className="h-3 w-3 text-text-muted" aria-hidden="true" />
              <span className="font-medium text-text-heading">{page.title}</span>
            </div>
            <span className="text-text-muted" aria-hidden="true">/</span>
            <span className="text-text-secondary">{page.description}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <label className="sr-only" htmlFor="theme-select">Appearance theme</label>
          <select
            id="theme-select"
            className="app-control theme-select min-h-10 max-w-32 border border-border bg-bg-1 px-2 text-xs font-medium text-text-heading focus-visible:outline-none sm:max-w-none sm:px-3 sm:text-sm"
            value={theme}
            onChange={(event) => setTheme(event.target.value as ThemeName)}
          >
            <option value="professional">Professional</option>
            <option value="neo-brutalism">Neo Brutalism</option>
          </select>
          <HealthIndicator />
        </div>
      </div>
    </header>
  );
}
