import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// --- CONFIGURATION ---
// 1. Gemini Configuration (The Brain)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// 2. Moorcheh Configuration (The Memory)
// This MUST match the namespace name in your Python script
const NAMESPACE = "grandpa_joe_FINAL";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    // Get the user's last question
    const lastUserMessage = messages[messages.length - 1].content;
    console.log(`🧠 Searching Moorcheh for: "${lastUserMessage}"`);

    // --- STEP A: RETRIEVE MEMORY (Moorcheh) ---
    // We search your specific namespace for context
    const searchResponse = await fetch("https://api.moorcheh.ai/v2/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.NEXT_PUBLIC_MOORCHEH_API_KEY || ""
      },
      body: JSON.stringify({
        namespace: NAMESPACE,
        query: lastUserMessage,
        limit: 3 // Get top 3 most relevant memories
      })
    });

    const searchData = await searchResponse.json();
    
    // Combine the found text segments into one block
    let contextText = "";
    if (searchData.documents) {
      contextText = searchData.documents.map((doc: any) => doc.text).join("\n\n");
      console.log("✅ Context Found");
    } else {
      console.log("⚠️ No context found.");
    }

    // --- STEP B: GENERATE ANSWER (Gemini) ---
    const systemPrompt = `
      ROLE: You are "NeuroVault," a compassionate dementia care assistant.
      
      RETRIEVED MEMORY:
      ${contextText}
      
      USER QUESTION:
      ${lastUserMessage}
      
      INSTRUCTIONS:
      1. Answer using ONLY the provided MEMORY.
      2. If the answer isn't in the memory, say "I'm not sure, let's call Sarah."
      3. Keep the answer under 20 words.
      4. Speak slowly and clearly.
    `;

    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text();

    return new NextResponse(responseText);

  } catch (error) {
    console.error("❌ Error in Chat Route:", error);
    return new NextResponse("I am having trouble thinking right now.", { status: 500 });
  }
}