"use client";

import { useState } from "react";
import NeuroVaultShell from "../components/neurovault/NeuroVaultShell";
import BigActionButton from "../components/neurovault/BigAction";
import ResponseCard from "../components/neurovault/ResponseCard";
import CaregiverFab from "@/components/neurovault/CaregiverFab";
import CameraCapture, { VisionIdentifyResult } from "@/components/neurovault/CameraCapture";

export default function Page() {
  const [status, setStatus] = useState<"idle" | "listening" | "thinking">("idle");
  const [transcript, setTranscript] = useState("");
  const [answer, setAnswer] = useState("");

  async function onAsk(text: string) {
    const q = text.trim();
    if (!q) return;

    // Do not start a new request while already thinking
    if (status === "thinking") return;

    setStatus("thinking");
    setTranscript(q);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: q }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`Brain connection failed: ${response.status} ${errText}`);
      }

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
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }

  function handleIdentify(r: VisionIdentifyResult) {
    // New backend returns memory_id (example: "mem_family_tim.txt")
    if (r.memory_id && r.memory_id !== "unknown") {
      // Deterministic retrieval (after you ingest memories with metadata.file)
      onAsk(`#file:${r.memory_id}`);
      return;
    }

    onAsk("Who is this person?");
  }

  return (
    <NeuroVaultShell status={status}>
      <div className="w-full max-w-2xl space-y-8">
        <header className="text-center">
          <h1 className="text-5xl font-semibold">NeuroVault</h1>
          <p className="mt-3 text-xl text-black/60">I help only when you ask.</p>
        </header>

        {/* Voice / Ask */}
        <BigActionButton
          status={status}
          onResult={(q) => onAsk(q)}
          onStatusChange={(s) => setStatus(s)}
        />

        {/* What the user said */}
        <div className="rounded-2xl border border-black/10 bg-white p-7">
          <div className="text-sm uppercase tracking-wide text-black/60">You said</div>
          <div className="mt-3 min-h-14 text-3xl font-semibold">
            {status === "listening" ? "Listening…" : transcript || "Press Ask for Help and speak."}
          </div>
        </div>

        {/* Photo Recall */}
        <div className="rounded-2xl border border-black/10 bg-white p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm uppercase tracking-wide text-black/60">Photo recall</div>
              <div className="mt-1 text-xl font-semibold">Identify from camera</div>
            </div>
            <div className="text-sm text-black/60">
              {status === "thinking" ? "Thinking…" : "Ready"}
            </div>
          </div>

          <div className="mt-5">
            <CameraCapture onIdentify={handleIdentify} />
          </div>

          <p className="mt-4 text-sm text-black/60">
            Tip: Use the same reference photos as <span className="font-mono">data/images</span>.
          </p>
        </div>

        {/* Answer */}
        <ResponseCard answer={answer} />
      </div>

      <CaregiverFab />
    </NeuroVaultShell>
  );
}
