import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasSidebarOpen = useRef(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (sidebarOpen && isMobile) closeButtonRef.current?.focus();
    else if (wasSidebarOpen.current && !sidebarOpen) menuButtonRef.current?.focus();
    wasSidebarOpen.current = sidebarOpen;
  }, [isMobile, sidebarOpen]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && sidebarOpen) setSidebarOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [sidebarOpen]);

  useEffect(() => { mainRef.current?.focus(); }, [pathname]);

  return (
    <div className={darkMode ? "dark flex h-screen overflow-hidden bg-slate-950" : "flex h-screen overflow-hidden bg-slate-50"}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-emerald-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950">Skip to main content</a>
      {sidebarOpen && isMobile && <div className="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}
      <Sidebar open={sidebarOpen} mobile={isMobile} collapsed={sidebarCollapsed} closeButtonRef={closeButtonRef} onClose={() => setSidebarOpen(false)} onToggle={() => setSidebarCollapsed((value) => !value)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar menuOpen={sidebarOpen} menuButtonRef={menuButtonRef} onMenuClick={() => setSidebarOpen(true)} darkMode={darkMode} onThemeToggle={() => setDarkMode((value) => !value)} />
        <main ref={mainRef} id="main-content" tabIndex={-1} className="app-grid flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-4 outline-none dark:bg-slate-950 sm:p-6 lg:p-8 xl:p-10"><Outlet /></main>
      </div>
    </div>
  );
}
