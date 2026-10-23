import { NavLink } from "react-router-dom";
import { LayoutDashboard, ClipboardCheck, Info, Shield, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/validate", icon: ClipboardCheck, label: "Validate" },
  { to: "/about", icon: Info, label: "About" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-900 text-white transition-transform duration-200 lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-navy-700">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-600">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight">AICTE Compliance</span>
          <span className="text-[11px] text-slate-400">Document Validation</span>
        </div>
        <button
          onClick={onClose}
          className="ml-auto rounded-md p-1 text-slate-400 hover:text-white lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-navy-700 text-white"
                  : "text-slate-400 hover:bg-navy-800 hover:text-slate-200"
              )
            }
            end={to === "/"}
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-navy-700 px-5 py-4">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Preliminary validation only.<br />
          Not a regulatory decision.
        </p>
      </div>
    </aside>
  );
}
