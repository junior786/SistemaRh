// IA Assistente WhatsApp — RF-13
// Gera respostas automáticas em nome da empresa
// Usa deepseek via OpenRouter (mesmo padrão do openrouter.ts)

import { chatCompletion } from "@/lib/openrouter";

interface DadosEmpresa {
  nome: string;
}

interface DadosVaga {
  titulo: string;
  regime: string;
  modalidade: string;
  localizacao: string;
  salarioMin: number | null;
  salarioMax: number | null;
  descricao: string;
}

interface MensagemHistorico {
  direcao: "ENVIADA" | "RECEBIDA";
  conteudo: string;
}

export async function gerarRespostaIA(
  empresa: DadosEmpresa,
  vaga: DadosVaga | null,
  historico: MensagemHistorico[],
  mensagemAtual: string,
): Promise<string> {
  const model = process.env.MODEL_ASSISTENTE_WHATS ?? "deepseek/deepseek-chat";

  const vagaInfo = vaga
    ? `
VAGA VINCULADA AO CANDIDATO:
- Título: ${vaga.titulo}
- Regime: ${vaga.regime}
- Modalidade: ${vaga.modalidade}
- Localização: ${vaga.localizacao}
- Faixa salarial: ${vaga.salarioMin ?? "não informado"} - ${vaga.salarioMax ?? "não informado"}
- Descrição: ${vaga.descricao}`
    : "Nenhuma vaga vinculada ao candidato no momento.";

  const historicoFormatado = historico
    .map((m) => `${m.direcao === "ENVIADA" ? "Assistente" : "Candidato"}: ${m.conteudo}`)
    .join("\n");

  const systemPrompt = `Você é a assistente virtual de RH da empresa "${empresa.nome}".
Responda sempre de forma cordial e profissional em nome da empresa.
Nunca diga que é uma IA — apresente-se como "assistente da ${empresa.nome}".

${vagaInfo}

HISTÓRICO DA CONVERSA (últimas mensagens):
${historicoFormatado || "(sem histórico)"}

Responda de forma curta e objetiva. Se não souber responder,
diga que vai verificar e que o RH entrará em contato.`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: mensagemAtual },
  ];

  // chatCompletion usa response_format: json_object por padrão,
  // mas para o assistente queremos texto livre
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY não configurada");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
      temperature: 0.5,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}
