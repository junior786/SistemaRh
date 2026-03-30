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
  areas: string[];
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
  areas: string[];
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

const SYSTEM_PROMPT = `Voce e um analista de RH especializado em triagem de candidatos. Analise a compatibilidade entre o candidato e a vaga.

REGRAS DE SCORING:
- Se o tipo de trabalho da vaga e do candidato sao claramente incompativeis, o score maximo e 10.
- Se as areas de atuacao sao completamente diferentes, isso deve pesar negativamente mesmo que existam skills parecidas.
- Requisitos obrigatorios tem peso eliminatorio. Se o candidato nao atende qualquer requisito obrigatorio, o score maximo e 50.
- Requisitos desejaveis distribuem pontos proporcionalmente no restante.
- Use as experiencias profissionais com tempo calculado como fator principal.
- Restricoes do candidato devem ser consideradas como contexto pratico.
- Score final: 0 a 100, inteiro.

Retorne APENAS um JSON valido:
{
  "score": 0,
  "analise": "Texto com pontos fortes e pontos de atencao do candidato para esta vaga",
  "checklist": [
    {
      "requisito": "descricao do requisito",
      "tipo": "OBRIGATORIO",
      "atende": true,
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
  if (!model) throw new Error("MODEL_ANALISE_VAGA nao configurada");

  const prompt = `## VAGA
Titulo: ${vaga.titulo}
Area principal: ${vaga.area}
Areas de atuacao: ${vaga.areas.join(", ") || "Nao informadas"}
Tipo de Trabalho: ${vaga.jobType}
Regime: ${vaga.regime}
Descricao: ${vaga.descricao}

### Requisitos
${vaga.requisitos.map((requisito) => {
    let linha = `- [${requisito.tipo}] ${requisito.descricao}`;
    if (requisito.tempoMeses) {
      const anos = Math.floor(requisito.tempoMeses / 12);
      const meses = requisito.tempoMeses % 12;
      const tempo = anos > 0
        ? meses > 0
          ? `${anos} ano(s) e ${meses} mes(es)`
          : `${anos} ano(s)`
        : `${meses} mes(es)`;
      linha += ` (minimo ${tempo} de experiencia)`;
    }
    return linha;
  }).join("\n")}

## CANDIDATO
Nome: ${candidato.nome}
${candidato.genero ? `Genero: ${candidato.genero}` : ""}
Tipo de Trabalho Pretendido: ${candidato.jobType}
Areas de atuacao: ${candidato.areas.join(", ") || "Nao informadas"}
Resumo: ${candidato.resumo || "Nao informado"}
Skills: ${candidato.skills.join(", ") || "Nenhuma informada"}
${candidato.restricoes.length > 0 ? `\nRestricoes / Informacoes relevantes:\n${candidato.restricoes.map((restricao) => `- ${restricao}`).join("\n")}` : ""}

### Experiencias profissionais
${candidato.experiencias.length > 0
    ? candidato.experiencias
        .map((experiencia) => `- ${experiencia.cargo} na ${experiencia.empresa} (${experiencia.tempoFormatado})${experiencia.descricao ? `: ${experiencia.descricao}` : ""}`)
        .join("\n")
    : "Nenhuma experiencia cadastrada"}

### Formacao academica
${candidato.formacoes.length > 0
    ? candidato.formacoes
        .map((formacao) => `- ${formacao.nivel}: ${formacao.curso} - ${formacao.instituicao}`)
        .join("\n")
    : "Nenhuma formacao cadastrada"}`;

  const raw = await chatCompletion(model, [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ]);

  return parseAIResponse<ResultadoAnalise>(raw);
}

export { formatarTempoExperiencia };
