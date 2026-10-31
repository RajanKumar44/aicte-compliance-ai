import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { HealthIndicator } from "./HealthIndicator";
import { useTheme, type ThemeName } from "./ThemeContext";
import {
  Shield,
  ChevronRight,
  LayoutDashboard,
  ClipboardCheck,
  Info,
  FileLock2,
  FileText,
  Menu,
  X,
  Clock3,
  GraduationCap,
  Archive,
  CheckSquare,
  Scale,
  Bell,
  CheckCheck,
} from "lucide-react";
import { useAuth } from "./useAuth";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const pageTitles: Record<string, { title: string; description: string; icon: React.ReactNode }> = {
  "/": {
    title: "Dashboard",
    description: "Compliance overview",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  "/validate": {
    title: "Validate",
    description: "Document validation workspace",
    icon: <ClipboardCheck className="h-5 w-5" />,
  },
  "/vault": {
    title: "Document Vault",
    description: "Institutional document custody & extraction",
    icon: <Archive className="h-5 w-5" />,
  },
  "/action-planner": {
    title: "Action Planner",
    description: "Corrective action tracking & verification",
    icon: <CheckSquare className="h-5 w-5" />,
  },
  "/regulatory-impact": {
    title: "Regulatory Impact",
    description: "Norm change intelligence & institutional diffs",
    icon: <Scale className="h-5 w-5" />,
  },
  "/cadre-calculator": {
    title: "Cadre & FSR Calculator",
    description: "AICTE 1:2:6 ratio & doctoral norms",
    icon: <GraduationCap className="h-5 w-5" />,
  },
  "/history": {
    title: "Audit History",
    description: "Saved institutional runs",
    icon: <Clock3 className="h-5 w-5" />,
  },
  "/about": {
    title: "Compliance Guide",
    description: "AICTE APH 2024–2027 Handbook",
    icon: <Info className="h-5 w-5" />,
  },
  "/signin": {
    title: "Institutional Sign In",
    description: "Portal access & scrutiny roles",
    icon: <Shield className="h-5 w-5" />,
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
  const { session, signOut } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const activeUser = session?.user
    ? {
        name: (session.user.user_metadata?.full_name as string) || session.user.email?.split("@")[0] || "User",
        role: "Institutional Member",
      }
    : null;

  const fetchNotifs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications?limit=10`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
      const countRes = await fetch(`${API_BASE}/api/notifications/unread-count`);
      if (countRes.ok) {
        const c = await countRes.json();
        setUnreadCount(c.unread_count || 0);
      }
    } catch {
      // Fallback silent
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 45000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await fetch(`${API_BASE}/api/notifications/mark-all-read`, { method: "POST" });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // Silent error
    }
  };

  return (
    <header className="app-topbar sticky top-0 z-30 h-16 border-b border-border bg-bg-0">
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
          <div className="flex items-center gap-2 text-text-secondary lg:hidden">
            <Shield className="h-5 w-5 text-primary-400 shrink-0" aria-hidden="true" />
            <span className="font-semibold text-text-heading truncate">AICTE Compliance AI</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-text-muted">{page.icon}</span>
              <ChevronRight className="h-3 w-3 text-text-muted" aria-hidden="true" />
              <span className="font-medium text-text-heading">{page.title}</span>
            </div>
            <span className="text-text-muted shrink-0" aria-hidden="true">/</span>
            <span className="text-text-secondary truncate">{page.description}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Notification Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg text-text-secondary hover:bg-bg-2 hover:text-text-heading transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Compliance notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger-500 text-[10px] font-bold text-white ring-2 ring-bg-0">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-bg-1 shadow-2xl z-50 overflow-hidden">
                <div className="p-3 border-b border-border flex items-center justify-between bg-bg-2/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-text-heading">Compliance Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] bg-primary-500/20 text-primary-400 font-bold px-1.5 py-0.5 rounded">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-semibold text-primary-400 hover:text-primary-300 flex items-center gap-1"
                    >
                      <CheckCheck className="h-3 w-3" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-text-muted">No notifications yet.</div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3 text-xs transition-colors ${
                          notif.is_read ? "bg-bg-1 text-text-secondary" : "bg-primary-500/5 text-text-heading font-medium"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-text-heading">{notif.title}</span>
                          <span className="text-[10px] text-text-muted">
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-text-secondary text-[11px] line-clamp-2">{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {activeUser ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col items-end text-xs">
                <span className="font-semibold text-text-heading leading-tight truncate max-w-[140px]">{activeUser.name}</span>
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{activeUser.role.replace(/_/g, " ")}</span>
              </div>
              <button
                type="button"
                className="app-button app-button-secondary inline-flex min-h-9 items-center rounded-md px-3 py-1.5 text-xs font-bold"
                onClick={() => { void signOut(); }}
                title="Sign out of current account"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              to="/signin"
              className="app-button app-button-secondary inline-flex min-h-9 items-center rounded-md px-3.5 py-1.5 text-xs font-bold"
            >
              Sign In
            </Link>
          )}

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
          <span
            className="hidden xl:inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-1 px-2.5 py-1 font-mono text-[11px] text-text-muted select-none"
            title={`Build: ${__APP_COMMIT_SHA__} • Compiled: ${new Date(__APP_BUILD_TIME__).toLocaleString()}`}
          >
            <span className="font-sans font-bold text-text-secondary">v0.5.0</span>
            <span>•</span>
            <span className="text-accent-strong font-semibold">{__APP_COMMIT_SHA__.substring(0, 7)}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
