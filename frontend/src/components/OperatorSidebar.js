"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Image, Map, Shield, CheckCircle, Radio, X } from "lucide-react";
import LogoutButton from "./LogoutButton";

export default function OperatorSidebar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleToggle = () => setMenuOpen((prev) => !prev);
    window.addEventListener("app:toggle-sidebar", handleToggle);
    return () => window.removeEventListener("app:toggle-sidebar", handleToggle);
  }, []);

  const handleClose = () => setMenuOpen(false);
  const isActive = (href) => pathname === href;

  const navItemClass = (active) =>
    `relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group overflow-hidden ${
      active
        ? "text-rose-50 bg-rose-900/20 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
        : "text-zinc-400 hover:text-rose-100 hover:bg-zinc-800/50 border border-transparent"
    }`;

  const iconClass = (active) =>
    `h-5 w-5 transition-colors duration-300 ${active ? "text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" : "text-zinc-500 group-hover:text-rose-300"}`;

  return (
    <>
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={handleClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <div
        id="operator-sidebar"
        className={`fixed left-0 top-0 z-50 h-screen w-64 bg-zinc-950/80 backdrop-blur-2xl px-4 py-6 flex flex-col border-r border-zinc-800/60 shadow-[4px_0_24px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] md:static md:z-auto md:translate-x-0 md:min-h-screen ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Operator navigation"
      >
        <div className="flex items-center justify-between mb-10 px-2 group cursor-default">
          <div className="flex items-center gap-3">
             <div className="relative h-10 w-10 rounded-xl border border-rose-900 bg-zinc-900 flex items-center justify-center shadow-lg overflow-hidden">
              <Shield className="h-5 w-5 text-rose-500 z-10" />
              <div className="absolute inset-0 bg-gradient-to-tr from-rose-900/40 to-transparent"></div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 tracking-wide flex items-center gap-2">
                OPS_CMD
              </h2>
              <p className="text-[10px] text-rose-500/80 uppercase tracking-widest mt-0.5 font-mono">
                Live Response
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleClose}
            className="md:hidden rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800/80 transition-colors border border-transparent hover:border-zinc-700"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="space-y-2 flex-1 relative z-10">
          <Link
            href="/dashboard/operator"
            onClick={handleClose}
            className={navItemClass(isActive("/dashboard/operator"))}
          >
            {isActive("/dashboard/operator") && (
              <motion.div layoutId="op-active-bg" className="absolute inset-0 bg-rose-600/10 rounded-xl" />
            )}
            <AlertTriangle className={iconClass(isActive("/dashboard/operator"))} />
            <span className="relative z-10 font-medium tracking-wide text-sm">Live Feed</span>
          </Link>

          <Link
            href="/detect-image"
            onClick={handleClose}
            className={navItemClass(isActive("/detect-image"))}
          >
            {isActive("/detect-image") && (
              <motion.div layoutId="op-active-bg" className="absolute inset-0 bg-rose-600/10 rounded-xl" />
            )}
            <Image className={iconClass(isActive("/detect-image"))} />
            <span className="relative z-10 font-medium tracking-wide text-sm">Image Analysis</span>
          </Link>

          <Link
            href="/dashboard/operator/map"
            onClick={handleClose}
            className={navItemClass(isActive("/dashboard/operator/map"))}
          >
            {isActive("/dashboard/operator/map") && (
              <motion.div layoutId="op-active-bg" className="absolute inset-0 bg-rose-600/10 rounded-xl" />
            )}
            <Map className={iconClass(isActive("/dashboard/operator/map"))} />
            <span className="relative z-10 font-medium tracking-wide text-sm">Tactical Map</span>
          </Link>

          <Link
            href="/dashboard/operator/incidents"
            onClick={handleClose}
            className={navItemClass(isActive("/dashboard/operator/incidents"))}
          >
            {isActive("/dashboard/operator/incidents") && (
              <motion.div layoutId="op-active-bg" className="absolute inset-0 bg-rose-600/10 rounded-xl" />
            )}
            <CheckCircle className={iconClass(isActive("/dashboard/operator/incidents"))} />
            <span className="relative z-10 font-medium tracking-wide text-sm">Case Files</span>
          </Link>

          <Link
            href="/surveillance"
            onClick={handleClose}
            className={navItemClass(isActive("/surveillance"))}
          >
            {isActive("/surveillance") && (
              <motion.div layoutId="op-active-bg" className="absolute inset-0 bg-rose-600/10 rounded-xl" />
            )}
            <Radio className={iconClass(isActive("/surveillance"))} />
            <span className="relative z-10 font-medium tracking-wide text-sm">Active Scan</span>
          </Link>
        </nav>

        {/* Global surveillance scanline effect on sidebars too for atmosphere */}
        <div className="absolute inset-0 scanlines opacity-30 pointer-events-none"></div>

        <div className="mt-6 pt-4 border-t border-zinc-800/60 relative z-10">
          <LogoutButton />
        </div>
      </div>
    </>
  );
}
