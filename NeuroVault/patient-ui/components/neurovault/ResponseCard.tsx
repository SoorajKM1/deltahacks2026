export default function ResponseCard({ answer }: { answer: string }) {
    if (!answer) return null;

    return (
        <section className="rounded-2xl border border-black/10 bg-black/[0.02] p-7">
        <div className="text-sm uppercase tracking-wide text-black/60">NeuroVault says</div>
        <div className="mt-3 text-3xl leading-snug text-black">{answer}</div>
        </section>
    );
}
