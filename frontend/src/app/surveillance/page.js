"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import AdminSidebar from "@/components/AdminSidebar";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, AlertTriangle, Play, Square, Activity, Cpu, Camera, Expand, ShieldAlert } from "lucide-react";

export default function SurveillancePage() {
  const router = useRouter();
  const checkedRef = useRef(false);

  const [espIp, setEspIp] = useState("http://10.216.190.92");
  const [streamRunning, setStreamRunning] = useState(false);
  const [streamUrl, setStreamUrl] = useState(null);
  const [capturesLength, setCapturesLength] = useState(0);
  const [notification, setNotification] = useState({ msg: "", type: "", show: false });
  const [lastCaptureTime, setLastCaptureTime] = useState(null);

  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [latestDetection, setLatestDetection] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const imgRef = useRef(null);
  const canvasRefs = useRef([...Array(5)].map(() => null));
  const captureCount = useRef(0);
  const autoCaptureInterval = useRef(null);
  const selectedCameraRef = useRef(null);
  const MAX_IMAGES = 5;
  const CAPTURE_INTERVAL = 3000;

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return router.replace("/login");
      const userRole = localStorage.getItem("role");
      if (userRole !== "admin" && userRole !== "operator") {
        return router.replace("/dashboard");
      }

      try {
        const token = await user.getIdToken();
        const res = await fetch("http://localhost:5000/api/operator/cameras", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setCameras(data);
          if (data.length > 0) {
            setSelectedCameraId(data[0].cameraId);
            setSelectedCamera(data[0]);
            selectedCameraRef.current = data[0];
          }
        }
      } catch (err) {
        console.error("Failed to fetch cameras:", err);
      }
    });

    return () => {
      stopAutoCapture();
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [router]);

  const handleCameraChange = (e) => {
    const camId = e.target.value;
    setSelectedCameraId(camId);
    const cam = cameras.find((c) => c.cameraId === camId) || null;
    setSelectedCamera(cam);
    selectedCameraRef.current = cam;
  };

  const notify = (msg, type) => {
    setNotification({ msg, type, show: true });
    setTimeout(() => setNotification((prev) => ({ ...prev, show: false })), 4000);
  };

  const startLive = () => {
    if (streamRunning || streamUrl) return;
    setStreamUrl(`${espIp}/stream?ts=${Date.now()}`);
  };

  const stopLive = () => {
    setStreamUrl(null);
    setStreamRunning(false);
    notify("Stream terminated by operator", "info");
    stopAutoCapture();
    setCapturesLength(0);
    captureCount.current = 0;
    setLastCaptureTime(null);
  };

  const startAutoCapture = () => {
    if (autoCaptureInterval.current) return;
    autoCaptureInterval.current = setInterval(captureImage, CAPTURE_INTERVAL);
  };

  const stopAutoCapture = () => {
    if (autoCaptureInterval.current) {
      clearInterval(autoCaptureInterval.current);
      autoCaptureInterval.current = null;
    }
  };

  const captureImage = () => {
    if (!imgRef.current) return;

    const w = imgRef.current.naturalWidth || 640;
    const h = imgRef.current.naturalHeight || 480;

    for (let i = MAX_IMAGES - 1; i > 0; i--) {
      const targetCanvas = canvasRefs.current[i];
      const sourceCanvas = canvasRefs.current[i - 1];

      if (targetCanvas && sourceCanvas && i <= captureCount.current) {
        targetCanvas.width = w;
        targetCanvas.height = h;
        const ctx = targetCanvas.getContext("2d");
        ctx.drawImage(sourceCanvas, 0, 0, w, h);
      }
    }

    const firstCanvas = canvasRefs.current[0];
    let snapshotUrl = null;
    if (firstCanvas) {
      firstCanvas.width = w;
      firstCanvas.height = h;
      const ctx = firstCanvas.getContext("2d");
      
      // Draw clean image first (rotate 180 degrees to upright)
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(Math.PI);
      ctx.drawImage(imgRef.current, -w / 2, -h / 2, w, h);
      ctx.restore();
      
      // Capture clean image for AI detection
      snapshotUrl = firstCanvas.toDataURL("image/jpeg", 0.8);

      // Now add grid line effects on canvas for that "tech" look in the UI
      ctx.fillStyle = "rgba(6,182,212,0.1)";
      for(let y=0; y<h; y+=20) ctx.fillRect(0, y, w, 1);
    }

    if (captureCount.current < MAX_IMAGES) {
      captureCount.current += 1;
      setCapturesLength(captureCount.current);
    }

    setLastCaptureTime(new Date().toLocaleTimeString());

    if (snapshotUrl) {
      uploadForDetection(snapshotUrl);
    }
  };

  const uploadForDetection = async (dataUrl) => {
    const cam = selectedCameraRef.current;
    if (!cam) return;

    setIsDetecting(true);
    try {
      const resBlob = await fetch(dataUrl);
      const blob = await resBlob.blob();
      const file = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("image", file);
      formData.append(
        "location",
        JSON.stringify({
          name: cam.area,
          lat: cam.latitude,
          lng: cam.longitude,
          cameraId: cam.cameraId,
        })
      );

      const res = await fetch("http://localhost:5000/api/detect/image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setLatestDetection({
          ...data.data,
          time: new Date().toLocaleTimeString()
        });

        if (data.data.crime_detected) {
          notify(`CRITICAL ABERRATION: ${data.data.crime_type || "Unknown Activity"}`, "error");
        }
      }
    } catch (err) {
      console.error("Auto detect error:", err);
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <div className="flex bg-zinc-950 min-h-screen text-slate-100 font-['Outfit'] relative overflow-hidden" suppressHydrationWarning>

      <AdminSidebar />
      <div className="flex-1 flex flex-col relative w-full overflow-y-auto custom-scrollbar">
        <div className="sticky top-0 z-20">
          <Navbar title="LIVE_FEED // ESP32" />
        </div>

        <div className="fixed inset-0 scanlines opacity-30 pointer-events-none z-0"></div>

        {/* NOTIFICATION */}
        <AnimatePresence>
          {notification.show && (
            <motion.div
              initial={{ x: "150%" }}
              animate={{ x: 0 }}
              exit={{ x: "150%" }}
              transition={{ type: "spring", stiffness: 100 }}
              className={`fixed top-20 right-6 px-6 py-4 rounded-xl font-mono text-xs md:text-sm font-bold tracking-wide text-white shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-[1000] backdrop-blur-xl border flex items-center gap-3
              ${notification.type === "success"
                  ? "bg-emerald-950/80 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)] text-emerald-100"
                  : notification.type === "error"
                    ? "bg-rose-950/80 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.3)] text-rose-100"
                    : "bg-cyan-950/80 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)] text-cyan-100"
                }`}
            >
              <Activity className="w-5 h-5 animate-pulse" />
              {notification.msg}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-6 md:p-8 flex-1 w-full max-w-[1600px] mx-auto pb-20 relative z-10">

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6"
          >
             <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-wide text-slate-100 uppercase">Tactical Surveillance Overview</h2>
                <p className="text-zinc-500 font-mono text-sm mt-1">Direct feed active. Awaiting operator input.</p>
             </div>
             
             {/* HUD Metrics Top Right */}
             <div className="hidden lg:flex gap-4 font-mono text-xs">
                 <div className="glass-panel px-3 py-1.5 border-zinc-700/50 text-cyan-400">
                    LATENCY: 12ms
                 </div>
                 <div className="glass-panel px-3 py-1.5 border-zinc-700/50 text-purple-400 flex items-center gap-2">
                    <Cpu className="w-3 h-3" /> NEURAL_NET: {isDetecting ? "ANALYZING" : "IDLE"}
                 </div>
             </div>
          </motion.div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8">
            {/* LIVE FEED PANEL */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="xl:col-span-7 glass-panel border-cyan-900/40 p-1 md:p-6 shadow-[0_0_30px_rgba(6,182,212,0.05)] flex flex-col gap-6"
            >
              <div className="flex justify-between items-center px-4 md:px-0 mt-4 md:mt-0">
                <div className="tech-badge">
                   <div className={`w-2 h-2 rounded-full ${streamRunning ? 'bg-cyan-400 shadow-[0_0_8px_#06b6d4] animate-pulse' : 'bg-red-500'}`} />
                   {streamRunning ? 'FEED ACTIVE' : 'NO SIGNAL'}
                </div>
                <div className="text-xs font-mono text-zinc-500 flex items-center gap-2">
                   {selectedCameraRef.current?.area || "NO ZONE SELECTED"} <Expand className="w-3 h-3 cursor-pointer hover:text-cyan-400" />
                </div>
              </div>

              <div className="relative w-full aspect-video bg-zinc-950 rounded-xl overflow-hidden shadow-inner flex flex-col items-center justify-center border border-zinc-800 group">
                {/* Visual HUD overlays */}
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-cyan-500/50 z-20"></div>
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-cyan-500/50 z-20"></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-cyan-500/50 z-20"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-cyan-500/50 z-20"></div>
                
                {streamRunning && (
                    <div className="absolute top-6 left-12 z-20 flex gap-2">
                        <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                        <span className="text-[10px] text-rose-500 font-mono font-bold tracking-widest">REC</span>
                    </div>
                )}

                {streamUrl && (
                  <img
                    ref={imgRef}
                    crossOrigin="anonymous"
                    src={streamUrl}
                    alt="Live ESP32 Feed"
                    className={`absolute inset-0 w-full h-full object-cover transform rotate-180 transition-opacity duration-500 z-10 ${streamRunning ? 'opacity-100 grayscale-[20%] contrast-125' : 'opacity-0'}`}
                    onLoad={() => {
                      if (!streamRunning) {
                        setStreamRunning(true);
                        notify("Neural feed established", "success");
                        startAutoCapture();
                      }
                    }}
                    onError={() => {
                      setStreamRunning(false);
                      setStreamUrl(null);
                      notify("Signal loss detected", "error");
                    }}
                  />
                )}
                {!streamRunning && (
                  <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center opacity-70 z-10">
                    <Radio className="w-12 h-12 text-zinc-700 mb-4 animate-pulse" />
                    <span className="text-zinc-500 font-mono tracking-widest text-sm">
                      {streamUrl ? "CONNECTING_TO_IP..." : "AWAITING_SIGNAL"}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col md:flex-row gap-4 px-4 md:px-0">
                <select
                  className="glass-input flex-1 focus:ring-cyan-500/30"
                  value={selectedCameraId}
                  onChange={handleCameraChange}
                  disabled={streamRunning}
                  suppressHydrationWarning
                >
                  <option value="" className="bg-zinc-900">-- Assign Zone --</option>
                  {cameras.map((cam) => (
                    <option key={cam.cameraId} value={cam.cameraId} className="bg-zinc-900">
                      {cam.name} ({cam.area})
                    </option>
                  ))}
                </select>

                <input
                  value={espIp}
                  onChange={(e) => setEspIp(e.target.value)}
                  placeholder="ESP32 Stream URL (e.g. http://10.216.190.92)"
                  className="glass-input flex-1 font-mono"
                  disabled={streamRunning}
                  suppressHydrationWarning
                />
              </div>

              <div className="grid grid-cols-2 gap-4 px-4 md:px-0 mb-4 md:mb-0">
                <button
                  onClick={startLive}
                  className="glass-button-primary py-4 uppercase tracking-[0.2em] font-bold text-xs"
                  suppressHydrationWarning
                >
                  <Play className="w-4 h-4" /> Initialize
                </button>
                <button
                  onClick={stopLive}
                  className="glass-button py-4 uppercase tracking-[0.2em] font-bold text-xs hover:border-rose-500/50 hover:text-rose-400"
                  suppressHydrationWarning
                >
                  <Square className="w-4 h-4" /> Terminate
                </button>
              </div>
            </motion.div>

            {/* AI ANALYSIS PANEL */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="xl:col-span-5 flex flex-col gap-6"
            >
              {/* Telemetry output */}
              <div className="glass-panel border-purple-900/40 p-6 flex flex-col gap-4">
                 <div className="flex justify-between items-center border-b border-zinc-800/60 pb-3">
                    <h3 className="text-sm font-bold text-purple-400 tracking-widest font-mono flex items-center gap-2">
                        <Cpu className="w-4 h-4" />
                        AI Telemetry
                    </h3>
                    {isDetecting && <div className="text-[10px] text-zinc-400 animate-pulse font-mono tracking-widest border border-zinc-800 px-2 py-1 rounded">PROCESSING</div>}
                 </div>

                 {latestDetection ? (
                     <motion.div 
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       className={`p-5 rounded-xl border backdrop-blur-md ${latestDetection.crime_detected ? 'bg-rose-950/30 border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.1)]' : 'bg-emerald-950/30 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]'}`}
                     >
                       <div className="flex justify-between items-start mb-4">
                         <h4 className={`text-lg font-bold uppercase tracking-wider ${latestDetection.crime_detected ? 'text-rose-400' : 'text-emerald-400'}`}>
                           {latestDetection.crime_detected ? (
                               <span className="flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> {latestDetection.crime_type || "SUSPICIOUS BEHAVIOR"}</span>
                           ) : (
                               <span className="flex items-center gap-2"><ShieldAlert className="w-5 h-5" /> PATTERN SECURE</span>
                           )}
                         </h4>
                         <span className="text-[10px] font-mono bg-zinc-900/80 px-2 py-1 rounded text-zinc-400 border border-zinc-800">
                           T-{latestDetection.time}
                         </span>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-3 mt-6">
                         <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80">
                           <span className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest border-b border-zinc-800/50 pb-1 mb-2">Confidence_</span>
                           <div className="flex items-end gap-1">
                               <span className="text-2xl font-semibold text-slate-100 leading-none">{Math.round((latestDetection.confidence || 0) * 100)}</span>
                               <span className="text-zinc-500 font-mono text-xs mb-1">%</span>
                           </div>
                         </div>
                         <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80">
                           <span className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest border-b border-zinc-800/50 pb-1 mb-2">Threat_Lvl_</span>
                           <span className={`text-xl font-bold font-mono tracking-wider ${latestDetection.threat_level === 'HIGH' || latestDetection.threat_level === 'CRITICAL' ? 'text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'text-emerald-400'}`}>
                             {latestDetection.threat_level || "LOW"}
                           </span>
                         </div>
                       </div>
                     </motion.div>
                 ) : (
                    <div className="p-8 text-center border border-zinc-800 border-dashed rounded-xl bg-zinc-900/30">
                        <p className="text-zinc-500 font-mono text-xs tracking-widest leading-relaxed">NO TELEMETRY DATA AVAILABLE.<br/>INITIALIZE VIDEO FEED TO COMMENCE SCAN.</p>
                    </div>
                 )}
              </div>

              {/* Frame history timeline */}
              <div className="glass-panel border-zinc-800/60 p-6 flex flex-col flex-1 min-h-[300px]">
                 <div className="flex justify-between items-center mb-4">
                     <h3 className="text-sm font-bold text-zinc-400 tracking-widest font-mono flex items-center gap-2">
                        <Camera className="w-4 h-4" /> Captures
                     </h3>
                     <span className="text-[10px] font-bold text-zinc-500 bg-zinc-900 px-2 py-1 rounded border border-zinc-800 tracking-widest">INTERVAL // 3s</span>
                 </div>

                 <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-2 custom-scrollbar content-start flex-1 mt-2">
                    {[...Array(MAX_IMAGES)].map((_, i) => (
                      <div key={i} className={`relative overflow-hidden rounded-lg aspect-video border ${i === 0 ? 'border-cyan-500/50 opacity-100' : 'border-zinc-800 opacity-60 grayscale-[50%] hover:opacity-100 hover:grayscale-0'} transition-all duration-300`} style={{ display: i < capturesLength ? 'block' : 'none' }}>
                         <canvas
                           ref={(el) => canvasRefs.current[i] = el}
                           className="w-full h-full object-cover bg-zinc-900 block"
                         />
                         {i === 0 && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-950 to-transparent p-2 text-[9px] font-mono text-cyan-400 tracking-widest">
                               LATEST FRAME
                            </div>
                         )}
                      </div>
                    ))}

                    {capturesLength === 0 && (
                      <div className="col-span-2 flex flex-col items-center justify-center p-6 bg-zinc-900/20 border border-zinc-800 rounded-lg text-zinc-600 min-h-[160px]">
                        <Camera className="w-8 h-8 opacity-20 mb-2" />
                        <span className="font-mono text-[10px] tracking-widest">AWAITING FRAMES...</span>
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
