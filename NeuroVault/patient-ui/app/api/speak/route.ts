import { NextResponse } from 'next/server';
import { ElevenLabsClient } from "elevenlabs";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    const client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });

    // Using the ID you found earlier: 56AoDkrOh6qfVPDXZ7Pt
    const audioStream = await client.textToSpeech.convert(
      "56AoDkrOh6qfVPDXZ7Pt", 
      {
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { 
            // ⬇️ DISTURBANCE FIX: High stability removes starting noise/stutter
            stability: 0.8, 
            similarity_boost: 0.85 
        },
      }
    );

    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    return new NextResponse(audioBuffer, {
      headers: { "Content-Type": "audio/mpeg" },
    });

  } catch (error) {
    return NextResponse.json({ error: "Speech failed" }, { status: 500 });
  }
}