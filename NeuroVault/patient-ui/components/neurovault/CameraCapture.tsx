"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type VisionIdentifyResult = {
    memory_id: string; // "mem_family_tim.txt" or "unknown"
    confidence: number;
    distance?: number;
    match_filename?: string;
};

type Status = "idle" | "starting" | "ready" | "capturing" | "error";

export default function CameraCapture({
    backendUrl = "http://localhost:8001",
    onCapture,
    onIdentify,
    autoAskFromMemoryId,
    }: {
    backendUrl?: string;

    // Called with the captured image (data URL)
    onCapture?: (imageDataUrl: string) => void;

    // Called with the backend identify response
    onIdentify?: (result: VisionIdentifyResult) => void;

    // Convenience: if provided, we will call this with "#file:<memory_id>" when match is found
    autoAskFromMemoryId?: (query: string) => void;
    }) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [status, setStatus] = useState<Status>("starting");
    const [err, setErr] = useState<string>("");
    const [busy, setBusy] = useState(false);

    const [lastResult, setLastResult] = useState<VisionIdentifyResult | null>(null);
    const [lastSnapshot, setLastSnapshot] = useState<string>("");

    const canSnap = status === "ready" && !busy;

    const statusText = useMemo(() => {
        if (status === "starting") return "Starting camera…";
        if (status === "ready") return "Camera ready";
        if (status === "capturing") return "Identifying…";
        if (status === "error") return "Camera error";
        return "Idle";
    }, [status]);

    useEffect(() => {
        let stream: MediaStream | null = null;

        async function start() {
        setErr("");
        setStatus("starting");

        try {
            stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user",
                width: { ideal: 1280 },
                height: { ideal: 720 },
            },
            audio: false,
            });

            const v = videoRef.current;
            if (!v) throw new Error("Video element not ready");

            v.srcObject = stream;
            await v.play();
            setStatus("ready");
        } catch (e: any) {
            console.error("Camera error:", e);
            setErr(e?.message || "Unable to access camera");
            setStatus("error");
        }
        }

        start();

        return () => {
        try {
            if (stream) stream.getTracks().forEach((t) => t.stop());
        } catch {}
        };
    }, []);

    async function captureFrame(): Promise<string | null> {
        const v = videoRef.current;
        const c = canvasRef.current;
        if (!v || !c) return null;

        const w = v.videoWidth || 1280;
        const h = v.videoHeight || 720;

        c.width = w;
        c.height = h;

        const ctx = c.getContext("2d");
        if (!ctx) return null;

        ctx.drawImage(v, 0, 0, w, h);
        return c.toDataURL("image/jpeg", 0.9);
    }

    async function snapAndIdentify() {
        if (!canSnap) return;

        setBusy(true);
        setStatus("capturing");
        setErr("");

        try {
        const img = await captureFrame();
        if (!img) throw new Error("Failed to capture frame");

        setLastSnapshot(img);
        onCapture?.(img);

        const res = await fetch(`${backendUrl}/identify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image_base64: img }),
        });

        const data = (await res.json()) as VisionIdentifyResult;

        if (!res.ok) {
            console.error("Vision backend error:", data);
            throw new Error("Vision identify failed");
        }

        setLastResult(data);
        onIdentify?.(data);

        if (data.memory_id && data.memory_id !== "unknown") {
            autoAskFromMemoryId?.(`#file:${data.memory_id}`);
        }
        } catch (e: any) {
        console.error(e);
        setErr(e?.message || "Something went wrong");
        setLastResult(null);
        } finally {
        setBusy(false);
        setStatus("ready");
        }
    }

    function resetPreview() {
        setLastSnapshot("");
        setLastResult(null);
        setErr("");
    }

    return (
        <div className="space-y-4">
        <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
            <div>
                <div className="text-sm uppercase tracking-wide text-black/60">Photo recall</div>
                <div className="mt-1 text-lg font-semibold">{statusText}</div>
            </div>

            <button
                onClick={snapAndIdentify}
                disabled={!canSnap}
                className="rounded-2xl bg-black/10 px-5 py-3 text-lg font-semibold text-black/80 hover:bg-black/15 disabled:opacity-50"
            >
                {busy ? "Identifying…" : "Capture"}
            </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-black/[0.02]">
            <video ref={videoRef} className="w-full" playsInline muted />
            </div>

            {err ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
                {err}
            </div>
            ) : null}

            <p className="mt-4 text-sm text-black/60">
            Tip: Use the same reference photos from <span className="font-mono">data/images</span> for the most reliable match.
            </p>
        </div>

        {(lastSnapshot || lastResult) && (
            <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
                <div className="text-2xl font-semibold">Last capture</div>
                <button
                onClick={resetPreview}
                className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-lg text-black/70 hover:bg-black/[0.03]"
                >
                Clear
                </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="overflow-hidden rounded-2xl border border-black/10 bg-black/[0.02]">
                {lastSnapshot ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={lastSnapshot} alt="Captured frame" className="w-full" />
                ) : null}
                </div>

                <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5">
                <div className="text-sm uppercase tracking-wide text-black/60">Match</div>

                {lastResult ? (
                    <>
                    <div className="mt-2 text-2xl font-semibold">
                        {lastResult.memory_id === "unknown" ? "Unknown" : lastResult.memory_id}
                    </div>

                    <div className="mt-2 text-black/70">
                        Confidence: <span className="font-semibold">{lastResult.confidence}</span>
                        {typeof lastResult.distance === "number" ? (
                        <>
                            {" "}
                            • Distance: <span className="font-semibold">{lastResult.distance}</span>
                        </>
                        ) : null}
                    </div>

                    {lastResult.match_filename ? (
                        <div className="mt-1 text-sm text-black/60">
                        Matched: <span className="font-mono">{lastResult.match_filename}</span>
                        </div>
                    ) : null}

                    {lastResult.memory_id !== "unknown" ? (
                        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                        We can now query Moorcheh with{" "}
                        <span className="font-mono">#file:{lastResult.memory_id}</span>.
                        </div>
                    ) : (
                        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                        No confident match. Try better lighting or a closer angle.
                        </div>
                    )}
                    </>
                ) : (
                    <div className="mt-2 text-black/60">No result yet.</div>
                )}
                </div>
            </div>
            </div>
        )}

        {/* hidden canvas used for capture */}
        <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
