"use client";

import { useState, useRef } from "react";
import { Mic, MicOff, Loader2, Keyboard, Send, Camera } from "lucide-react";

// --- SPEECH API TYPES ---
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

type Props = {
  status: "idle" | "listening" | "thinking";
  onResult: (text: string) => void;
  onStatusChange: (s: "idle" | "listening" | "thinking") => void;
  onToggleCamera: () => void; // New Prop: Just a signal
};

export default function BigActionButton({ status, onResult, onStatusChange, onToggleCamera }: Props) {
  const [isTypingMode, setIsTypingMode] = useState(false);
  const [inputText, setInputText] = useState("");
  const recognitionRef = useRef<any>(null);

  // --- VOICE LOGIC ---
  const handleVoicePress = () => {
    if (status !== "idle") return;

    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechChoice = SpeechRecognition || webkitSpeechRecognition;

    if (!SpeechChoice) {
      alert("Voice control is not supported. Please use Chrome/Edge.");
      return;
    }

    const recognition = new SpeechChoice();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => onStatusChange("listening");
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) onResult(transcript);
    };

    recognition.onend = () => setTimeout(() => {}, 500); 
    recognition.onerror = () => onStatusChange("idle");

    recognition.start();
  };

  // --- TYPING LOGIC ---
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onResult(inputText);
      setInputText("");
      setIsTypingMode(false);
    }
  };

  // --- RENDER: TYPING MODE ---
  if (isTypingMode) {
    return (
      <div className="w-full max-w-md animate-in zoom-in-95 duration-200">
        <form onSubmit={handleTextSubmit} className="relative bg-white p-2 rounded-3xl shadow-2xl border-2 border-blue-500 ring-4 ring-blue-100">
          <textarea
            autoFocus
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type here..."
            className="w-full h-48 p-4 text-2xl font-semibold text-slate-800 placeholder:text-slate-300 resize-none outline-none rounded-2xl"
          />
          <div className="flex items-center gap-2 mt-2">
            <button type="button" onClick={() => setIsTypingMode(false)} className="px-6 py-4 rounded-xl bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!inputText.trim()} className="flex-1 px-6 py-4 rounded-xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              <Send size={20} /> Send
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- RENDER: DEFAULT CONTROLS ---
  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* BIG MIC BUTTON */}
      <button
        onClick={handleVoicePress}
        disabled={status === "thinking"}
        className={`
          relative group w-56 h-56 rounded-full flex flex-col items-center justify-center transition-all duration-500 ease-out shadow-2xl
          ${status === "idle" ? "bg-blue-600 hover:bg-blue-700 hover:scale-105 shadow-blue-500/30" : ""}
          ${status === "listening" ? "bg-rose-500 scale-110 shadow-rose-500/40" : ""}
          ${status === "thinking" ? "bg-amber-400 scale-95 shadow-amber-500/20 cursor-wait" : ""}
        `}
      >
        {status === "listening" && (
          <>
            <div className="absolute inset-0 rounded-full border-4 border-rose-200 animate-ping opacity-75" />
            <div className="absolute -inset-4 rounded-full border border-rose-100 opacity-50 animate-pulse" />
          </>
        )}

        <div className="relative z-10 flex flex-col items-center gap-2 text-white">
          {status === "idle" && <Mic size={48} className="drop-shadow-md" />}
          {status === "listening" && <MicOff size={48} className="animate-pulse" />}
          {status === "thinking" && <Loader2 size={48} className="animate-spin text-white/90" />}
          
          <span className="text-lg font-bold tracking-wide uppercase">
            {status === "idle" && "Tap to Speak"}
            {status === "listening" && "Listening..."}
            {status === "thinking" && "Thinking..."}
          </span>
        </div>
      </button>

      {/* ACTION ROW (Type & Camera) */}
      {status === "idle" && (
        <div className="flex items-center gap-4 w-full max-w-xs">
          <button 
            onClick={() => setIsTypingMode(true)}
            className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-500 font-bold hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
          >
            <Keyboard size={24} />
            <span className="text-sm">Type</span>
          </button>
          
          <button 
            onClick={onToggleCamera} // <--- Calls the parent page now!
            className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-500 font-bold hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
          >
            <Camera size={24} />
            <span className="text-sm">Scan</span>
          </button>
        </div>
      )}
    </div>
  );
}