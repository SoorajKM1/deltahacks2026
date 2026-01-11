import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const VISION_URL = process.env.VISION_URL || "http://127.0.0.1:8001";

    try {
        const body = await req.json();

        const r = await fetch(`${VISION_URL}/identify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        });

        const text = await r.text();

        return new NextResponse(text || "", {
        status: r.status,
        headers: {
            "Content-Type": r.headers.get("content-type") || "application/json",
        },
        });
    } catch (e: any) {
        console.error("Vision proxy error:", e);
        return NextResponse.json(
        { error: String(e), VISION_URL },
        { status: 500 }
        );
    }
}
