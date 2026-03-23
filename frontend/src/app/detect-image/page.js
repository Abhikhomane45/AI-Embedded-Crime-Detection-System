"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import OperatorSidebar from "@/components/OperatorSidebar";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Camera, Search, User, Target, Activity, MapPin, Scan, Shield, AlertTriangle, CheckCircle } from "lucide-react";

export default function ImageDetectionPage() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [selectedCamera, setSelectedCamera] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  /* ======================================================
     🔄 MOUNTED STATE - PREVENT HYDRATION ISSUES
     ====================================================== */
  useEffect(() => {
    setMounted(true);
  }, []);

  /* ======================================================
     🎥 FETCH CAMERAS AFTER AUTH IS READY
     ====================================================== */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        const token = await user.getIdToken();

        const res = await fetch(
          "http://localhost:5000/api/operator/cameras",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();

        if (Array.isArray(data)) {
          setCameras(data);
        } else {
          console.warn("Unexpected cameras response:", data);
          setCameras([]);
        }
      } catch (err) {
        console.error("Failed to fetch cameras:", err);
        setCameras([]);
      }
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  /* ================= IMAGE HANDLER ================= */
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 16MB)
    if (file.size > 16 * 1024 * 1024) {
      setError("File size too large. Max 16MB allowed.");
      return;
    }

    // Check file type
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/bmp"];
    if (!validTypes.includes(file.type)) {
      setError("Invalid format. Permitted: JPEG, PNG, BMP.");
      return;
    }

    setImage(file);
    setPreview(URL.createObjectURL(file));
    setError("");
    setResult(null);
  };

  /* ================= CAMERA SELECT ================= */
  const handleCameraChange = (cameraId) => {
    setSelectedCameraId(cameraId);
    const cam = cameras.find((c) => c.cameraId === cameraId);
    setSelectedCamera(cam || null);
  };

  /* ================= CALCULATE THREAT SCORE ================= */
  const calculateThreatScore = (data) => {
    if (data.threat_score !== undefined) {
      return data.threat_score;
    }
    
    let baseScore = 0;
    const confidence = data.confidence || 0;
    baseScore = Math.round(confidence * 100);
    
    const threatLevel = data.threat_level?.toUpperCase() || "LOW";
    switch (threatLevel) {
      case "CRITICAL":
        return Math.min(100, baseScore + 40);
      case "HIGH":
        return Math.min(100, baseScore + 25);
      case "MEDIUM":
        return Math.min(100, baseScore + 15);
      case "LOW":
        return baseScore;
      default:
        return baseScore;
    }
  };

  /* ================= DETERMINE CRIME STATUS ================= */
  const determineCrimeStatus = (data) => {
    if (data.crime_detected !== undefined) {
      return data.crime_detected;
    }
    
    const threatLevel = data.threat_level?.toUpperCase() || "LOW";
    const crimeType = data.crime_type || data.type || "";
    const confidence = data.confidence || 0;
    
    const seriousCrimes = ["KIDNAPPING", "ABDUCTION", "ASSAULT", "ROBBERY", "FIGHT"];
    const isSeriousCrime = seriousCrimes.some(crime => 
      crimeType.toUpperCase().includes(crime)
    );
    
    return isSeriousCrime || threatLevel === "HIGH" || threatLevel === "CRITICAL" || confidence > 0.7;
  };

  /* ================= SUBMIT ================= */
  const submitImage = async () => {
    if (!image || !selectedCamera) {
      alert("Please select a camera node and upload image telemetry.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("image", image);
    formData.append(
      "location",
      JSON.stringify({
        name: selectedCamera.area,
        lat: selectedCamera.latitude,
        lng: selectedCamera.longitude,
        cameraId: selectedCamera.cameraId,
      })
    );

    try {
      const res = await fetch(
        "http://localhost:5000/api/detect/image",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Detection analysis failed");
      }

      console.log("✅ SAVED TO DB:", data);

      const processedData = {
        ...data.data,
        confidence: Number(data.data.confidence) || 0,
        persons_detected: Number(data.data.persons_detected) || 0,
        threat_score: calculateThreatScore(data.data),
        crime_detected: determineCrimeStatus(data.data),
      };

      // simulate scanning delay
      setTimeout(() => setResult(processedData), 800);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  };

  /* ================= RESET ================= */
  const resetForm = () => {
    setImage(null);
    setPreview(null);
    setSelectedCamera(null);
    setSelectedCameraId("");
    setResult(null);
    setError("");
  };

  /* ================= THREAT EFFECTS ================= */
  const getSeverityInfo = (level) => {
    const lvl = level?.toUpperCase() || "MEDIUM";
    switch (lvl) {
      case "CRITICAL":
        return {
          color: "text-rose-500",
          bg: "bg-rose-950/40",
          border: "border-rose-500/50",
          shadow: "shadow-[0_0_15px_rgba(244,63,94,0.4)]"
        };
      case "HIGH":
        return {
          color: "text-orange-500",
          bg: "bg-orange-950/40",
          border: "border-orange-500/50",
          shadow: "shadow-[0_0_15px_rgba(249,115,22,0.4)]"
        };
      case "MEDIUM":
        return {
          color: "text-yellow-500",
          bg: "bg-yellow-950/40",
          border: "border-yellow-500/50",
          shadow: "shadow-[0_0_15px_rgba(234,179,8,0.4)]"
        };
      case "LOW":
        return {
          color: "text-blue-400",
          bg: "bg-blue-950/40",
          border: "border-blue-500/50",
          shadow: "shadow-[0_0_15px_rgba(59,130,246,0.4)]"
        };
      default:
        return {
          color: "text-zinc-400",
          bg: "bg-zinc-900",
          border: "border-zinc-700",
          shadow: ""
        };
    }
  };

  const getCrimeTypeDisplay = (data) => {
    if (data.crime_type) return data.crime_type;
    if (data.type) return data.type;
    
    if (data.crime_detected) {
      const threatLevel = data.threat_level?.toUpperCase();
      if (threatLevel === "CRITICAL" || threatLevel === "HIGH") {
        return "Violent Incident Parameters Met";
      }
      return "Suspicious Parameters Met";
    }
    
    return "Normal Baseline";
  };

  return (
    <div className="flex h-screen bg-zinc-950 font-['Outfit'] text-slate-100 overflow-hidden" suppressHydrationWarning>
      <OperatorSidebar />

      <div className="flex-1 flex flex-col relative w-full overflow-y-auto custom-scrollbar">
        <div className="sticky top-0 z-20">
          <Navbar title="MANUAL_ANALYSIS" />
        </div>

        <div className="fixed inset-0 scanlines opacity-20 pointer-events-none z-0"></div>

        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full relative z-10 pb-20">
          {/* HEADER */}
          <div className="text-center mb-10 mt-4">
            <div className="tech-badge mx-auto w-fit mb-4">Post-processing Engine</div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-100 uppercase tracking-widest flex items-center justify-center gap-4">
               <Scan className="w-8 h-8 text-cyan-400" /> Image Telemetry Analysis
            </h1>
            <p className="text-zinc-500 font-mono mt-3 uppercase tracking-widest text-sm">
              Upload standalone image frames for deep pose-estimation and threat analysis
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* LEFT COLUMN - UPLOAD FORM */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="glass-panel p-6 border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.05)]">
                <h2 className="text-sm font-bold font-mono text-cyan-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                   <Upload className="w-4 h-4" /> Data Ingestion
                </h2>

                {/* CAMERA SELECTION */}
                <div className="mb-6">
                  <label className="block text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-2">
                    Source Node Link *
                  </label>
                  <select
                    className="glass-input w-full font-mono text-sm uppercase"
                    value={selectedCameraId}
                    onChange={(e) => handleCameraChange(e.target.value)}
                    suppressHydrationWarning
                  >
                    <option className="bg-zinc-900" value="">-- SELECT NODE --</option>
                    {cameras.map((cam) => (
                      <option className="bg-zinc-900" key={cam.cameraId} value={cam.cameraId}>
                        NODE//{cam.name} ({cam.area})
                      </option>
                    ))}
                  </select>
                  {cameras.length === 0 && (
                    <p className="text-[10px] text-rose-500 font-mono uppercase mt-2">
                      No hardware assigned to this operator.
                    </p>
                  )}
                  {selectedCamera && (
                    <div className="mt-3 p-3 bg-cyan-950/30 border border-cyan-500/30 rounded flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <p className="text-xs font-mono uppercase font-bold text-cyan-400 flex items-center gap-2">
                          <MapPin className="w-3 h-3" /> {selectedCamera.area}
                        </p>
                        <p className="text-[10px] font-mono text-cyan-600 tracking-widest">
                          [{selectedCamera.latitude}, {selectedCamera.longitude}]
                        </p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981] animate-pulse"></div>
                    </div>
                  )}
                </div>

                {/* IMAGE UPLOAD */}
                <div className="mb-6">
                  <label className="block text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-2">
                    Visual Telemetry File *
                  </label>
                  <div className={`border-2 border-dashed ${preview ? 'border-cyan-500/50 bg-zinc-900/50' : 'border-zinc-700 bg-zinc-900/30'} rounded-xl p-2 text-center hover:border-cyan-400 transition-colors relative overflow-hidden group`}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                      suppressHydrationWarning
                    />
                    <label
                      htmlFor="image-upload"
                      className="cursor-pointer block relative z-10 w-full h-full p-6"
                    >
                      {preview ? (
                        <div className="relative">
                          {/* Tech bracket overlay */}
                          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400 z-10"></div>
                          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400 z-10"></div>
                          
                          <img
                            src={preview}
                            alt="preview telemetry"
                            className="w-full h-auto max-h-[250px] object-contain mx-auto rounded mb-3"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreview(null);
                              setImage(null);
                            }}
                            className="absolute -top-2 -right-2 bg-zinc-900 text-rose-500 border border-rose-500/50 p-1 rounded hover:bg-rose-900/50 transition z-20"
                            suppressHydrationWarning
                          >
                            <span className="font-mono text-xs uppercase tracking-widest px-1">Discard</span>
                          </button>
                        </div>
                      ) : (
                        <div className="py-6 flex flex-col items-center justify-center">
                          <div className="w-12 h-12 mb-4 bg-zinc-800 rounded-lg flex items-center justify-center border border-zinc-700 group-hover:bg-zinc-800/80 transition shadow-inner">
                            <Upload className="w-5 h-5 text-zinc-400 group-hover:text-cyan-400" />
                          </div>
                          <p className="text-slate-300 font-bold tracking-wide">
                            CLICK TO INGEST
                          </p>
                          <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest mt-2">
                            [JPG, PNG, BMP] MAX_SIZE: 16MB
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* ERROR MESSAGE */}
                {error && (
                  <div className="mb-4 p-3 bg-rose-950/40 border border-rose-500/50 rounded text-rose-400 text-xs font-mono uppercase tracking-widest flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> {error}
                  </div>
                )}

                {/* BUTTONS */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={submitImage}
                    disabled={loading || !image || !selectedCamera}
                    className="flex-1 glass-button-primary justify-center font-bold text-sm tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                    suppressHydrationWarning
                  >
                    {loading ? (
                      <span className="flex items-center gap-3 relative z-10">
                        <Scan className="w-4 h-4 animate-spin" /> RUNNING ALGORITHM...
                      </span>
                    ) : (
                      <span className="flex items-center gap-3 relative z-10">
                        <Search className="w-4 h-4 group-hover:scale-110 transition-transform" /> ANALYZE TELEMETRY
                      </span>
                    )}
                    
                    {/* Animated scanning bar underneath processing button */}
                    {loading && (
                      <div className="absolute top-0 bottom-0 left-0 w-24 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent -skew-x-[20deg] animate-[shimmer_1s_infinite]"></div>
                    )}
                  </button>
                  <button
                    onClick={resetForm}
                    disabled={loading}
                    className="glass-button text-xs font-mono uppercase tracking-widest justify-center disabled:opacity-50"
                    suppressHydrationWarning
                  >
                    Clear Form
                  </button>
                </div>

                {/* INFO TIPS */}
                <div className="mt-8 pt-6 border-t border-zinc-800/60">
                  <h4 className="text-[10px] font-mono tracking-widest text-emerald-500 uppercase mb-3 flex items-center gap-2">
                    <Shield className="w-3 h-3" /> System Guidelines
                  </h4>
                  <ul className="text-xs font-mono text-zinc-500 space-y-2 uppercase leading-relaxed">
                    <li><span className="text-zinc-400 mr-2">&gt;</span> SUBJECTS MUST BE VISIBLE WITHIN FRAME</li>
                    <li><span className="text-zinc-400 mr-2">&gt;</span> HIGH LUMINOSITY INCREASES ACCURACY</li>
                    <li><span className="text-zinc-400 mr-2">&gt;</span> POSTURE_DB: PUNCHES, KICKS, FALLS, GRABS</li>
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* RIGHT COLUMN - RESULTS */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="glass-panel p-6 h-full flex flex-col border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.05)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

                <h2 className="text-sm font-bold font-mono text-purple-400 uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
                   <Target className="w-4 h-4" /> Deep Analysis Output
                </h2>

                <div className="flex-1 relative z-10">
                  {loading ? (
                     <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8">
                       <Scan className="w-16 h-16 text-cyan-500 mb-6 animate-pulse" />
                       <h3 className="text-lg font-bold text-slate-100 uppercase tracking-widest font-mono mb-2">
                         Processing Matrices
                       </h3>
                       <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                         Running inference via Nexus AI Engine...
                       </p>
                       <div className="w-48 h-1 bg-zinc-800 rounded-full mt-8 overflow-hidden">
                         <div className="h-full bg-cyan-500 w-1/3 animate-[shimmer_1.5s_infinite]"></div>
                       </div>
                     </div>
                  ) : result ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                      
                      {/* CRIME STATUS BANNER */}
                      <div className={`p-4 rounded-xl border relative overflow-hidden ${result.crime_detected ? 'border-rose-500/50 bg-rose-950/20 shadow-[0_0_20px_rgba(244,63,94,0.15)]' : 'border-emerald-500/30 bg-emerald-950/20'}`}>
                        {result.crime_detected && <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 animate-pulse"></div>}
                        
                        <div className="flex items-center justify-between pl-2">
                          <div>
                            <h3 className={`font-bold text-xl uppercase tracking-wider ${result.crime_detected ? 'text-rose-500' : 'text-emerald-500'} flex items-center gap-3`}>
                              {result.crime_detected ? <AlertTriangle className="w-5 h-5 relative -top-[1px]" /> : <CheckCircle className="w-5 h-5 relative -top-[1px]" />}
                              {result.crime_detected ? 'CRITICAL MATCH' : 'NOMINAL MATCH'}
                            </h3>
                            <p className="text-zinc-400 font-mono text-xs mt-2 uppercase tracking-widest">{getCrimeTypeDisplay(result)}</p>
                          </div>
                          <div className={`text-4xl ${result.crime_detected ? 'text-rose-500/20' : 'text-emerald-500/20'}`}>
                             <Scan className="w-12 h-12" />
                          </div>
                        </div>
                      </div>

                      {/* METRICS GRID */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-zinc-900/40 border border-zinc-800/80 p-3 rounded-lg text-center">
                          <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest mb-1">Conf_Score</p>
                          <p className="text-2xl font-bold text-cyan-400">{Math.round((result.confidence || 0) * 100)}%</p>
                        </div>
                        
                        <div className={`bg-zinc-900/40 border p-3 rounded-lg text-center ${getSeverityInfo(result.threat_level).border} shadow-inner`}>
                          <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest mb-1">Threat_Lvl</p>
                          <p className={`text-xl font-bold ${getSeverityInfo(result.threat_level).color}`}>{result.threat_level || "LOW"}</p>
                        </div>
                        
                        <div className="bg-zinc-900/40 border border-zinc-800/80 p-3 rounded-lg text-center">
                          <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest mb-1">Subjects</p>
                          <div className="flex items-center justify-center gap-1.5 text-2xl font-bold text-purple-400">
                             <User className="w-4 h-4" /> {result.persons_detected || 0}
                          </div>
                        </div>
                        
                        <div className="bg-zinc-900/40 border border-zinc-800/80 p-3 rounded-lg text-center">
                          <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest mb-1">Risk_Idx</p>
                          <p className="text-2xl font-bold text-slate-100">{result.threat_score || 0}<span className="text-xs text-zinc-500 font-mono">/100</span></p>
                        </div>
                      </div>

                      {/* DETAILS LIST */}
                      <div className="space-y-5 bg-zinc-900/30 border border-zinc-800/60 p-5 rounded-lg font-mono text-xs uppercase tracking-widest">
                        
                        {result.activities && result.activities.length > 0 && (
                          <div className="flex border-b border-zinc-800 pb-3">
                            <span className="text-zinc-500 w-32 shrink-0">Tags:</span>
                            <div className="flex flex-wrap gap-2 flex-1">
                              {result.activities.map((activity, idx) => (
                                <span key={idx} className="text-cyan-400 bg-cyan-950/30 border border-cyan-500/20 px-1.5 py-0.5 rounded">
                                  {activity.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {result.signals && result.signals.length > 0 && (
                          <div className="flex border-b border-zinc-800 pb-3">
                            <span className="text-zinc-500 w-32 shrink-0">Signals:</span>
                            <div className="flex flex-wrap gap-2 flex-1">
                              {result.signals.map((signal, idx) => (
                                <span key={idx} className="text-rose-400 bg-rose-950/30 border border-rose-500/20 px-1.5 py-0.5 rounded">
                                  {signal.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center">
                          <span className="text-zinc-500 w-32 shrink-0">Origin:</span>
                          <span className="text-slate-300">
                            {typeof result.location === "object"
                              ? (result.location?.name || selectedCamera?.area || "UNKNOWN")
                              : (result.location || selectedCamera?.area || "UNKNOWN")}
                          </span>
                        </div>
                        
                        <div className="flex items-center">
                          <span className="text-zinc-500 w-32 shrink-0">Coords:</span>
                          <span className="text-slate-300">
                            {typeof result.location === "object" && result.location?.lat != null
                              ? `[ ${result.location.lat}, ${result.location.lng} ]`
                              : selectedCamera && `[ ${selectedCamera.latitude}, ${selectedCamera.longitude} ]`}
                          </span>
                        </div>

                        <div className="flex items-center">
                          <span className="text-zinc-500 w-32 shrink-0">Timestamp:</span>
                          <span className="text-slate-300">
                            {mounted && (result.timestamp 
                              ? new Date(result.timestamp).toLocaleString()
                              : new Date().toLocaleString()
                            )}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    /* EMPTY STATE */
                    <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8">
                      <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                        <Activity className="w-6 h-6 text-zinc-600" />
                      </div>
                      <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest font-mono mb-2">
                        AWAITING INGESTION
                      </h3>
                      <p className="text-xs text-zinc-600 font-mono tracking-widest max-w-[250px] leading-relaxed">
                        Standby. Select a node origin and input visual bounds to begin telemetry analysis.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}