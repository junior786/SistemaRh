// RF-02 / RN-02 — Extração de dados de PDF via OpenRouter
// Modelo: openai/gpt-4.1-nano (MODEL_EXTRACAO_PDF)
// Retorna JSON estruturado para revisão humana antes de salvar

import { chatCompletion, parseAIResponse } from "@/lib/openrouter";

export interface DadosExtraidosPDF {
  nome: string;
  email: string;
  telefone: string | null;
  cidade: string | null;
  resumo: string | null;
  pretensaoSalarial: number | null;
  skills: string[];
  experiencias: {
    empresa: string;
    cargo: string;
    descricao: string | null;
    dataInicio: string;
    dataFim: string | null;
    atual: boolean;
  }[];
  formacoes: {
    instituicao: string;
    curso: string;
    nivel: string;
    dataInicio: string;
    dataFim: string | null;
    atual: boolean;
  }[];
}

const SYSTEM_PROMPT = `Você é um extrator de dados de currículos. Analise o texto do PDF e retorne APENAS um JSON válido (sem markdown, sem blocos de código) com a seguinte estrutura:

{
  "nome": "string",
  "email": "string",
  "telefone": "string ou null",
  "cidade": "string ou null",
  "resumo": "string ou null (resumo profissional breve)",
  "pretensaoSalarial": "number ou null",
  "skills": ["string"],
  "experiencias": [
    {
      "empresa": "string",
      "cargo": "string",
      "descricao": "string ou null",
      "dataInicio": "YYYY-MM-DD",
      "dataFim": "YYYY-MM-DD ou null",
      "atual": true/false
    }
  ],
  "formacoes": [
    {
      "instituicao": "string",
      "curso": "string",
      "nivel": "TECNICO|GRADUACAO|POS_GRADUACAO|MBA|MESTRADO|DOUTORADO|CURSO_LIVRE",
      "dataInicio": "YYYY-MM-DD",
      "dataFim": "YYYY-MM-DD ou null",
      "atual": true/false
    }
  ]
}

Se uma informação não estiver disponível, use null. Para datas incompletas (apenas ano), use YYYY-01-01. Retorne SOMENTE o JSON.`;

export async function extrairDadosPDF(
  textoOuBase64: string,
): Promise<DadosExtraidosPDF> {
  const model = process.env.MODEL_EXTRACAO_PDF;
  if (!model) throw new Error("MODEL_EXTRACAO_PDF não configurada");

  const raw = await chatCompletion(model, [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Extraia os dados deste currículo:\n\n${textoOuBase64}`,
    },
  ]);

  return parseAIResponse<DadosExtraidosPDF>(raw);
}
