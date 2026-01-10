import { buildApiRequestBody, getApiEndpoint, getApiHeaders } from "@/lib/api-config";

type ChatMsg = { role: string; content: string };

export async function askNeuroVault(query: string, chatHistory: ChatMsg[] = []) {
  const body = buildApiRequestBody(query, chatHistory);

  const res = await fetch(getApiEndpoint(), {
    method: "POST",
    headers: getApiHeaders(),
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || "Moorcheh request failed");
  }

  // Boilerplates differ in response shape so we normalize a few common ones
  return (
    data?.answer ||
    data?.output ||
    data?.response ||
    data?.choices?.[0]?.message?.content ||
    ""
  );
}
