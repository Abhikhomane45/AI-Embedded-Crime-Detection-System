"use client";

import { motion } from "framer-motion";
import { ShieldAlert, Activity, Eye, Zap, ChevronRight } from "lucide-react";

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0.4 } }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100 flex flex-col relative overflow-hidden font-['Outfit',sans-serif]">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-900/20 via-zinc-950 to-zinc-950"></div>
      <div className="absolute inset-0 scanlines opacity-20 pointer-events-none"></div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center gap-14 px-6 py-20 lg:flex-row lg:items-center lg:gap-16">
        
        <motion.section 
          className="flex-1 space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3 py-1 text-xs font-medium text-cyan-400 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            SYSTEM ONLINE // V4.2.1
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl/tight bg-clip-text text-transparent bg-gradient-to-br from-white via-slate-200 to-slate-500">
              Nexus <span className="text-cyan-400">Security</span><br />
              <span className="text-3xl sm:text-4xl text-slate-400">Tactical Surveillance AI</span>
            </h1>
            <p className="mt-6 text-lg text-slate-400 max-w-xl leading-relaxed">
              Coordinate rapid response teams, analyze autonomous feeds, and intercept anomalies with a unified high-stakes command dashboard. 
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="flex flex-wrap gap-4 pt-4">
            <a href="/login" className="glass-button-primary px-6 py-3 text-base">
              Authenticate <ChevronRight className="w-4 h-4" />
            </a>
            <a
              href="/dashboard"
              className="glass-button px-6 py-3 text-base"
            >
              Access Terminal
            </a>
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4 pt-8">
            {[
              { label: "Active Nodes", value: "128", icon: Eye, color: "text-cyan-400" },
              { label: "Anomalies", value: "3", icon: ShieldAlert, color: "text-rose-400" },
              { label: "Latency", value: "14ms", icon: Activity, color: "text-emerald-400" },
            ].map((item, i) => (
              <div key={i} className="glass-panel p-4 flex flex-col items-start gap-2 group hover:border-zinc-700 transition-colors">
                <item.icon className={`w-5 h-5 ${item.color} opacity-80 group-hover:opacity-100 transition-opacity`} />
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">
                    {item.label}
                  </p>
                  <p className="text-2xl font-semibold text-slate-100 mt-1">
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.section>

        <motion.section 
          className="flex-1 w-full"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3, type: "spring" }}
        >
          <div className="glass-panel border-cyan-500/20 p-6 relative overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.1)]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-3xl rounded-full"></div>
            
            <div className="flex items-center justify-between relative z-10 border-b border-zinc-800/60 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                  <Zap className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-100">
                    Citywide Pulse
                  </h2>
                  <p className="text-xs uppercase tracking-widest text-zinc-500 font-mono">
                    Network Overview
                  </p>
                </div>
              </div>
              <div className="tech-badge">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                SYNCED
              </div>
            </div>

            <div className="grid gap-4 relative z-10">
              <div className="glass-card p-4 hover:border-rose-500/30 group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-300">Level 4 Threats</span>
                  <span className="text-sm font-mono font-bold text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]">02</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "25%" }}
                    transition={{ duration: 1, delay: 0.8 }}
                    className="h-full rounded-full bg-rose-500 shadow-[0_0_10px_#f43f5e]" 
                  />
                </div>
              </div>

              <div className="glass-card p-4 hover:border-emerald-500/30 group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-300">Operator Coverage</span>
                  <span className="text-sm font-mono font-bold text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">94%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "94%" }}
                    transition={{ duration: 1.2, delay: 0.9 }}
                    className="h-full rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" 
                  />
                </div>
              </div>

              <div className="glass-card p-4 hover:border-purple-500/30 group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-300">Neural Net Stability</span>
                  <span className="text-sm font-mono font-bold text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]">OPT</span>
                </div>
                <p className="text-xs text-zinc-500 font-mono">
                  [LOG] Pose estimation heuristics stable. No anomalies detected in current feed cohort.
                </p>
              </div>
            </div>
            
            {/* Decorative tech corners */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500/50 rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500/50 rounded-tr-lg"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500/50 rounded-bl-lg"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500/50 rounded-br-lg"></div>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
