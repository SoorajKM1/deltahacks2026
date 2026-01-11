"use client";

import { useState, useEffect } from "react";
import { Sparkles, Clock, Users, Pill, X } from "lucide-react"; 
import NeuroVaultShell from "../components/neurovault/NeuroVaultShell";
import BigActionButton from "../components/neurovault/BigAction";
import ResponseCard from "../components/neurovault/ResponseCard";
import CaregiverFab from "@/components/neurovault/CaregiverFab";
import CameraCapture, { VisionIdentifyResult } from "@/components/neurovault/CameraCapture";

export default function Page() {
  const [status, setStatus] = useState<"idle" | "listening" | "thinking">("idle");
  const [transcript, setTranscript] = useState("");
  const [answer, setAnswer] = useState("");
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    if (answer) window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }, [answer]);

  async function onAsk(text: string) {
    const q = text.trim();
    if (!q || status === "thinking") return;

    setStatus("thinking");
    setTranscript(q);
    setShowCamera(false); 

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: q }] }),
      });

      if (!response.ok) throw new Error("Brain connection failed");
      const a = await response.text();
      setAnswer(a);
      speak(a);
    } catch (e) {
      console.error(e);
      const fallback = "I'm having trouble connecting to my memory right now.";
      setAnswer(fallback);
      speak(fallback);
    } finally {
      setStatus("idle");
    }
  }

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95; u.pitch = 1.05; 
    window.speechSynthesis.speak(u);
  }

  function handleIdentify(r: VisionIdentifyResult) {
    if (r.memory_id && r.memory_id !== "unknown") {
      onAsk(`#file:${r.memory_id}`);
    } else {
      onAsk("Who is this person?");
    }
    setShowCamera(false);
  }

  return (
    <NeuroVaultShell status={status}>
      
      {/* ANIMATION CONTAINER 
        - We use 'translate-x' to physically move the whole group left/right.
        - When Camera is CLOSED: The group centers the Main Card.
        - When Camera is OPEN: The group shifts left to center the PAIR.
      */}
      <div 
        className={`
          flex items-start justify-center gap-8 w-fit mx-auto transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${showCamera ? "-translate-x-[22rem]" : "translate-x-0"} 
        `}
      >

        {/* --- MAIN CARD --- */}
        <div className="w-[45rem] shrink-0 bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col transition-all duration-500 z-20 relative">
          
          {/* Header */}
          <header className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-800">NeuroVault</h1>
              <p className="text-slate-400 text-sm font-medium">Personal Assistant</p>
            </div>
            <div className="px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm flex items-center gap-2">
               {status === "idle" && <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>}
               {status === "listening" && <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>}
               {status === "thinking" && <Sparkles size={14} className="text-blue-500 animate-spin" />}
               <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
                 {status === "idle" ? "System Online" : status === "listening" ? "Listening..." : "Processing..."}
               </span>
            </div>
          </header>

          {/* Display Area */}
          <div className="flex-1 bg-slate-50/30 p-8 flex flex-col items-center justify-center relative min-h-[500px]">
            {!answer && !transcript && (
              <div className="text-center space-y-8 animate-in fade-in duration-700">
                <p className="text-slate-400 text-lg font-medium">Try asking...</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <button onClick={() => onAsk("Who is in my family?")} className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 text-left hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3 group">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors"><Users size={20}/></div>
                    <span className="text-slate-700 font-semibold">Who is in my family?</span>
                  </button>
                  <button onClick={() => onAsk("What medication do I take?")} className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 text-left hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3 group">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors"><Pill size={20}/></div>
                    <span className="text-slate-700 font-semibold">My medication?</span>
                  </button>
                  <button onClick={() => onAsk("What is my routine today?")} className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 text-left hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3 group">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors"><Clock size={20}/></div>
                    <span className="text-slate-700 font-semibold">My daily routine?</span>
                  </button>
                </div>
              </div>
            )}
            <div className="w-full space-y-6">
              {transcript && (
                <div className="flex justify-end animate-in slide-in-from-bottom-2 fade-in">
                  <div className="bg-blue-600 text-white px-6 py-4 rounded-3xl rounded-tr-sm text-xl shadow-lg max-w-[85%]">"{transcript}"</div>
                </div>
              )}
              {answer && <ResponseCard answer={answer} />}
            </div>
          </div>

          {/* Control Dock */}
          <div className="bg-white p-8 border-t border-slate-100 flex flex-col items-center shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] relative z-20">
             <BigActionButton
               status={status}
               onResult={onAsk}
               onStatusChange={setStatus}
               onToggleCamera={() => setShowCamera(!showCamera)} 
             />
          </div>
        </div>

        {/* --- CAMERA CARD (The Pop-Up) --- 
            - absolute: positions it relative to the moving container, essentially "off screen" initially
            - left-[47rem]: Places it exactly to the right of the main card (45rem width + 2rem gap)
        */}
        <div className={`
           absolute left-[47rem] top-0 bottom-0
           w-[45rem] bg-slate-900 rounded-[3rem] shadow-2xl border-4 border-slate-800 overflow-hidden flex flex-col 
           transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-left
           ${showCamera 
             ? "opacity-100 scale-100 translate-x-0 rotate-0" 
             : "opacity-0 scale-90 -translate-x-10 rotate-[-5deg] pointer-events-none"}
        `}>
            
            <div className="flex items-center justify-between p-8 bg-slate-900 text-white z-10">
              <div>
                <h2 className="font-bold text-2xl tracking-wide">Visual Scanner</h2>
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mt-1">Camera Active</p>
              </div>
              <button onClick={() => setShowCamera(false)} className="p-4 rounded-full bg-white/10 hover:bg-white/20 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 bg-black relative rounded-t-[2.5rem] overflow-hidden mx-3 mb-3 border border-slate-800">
                {/* Only mount camera when showing to save resources */}
                {showCamera && <CameraCapture onIdentify={handleIdentify} />}
                
                <div className="absolute inset-0 pointer-events-none border-[8px] border-white/5 rounded-[2.5rem]" />
                <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
                  <span className="bg-black/60 text-white px-6 py-3 rounded-full text-base font-mono backdrop-blur-md border border-white/10 shadow-lg animate-pulse">
                    Scanning Environment...
                  </span>
                </div>
            </div>
        </div>

      </div>
      <CaregiverFab />
    </NeuroVaultShell>
  );
}