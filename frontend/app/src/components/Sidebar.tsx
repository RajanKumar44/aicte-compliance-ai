import { NavLink } from "react-router-dom";
import type { RefObject } from "react";
import { LayoutDashboard, ClipboardCheck, Info, Shield, X, CircleAlert, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    label: "Workspace",
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/validate", icon: ClipboardCheck, label: "Validate documents" },
    ],
  },
  {
    label: "Guidance",
    items: [{ to: "/about", icon: Info, label: "About and scope" }],
  },
];

interface SidebarProps {
  open: boolean;
  mobile: boolean;
  collapsed: boolean;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onToggleCollapsed: () => void;
}

export function Sidebar({ open, mobile, collapsed, closeButtonRef, onClose, onToggleCollapsed }: SidebarProps) {
  const isCompact = collapsed && !mobile;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col relative bg-[#101a2d] text-white shadow-2xl transition-[width,transform] duration-200 lg:static lg:translate-x-0 lg:shadow-none",
        isCompact ? "w-[5rem]" : "w-[17rem]",
        open || !mobile ? "translate-x-0" : "-translate-x-full"
      )}
      id="primary-navigation"
      aria-label="Primary navigation"
      aria-hidden={mobile && !open}
    >
      <div className={cn("flex min-h-20 items-center border-b border-white/10", isCompact ? "justify-center px-3" : "gap-3 px-5")}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/90 shadow-lg shadow-teal-950/20">
          <Shield className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        {!isCompact && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">AICTE Compliance</p>
            <p className="mt-0.5 truncate text-xs text-slate-400">Evidence review workspace</p>
          </div>
        )}
        <button
          ref={closeButtonRef}
          onClick={onClose}
          tabIndex={mobile && !open ? -1 : undefined}
          className={cn("rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 lg:hidden", !isCompact && "ml-auto")}
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
        {!mobile && (
          <button
            onClick={onToggleCollapsed}
            className={cn("rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400", isCompact ? "absolute left-[4.4rem] top-5" : "ml-auto")}
            aria-label={isCompact ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={isCompact}
            title={isCompact ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCompact ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      <nav className={cn("flex-1 space-y-7 py-6", isCompact ? "px-2" : "px-3")} aria-label="Workspace navigation">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!isCompact && <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{group.label}</p>}
            <div className="space-y-1">
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  tabIndex={mobile && !open ? -1 : undefined}
                  title={isCompact ? label : undefined}
                  className={({ isActive }) => cn(
                    "group relative flex items-center rounded-xl py-3 text-sm font-medium transition-colors",
                    isCompact ? "justify-center px-2" : "gap-3 px-3",
                    isActive
                      ? "bg-white/10 text-white shadow-sm before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-teal-300"
                      : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
                  )}
                  end={to === "/dashboard"}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                  {!isCompact && <span>{label}</span>}
                  {isCompact && <span className="sr-only">{label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn("space-y-4 border-t border-white/10 p-4", isCompact && "px-3") }>
        <div className={cn("rounded-xl border border-white/10 bg-white/[0.05]", isCompact ? "flex justify-center p-3" : "p-4")} title={isCompact ? "Preliminary review only" : undefined}>
          <div className={cn("flex items-start gap-2", isCompact && "justify-center")}>
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
            {!isCompact && <div><p className="text-xs font-semibold text-slate-100">Preliminary review only</p><p className="mt-1 text-xs leading-5 text-slate-400">Not an official AICTE decision or authenticity check.</p></div>}
            {isCompact && <span className="sr-only">Preliminary review only. Not an official AICTE decision or authenticity check.</span>}
          </div>
        </div>
        {!isCompact && <p className="px-1 text-[11px] leading-5 text-slate-500">Use synthetic identifiers and caller-supplied lists for demonstrations.</p>}
      </div>
    </aside>
  );
}
