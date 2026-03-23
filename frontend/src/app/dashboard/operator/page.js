"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  orderBy,
  query,
  where
} from "firebase/firestore";
import {
  BarChart3,
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  Filter,
  Camera,
  Clock,
  MapPin,
  Users,
  TrendingUp,
  Search,
  MoreVertical,
  Download,
  Eye,
  Activity
} from "lucide-react";

import Navbar from "@/components/Navbar";
import OperatorSidebar from "@/components/OperatorSidebar";
import { motion, AnimatePresence } from "framer-motion";

export default function OperatorDashboard() {
  const router = useRouter();

  const [incidents, setIncidents] = useState([]);
  const [cameraFilter, setCameraFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [operatorCameras, setOperatorCameras] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* ---------- AUTH GUARD ---------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      if (localStorage.getItem("role") !== "operator") {
        router.replace("/dashboard/admin");
        return;
      }

      const opRef = doc(db, "operators", user.uid);
      const opSnap = await getDoc(opRef);

      if (!opSnap.exists()) {
        console.error("Operator profile missing");
        return;
      }

      setOperatorCameras(opSnap.data().cameras || []);
    });

    return () => unsub();
  }, [router]);

  /* ---------- FETCH INCIDENTS ---------- */
  useEffect(() => {
    if (!operatorCameras || operatorCameras.length === 0) return;

    const fetchIncidents = async () => {
      try {
        setLoading(true);

        const q = query(
          collection(db, "incidents"),
          orderBy("createdAt", "desc"),
          where("location.cameraId", "in", operatorCameras)
        );

        const snap = await getDocs(q);

        const list = snap.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || null,
          };
        });

        setIncidents(list);
        calculateStats(list);
      } catch (err) {
        console.error("❌ Fetch incidents error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchIncidents();
  }, [operatorCameras]);

  /* ---------- STATS ---------- */
  const calculateStats = (list) => {
    const s = {
      total: list.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    list.forEach((i) => {
      const level = i.threat_level?.toUpperCase() || "MEDIUM";
      if (level === "CRITICAL") s.critical++;
      else if (level === "HIGH") s.high++;
      else if (level === "MEDIUM") s.medium++;
      else if (level === "LOW") s.low++;
    });

    setStats(s);
  };

  /* ---------- FILTERED INCIDENTS ---------- */
  const filteredIncidents = incidents.filter((i) => {
      const cameraMatch =
        cameraFilter === "all" ||
        i.location?.cameraId === cameraFilter;

      const severityMatch =
        severityFilter === "all" ||
        i.threat_level?.toLowerCase() === severityFilter;

      const searchMatch =
        searchQuery === "" ||
        i.crime_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.location?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.threat_level?.toLowerCase().includes(searchQuery.toLowerCase());

      return cameraMatch && severityMatch && searchMatch;
  });

  /* ---------- HELPERS ---------- */
  const formatDate = (date) => {
    if (!date) return "Unknown";
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return mounted ? date.toLocaleDateString([], { 
      year: "numeric", 
      month: "short", 
      day: "numeric" 
    }) : "";
  };

  const getCrimeTypeDisplay = (type) =>
    type
      ? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "Unknown Activity";

  const getSeverityInfo = (level) => {
    const lvl = level?.toUpperCase() || "MEDIUM";
    switch (lvl) {
      case "CRITICAL":
        return {
          color: "text-rose-500",
          bg: "bg-rose-950/40",
          icon: <ShieldAlert className="w-5 h-5" />,
          label: "CRITICAL",
          border: "border-rose-500/50",
          fill: "bg-rose-500",
          shadow: "shadow-[0_0_15px_rgba(244,63,94,0.4)]"
        };
      case "HIGH":
        return {
          color: "text-orange-500",
          bg: "bg-orange-950/40",
          icon: <AlertTriangle className="w-5 h-5" />,
          label: "HIGH",
          border: "border-orange-500/50",
          fill: "bg-orange-500",
          shadow: "shadow-[0_0_15px_rgba(249,115,22,0.4)]"
        };
      case "MEDIUM":
        return {
          color: "text-yellow-500",
          bg: "bg-yellow-950/40",
          icon: <AlertTriangle className="w-5 h-5" />,
          label: "MEDIUM",
          border: "border-yellow-500/50",
          fill: "bg-yellow-500",
          shadow: "shadow-[0_0_15px_rgba(234,179,8,0.4)]"
        };
      case "LOW":
        return {
          color: "text-blue-400",
          bg: "bg-blue-950/40",
          icon: <CheckCircle className="w-5 h-5" />,
          label: "LOW",
          border: "border-blue-500/50",
          fill: "bg-blue-500",
          shadow: "shadow-[0_0_15px_rgba(59,130,246,0.4)]"
        };
      default:
        return {
          color: "text-zinc-400",
          bg: "bg-zinc-900",
          icon: <CheckCircle className="w-5 h-5" />,
          label: "INFO",
          border: "border-zinc-700",
          fill: "bg-zinc-500",
          shadow: ""
        };
    }
  };

  const getUniqueCameras = () => {
    const cameras = incidents
      .map(i => i.location?.cameraId)
      .filter(Boolean);
    return [...new Set(cameras)];
  };

  const exportIncidents = () => {
    const data = filteredIncidents.map(inc => ({
      ID: inc.id,
      Type: inc.crime_type,
      Severity: inc.threat_level,
      Location: inc.location?.name,
      Camera: inc.location?.cameraId,
      Confidence: `${Math.round((inc.confidence || 0) * 100)}%`,
      "People Detected": inc.persons_detected || 0,
      "Threat Score": inc.threat_score || 0,
      Timestamp: mounted ? (inc.createdAt?.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }) || "Unknown") : "Unknown"
    }));

    const csv = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = mounted ? `incidents_${new Date().toISOString().split('T')[0]}.csv` : 'incidents.csv';
    a.click();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden text-slate-100 font-['Outfit']" suppressHydrationWarning>
      <OperatorSidebar />

      <div className="flex-1 flex flex-col relative z-10 w-full overflow-y-auto custom-scrollbar">
        <Navbar title="OPS_DASHBOARD" />

        <div className="fixed inset-0 scanlines opacity-20 pointer-events-none"></div>

        <div className="p-6 md:p-8 space-y-8 flex-1 w-full max-w-7xl mx-auto pb-20 relative z-10">
          {/* HEADER */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
          >
            <div>
              <div className="tech-badge mb-3">Operator Workspace</div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-wide uppercase">Incident Management</h1>
              <p className="text-zinc-500 font-mono text-sm mt-1">Monitor and respond to security anomalies in real-time</p>
            </div>
            <button
              onClick={exportIncidents}
              className="glass-button flex-items-center"
              suppressHydrationWarning
            >
              <Download className="w-4 h-4" />
              Export Telemetry
            </button>
          </motion.div>

          {/* STATS CARDS */}
          <motion.div 
            className="grid grid-cols-2 lg:grid-cols-5 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={itemVariants} className="glass-panel p-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[10px] font-mono leading-none tracking-widest text-zinc-500 uppercase">Total_Events</p>
                  <p className="text-3xl font-bold text-slate-100 mt-2">{stats.total}</p>
                </div>
                <div className="p-2.5 bg-cyan-900/30 rounded-lg border border-cyan-500/20">
                  <Activity className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div className="mt-4 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]" 
                  style={{ width: `${stats.total > 0 ? 100 : 0}%` }}
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="glass-panel p-5 border-rose-500/20 bg-gradient-to-br from-zinc-900/50 to-rose-950/20">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[10px] font-mono leading-none tracking-widest text-zinc-500 uppercase">Critical</p>
                  <p className="text-3xl font-bold text-rose-500 mt-2 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]">{stats.critical}</p>
                </div>
                <div className="p-2.5 bg-rose-900/30 rounded-lg border border-rose-500/30">
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                </div>
              </div>
              <div className="mt-4 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-rose-500 shadow-[0_0_10px_#f43f5e]" 
                  style={{ width: `${stats.total > 0 ? (stats.critical / stats.total) * 100 : 0}%` }}
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="glass-panel p-5 border-orange-500/20 bg-gradient-to-br from-zinc-900/50 to-orange-950/20">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[10px] font-mono leading-none tracking-widest text-zinc-500 uppercase">High_Priority</p>
                  <p className="text-3xl font-bold text-orange-500 mt-2 drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]">{stats.high}</p>
                </div>
                <div className="p-2.5 bg-orange-900/30 rounded-lg border border-orange-500/30">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                </div>
              </div>
              <div className="mt-4 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-500 shadow-[0_0_10px_#f97316]" 
                  style={{ width: `${stats.total > 0 ? (stats.high / stats.total) * 100 : 0}%` }}
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="glass-panel p-5 border-yellow-500/20 bg-gradient-to-br from-zinc-900/50 to-yellow-950/20">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[10px] font-mono leading-none tracking-widest text-zinc-500 uppercase">Medium</p>
                  <p className="text-3xl font-bold text-yellow-500 mt-2">{stats.medium}</p>
                </div>
                <div className="p-2.5 bg-yellow-900/30 rounded-lg border border-yellow-500/30">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                </div>
              </div>
              <div className="mt-4 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-400 shadow-[0_0_10px_#facc15]" 
                  style={{ width: `${stats.total > 0 ? (stats.medium / stats.total) * 100 : 0}%` }}
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="glass-panel p-5 border-blue-500/20 bg-gradient-to-br from-zinc-900/50 to-blue-950/20">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[10px] font-mono leading-none tracking-widest text-zinc-500 uppercase">Low</p>
                  <p className="text-3xl font-bold text-blue-400 mt-2">{stats.low}</p>
                </div>
                <div className="p-2.5 bg-blue-900/30 rounded-lg border border-blue-500/30">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <div className="mt-4 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" 
                  style={{ width: `${stats.total > 0 ? (stats.low / stats.total) * 100 : 0}%` }}
                />
              </div>
            </motion.div>
          </motion.div>

          {/* FILTERS BAR */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="glass-panel p-5"
          >
            <div className="flex flex-col lg:flex-row gap-4">
              {/* SEARCH */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search query [type, location, severity]..."
                    className="glass-input pl-10 h-[50px] font-mono text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    suppressHydrationWarning
                  />
                </div>
              </div>

              {/* FILTERS */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative">
                  <Camera className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-4 h-4" />
                  <select
                    className="glass-input pl-10 appearance-none min-w-[180px] h-[50px] font-mono text-xs uppercase"
                    value={cameraFilter}
                    onChange={(e) => setCameraFilter(e.target.value)}
                    suppressHydrationWarning
                  >
                    <option value="all" className="bg-zinc-900">All Nodes</option>
                    {getUniqueCameras().map((cam) => (
                      <option key={cam} value={cam} className="bg-zinc-900">
                        Node // {cam}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-4 h-4" />
                  <select
                    className="glass-input pl-10 appearance-none min-w-[180px] h-[50px] font-mono text-xs uppercase"
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    suppressHydrationWarning
                  >
                    <option value="all" className="bg-zinc-900">All Threat Lvls</option>
                    <option value="critical" className="bg-zinc-900 text-rose-400">Critical</option>
                    <option value="high" className="bg-zinc-900 text-orange-400">High</option>
                    <option value="medium" className="bg-zinc-900 text-yellow-400">Medium</option>
                    <option value="low" className="bg-zinc-900 text-blue-400">Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ACTIVE FILTERS (Chips) */}
            <div className="flex flex-wrap gap-2 mt-4">
              <AnimatePresence>
              {cameraFilter !== "all" && (
                <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-900/30 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-mono uppercase tracking-widest">
                  <Camera className="w-3 h-3" /> NODE // {cameraFilter}
                  <button onClick={() => setCameraFilter("all")} className="ml-1 hover:text-cyan-100 transition-colors">×</button>
                </motion.span>
              )}
              {severityFilter !== "all" && (
                <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-900/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-mono uppercase tracking-widest">
                  <Filter className="w-3 h-3" /> THREAT // {severityFilter}
                  <button onClick={() => setSeverityFilter("all")} className="ml-1 hover:text-purple-100 transition-colors">×</button>
                </motion.span>
              )}
              {searchQuery && (
                <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg text-xs font-mono uppercase tracking-widest">
                  <Search className="w-3 h-3" /> Q // {searchQuery}
                  <button onClick={() => setSearchQuery("")} className="ml-1 hover:text-white transition-colors">×</button>
                </motion.span>
              )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* INCIDENTS TABLE / LIST */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="glass-panel overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-zinc-800/60 bg-zinc-900/30 flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-widest font-mono text-slate-100 flex items-center gap-2 uppercase">
                <BarChart3 className="w-4 h-4 text-cyan-400" /> Event Logs
              </h2>
              <span className="text-xs font-mono text-zinc-500 px-2 py-1 bg-zinc-950 rounded border border-zinc-800">
                {filteredIncidents.length} RECORDS
              </span>
            </div>

            {loading ? (
              <div className="p-16 text-center flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-zinc-500 font-mono tracking-widest text-xs">QUERYING DATABASE...</p>
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div className="p-16 text-center">
                <div className="inline-flex p-4 bg-zinc-900 border border-zinc-800 rounded-full mb-4">
                  <AlertTriangle className="w-8 h-8 text-zinc-600" />
                </div>
                <h3 className="text-sm font-bold text-zinc-400 tracking-widest font-mono uppercase mb-2">No Anomalies Found</h3>
                <p className="text-zinc-600 text-sm">Review search parameters or wait for incoming telemetry.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {filteredIncidents.map((incident) => {
                  const severity = getSeverityInfo(incident.threat_level);
                  
                  return (
                    <motion.div 
                      initial={{ opacity: 0, backgroundColor: "transparent" }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      whileHover={{ backgroundColor: "rgba(39,39,42,0.4)" }}
                      key={incident.id} 
                      className="p-6 transition-colors cursor-pointer group"
                      onClick={() => setSelectedIncident(incident)}
                    >
                      <div className="flex flex-col lg:flex-row gap-6">
                        {/* IMAGE */}
                        {incident.imageUrl && (
                          <div className="lg:w-72 flex-shrink-0 relative">
                            {/* HUD frame Corners */}
                            <div className={`absolute top-0 left-0 w-3 h-3 border-t border-l ${severity.border} z-10`} />
                            <div className={`absolute bottom-0 right-0 w-3 h-3 border-b border-r ${severity.border} z-10`} />
                            
                            <div className={`relative aspect-video bg-zinc-950 rounded border ${severity.border} overflow-hidden shadow-md`}>
                              <img
                                src={incident.imageUrl}
                                alt="Incident"
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                              />
                              <div className="absolute top-2 right-2">
                                <span className={`px-2 py-1 text-[9px] font-mono tracking-widest font-bold border ${severity.border} ${severity.bg} ${severity.color} rounded backdrop-blur ${severity.shadow}`}>
                                  {severity.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* DETAILS */}
                        <div className="flex-1">
                          <div className="flex flex-col md:flex-row md:items-start justify-between mb-4">
                            <div>
                              <h3 className="text-xl font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
                                {severity.icon}
                                {getCrimeTypeDisplay(incident.crime_type)}
                              </h3>
                              <div className="flex items-center gap-4 mt-2 font-mono text-xs">
                                <span className="flex items-center gap-1.5 text-zinc-400">
                                  <Clock className="w-3.5 h-3.5 text-cyan-500/70" />
                                  {formatDate(incident.createdAt)}
                                </span>
                                <span className="flex items-center gap-1.5 text-zinc-400">
                                  <MapPin className="w-3.5 h-3.5 text-purple-500/70" />
                                  {incident.location?.name || "Unknown Zone"}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3 md:mt-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-2 text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800 rounded-lg border border-transparent hover:border-zinc-700 transition">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button className="p-2 text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800 rounded-lg border border-transparent hover:border-zinc-700 transition">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* METRICS */}
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                            <div className={`px-4 py-3 rounded-lg border bg-zinc-950/40 ${severity.border}`}>
                              <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-1">Conf_Score</p>
                              <div className="flex items-baseline gap-1">
                                <p className={`text-xl font-bold ${severity.color}`}>
                                  {Math.round((incident.confidence || 0) * 100)}
                                </p>
                                <span className="text-zinc-500 text-xs font-mono">%</span>
                              </div>
                            </div>
                            <div className="px-4 py-3 rounded-lg border border-zinc-800 bg-zinc-950/40">
                              <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-1 flex items-center gap-1">
                                <Users className="w-3 h-3" /> Subjects
                              </p>
                              <p className="text-xl font-bold text-slate-300">
                                {incident.persons_detected || 0}
                              </p>
                            </div>
                            <div className="px-4 py-3 rounded-lg border border-zinc-800 bg-zinc-950/40">
                              <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-1 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> Threat_Idx
                              </p>
                              <div className="flex items-baseline gap-1">
                                <p className="text-xl font-bold text-slate-300">
                                  {Number(incident.threat_score) || 0}
                                </p>
                                <span className="text-zinc-500 text-xs font-mono">/10</span>
                              </div>
                            </div>
                            <div className="px-4 py-3 rounded-lg border border-zinc-800 bg-zinc-950/40">
                              <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-1">Node_ID</p>
                              <p className="text-sm font-mono text-cyan-400 mt-1 truncate">
                                {incident.location?.cameraId || "N/A"}
                              </p>
                            </div>
                          </div>

                          {/* ACTIVITIES */}
                          {incident.activities && incident.activities.length > 0 && (
                            <div>
                              <div className="flex flex-wrap gap-2">
                                {incident.activities.slice(0, 5).map((activity, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-zinc-900 border border-zinc-700 text-cyan-100/70 rounded text-[10px] font-mono tracking-wider uppercase"
                                  >
                                    {activity.replace(/_/g, ' ')}
                                  </span>
                                ))}
                                {incident.activities.length > 5 && (
                                  <span className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded text-[10px] font-mono tracking-wider uppercase">
                                    +{incident.activities.length - 5} MORE
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* SUMMARY */}
          <div className="text-center text-xs font-mono tracking-widest text-zinc-500 pt-2 pb-10">
            DISPLAYING {filteredIncidents.length} / {incidents.length} RECORDS
            {incidents.length > 0 && (
              <span className="ml-4 border-l border-zinc-700 pl-4">
                UPDATED {formatDate(new Date(Math.max(...incidents.map(i => i.createdAt?.getTime() || 0))))}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}