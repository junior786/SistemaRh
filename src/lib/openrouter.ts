// Configuração do cliente OpenRouter
// Toda comunicação com IA passa por aqui (RNF-06)
// Chaves e chamadas sempre server-side — nunca expostas ao cliente

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterResponse {
  choices: { message: { content: string } }[];
}

export async function chatCompletion(
  model: string,
  messages: ChatMessage[],
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY não configurada");

  const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "RH Selector",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error (${res.status}): ${err}`);
  }

  const data = (await res.json()) as OpenRouterResponse;
  return data.choices[0].message.content;
}

// RN-05: parse JSON seguro — trata erros de parsing antes de persistir
export function parseAIResponse<T>(raw: string): T {
  // Remove possíveis blocos de código markdown que a IA possa retornar
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(cleaned) as T;
}
