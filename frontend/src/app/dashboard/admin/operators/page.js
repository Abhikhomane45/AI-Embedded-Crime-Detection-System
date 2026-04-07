"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";

import Navbar from "@/components/Navbar";
import AdminSidebar from "@/components/AdminSidebar";

export default function ManageOperators() {
  const router = useRouter();
  const checkedRef = useRef(false);
  const dropdownRef = useRef(null);

  const [operators, setOperators] = useState([]);
  const [cameras, setCameras] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editingUid, setEditingUid] = useState(null);
  const [resetUid, setResetUid] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const emptyForm = {
    email: "",
    password: "",
    cameras: [],
  };

  const [form, setForm] = useState(emptyForm);

  /* ================= MOUNTED STATE ================= */
  useEffect(() => {
    setMounted(true);
  }, []);

  /* ================= AUTH GUARD ================= */
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      const tokenResult = await user.getIdTokenResult(true);
      const role = tokenResult.claims.role;

      if (role !== "admin") {
        router.replace("/dashboard/operator");
        return;
      }

      fetchOperators();
      fetchCameras();
    });

    return () => unsub();
  }, [router]);

  /* ================= CLOSE DROPDOWN ON CLICK OUTSIDE ================= */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /* ================= FETCH OPERATORS ================= */
  const fetchOperators = async () => {
    try {
      console.log("Fetching operators...");
      const snap = await getDocs(collection(db, "operators"));
      const ops = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      console.log("Fetched operators:", ops);
      setOperators(ops);
    } catch (err) {
      console.error("Failed to fetch operators:", err);
      // Fallback: try to fetch via API if firestore fails (e.g. security rules)
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch("http://localhost:5000/api/admin/operators-list", {
           headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
           const data = await res.json();
           setOperators(data.operators || []);
        }
      } catch(apiErr) {
        console.error("API fetch also failed", apiErr);
      }
    }
  };

  /* ================= FETCH CAMERAS ================= */
  const fetchCameras = async () => {
    try {
      const snap = await getDocs(collection(db, "cameras"));
      setCameras(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    } catch (err) {
      console.error("Failed to fetch cameras direct:", err);
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch("http://localhost:5000/api/operator/cameras", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
           const data = await res.json();
           // map cameraId to id to match local structure expectation
           setCameras(data.map(d => ({...d, id: d.cameraId || d.id})));
        }
      } catch (apiErr) {
        console.error("API fallback for cameras failed:", apiErr);
      }
    }
  };

  /* ================= ADD OPERATOR ================= */
  const addOperator = async () => {
    if (!form.email || !form.password || form.cameras.length === 0) {
      alert("All fields are required");
      return;
    }

    const token = await auth.currentUser.getIdToken();

    const res = await fetch(
      "http://localhost:5000/api/admin/create-operator",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      }
    );

    const data = await res.json();
    if (!res.ok) return alert(data.message);

    closeModal();
    fetchOperators();
  };

  /* ================= EDIT OPERATOR ================= */
  const editOperator = (op) => {
    setEditingUid(op.uid);
    setForm({
      email: op.email,
      password: "",
      cameras: op.cameras || [],
    });
    setShowModal(true);
  };

  const updateOperator = async () => {
    if (form.cameras.length === 0) {
      alert("Select at least one camera");
      return;
    }

    await updateDoc(doc(db, "operators", editingUid), {
      cameras: form.cameras,
      updatedAt: new Date(),
    });

    closeModal();
    fetchOperators();
  };

  /* ================= TOGGLE STATUS ================= */
  const toggleStatus = async (uid, status) => {
    await updateDoc(doc(db, "operators", uid), {
      status: status === "active" ? "inactive" : "active",
    });
    fetchOperators();
  };

  /* ================= RESET PASSWORD ================= */
  const resetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    const token = await auth.currentUser.getIdToken();

    const res = await fetch(
      "http://localhost:5000/api/admin/reset-operator-password",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uid: resetUid,
          newPassword,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.message);
      return;
    }

    alert("Password reset successfully");

    setResetUid(null);
    setNewPassword("");
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUid(null);
    setForm(emptyForm);
    setSearch("");
    setDropdownOpen(false);
  };

  /* ================= CAMERA NAME MAP ================= */
  const cameraMap = cameras.reduce((acc, cam) => {
    acc[cam.id] = cam.name;
    return acc;
  }, {});

  const filteredCameras = cameras.filter(
    (cam) =>
      cam.name.toLowerCase().includes(search.toLowerCase()) ||
      cam.area.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-zinc-950 font-['Outfit'] text-slate-100 overflow-hidden" suppressHydrationWarning>
      <AdminSidebar />

      <div className="flex-1 flex flex-col relative w-full overflow-y-auto custom-scrollbar">
        <div className="sticky top-0 z-20">
          <Navbar title="PERSONNEL_MANAGER" />
        </div>

        <div className="fixed inset-0 scanlines opacity-20 pointer-events-none z-0"></div>

        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full relative z-10">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <div className="tech-badge w-fit mb-3">Team Management</div>
              <h2 className="text-2xl font-bold text-slate-100 uppercase tracking-wide flex items-center gap-3">
                Operator Accounts
              </h2>
              <p className="text-zinc-500 font-mono text-sm mt-1 uppercase tracking-widest">
                Manage access and node assignment for active operators
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="glass-button-primary"
            >
              ➕ Provision Operator
            </button>
          </div>

          {/* TABLE */}
          <div className="glass-panel overflow-hidden">
            <div className="px-6 py-4 bg-zinc-900/40 border-b border-zinc-800/60 flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono tracking-widest text-slate-100 uppercase flex items-center gap-2">
                Active Personnel
              </h3>
              <div className="px-2 py-1 bg-zinc-950 rounded border border-zinc-800 text-xs font-mono text-cyan-400 tracking-widest">
                {operators.length} REGISTERED
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-900/50 text-zinc-400 font-mono text-xs uppercase tracking-widest border-b border-zinc-800">
                  <tr>
                    <th className="p-4 py-3 font-medium">Operator Email</th>
                    <th className="p-4 py-3 font-medium">Assigned Nodes</th>
                    <th className="p-4 py-3 font-medium text-center">Status</th>
                    <th className="p-4 py-3 font-medium text-center">Provisioned Date</th>
                    <th className="p-4 py-3 font-medium text-right pr-6">Commands</th>
                  </tr>
                </thead>

                <tbody className="text-sm divide-y divide-zinc-800/60">
                  {operators.map((op) => (
                    <tr key={op.uid} className="hover:bg-zinc-900/40 transition-colors group">
                      <td className="p-4 font-mono text-cyan-400 tracking-wide font-medium">{op.email}</td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {op.cameras?.map((id) => (
                            <span
                              key={id}
                              className="px-2 py-1 border border-zinc-700 bg-zinc-900 text-zinc-300 rounded text-[10px] font-mono tracking-widest uppercase"
                            >
                              {cameraMap[id] || id}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono tracking-widest uppercase rounded border ${
                            op.status === "active"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                          }`}
                        >
                          {op.status === "active" ? (
                            <><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981] animate-pulse"></div> ACTIVE</>
                          ) : (
                            <><div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_5px_#f43f5e]"></div> SUSPENDED</>
                          )}
                        </span>
                      </td>

                      <td className="p-4 text-center text-zinc-500 font-mono text-xs">
                        {mounted && op.createdAt
                          ? new Date(
                              op.createdAt.seconds * 1000
                            ).toLocaleDateString([], {
                              year: "numeric",
                              month: "short",
                              day: "numeric"
                            })
                          : "—"}
                      </td>

                      <td className="p-4 pr-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => editOperator(op)}
                            className="p-1.5 bg-zinc-800 hover:bg-cyan-900/50 text-cyan-400 border border-zinc-700 hover:border-cyan-500/50 rounded transition font-mono uppercase text-[10px] tracking-widest"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => {
                              setResetUid(op.uid);
                              setNewPassword("");
                            }}
                            className="p-1.5 bg-zinc-800 hover:bg-yellow-900/50 text-yellow-500 border border-zinc-700 hover:border-yellow-500/50 rounded transition font-mono uppercase text-[10px] tracking-widest"
                          >
                            Reset
                          </button>

                          <button
                            onClick={() => toggleStatus(op.uid, op.status)}
                            className={`p-1.5 bg-zinc-800 border border-zinc-700 rounded transition font-mono uppercase text-[10px] tracking-widest ${
                              op.status === "active"
                                ? "hover:bg-rose-900/50 text-rose-400 hover:border-rose-500/50"
                                : "hover:bg-emerald-900/50 text-emerald-400 hover:border-emerald-500/50"
                            }`}
                          >
                            {op.status === "active" ? "Suspend" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {operators.length === 0 && (
                <div className="p-16 text-center flex flex-col items-center">
                  <p className="text-zinc-500 font-mono text-sm tracking-widest uppercase">
                    No operators found
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ADD/EDIT MODAL */}
        {showModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="glass-panel w-full max-w-[440px] p-6 border-cyan-500/30">
              <h3 className="font-bold font-mono tracking-widest text-slate-100 uppercase mb-6">
                {editingUid ? "Reconfigure Operator" : "Provision Operator"}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5">
                    Operator Email
                  </label>
                  <input
                    className="glass-input font-mono w-full text-sm"
                    placeholder="operator@nexus.sys"
                    value={form.email}
                    disabled={!!editingUid}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>

                {!editingUid && (
                  <div>
                    <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5">
                      Temporary Access Key
                    </label>
                    <input
                      type="password"
                      className="glass-input font-mono w-full text-sm"
                      placeholder="Auth Key"
                      value={form.password}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          password: e.target.value,
                        })
                      }
                    />
                  </div>
                )}

                {/* SEARCHABLE DROPDOWN */}
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5">
                    Assign Sensor Nodes
                  </label>
                  <div ref={dropdownRef} className="relative">
                    <input
                      className="glass-input font-mono w-full text-sm"
                      placeholder="Search nodes..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setDropdownOpen(true);
                      }}
                      onFocus={() => setDropdownOpen(true)}
                    />

                    {dropdownOpen && (
                      <div className="absolute z-10 mt-1 bg-zinc-900 border border-zinc-700/80 rounded-lg w-full max-h-48 overflow-y-auto shadow-2xl">
                        <div className="p-2">
                          {filteredCameras.length === 0 ? (
                            <p className="p-2 text-zinc-500 font-mono text-xs text-center uppercase">
                              No nodes found
                            </p>
                          ) : (
                            filteredCameras.map((cam) => (
                              <label
                                key={cam.id}
                                className="flex items-center gap-3 p-3 hover:bg-zinc-800/80 cursor-pointer rounded-md transition border border-transparent hover:border-zinc-700"
                              >
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 bg-zinc-950 border-zinc-700 text-cyan-600 rounded focus:ring-cyan-500/30"
                                  checked={form.cameras.includes(cam.id)}
                                  onChange={(e) => {
                                    const updated = e.target.checked
                                      ? [...form.cameras, cam.id]
                                      : form.cameras.filter(
                                          (c) => c !== cam.id
                                        );
                                    setForm({
                                      ...form,
                                      cameras: updated,
                                    });
                                  }}
                                />
                                <div>
                                  <p className="font-medium font-mono text-sm text-cyan-400 tracking-wide uppercase">{cam.name}</p>
                                  <p className="text-[10px] text-zinc-500 uppercase font-mono">{cam.area}</p>
                                </div>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Selected cameras preview */}
                  {form.cameras.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5">Allocated ({form.cameras.length}):</p>
                      <div className="flex flex-wrap gap-1.5">
                        {form.cameras.map((id) => {
                          const cam = cameras.find(c => c.id === id);
                          return (
                            <span
                              key={id}
                              className="px-2 py-1 bg-cyan-900/30 border border-cyan-500/30 text-cyan-400 rounded text-[10px] font-mono tracking-widest uppercase"
                            >
                              {cam?.name || id}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-zinc-800">
                <button
                  onClick={closeModal}
                  className="glass-button text-xs font-mono uppercase tracking-widest"
                >
                  Abort
                </button>
                <button
                  onClick={
                    editingUid ? updateOperator : addOperator
                  }
                  className="glass-button-primary text-xs font-mono uppercase tracking-widest"
                >
                  Commit Config
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RESET PASSWORD MODAL */}
        {resetUid && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="glass-panel w-full max-w-[360px] p-6 border-yellow-500/30">
              <h3 className="font-bold font-mono tracking-widest text-slate-100 uppercase mb-4 text-yellow-500">
                Reset Auth Key
              </h3>

              <input
                type="password"
                className="glass-input font-mono w-full text-sm mb-6"
                placeholder="New Auth Key"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />

              <div className="flex justify-end gap-3 border-t border-zinc-800 pt-4">
                <button
                  onClick={() => {
                    setResetUid(null);
                    setNewPassword("");
                  }}
                  className="glass-button text-xs font-mono uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  onClick={resetPassword}
                  className="glass-button-primary bg-yellow-500/20 text-yellow-500 border-yellow-500/50 hover:bg-yellow-500/40 text-xs font-mono uppercase tracking-widest"
                >
                  Reset Key
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}