"use client";

import { useState } from "react";
// import { askNeuroVault } from "../lib/neurovault-client"; #This is the old chat, were not using it anymore
import NeuroVaultShell from "../components/neurovault/NeuroVaultShell";
import BigActionButton from "../components/neurovault/BigAction";
import ResponseCard from "../components/neurovault/ResponseCard";
import CaregiverFab from "@/components/neurovault/CaregiverFab";

export default function Page() {
  const [status, setStatus] = useState<"idle" | "listening" | "thinking">("idle");
  const [transcript, setTranscript] = useState("");
  const [answer, setAnswer] = useState("");

  async function onAsk(text: string) {
    const q = text.trim();
    if (!q) return;

    setStatus("thinking");
    setTranscript(q);

    try {
      // --- NEW: Direct Call to Gemini Brain --- IMPORTANT
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            messages: [{ role: "user", content: q }] 
        }),
      });

      if (!response.ok) throw new Error("Brain connection failed");

      const a = await response.text();
      // ----------------------------------------

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
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    // Accessibility Tweak: Slower rate for seniors
    u.rate = 0.9; 
    // Optional: Deep/Comforting voice if available
    // const voices = window.speechSynthesis.getVoices();
    // u.voice = voices.find(v => v.name.includes("Male")) || null; 
    
    window.speechSynthesis.speak(u);
  }

  return (
    <NeuroVaultShell status={status}>
      <div className="w-full max-w-2xl space-y-8">
        <header className="text-center">
          <h1 className="text-5xl font-semibold">NeuroVault</h1>
          <p className="mt-3 text-xl text-black/60">I help only when you ask.</p>
        </header>

        <BigActionButton
          status={status}
          onResult={(q) => onAsk(q)}
          onStatusChange={(s) => setStatus(s)}
        />

        <div className="rounded-2xl border border-black/10 bg-white p-7">
          <div className="text-sm uppercase tracking-wide text-black/60">You said</div>
          <div className="mt-3 min-h-14 text-3xl font-semibold">
            {status === "listening" ? "Listening…" : transcript || "Press Ask for Help and speak."}
          </div>
        </div>

        <ResponseCard answer={answer} />
      </div>
      <CaregiverFab />
    </NeuroVaultShell>
  );
}