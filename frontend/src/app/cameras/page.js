"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import AdminSidebar from "@/components/AdminSidebar";
import { Camera, Plus, Edit2, Trash2, Shield, Activity, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ManageCameras() {
  const router = useRouter();
  const checkedRef = useRef(false);

  const [cameras, setCameras] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const emptyForm = {
    name: "",
    area: "",
    latitude: "",
    longitude: "",
    active: true,
  };

  const [form, setForm] = useState(emptyForm);

  /* ================= AUTH GUARD ================= */
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    onAuthStateChanged(auth, async (user) => {
      if (!user) return router.replace("/login");
      if (localStorage.getItem("role") !== "admin")
        return router.replace("/dashboard");

      fetchCameras();
    });
  }, [router]);

  /* ================= FETCH CAMERAS ================= */
  const fetchCameras = async () => {
    const token = await auth.currentUser.getIdToken();

    const res = await fetch("http://localhost:5000/api/cameras", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    // ✅ FIX: extract array safely
    setCameras(Array.isArray(data) ? data : data.cameras || []);
  };

  /* ================= ADD / UPDATE ================= */
  const saveCamera = async () => {
    if (!form.name || !form.area) {
      alert("All fields are required");
      return;
    }

    const token = await auth.currentUser.getIdToken();

    const payload = {
      ...form,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      active: Boolean(form.active),
    };

    const url = editingId
      ? `http://localhost:5000/api/cameras/${editingId}`
      : "http://localhost:5000/api/cameras";

    const res = await fetch(url, {
      method: editingId ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message);

    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    fetchCameras();
  };

  /* ================= DELETE ================= */
  const deleteCamera = async (id) => {
    if (!confirm("Are you sure you want to delete this camera node? This action is irreversible.")) return;
    const token = await auth.currentUser.getIdToken();

    await fetch(`http://localhost:5000/api/cameras/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    fetchCameras();
  };

  return (
    <div className="flex h-screen bg-zinc-950 font-['Outfit'] text-slate-100 overflow-hidden" suppressHydrationWarning>
      <AdminSidebar />

      <div className="flex-1 flex flex-col relative w-full overflow-y-auto custom-scrollbar">
        <div className="sticky top-0 z-20">
          <Navbar title="CAMERA_SYS_CONFIG" />
        </div>

        <div className="fixed inset-0 scanlines opacity-20 pointer-events-none z-0"></div>

        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full relative z-10">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <div className="tech-badge w-fit mb-3">Hardware Layer</div>
              <h2 className="text-2xl font-bold text-slate-100 uppercase tracking-wide flex items-center gap-3">
                <Camera className="w-6 h-6 text-cyan-400" /> Sensor Network Array
              </h2>
              <p className="text-zinc-500 font-mono text-sm mt-1 uppercase tracking-widest">
                Manage and provision camera tracking nodes
              </p>
            </div>
            <button
              onClick={() => {
                setShowModal(true);
                setForm(emptyForm);
                setEditingId(null);
              }}
              className="glass-button-primary flex items-center gap-2"
              suppressHydrationWarning
            >
              <Plus className="w-4 h-4" /> Provision Node
            </button>
          </div>

          {/* TABLE */}
          <div className="glass-panel overflow-hidden">
            <div className="px-6 py-4 bg-zinc-900/40 border-b border-zinc-800/60 flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono tracking-widest text-slate-100 uppercase flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" /> Active Nodes List
              </h3>
              <div className="px-2 py-1 bg-zinc-950 rounded border border-zinc-800 text-xs font-mono text-cyan-400 tracking-widest">
                {cameras.length} CONFIGURED
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-900/50 text-zinc-400 font-mono text-xs uppercase tracking-widest border-b border-zinc-800">
                  <tr>
                    <th className="p-4 py-3 font-medium">Node_ID</th>
                    <th className="p-4 py-3 font-medium">Sector/Area</th>
                    <th className="p-4 py-3 font-medium text-center">Latitude</th>
                    <th className="p-4 py-3 font-medium text-center">Longitude</th>
                    <th className="p-4 py-3 font-medium text-center">Telemetry</th>
                    <th className="p-4 py-3 font-medium text-right pr-6">Commands</th>
                  </tr>
                </thead>

                <tbody className="text-sm divide-y divide-zinc-800/60">
                  {cameras.map((cam) => (
                    <tr
                      key={cam.cameraId}
                      className="hover:bg-zinc-900/40 transition-colors group"
                    >
                      <td className="p-4 font-mono text-cyan-400 tracking-wide font-medium flex items-center gap-2">
                        <Camera className="w-4 h-4 text-zinc-500" />
                        {cam.name}
                      </td>
                      <td className="p-4 text-slate-300">{cam.area}</td>
                      <td className="p-4 text-center font-mono text-zinc-400">
                        {cam.latitude}
                      </td>
                      <td className="p-4 text-center font-mono text-zinc-400">
                        {cam.longitude}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono tracking-widest uppercase rounded border ${cam.active
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                            }`}
                        >
                          {cam.active ? (
                            <><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981] animate-pulse"></div> ONLINE</>
                          ) : (
                            <><div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_5px_#f43f5e]"></div> OFFLINE</>
                          )}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingId(cam.cameraId);
                              setForm(cam);
                              setShowModal(true);
                            }}
                            className="p-1.5 bg-zinc-800 hover:bg-cyan-900/50 text-cyan-400 border border-zinc-700 hover:border-cyan-500/50 rounded transition"
                            title="Edit Configuration"
                            suppressHydrationWarning
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteCamera(cam.cameraId)}
                            className="p-1.5 bg-zinc-800 hover:bg-rose-900/50 text-rose-400 border border-zinc-700 hover:border-rose-500/50 rounded transition"
                            title="Decommission Node"
                            suppressHydrationWarning
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {cameras.length === 0 && (
                <div className="p-12 text-center flex flex-col items-center">
                  <Activity className="w-10 h-10 text-zinc-700 mb-3" />
                  <p className="text-zinc-500 font-mono text-sm tracking-widest uppercase">
                    No hardware nodes provisioned in the network.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MODAL */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="glass-panel w-full max-w-[420px] p-6 border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.1)]"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold font-mono tracking-widest text-slate-100 uppercase">
                    {editingId ? "Reconfigure Node" : "Provision Node"}
                  </h3>
                  <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-rose-400 transition">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5">Node Name_ID</label>
                    <input
                      className="glass-input text-sm font-mono w-full"
                      placeholder="e.g. CAM-N1-01"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      suppressHydrationWarning
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5">Assigned Sector/Area</label>
                    <input
                      className="glass-input text-sm w-full"
                      placeholder="e.g. North Perimeter"
                      value={form.area}
                      onChange={(e) =>
                        setForm({ ...form, area: e.target.value })
                      }
                      suppressHydrationWarning
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5">Latitude G-CORD</label>
                      <input
                        type="number"
                        className="glass-input font-mono text-sm w-full"
                        placeholder="0.0000"
                        value={form.latitude}
                        onChange={(e) =>
                          setForm({ ...form, latitude: e.target.value })
                        }
                        suppressHydrationWarning
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5">Longitude G-CORD</label>
                      <input
                        type="number"
                        className="glass-input font-mono text-sm w-full"
                        placeholder="0.0000"
                        value={form.longitude}
                        onChange={(e) =>
                          setForm({ ...form, longitude: e.target.value })
                        }
                        suppressHydrationWarning
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 mt-2">
                    <label className="flex items-center gap-3 text-sm text-slate-300 font-medium cursor-pointer py-2">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={form.active}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              active: e.target.checked,
                            })
                          }
                        />
                        <div className="w-10 h-5 bg-zinc-800 rounded-full peer peer-checked:bg-emerald-500/20 border border-zinc-700 peer-checked:border-emerald-500/50 transition-colors"></div>
                        <div className="absolute left-1 top-1 w-3 h-3 bg-zinc-400 rounded-full peer-checked:bg-emerald-400 peer-checked:translate-x-5 transition-transform shadow-[0_0_5px_#10b981]"></div>
                      </div>
                      <span className="font-mono tracking-widest uppercase text-xs">Initialize Sensor (Active)</span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800/80">
                    <button
                      onClick={() => setShowModal(false)}
                      className="glass-button text-xs"
                      suppressHydrationWarning
                    >
                      Abort
                    </button>
                    <button
                      onClick={saveCamera}
                      className="glass-button-primary text-xs"
                      suppressHydrationWarning
                    >
                      Commit Config
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
