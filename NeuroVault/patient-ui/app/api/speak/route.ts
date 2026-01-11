import { NextResponse } from 'next/server';
import { ElevenLabsClient } from "elevenlabs";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    const client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });
    
    const finalText = text; 

    const audioStream = await client.textToSpeech.convert(
      "56AoDkrOh6qfVPDXZ7Pt", 
      {
        text: finalText,
        model_id: "eleven_turbo_v2_5", 
        voice_settings: { 
            stability: 0.3, 
            similarity_boost: 0.8 
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