"use client";

import { useState } from "react";
import NeuroVaultShell from "@/components/neurovault/NeuroVaultShell";
import BigActionButton from "@/components/neurovault/BigActionButton";
import ResponseCard from "@/components/neurovault/ResponseCard";

// TODO: swap this with the boilerplate's real API call.
// Search your repo for something like: fetch("/api") or "generate" or "moorcheh"
async function askNeuroVault(question: string): Promise<string> {
  // Temporary safe stub so UI works immediately
  await new Promise((r) => setTimeout(r, 600));
  return "This is Tim, your grandson. He is 8 years old and loves playing soccer.";
}

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
      const a = await askNeuroVault(q);
      setAnswer(a);
      speak(a);
    } finally {
      setStatus("idle");
    }
  }

  function speak(text: string) {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
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

        <div className="rounded-2xl border border-black/10 p-6">
          <div className="text-sm uppercase tracking-wide text-black/60">You said</div>
          <div className="mt-2 min-h-[56px] text-3xl font-semibold">
            {status === "listening" ? "Listening…" : transcript || "Press the button and speak."}
          </div>
        </div>

        <ResponseCard answer={answer} />
      </div>
    </NeuroVaultShell>
  );
}
