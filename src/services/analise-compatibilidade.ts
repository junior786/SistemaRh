// RF-03 / RN-01 — Motor de compatibilidade via OpenRouter
// Modelo: deepseek/deepseek-chat (MODEL_ANALISE_VAGA)
// Score de 0-100, justificativa, checklist de requisitos

import { chatCompletion, parseAIResponse } from "@/lib/openrouter";

export interface ChecklistItem {
  requisito: string;
  tipo: "OBRIGATORIO" | "DESEJAVEL";
  atende: boolean;
  observacao: string;
}

export interface ResultadoAnalise {
  score: number;
  analise: string;
  checklist: ChecklistItem[];
}

interface DadosVaga {
  titulo: string;
  area: string;
  jobType: string;
  regime: string;
  descricao: string;
  requisitos: { descricao: string; tipo: "OBRIGATORIO" | "DESEJAVEL"; tempoMeses?: number | null }[];
}

interface DadosCandidato {
  nome: string;
  resumo: string | null;
  genero: string | null;
  jobType: string;
  skills: string[];
  restricoes: string[];
  experiencias: {
    empresa: string;
    cargo: string;
    descricao: string | null;
    tempoFormatado: string;
  }[];
  formacoes: {
    instituicao: string;
    curso: string;
    nivel: string;
  }[];
}

const SYSTEM_PROMPT = `Você é um analista de RH especializado em triagem de candidatos. Analise a compatibilidade entre o candidato e a vaga.

REGRAS DE SCORING (RN-01):
- REGRA PRINCIPAL: Se o Tipo de Trabalho da vaga e do candidato são INCOMPATÍVEIS (ex: vaga de Doméstica e candidato Desenvolvedor, ou vaga de Motorista e candidato Enfermeiro), o score MÁXIMO é 10%. Perfis de áreas completamente diferentes NÃO são compatíveis, independente de skills ou experiência.
- Requisitos OBRIGATÓRIOS têm peso eliminatório. Se o candidato NÃO atende QUALQUER requisito obrigatório, o score MÁXIMO é 50%.
- Requisitos DESEJÁVEIS distribuem pontos proporcionalmente no restante.
- Use as experiências profissionais com tempo calculado como fator principal.
- RESTRIÇÕES do candidato (ex: filhos, falta de CNH, disponibilidade limitada) devem ser consideradas como contexto para avaliar compatibilidade prática com a vaga.
- Score final: 0 a 100 (inteiro).

Retorne APENAS um JSON válido (sem markdown, sem blocos de código):

{
  "score": 0-100,
  "analise": "Texto com pontos fortes e pontos de atenção do candidato para esta vaga",
  "checklist": [
    {
      "requisito": "descrição do requisito",
      "tipo": "OBRIGATORIO ou DESEJAVEL",
      "atende": true/false,
      "observacao": "justificativa breve"
    }
  ]
}`;

function formatarTempoExperiencia(dataInicio: string, dataFim: string | null): string {
  const inicio = new Date(dataInicio);
  const fim = dataFim ? new Date(dataFim) : new Date();
  const meses = (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth());
  const anos = Math.floor(meses / 12);
  const mesesRestantes = meses % 12;

  if (anos === 0) return `${mesesRestantes} meses`;
  if (mesesRestantes === 0) return `${anos} ano${anos > 1 ? "s" : ""}`;
  return `${anos} ano${anos > 1 ? "s" : ""} e ${mesesRestantes} meses`;
}

export async function analisarCompatibilidade(
  vaga: DadosVaga,
  candidato: DadosCandidato,
): Promise<ResultadoAnalise> {
  const model = process.env.MODEL_ANALISE_VAGA;
  if (!model) throw new Error("MODEL_ANALISE_VAGA não configurada");

  const experienciasFormatadas = candidato.experiencias.map((e) => ({
    ...e,
    tempoFormatado: e.tempoFormatado,
  }));

  const prompt = `## VAGA
Título: ${vaga.titulo}
Área: ${vaga.area}
Tipo de Trabalho: ${vaga.jobType}
Regime: ${vaga.regime}
Descrição: ${vaga.descricao}

### Requisitos:
${vaga.requisitos.map((r) => {
    let line = `- [${r.tipo}] ${r.descricao}`;
    if (r.tempoMeses) {
      const anos = Math.floor(r.tempoMeses / 12);
      const meses = r.tempoMeses % 12;
      const tempo = anos > 0 ? (meses > 0 ? `${anos} ano(s) e ${meses} mês(es)` : `${anos} ano(s)`) : `${meses} mês(es)`;
      line += ` (mínimo ${tempo} de experiência)`;
    }
    return line;
  }).join("\n")}

## CANDIDATO
Nome: ${candidato.nome}
${candidato.genero ? `Gênero: ${candidato.genero}` : ""}
Tipo de Trabalho Pretendido: ${candidato.jobType}
Resumo: ${candidato.resumo || "Não informado"}
Skills: ${candidato.skills.join(", ") || "Nenhuma informada"}
${candidato.restricoes.length > 0 ? `\nRestrições / Informações relevantes:\n${candidato.restricoes.map((r) => `- ${r}`).join("\n")}` : ""}

### Experiências profissionais:
${
  experienciasFormatadas.length > 0
    ? experienciasFormatadas
        .map(
          (e) =>
            `- ${e.cargo} na ${e.empresa} (${e.tempoFormatado})${e.descricao ? `: ${e.descricao}` : ""}`,
        )
        .join("\n")
    : "Nenhuma experiência cadastrada"
}

### Formação acadêmica:
${
  candidato.formacoes.length > 0
    ? candidato.formacoes
        .map((f) => `- ${f.nivel}: ${f.curso} — ${f.instituicao}`)
        .join("\n")
    : "Nenhuma formação cadastrada"
}`;

  const raw = await chatCompletion(model, [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ]);

  return parseAIResponse<ResultadoAnalise>(raw);
}

export { formatarTempoExperiencia };
