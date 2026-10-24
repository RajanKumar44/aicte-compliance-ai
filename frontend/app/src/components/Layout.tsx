import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileSidebarOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileSidebarOpen]);

  return (
    <div className="app-shell min-h-screen bg-bg-0 flex">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {mobileSidebarOpen && (
        <button
          type="button"
          className="no-print fixed inset-0 z-40 bg-bg-0/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close navigation menu"
        />
      )}

      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-[padding] duration-300",
          sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-[260px]"
        )}
      >
        <TopBar
          onMenuToggle={() => setMobileSidebarOpen((open) => !open)}
          mobileMenuOpen={mobileSidebarOpen}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
            <Outlet />
            <footer className="app-footer mt-12 flex flex-col gap-4 border-t border-border pt-5 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-text-secondary">Prototype only. Results require human review and do not establish AICTE compliance.</p>
              <nav className="flex items-center gap-5" aria-label="Legal information">
                <Link to="/privacy" className="text-text-body underline decoration-border-hover underline-offset-4 hover:text-text-heading">Privacy</Link>
                <Link to="/terms" className="text-text-body underline decoration-border-hover underline-offset-4 hover:text-text-heading">Terms</Link>
              </nav>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
