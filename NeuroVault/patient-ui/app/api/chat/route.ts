import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const NAMESPACE = "grandpa_joe_FINAL";
const MOORCHEH_SEARCH_URL = "https://api.moorcheh.ai/v2/search";

function extractFileId(q: string) {
  const m = q.trim().match(/^#file:(.+)$/i);
  return m ? m[1].trim() : null;
}

function safeJsonParse(raw: string) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function buildContextFromResults(results: any[]) {
  return results
    .map((r) => r?.text)
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

// Super simple non-LLM fallback so demo never dies
function fallbackAnswerFromContext(contextText: string) {
  if (!contextText) return "I’m not sure. Let’s call Sarah.";

  // Keep it short, like your prompt wanted
  const words = contextText.replace(/\s+/g, " ").split(" ").slice(0, 18);
  return `${words.join(" ")}…`;
}

async function moorchehFetch(body: any) {
  const apiKey =
    process.env.MOORCHEH_API_KEY ||
    process.env.NEXT_PUBLIC_MOORCHEH_API_KEY ||
    "";

  if (!apiKey) {
    return {
      ok: false,
      status: 500,
      raw: `{"message":"Missing MOORCHEH_API_KEY env var"}`,
    };
  }

  const res = await fetch(MOORCHEH_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  return { ok: res.ok, status: res.status, raw };
}

async function moorchehSearchByFileId(fileId: string) {
  // Use a single-space query so some backends skip embedding
  // If Moorcheh still tries to embed and Bedrock is down, we will fallback gracefully.
  return moorchehFetch({
    namespace: NAMESPACE,
    query: " ",
    limit: 3,
    metadata_filter: { file: fileId },
  });
}

async function moorchehSemanticSearch(query: string) {
  return moorchehFetch({
    namespace: NAMESPACE,
    query,
    limit: 3,
  });
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const messages = Array.isArray(payload?.messages) ? payload.messages : [];
    const lastUserMessage = messages[messages.length - 1]?.content || "";

    console.log(`🧠 Searching Moorcheh for: "${lastUserMessage}"`);

    const fileId = extractFileId(lastUserMessage);

    // 1) Retrieve memory
    const search = fileId
      ? await moorchehSearchByFileId(fileId)
      : await moorchehSemanticSearch(lastUserMessage);

    console.log("Moorcheh status:", search.status);
    console.log("Moorcheh raw:", (search.raw || "").slice(0, 800));

    // If Moorcheh fails, do not 500 your UI
    if (!search.ok) {
      return new NextResponse(
        "I’m having trouble accessing memory right now. Please try again or ask the caregiver to re-sync.",
        { status: 200 }
      );
    }

    const data = safeJsonParse(search.raw);
    const results = Array.isArray(data?.results) ? data.results : [];
    const contextText = buildContextFromResults(results);

    console.log("Moorcheh results count:", results.length);
    console.log("Context length:", contextText.length);
    console.log("Context preview:", contextText.slice(0, 200));

    // 2) Generate answer (Gemini if available, else fallback)
    const googleKey = process.env.GOOGLE_API_KEY || "";
    if (!googleKey) {
      return new NextResponse(fallbackAnswerFromContext(contextText), { status: 200 });
    }

    try {
      const genAI = new GoogleGenerativeAI(googleKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
`.trim();

      const result = await model.generateContent(systemPrompt);
      const responseText = result.response.text();

      return new NextResponse(responseText, { status: 200 });
    } catch (e) {
      console.log("Gemini failed, using fallback:", e);
      return new NextResponse(fallbackAnswerFromContext(contextText), { status: 200 });
    }
  } catch (error) {
    console.error("❌ Error in Chat Route:", error);
    return new NextResponse("I’m having trouble thinking right now.", { status: 200 });
  }
}
