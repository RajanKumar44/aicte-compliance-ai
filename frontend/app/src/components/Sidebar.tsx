import type { RefObject } from "react";
import { NavLink } from "react-router-dom";
import { BookOpen, ChevronRight, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Settings2, ShieldCheck, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Overview", count: "" },
  { to: "/validate", icon: UploadCloud, label: "Verification workspace", count: "03" },
  { to: "/about", icon: BookOpen, label: "Methodology", count: "" },
];

interface SidebarProps { open: boolean; mobile: boolean; collapsed: boolean; closeButtonRef: RefObject<HTMLButtonElement | null>; onClose: () => void; onToggle: () => void; }

export function Sidebar({ open, mobile, collapsed, closeButtonRef, onClose, onToggle }: SidebarProps) {
  return <aside className={cn("fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-800 bg-slate-950 text-white transition-all duration-200 lg:static lg:translate-x-0", collapsed ? "w-[76px]" : "w-72", open || !mobile ? "translate-x-0" : "-translate-x-full")} id="primary-navigation" aria-label="Primary navigation" aria-hidden={mobile && !open}>
    <div className={cn("flex h-20 items-center gap-3 border-b border-slate-800", collapsed ? "justify-center px-3" : "px-5")}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/10"><ShieldCheck className="h-5 w-5" /></div>
      {!collapsed && <div className="min-w-0"><p className="truncate text-sm font-semibold tracking-tight">AICTE Compliance AI</p><p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">Institution console</p></div>}
      <button ref={closeButtonRef} onClick={onClose} tabIndex={mobile && !open ? -1 : undefined} className="ml-auto rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white lg:hidden" aria-label="Close sidebar"><X className="h-5 w-5" /></button>
      <button type="button" onClick={onToggle} className="ml-auto hidden rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white lg:block" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</button>
    </div>
    <nav className={cn("flex-1 space-y-1 py-6", collapsed ? "px-2" : "px-3")}>
      {!collapsed && <p className="mb-3 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Workspace</p>}
      {NAV_ITEMS.map(({ to, icon: Icon, label, count }) => <NavLink key={to} to={to} onClick={onClose} tabIndex={mobile && !open ? -1 : undefined} end={to === "/dashboard"} title={collapsed ? label : undefined} className={({ isActive }) => cn("group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium", isActive ? "bg-emerald-400/10 text-emerald-300 before:absolute before:left-0 before:top-3 before:h-6 before:w-0.5 before:rounded-full before:bg-emerald-400" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100")}><Icon className="h-[18px] w-[18px] shrink-0" /><span className={cn("truncate", collapsed && "hidden")}>{label}</span>{count && !collapsed && <span className="ml-auto rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">{count}</span>}</NavLink>)}
    </nav>
    {!collapsed && <div className="mx-3 mb-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/15 text-xs font-bold text-emerald-300">NI</div><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-200">North Valley Institute</p><p className="mt-0.5 text-[10px] text-slate-500">Institution workspace</p></div><ChevronRight className="ml-auto h-4 w-4 text-slate-600" /></div></div>}
    <div className={cn("border-t border-slate-800 py-4", collapsed ? "px-2" : "px-5")}><div className="flex items-center gap-2"><Settings2 className={cn("h-4 w-4 text-slate-500", collapsed && "mx-auto")} />{!collapsed && <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">System status</span>}</div>{!collapsed && <p className="mt-2 text-[11px] leading-relaxed text-slate-500">Preliminary checks only.<br />Human review remains authoritative.</p>}</div>
  </aside>;
}
