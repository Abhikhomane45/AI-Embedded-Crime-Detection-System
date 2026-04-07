"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import AdminSidebar from "@/components/AdminSidebar";
import { ClipboardList, Activity } from "lucide-react";

export default function OperatorLogs() {
  const router = useRouter();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ================= AUTH + FETCH LOGS ================= */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const token = await user.getIdToken();

        const res = await fetch(
          "http://localhost:5000/api/admin/operator-logs?limit=100",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();
        setLogs(data.logs || []);
      } catch (err) {
        console.error("Failed to fetch operator logs:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="flex h-screen bg-zinc-950 font-['Outfit'] text-slate-100 overflow-hidden" suppressHydrationWarning>
      <AdminSidebar />

      <div className="flex-1 flex flex-col relative w-full overflow-y-auto custom-scrollbar">
        <div className="sticky top-0 z-20">
          <Navbar title="OPERATOR_AUDIT_LOGS" />
        </div>

        <div className="fixed inset-0 scanlines opacity-20 pointer-events-none z-0"></div>

        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <div className="tech-badge w-fit mb-3">Auditing Layer</div>
              <h2 className="text-2xl font-bold text-slate-100 uppercase tracking-wide flex items-center gap-3">
                <ClipboardList className="w-6 h-6 text-cyan-400" /> Operator Action Logs
              </h2>
              <p className="text-zinc-500 font-mono text-sm mt-1 uppercase tracking-widest">
                Review historical actions and system events triggered by operators
              </p>
            </div>
          </div>

          <div className="glass-panel overflow-hidden">
            <div className="px-6 py-4 bg-zinc-900/40 border-b border-zinc-800/60 flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono tracking-widest text-slate-100 uppercase flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" /> Security Audit Trail
              </h3>
              <div className="px-2 py-1 bg-zinc-950 rounded border border-zinc-800 text-xs font-mono text-cyan-400 tracking-widest">
                {logs.length} RECORDS
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-900/50 text-zinc-400 font-mono text-xs uppercase tracking-widest border-b border-zinc-800">
                  <tr>
                    <th className="p-4 py-3 font-medium">Operator Email</th>
                    <th className="p-4 py-3 font-medium text-purple-400">Action Code</th>
                    <th className="p-4 py-3 font-medium">Telemetry/Details</th>
                    <th className="p-4 py-3 font-medium text-cyan-400">Node_ID</th>
                    <th className="p-4 py-3 font-medium text-right pr-6">Timestamp</th>
                  </tr>
                </thead>

                <tbody className="text-sm divide-y divide-zinc-800/60">
                  {!loading &&
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-900/40 transition-colors group">
                        <td className="p-4 text-slate-300 font-mono text-xs">{log.operatorEmail}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-purple-900/30 text-purple-400 border border-purple-500/30 rounded text-[10px] uppercase font-mono tracking-widest">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4 text-zinc-400 text-xs uppercase font-mono">{log.description}</td>
                        <td className="p-4 font-mono text-cyan-500/80 text-xs">{log.cameraId || "—"}</td>
                        <td className="p-4 pr-6 text-right font-mono text-zinc-500 text-xs tracking-wide">
                          {log.createdAt?.seconds
                            ? new Date(
                                log.createdAt.seconds * 1000
                              ).toLocaleString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {loading && (
                <div className="p-16 text-center flex flex-col items-center justify-center">
                  <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-zinc-500 font-mono tracking-widest text-xs uppercase">SYNCHRONIZING AUDIT TRAIL...</p>
                </div>
              )}

              {!loading && logs.length === 0 && (
                <div className="p-16 text-center flex flex-col items-center justify-center">
                  <Activity className="w-10 h-10 text-zinc-700 mb-4" />
                  <p className="text-zinc-500 font-mono tracking-widest text-xs uppercase">No telemetry found in audit index.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
