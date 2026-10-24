import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useEffect, useRef, useState } from "react";

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasSidebarOpen = useRef(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (sidebarOpen && isMobile) {
      closeButtonRef.current?.focus();
    } else if (wasSidebarOpen.current && !sidebarOpen) {
      menuButtonRef.current?.focus();
    }
    wasSidebarOpen.current = sidebarOpen;
  }, [isMobile, sidebarOpen]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && sidebarOpen) setSidebarOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [sidebarOpen]);

  useEffect(() => {
    mainRef.current?.focus();
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f7fa]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-navy-900 focus:shadow-lg"
      >
        Skip to main content
      </a>
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        open={sidebarOpen}
        mobile={isMobile}
        collapsed={sidebarCollapsed}
        closeButtonRef={closeButtonRef}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          menuOpen={sidebarOpen}
          menuButtonRef={menuButtonRef}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main
          ref={mainRef}
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-x-hidden overflow-y-auto bg-[#f4f7fa] p-4 outline-none sm:p-6 lg:p-8 xl:p-10"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
