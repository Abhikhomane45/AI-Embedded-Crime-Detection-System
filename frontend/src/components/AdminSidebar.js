"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Radio,
  BarChart3,
  Video,
  Users,
  ClipboardList,
  Shield,
  Fingerprint
} from "lucide-react";

export default function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href) => pathname.startsWith(href) && (href !== '/dashboard/admin' || pathname === '/dashboard/admin');

  const navItemClass = (active) =>
    `relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group overflow-hidden ${
      active
        ? "text-cyan-50 bg-cyan-900/20 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
        : "text-zinc-400 hover:text-cyan-100 hover:bg-zinc-800/50 border border-transparent"
    }`;

  const iconClass = (active) =>
    `h-5 w-5 transition-colors duration-300 ${active ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" : "text-zinc-500 group-hover:text-cyan-300"}`;

  return (
    <aside className="w-64 h-screen bg-zinc-950/80 backdrop-blur-2xl border-r border-zinc-800/60 px-4 py-6 flex flex-col justify-between shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
      
      {/* Top Section */}
      <div>
        {/* Logo / Header */}
        <div className="flex items-center gap-4 mb-10 px-2 relative group cursor-pointer">
          <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <motion.div 
            initial={{ rotate: -10 }}
            animate={{ rotate: 0 }}
            className="relative h-12 w-12 rounded-xl border border-zinc-700 bg-zinc-900 flex items-center justify-center shadow-lg overflow-hidden"
          >
            <Shield className="h-6 w-6 text-cyan-400 z-10" />
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/40 to-transparent"></div>
          </motion.div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 tracking-wide flex items-center gap-2">
              SYS_ADMIN
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse"></div>
            </h2>
            <p className="text-[10px] text-cyan-500/80 uppercase tracking-widest mt-0.5 font-mono">
              Level 4 Clearance
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          <Link href="/dashboard/admin" className={navItemClass(isActive("/dashboard/admin"))}>
            {isActive("/dashboard/admin") && (
              <motion.div layoutId="admin-active-bg" className="absolute inset-0 bg-cyan-600/10 rounded-xl" />
            )}
            <LayoutDashboard className={iconClass(isActive("/dashboard/admin"))} />
            <span className="relative z-10 font-medium tracking-wide text-sm">Overview</span>
          </Link>

          <Link href="/dashboard/operator" className={navItemClass(isActive("/dashboard/operator"))}>
            {isActive("/dashboard/operator") && (
              <motion.div layoutId="admin-active-bg" className="absolute inset-0 bg-cyan-600/10 rounded-xl" />
            )}
            <Radio className={iconClass(isActive("/dashboard/operator"))} />
            <span className="relative z-10 font-medium tracking-wide text-sm">Live Monitoring</span>
          </Link>

          <Link href="/dashboard/admin/analytics" className={navItemClass(isActive("/dashboard/admin/analytics"))}>
            {isActive("/dashboard/admin/analytics") && (
              <motion.div layoutId="admin-active-bg" className="absolute inset-0 bg-cyan-600/10 rounded-xl" />
            )}
            <BarChart3 className={iconClass(isActive("/dashboard/admin/analytics"))} />
            <span className="relative z-10 font-medium tracking-wide text-sm">Analytics</span>
          </Link>

          <Link href="/cameras" className={navItemClass(isActive("/cameras"))}>
            {isActive("/cameras") && (
              <motion.div layoutId="admin-active-bg" className="absolute inset-0 bg-cyan-600/10 rounded-xl" />
            )}
            <Video className={iconClass(isActive("/cameras"))} />
            <span className="relative z-10 font-medium tracking-wide text-sm">Camera Network</span>
          </Link>

          <Link href="/surveillance" className={navItemClass(isActive("/surveillance"))}>
            {isActive("/surveillance") && (
              <motion.div layoutId="admin-active-bg" className="absolute inset-0 bg-cyan-600/10 rounded-xl" />
            )}
            <Fingerprint className={iconClass(isActive("/surveillance"))} />
            <span className="relative z-10 font-medium tracking-wide text-sm">ESP32 Feed</span>
          </Link>

          <div className="pt-4 pb-1">
            <p className="px-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest border-b border-zinc-800/50 pb-2 mb-2">
              Personnel
            </p>
          </div>

          <Link href="/dashboard/admin/operators" className={navItemClass(isActive("/dashboard/admin/operators"))}>
            {isActive("/dashboard/admin/operators") && (
              <motion.div layoutId="admin-active-bg" className="absolute inset-0 bg-cyan-600/10 rounded-xl" />
            )}
            <Users className={iconClass(isActive("/dashboard/admin/operators"))} />
            <span className="relative z-10 font-medium tracking-wide text-sm">Operators</span>
          </Link>

          <Link href="/dashboard/admin/operator-logs" className={navItemClass(isActive("/dashboard/admin/operator-logs"))}>
            {isActive("/dashboard/admin/operator-logs") && (
              <motion.div layoutId="admin-active-bg" className="absolute inset-0 bg-cyan-600/10 rounded-xl" />
            )}
            <ClipboardList className={iconClass(isActive("/dashboard/admin/operator-logs"))} />
            <span className="relative z-10 font-medium tracking-wide text-sm">Audit Logs</span>
          </Link>
        </nav>
      </div>

      {/* Bottom Info Panel */}
      <div className="mt-8 p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/30 text-xs text-zinc-400 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 drop-shadow-[0_0_4px_#10b981]"></div>
        </div>
        <div className="scanlines absolute inset-0"></div>
        <p className="font-mono text-cyan-400 mb-1 flex items-center gap-2 relative z-10">
          SEC_STATUS // ACTIVE
        </p>
        <p className="leading-relaxed relative z-10 text-zinc-500 font-medium">
          System postulate optimal. Traffic monitored in real-time. Full E2E cipher.
        </p>
      </div>
    </aside>
  );
}
