"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  query,
  orderBy
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

import Navbar from "@/components/Navbar";
import OperatorSidebar from "@/components/OperatorSidebar";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Clock, CheckCircle2, ShieldAlert, AlertTriangle } from "lucide-react";

export default function OperatorIncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let unsubscribeSnapshot;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(
          collection(db, "incidents"),
          orderBy("createdAt", "desc")
        );

        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const list = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }));
          setIncidents(list);
        }, (error) => {
           console.error("Incidents snapshot error:", error);
        });
      } else {
        setIncidents([]);
        if (unsubscribeSnapshot) unsubscribeSnapshot();
      }
    });

    return () => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      unsubscribeAuth();
    };
  }, []);

  const handleAck = async (id) => {
    await updateDoc(doc(db, "incidents", id), {
      status: "acknowledged",
      acknowledgedAt: new Date()
    });
  };

  const handleResolve = async (id) => {
    await updateDoc(doc(db, "incidents", id), {
      status: "resolved",
      resolvedAt: new Date()
    });
  };

  const getSeverityIcon = (severity) => {
    const s = (severity || "").toLowerCase();
    if (s === "critical") return <ShieldAlert className="w-5 h-5 text-rose-500" />;
    if (s === "high") return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    if (s === "medium") return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    return <AlertCircle className="w-5 h-5 text-cyan-500" />;
  };

  const getSeverityClasses = (severity) => {
    const s = (severity || "").toLowerCase();
    if (s === "critical") return "border-rose-500/30 bg-rose-950/20 text-rose-400";
    if (s === "high") return "border-orange-500/30 bg-orange-950/20 text-orange-400";
    if (s === "medium") return "border-yellow-500/30 bg-yellow-950/20 text-yellow-500";
    return "border-cyan-500/30 bg-cyan-950/20 text-cyan-400";
  };

  const getStatusClasses = (status) => {
    const s = (status || "active").toLowerCase();
    if (s === "resolved") return "text-emerald-400 border-emerald-500/30 bg-emerald-950/30";
    if (s === "acknowledged") return "text-purple-400 border-purple-500/30 bg-purple-950/30";
    return "text-rose-400 border-rose-500/30 bg-rose-950/30 animate-pulse";
  };

  const formatDate = (dateValue) => {
    if (!mounted) return "";
    if (!dateValue) return "Unknown time";
    
    let d = dateValue;
    if (d?.toDate) d = d.toDate();
    else if (typeof d === "string" || typeof d === "number") d = new Date(d);

    if (!(d instanceof Date) || isNaN(d.getTime())) return "Unknown time";

    return d.toLocaleString([], {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
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
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex h-screen bg-zinc-950 font-['Outfit'] text-slate-100 overflow-hidden" suppressHydrationWarning>
      <OperatorSidebar />

      <div className="flex-1 flex flex-col relative z-10 w-full overflow-y-auto custom-scrollbar">
        <Navbar title="INCIDENT_Q" />

        <div className="fixed inset-0 scanlines opacity-20 pointer-events-none"></div>

        <div className="p-6 md:p-8 flex-1 w-full max-w-5xl mx-auto relative z-10 pb-20">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h2 className="text-2xl font-bold text-slate-100 uppercase tracking-wide flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-rose-500" /> Response Queue
            </h2>
            <p className="text-zinc-500 font-mono text-sm mt-1 uppercase tracking-widest">Acknowledge and resolve detected anomalies</p>
          </motion.div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            <AnimatePresence>
              {incidents.map((incident) => (
                <motion.div
                  key={incident.id}
                  variants={itemVariants}
                  layout
                  className="glass-panel p-5 overflow-hidden group"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl border ${getSeverityClasses(incident.severity)}`}>
                        {getSeverityIcon(incident.severity)}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold font-mono tracking-widest text-slate-100 flex items-center gap-2">
                            ID_{incident.id.slice(-6).toUpperCase()}
                          </h3>
                          <span className={`px-2 py-0.5 text-[10px] uppercase font-mono tracking-widest border rounded ${getStatusClasses(incident.status)}`}>
                            {incident.status || "active"}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2 font-mono text-xs uppercase tracking-widest text-zinc-400">
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500">SEVERITY:</span> 
                            <span className={`px-2 rounded bg-zinc-900 border ${getSeverityClasses(incident.severity)}`}>
                              {incident.severity || "UNKNOWN"}
                            </span>
                          </div>
                          {incident.crime_type && (
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-500">TYPE:</span> 
                              <span className="text-cyan-400">{incident.crime_type.replace(/_/g, ' ')}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 col-span-2 mt-1">
                            <span className="text-zinc-500">TIME:</span>
                            <span className="text-slate-300 flex items-center gap-1.5 border border-zinc-800 bg-zinc-900/50 px-2 py-0.5 rounded">
                              <Clock className="w-3 h-3 text-cyan-500/70" /> {formatDate(incident.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-zinc-800 inset-x-0">
                      {incident.status !== "acknowledged" && incident.status !== "resolved" && (
                        <button
                          onClick={() => handleAck(incident.id)}
                          className="flex-1 md:flex-none glass-button-primary bg-purple-600/20 border-purple-500/50 text-purple-100 hover:bg-purple-600/40 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          ACK
                        </button>
                      )}

                      {incident.status !== "resolved" && (
                        <button
                          onClick={() => handleResolve(incident.id)}
                          className="flex-1 md:flex-none glass-button-primary bg-emerald-600/20 border-emerald-500/50 text-emerald-100 hover:bg-emerald-600/40 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          RESOLVE
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {incidents.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center text-zinc-500 py-16 font-mono text-sm tracking-widest uppercase border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20"
              >
                No active incidents in queue.
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}