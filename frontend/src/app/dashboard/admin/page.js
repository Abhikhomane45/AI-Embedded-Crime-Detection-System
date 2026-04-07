"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import AdminSidebar from "@/components/AdminSidebar";
import { motion } from "framer-motion";
import { Radio, BarChart3, Video, ShieldCheck, Activity, Users, RefreshCw } from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const checkedRef = useRef(false);

  const [stats, setStats] = useState({
    cameras: 0,
    incidents: 0,
    operators: 0,
    health: "SYNCING",
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardStats = async (user) => {
    try {
      let camerasCount = 0;
      let incidentsCount = 0;
      let opsCount = 0;

      // 1. Fetch Cameras
      try {
        const camSnap = await getDocs(collection(db, "cameras"));
        camerasCount = camSnap.docs.length;
      } catch (err) {
        // Fallback to API if firestore rules block direct fetch
        const token = await user.getIdToken();
        const res = await fetch("http://localhost:5000/api/operator/cameras", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          camerasCount = data.length || 0;
        }
      }

      // 2. Fetch Operators
      try {
        const opSnap = await getDocs(collection(db, "operators"));
        opsCount = opSnap.docs.length;
      } catch (err) {
        // Fallback to API if firestore rules block direct fetch
        const token = await user.getIdToken();
        const res = await fetch("http://localhost:5000/api/admin/operators-list", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          opsCount = data.operators?.length || 0;
        }
      }

      // 3. Fetch Incidents
      try {
        const incSnap = await getDocs(collection(db, "incidents"));
        incidentsCount = incSnap.docs.length;
      } catch (err) {
        console.warn("Failed to load incidents locally", err);
      }

      setStats({
        cameras: camerasCount,
        incidents: incidentsCount,
        operators: opsCount,
        health: "99.9%",
      });
      setLoading(false);
    } catch (e) {
      console.error("Dashboard Stats Fetch Error:", e);
      setStats((prev) => ({ ...prev, health: "DEGRADED" }));
      setLoading(false);
    }
  };

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      const role = localStorage.getItem("role");
      if (role !== "admin") {
        router.replace("/dashboard/operator");
        return;
      }

      fetchDashboardStats(user);
    });

    return () => unsub();
  }, [router]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
  };

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden font-['Outfit',sans-serif]" suppressHydrationWarning>
      <AdminSidebar />

      <div className="flex-1 flex flex-col relative w-full overflow-y-auto custom-scrollbar">
        <div className="sticky top-0 z-20">
          <Navbar title="ADMIN_OVERVIEW" />
        </div>

        {/* Global surveillance scanline effect */}
        <div className="fixed inset-0 scanlines opacity-20 pointer-events-none z-0"></div>

        <div className="p-8 max-w-7xl mx-auto w-full flex-1 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="text-3xl font-semibold text-slate-100 mb-2">Command Center</h2>
            <div className="flex items-center gap-2">
              <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest flex items-center gap-2">
                System status:{" "}
                <span className={stats.health === "SYNCING" ? "text-cyan-400 flex items-center gap-1" : "text-emerald-400"}>
                  {stats.health === "SYNCING" && <RefreshCw className="w-3 h-3 animate-spin" />}
                  {stats.health}
                </span>{" "}
                | System Anomalies: <span className="text-rose-400">{stats.incidents} DETECTED</span>
              </p>
            </div>
          </motion.div>

          {/* KPI Row */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {[
              {
                label: "Total Nodes",
                value: loading ? "..." : String(stats.cameras).padStart(2, "0"),
                icon: Video,
                color: "text-cyan-400",
                bg: "bg-cyan-900/20",
                border: "border-cyan-500/30",
              },
              {
                label: "Incident Log",
                value: loading ? "..." : String(stats.incidents).padStart(2, "0"),
                icon: Radio,
                color: "text-rose-400",
                bg: "bg-rose-900/20",
                border: "border-rose-500/30",
              },
              {
                label: "System Base",
                value: stats.health,
                icon: Activity,
                color: "text-emerald-400",
                bg: "bg-emerald-900/20",
                border: "border-emerald-500/30",
              },
              {
                label: "Personnel",
                value: loading ? "..." : String(stats.operators).padStart(2, "0"),
                icon: Users,
                color: "text-purple-400",
                bg: "bg-purple-900/20",
                border: "border-purple-500/30",
              },
            ].map((kpi, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className={`glass-panel p-5 border ${kpi.border} ${kpi.bg}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-lg bg-zinc-900/50 ${kpi.color}`}>
                    <kpi.icon className="w-5 h-5" />
                  </div>
                  <ShieldCheck className={`w-4 h-4 ${kpi.color} opacity-50`} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-100">{kpi.value}</h3>
                  <p className="text-xs uppercase tracking-widest text-zinc-400 mt-1 font-mono">
                    {kpi.label}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.h3
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg font-medium text-slate-300 mb-4 tracking-wide"
          >
            QUICK ACCESS
          </motion.h3>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <motion.a
              variants={itemVariants}
              href="/dashboard/operator"
              className="glass-card p-6 group block relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-colors group-hover:bg-rose-500/20"></div>
              <div className="p-3 bg-zinc-900 rounded-xl w-fit mb-4 border border-zinc-800">
                <Radio className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="font-semibold text-xl text-slate-100 mb-2">Live Monitoring</h3>
              <p className="text-sm text-zinc-400 font-mono">
                Access real-time crime alerts and dispatch units.
              </p>
            </motion.a>

            <motion.a
              variants={itemVariants}
              href="/analytics"
              className="glass-card p-6 group block relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-colors group-hover:bg-cyan-500/20"></div>
              <div className="p-3 bg-zinc-900 rounded-xl w-fit mb-4 border border-zinc-800">
                <BarChart3 className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="font-semibold text-xl text-slate-100 mb-2">Analytics Engine</h3>
              <p className="text-sm text-zinc-400 font-mono">
                Historical crime trends, heatmaps & predictive stats.
              </p>
            </motion.a>

            <motion.a
              variants={itemVariants}
              href="/cameras"
              className="glass-card p-6 group block relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-colors group-hover:bg-purple-500/20"></div>
              <div className="p-3 bg-zinc-900 rounded-xl w-fit mb-4 border border-zinc-800">
                <Video className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-semibold text-xl text-slate-100 mb-2">Camera Network</h3>
              <p className="text-sm text-zinc-400 font-mono">
                Deploy, configure, and calibrate CCTV & ESP32 nodes.
              </p>
            </motion.a>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
