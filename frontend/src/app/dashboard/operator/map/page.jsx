"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";

import IncidentMap from "@/components/IncidentMap";
import Navbar from "@/components/Navbar";
import OperatorSidebar from "@/components/OperatorSidebar";
import { motion } from "framer-motion";
import { 
  AlertCircle, 
  MapPin, 
  RefreshCw, 
  Shield,
  Camera,
  AlertTriangle,
  Activity,
  Eye,
  CheckCircle,
  TrendingUp,
  Clock,
  Layers
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function OperatorMapPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cameraCount, setCameraCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let unsubscribeIncidents = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setError("Authentication required. Please log in to access the incident map.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // 🔐 Ensure fresh token for Firestore rules
        await user.getIdToken(true);

        /* 1️⃣ Load operator profile */
        const operatorSnap = await getDoc(
          doc(db, "operators", user.uid)
        );

        if (!operatorSnap.exists()) {
          setError("Operator profile not found. Please contact support.");
          setLoading(false);
          return;
        }

        const cameraIds = operatorSnap.data().cameras || [];
        setCameraCount(cameraIds.length);

        if (cameraIds.length === 0) {
          setError("No nodes assigned to your account. Please contact your administrator.");
          setLoading(false);
          return;
        }

        /* 2️⃣ Real-time incidents (Firestore-safe) */
        const q = query(
          collection(db, "incidents"),
          where("location.cameraId", "in", cameraIds)
        );

        unsubscribeIncidents = onSnapshot(
          q,
          (snapshot) => {
            const list = snapshot.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            }));
            setIncidents(list);
            setLastUpdate(new Date());
            setLoading(false);
          },
          (err) => {
            console.error("❌ Firestore snapshot error:", err);
            setError("Connection error. Please check your internet connection.");
            setLoading(false);
          }
        );
      } catch (err) {
        console.error("❌ Operator map error:", err);
        setError("Unable to load incident data. Please try again.");
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeIncidents) unsubscribeIncidents();
    };
  }, []);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    window.location.reload();
  };

  const getIncidentStats = () => {
    const normalize = (value) => (value || "").toLowerCase();
    const resolveLevel = (incident) =>
      normalize(incident.severity) ||
      normalize(incident.threat_level) ||
      "low";

    const critical = incidents.filter((i) => resolveLevel(i) === "critical").length;
    const high = incidents.filter((i) => resolveLevel(i) === "high").length;
    const medium = incidents.filter((i) => resolveLevel(i) === "medium").length;
    const low = incidents.filter((i) => resolveLevel(i) === "low").length;

    return {
      total: incidents.length,
      critical,
      high,
      medium,
      low,
    };
  };

  const getIncidentTimeMs = (incident) => {
    const createdAt = incident.createdAt;
    if (createdAt?.toDate) return createdAt.toDate().getTime();
    if (createdAt instanceof Date) return createdAt.getTime();
    if (typeof createdAt === "string" || typeof createdAt === "number") {
      const parsed = new Date(createdAt).getTime();
      return Number.isNaN(parsed) ? null : parsed;
    }

    const legacyTimestamp = incident.timestamp;
    if (legacyTimestamp instanceof Date) return legacyTimestamp.getTime();
    if (typeof legacyTimestamp === "string" || typeof legacyTimestamp === "number") {
      const parsed = new Date(legacyTimestamp).getTime();
      return Number.isNaN(parsed) ? null : parsed;
    }

    return null;
  };

  const resolveSeverityBucket = (incident) => {
    const raw = (incident.severity || incident.threat_level || "").toLowerCase();
    if (raw === "critical") return "critical";
    if (raw === "warning" || raw === "high" || raw === "medium") return "warning";
    if (raw === "low" || raw === "info") return "info";
    return null;
  };

  const getLast24hTrend = (items) => {
    const now = Date.now();
    const buckets = Array.from({ length: 24 }, (_, i) => {
      const hoursAgo = 23 - i;
      const bucketTime = new Date(now - hoursAgo * 60 * 60 * 1000);
      const label = bucketTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      return {
        hour: i,
        label,
        critical: 0,
        warning: 0,
        info: 0,
      };
    });

    items.forEach((incident) => {
      const timeMs = getIncidentTimeMs(incident);
      if (!timeMs) return;

      const diffHours = Math.floor((now - timeMs) / (1000 * 60 * 60));
      if (diffHours < 0 || diffHours >= 24) return;

      const bucket = buckets[23 - diffHours];
      const severity = resolveSeverityBucket(incident);
      if (severity && bucket[severity] !== undefined) {
        bucket[severity] += 1;
      }
    });

    return buckets.map((bucket, index) => {
      const isRecent = index >= 21;
      return {
        ...bucket,
        criticalRecent: isRecent ? bucket.critical : null,
        warningRecent: isRecent ? bucket.warning : null,
        infoRecent: isRecent ? bucket.info : null,
      };
    });
  };

  const stats = getIncidentStats();
  const trendData = getLast24hTrend(incidents);

  /* ================= UI ================= */

  if (error) {
    return (
      <div className="flex h-screen bg-zinc-950 overflow-hidden font-['Outfit']">
        <OperatorSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 z-50">
            <Navbar title="LIVE_MAP" />
          </div>
          <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center relative">
            <div className="absolute inset-0 scanlines opacity-20 pointer-events-none"></div>
            <div className="max-w-xl w-full">
              <div className="glass-panel p-10 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div className="relative mb-6 mx-auto w-20 h-20 bg-rose-950 border border-rose-500/30 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.3)]">
                  <AlertCircle className="w-10 h-10 text-rose-500 relative z-10" />
                </div>
                <h3 className="text-2xl font-bold text-slate-100 mb-3 tracking-wide">
                  CONNECTION LOST
                </h3>
                <p className="text-zinc-400 mb-8 font-mono text-sm">
                  {error}
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={handleRetry}
                    className="glass-button-primary"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Re-Establish Link
                  </button>
                  <button
                    onClick={() => window.history.back()}
                    className="glass-button"
                  >
                    Abort
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden font-['Outfit'] text-slate-100" suppressHydrationWarning>
      <div className="flex-shrink-0">
        <OperatorSidebar />
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10">
        <div className="flex-shrink-0 z-50">
          <Navbar 
            title={
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-10 h-10 bg-cyan-950 border border-cyan-500/30 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                    <MapPin className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-900 shadow-[0_0_8px_#10b981]"></div>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-100 tracking-wide uppercase">Tactical Map</h1>
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-500">
                    <div className="flex items-center gap-1.5 text-cyan-400">
                      <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></div>
                      <span>LIVE SYNC</span>
                    </div>
                    <span>•</span>
                    <span>{cameraCount} NODES ACTIVE</span>
                  </div>
                </div>
              </div>
            }
          />
        </div>
        
        <div className="absolute inset-0 scanlines opacity-20 pointer-events-none"></div>

        <div className="flex-1 overflow-auto custom-scrollbar relative z-10">
          <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto pb-20">
            {/* Header Stats */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-100 uppercase tracking-wide">Geospatial Overview</h2>
                <p className="text-zinc-500 mt-1 font-mono text-sm">
                  Global theater mapping across {cameraCount} surveillance vectors
                </p>
              </div>
              <div className="flex items-center gap-3">
                {mounted && lastUpdate && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/50 rounded-lg border border-zinc-800 shadow-sm font-mono text-xs text-cyan-400">
                    <Clock className="w-3 h-3" />
                    <span>
                      T-{lastUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>
                )}
                <button 
                  onClick={handleRetry}
                  className="glass-button text-xs font-mono uppercase tracking-widest"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  SYNC
                </button>
              </div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-4 gap-4"
            >
              <div className="glass-panel p-5 border-rose-500/20 bg-gradient-to-br from-zinc-900/50 to-rose-950/20 group hover:border-rose-500/40 transition">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-mono tracking-widest text-zinc-500 mb-1">ACTIVE TARGETS</p>
                    <div className="flex items-baseline gap-3">
                      <p className="text-4xl font-bold text-slate-100">{incidents.length}</p>
                      {incidents.length > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-rose-500/20 border border-rose-500/30 rounded text-rose-400 text-[9px] font-mono uppercase tracking-widest animate-pulse">
                          Tracking
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-3 bg-rose-900/30 rounded-xl border border-rose-500/30 text-rose-500">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-zinc-800/60">
                  <div className="flex justify-between text-xs font-mono uppercase tracking-widest">
                    <span className="text-rose-500 flex items-center gap-2"><div className="w-2 h-2 bg-rose-500 rounded-full mb-[1px]"></div> CRITICAL: {stats.critical}</span>
                    <span className="text-orange-500 flex items-center gap-2"><div className="w-2 h-2 bg-orange-500 rounded-full mb-[1px]"></div> HIGH: {stats.high}</span>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-5 border-cyan-500/20 bg-gradient-to-br from-zinc-900/50 to-cyan-950/20 group hover:border-cyan-500/40 transition">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-mono tracking-widest text-zinc-500 mb-1">SENSOR NETWORK</p>
                    <p className="text-4xl font-bold text-slate-100">{cameraCount}</p>
                  </div>
                  <div className="p-3 bg-cyan-900/30 rounded-xl border border-cyan-500/30 text-cyan-400">
                    <Camera className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-zinc-800/60">
                  <div className="flex items-center gap-2 text-xs font-mono tracking-widest uppercase">
                    <div className={`w-2 h-2 rounded-full mb-[1px] ${cameraCount > 0 ? 'bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse' : 'bg-zinc-600'}`}></div>
                    <span className="text-emerald-400">
                      {cameraCount > 0 ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-5 border-emerald-500/20 bg-gradient-to-br from-zinc-900/50 to-emerald-950/20 group hover:border-emerald-500/40 transition">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-mono tracking-widest text-zinc-500 mb-1">SYSTEM CORE</p>
                    <div className="flex items-center gap-3">
                      <p className="text-3xl font-bold text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">STABLE</p>
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-900/30 rounded-xl border border-emerald-500/30 text-emerald-400">
                    <Shield className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-zinc-800/60">
                  <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-zinc-400 uppercase">
                    <Activity className="w-3.5 h-3.5 mb-[1px]" />
                    <span>Uptime: 99.9%</span>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-5 border-purple-500/20 bg-gradient-to-br from-zinc-900/50 to-purple-950/20 group hover:border-purple-500/40 transition">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-mono tracking-widest text-zinc-500 mb-1">LATENCY</p>
                    <div className="flex items-baseline gap-1 mt-1">
                       <p className="text-4xl font-bold text-slate-100">14</p>
                       <span className="text-slate-400 font-mono text-sm">ms</span>
                    </div>
                  </div>
                  <div className="p-3 bg-purple-900/30 rounded-xl border border-purple-500/30 text-purple-400">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-zinc-800/60">
                  <div className="flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-emerald-400">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mb-[1px]"></div>
                    <span>OPTIMAL LINK</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Map Container */}
            <motion.div 
               initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
               className="glass-panel overflow-hidden relative"
            >
              {/* Map Header */}
              <div className="px-6 py-4 bg-zinc-900/40 border-b border-zinc-800/60 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-widest">Global Topography</h2>
                </div>
                <div className="flex items-center gap-4">
                  {loading && (
                    <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-cyan-400">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Syncing...</span>
                    </div>
                  )}
                  <div className="tech-badge bg-rose-950 text-rose-400 border-rose-500/30">
                    <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_#f43f5e]"></div>
                    SAT_LINK_ACTIVE
                  </div>
                </div>
              </div>
              
              {/* Map Content */}
              <div className="p-4 bg-zinc-950/50">
                {loading ? (
                  <div className="h-[600px] flex flex-col items-center justify-center bg-zinc-900/20 rounded-xl border border-dashed border-zinc-800">
                    <div className="relative mb-6">
                      <div className="w-20 h-20 border-2 border-zinc-800 border-t-cyan-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <MapPin className="w-8 h-8 text-cyan-500" />
                      </div>
                    </div>
                    <p className="text-zinc-500 font-mono tracking-widest text-xs uppercase">Establishing Satellite Uplink...</p>
                  </div>
                ) : incidents.length === 0 ? (
                  <div className="h-[600px] flex flex-col items-center justify-center bg-emerald-950/10 rounded-xl border border-emerald-900/20">
                    <div className="relative mb-6 w-24 h-24 bg-emerald-900/20 rounded-full flex items-center justify-center border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                      <Shield className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-bold text-emerald-400 mb-2 uppercase tracking-wide">Theater Secure</h3>
                    <p className="text-zinc-500 font-mono text-xs max-w-sm text-center uppercase tracking-widest mb-6">
                      Zero anomalies detected across {cameraCount} configured nodes.
                    </p>
                    <div className="flex items-center gap-6 font-mono text-xs text-zinc-400 uppercase tracking-widest">
                      <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Secure</span>
                      <span className="flex items-center gap-2"><Eye className="w-4 h-4 text-cyan-500" /> Monitoring</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden border border-zinc-800/80 shadow-lg map-premium relative">
                    {/* Corner decorative anchors */}
                    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-500/50 z-[1000] pointer-events-none"></div>
                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-500/50 z-[1000] pointer-events-none"></div>
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-500/50 z-[1000] pointer-events-none"></div>
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-500/50 z-[1000] pointer-events-none"></div>
                    
                    <IncidentMap incidents={incidents} />
                  </div>
                )}
              </div>
              
              {/* Map Footer Legend */}
              {incidents.length > 0 && !loading && (
                <div className="px-6 py-4 bg-zinc-900/40 border-t border-zinc-800/60">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-6 font-mono text-[10px] tracking-widest uppercase">
                      <div className="flex items-center gap-2 text-rose-400">
                        <div className="w-3 h-3 bg-rose-500 rounded-full shadow-[0_0_5px_#f43f5e]"></div>
                        <span>Critical [{stats.critical}]</span>
                      </div>
                      <div className="flex items-center gap-2 text-orange-400">
                        <div className="w-3 h-3 bg-orange-500 rounded-full shadow-[0_0_5px_#f97316]"></div>
                        <span>High [{stats.high}]</span>
                      </div>
                      <div className="flex items-center gap-2 text-yellow-500">
                        <div className="w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_5px_#facc15]"></div>
                        <span>Medium [{stats.medium}]</span>
                      </div>
                      <div className="flex items-center gap-2 text-blue-400">
                        <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_5px_#3b82f6]"></div>
                        <span>Low [{stats.low}]</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono text-zinc-500 uppercase tracking-widest">
                       <p>Displaying {incidents.length} anomalies</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Severity Trend */}
            <motion.div 
               initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
               className="glass-panel overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-zinc-800/60 bg-zinc-900/30 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest font-mono flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" /> Anomaly Trend / 24H
                </h3>
              </div>
              <div className="p-6">
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" strokeOpacity={0.8} />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#71717a", fontFamily: "monospace" }} axisLine={{ stroke: '#3f3f46' }} tickLine={{ stroke: '#3f3f46' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#71717a", fontFamily: "monospace" }} axisLine={{ stroke: '#3f3f46' }} tickLine={{ stroke: '#3f3f46' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#f4f4f5' }} />
                      <Line
                        type="monotone"
                        dataKey="critical"
                        stroke="#f43f5e"
                        strokeWidth={2}
                        strokeOpacity={0.3}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="warning"
                        stroke="#f97316"
                        strokeWidth={2}
                        strokeOpacity={0.3}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="info"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        strokeOpacity={0.3}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="criticalRecent"
                        stroke="#f43f5e"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#18181b', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#f43f5e' }}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="warningRecent"
                        stroke="#f97316"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#18181b', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#f97316' }}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="infoRecent"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#18181b', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#3b82f6' }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}