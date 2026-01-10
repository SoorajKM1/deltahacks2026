export default function NeuroVaultShell({
    children,
    status,
    }: {
    children: React.ReactNode;
    status: "idle" | "listening" | "thinking";
    }) {
    const statusText =
        status === "thinking" ? "Checking…" : status === "listening" ? "Listening" : "Ready";

    return (
        <main className="min-h-screen bg-black/[0.03] px-6 py-10 flex items-center justify-center">
        <div className="w-full max-w-2xl">
            <div className="bg-white rounded-3xl border border-black/10 shadow-sm p-10 relative">
            <div className="absolute top-6 right-6">
                <span className="inline-flex items-center rounded-full border border-black/10 px-4 py-2 text-lg text-black/70">
                {statusText}
                </span>
            </div>

            {children}
            </div>

            <div className="mt-4 text-center text-sm text-black/50">
            NeuroVault helps only when you ask.
            </div>
        </div>
        </main>
    );
}
