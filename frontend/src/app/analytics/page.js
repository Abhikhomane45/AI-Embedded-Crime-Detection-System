"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import dynamic from "next/dynamic";
import { Activity } from "lucide-react";

// ✅ Client-only charts
const AnalyticsCharts = dynamic(
  () => import("@/components/AnalyticsCharts"),
  { ssr: false }
);

export default function Analytics() {
  const [dailyData, setDailyData] = useState([]);
  const [severityData, setSeverityData] = useState([]);
  const [cameraData, setCameraData] = useState([]);

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const snapshot = await getDocs(collection(db, "incidents"));
        const incidents = snapshot.docs.map((doc) => doc.data());

        processDaily(incidents);
        processSeverity(incidents);
        processCamera(incidents);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchIncidents();
      }
    });

    return () => unsubscribe();
  }, []);

  /* ---------- HELPERS ---------- */

  const getSeverity = (confidence) => {
    if (confidence >= 0.8) return "HIGH";
    if (confidence >= 0.6) return "MEDIUM";
    return "LOW";
  };

  const formatDate = (timestamp) => {
    if (timestamp?.toDate) {
      return timestamp.toDate().toLocaleDateString();
    }
    return new Date(timestamp).toLocaleDateString();
  };

  /* ---------- PROCESS DATA ---------- */

  const processDaily = (incidents) => {
    const map = {};
    incidents.forEach((i) => {
      const date = formatDate(i.createdAt || i.timestamp);
      map[date] = (map[date] || 0) + 1;
    });

    setDailyData(
      Object.keys(map).map((d) => ({
        date: d,
        count: map[d],
      }))
    );
  };

  const processSeverity = (incidents) => {
    const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    incidents.forEach((i) => {
      counts[getSeverity(i.confidence)]++;
    });

    setSeverityData(
      Object.keys(counts).map((k) => ({
        name: k,
        value: counts[k],
      }))
    );
  };

  const processCamera = (incidents) => {
    const map = {};
    incidents.forEach((i) => {
      map[i.cameraId] = (map[i.cameraId] || 0) + 1;
    });

    setCameraData(
      Object.keys(map).map((c) => ({
        camera: c,
        count: map[c],
      }))
    );
  };

  return (
    <div className="flex h-screen bg-zinc-950 font-['Outfit'] text-slate-100 overflow-hidden" suppressHydrationWarning>
      <div className="flex-1 flex flex-col relative z-10 w-full overflow-y-auto custom-scrollbar">
        <div className="fixed inset-0 scanlines opacity-20 pointer-events-none"></div>

        <div className="mx-auto max-w-7xl w-full px-6 py-8 relative z-10">
          <div className="mb-8 flex flex-col items-start gap-4">
            <h1 className="text-2xl font-bold text-slate-100 uppercase tracking-wide flex items-center gap-3">
              <Activity className="w-6 h-6 text-cyan-400" /> Operational Insights
            </h1>
            <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">
              Track telemetry details, severity metrics, and node hotspots across the grid.
            </p>
          </div>

          <div className="glass-panel p-6 border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.05)]">
            <AnalyticsCharts
              dailyData={dailyData}
              severityData={severityData}
              cameraData={cameraData}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
