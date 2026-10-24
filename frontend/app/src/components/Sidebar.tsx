import { NavLink } from "react-router-dom";
import type { RefObject } from "react";
import { LayoutDashboard, ClipboardCheck, Info, Shield, X, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    label: "Workspace",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Dashboard" },
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
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

export function Sidebar({ open, mobile, closeButtonRef, onClose }: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-[17rem] flex-col bg-[#101a2d] text-white shadow-2xl transition-transform duration-200 lg:static lg:translate-x-0 lg:shadow-none",
        open || !mobile ? "translate-x-0" : "-translate-x-full"
      )}
      id="primary-navigation"
      aria-label="Primary navigation"
      aria-hidden={mobile && !open}
    >
      <div className="flex min-h-20 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/90 shadow-lg shadow-teal-950/20">
          <Shield className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">AICTE Compliance</p>
          <p className="mt-0.5 truncate text-xs text-slate-400">Evidence review workspace</p>
        </div>
        <button
          ref={closeButtonRef}
          onClick={onClose}
          tabIndex={mobile && !open ? -1 : undefined}
          className="ml-auto rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-7 px-3 py-6" aria-label="Workspace navigation">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{group.label}</p>
            <div className="space-y-1">
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  tabIndex={mobile && !open ? -1 : undefined}
                  className={({ isActive }) => cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-white/10 text-white shadow-sm before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-teal-300"
                      : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
                  )}
                  end={to === "/"}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-4 border-t border-white/10 p-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4">
          <div className="flex items-start gap-2">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold text-slate-100">Preliminary review only</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">Not an official AICTE decision or authenticity check.</p>
            </div>
          </div>
        </div>
        <p className="px-1 text-[11px] leading-5 text-slate-500">Use synthetic identifiers and caller-supplied lists for demonstrations.</p>
      </div>
    </aside>
  );
}
