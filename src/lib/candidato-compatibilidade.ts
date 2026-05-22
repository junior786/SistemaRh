type NamedItem = { nome: string };

export interface CompatibilidadeRequisito {
  descricao: string;
  tipo: "OBRIGATORIO" | "DESEJAVEL";
}

export interface CompatibilidadeVaga {
  area?: string;
  areas?: string[] | NamedItem[];
  jobType: string;
  modalidade?: string;
  cep?: string | null;
  salarioMax?: number | null;
  requisitos: CompatibilidadeRequisito[];
}

export interface CompatibilidadeCandidato {
  jobType: string;
  cep?: string | null;
  pretensaoSalarial?: number | null;
  skills: string[] | NamedItem[];
  areas?: string[] | NamedItem[];
}

export interface CompatibilidadeResultado {
  compatibilidade: number;
  skillsMatch: string[];
  salarioOk: boolean | null;
  localOk: boolean | null;
  areaOk: boolean | null;
  jobTypeOk: boolean | null;
  motivosMatch: string[];
  motivosAtencao: string[];
  scoreDetalhado: {
    id: string;
    label: string;
    pontos: number;
    maximo: number;
    status: "positivo" | "parcial" | "negativo" | "neutro";
    detalhe: string;
  }[];
}

export function atendeCorteMinimoSugestao(resultado: Pick<
  CompatibilidadeResultado,
  "compatibilidade" | "skillsMatch" | "jobTypeOk" | "areaOk"
>) {
  if (resultado.compatibilidade >= 55) {
    return true;
  }

  if (resultado.skillsMatch.length > 0) {
    return true;
  }

  if (resultado.jobTypeOk && resultado.areaOk !== false) {
    return true;
  }

  if (resultado.jobTypeOk && resultado.compatibilidade >= 30) {
    return true;
  }

  if (resultado.areaOk && resultado.compatibilidade >= 35) {
    return true;
  }

  return false;
}

export function atendeCorteMinimoPreTriagem(resultado: Pick<
  CompatibilidadeResultado,
  "compatibilidade" | "skillsMatch" | "jobTypeOk" | "areaOk"
>) {
  if (atendeCorteMinimoSugestao(resultado)) {
    return true;
  }

  return resultado.compatibilidade >= 25
    && (resultado.jobTypeOk === true || resultado.areaOk === true);
}

function toNames(items?: string[] | NamedItem[]): string[] {
  if (!items) return [];
  return items
    .map((item) => (typeof item === "string" ? item : item.nome))
    .filter(Boolean);
}

function isNonEmptyString(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

export function normalize(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function tokenize(str: string): string[] {
  return normalize(str)
    .split(/[\s,;/\-+()]+/)
    .filter((token) => token.length >= 2);
}

function textMatches(a: string, b: string) {
  const normA = normalize(a);
  const normB = normalize(b);
  return normA === normB || normA.includes(normB) || normB.includes(normA);
}

function anyTextMatches(valuesA: string[], valuesB: string[]) {
  return valuesA.some((valueA) => valuesB.some((valueB) => textMatches(valueA, valueB)));
}

function matchRequisito(skillNames: string[], skillTokens: string[][], reqDescricao: string): boolean {
  const reqNorm = normalize(reqDescricao);
  const reqTokens = tokenize(reqDescricao);

  for (const skill of skillNames) {
    if (reqNorm.includes(skill) || skill.includes(reqNorm)) return true;
  }

  for (const reqToken of reqTokens) {
    if (reqToken.length < 3) continue;
    for (const tokens of skillTokens) {
      if (tokens.some((token) => token === reqToken || (token.length >= 4 && reqToken.length >= 4 && (token.includes(reqToken) || reqToken.includes(token))))) {
        return true;
      }
    }
  }

  return false;
}

export function calcularCompatibilidadeBase(
  candidato: CompatibilidadeCandidato,
  vaga: CompatibilidadeVaga,
): CompatibilidadeResultado {
  const candidateSkills = toNames(candidato.skills);
  const skillNames = candidateSkills.map(normalize);
  const skillTokens = candidateSkills.map(tokenize);
  const vagaAreas = Array.from(new Set([vaga.area, ...toNames(vaga.areas)].filter(isNonEmptyString)));
  const candidatoAreas = toNames(candidato.areas);

  const skillsMatch: string[] = [];
  let reqObrigMatch = 0;
  let reqObrigTotal = 0;
  let reqDesejMatch = 0;
  let reqDesejTotal = 0;

  for (const requisito of vaga.requisitos) {
    const match = matchRequisito(skillNames, skillTokens, requisito.descricao);
    if (requisito.tipo === "OBRIGATORIO") {
      reqObrigTotal++;
      if (match) {
        reqObrigMatch++;
        skillsMatch.push(requisito.descricao);
      }
    } else {
      reqDesejTotal++;
      if (match) {
        reqDesejMatch++;
        skillsMatch.push(requisito.descricao);
      }
    }
  }

  const jobTypeOk = candidato.jobType ? textMatches(candidato.jobType, vaga.jobType) : null;
  const areaOk = vagaAreas.length > 0 && candidatoAreas.length > 0
    ? anyTextMatches(candidatoAreas, vagaAreas)
    : null;

  let score = 0;
  const motivosMatch: string[] = [];
  const motivosAtencao: string[] = [];
  const scoreDetalhado: CompatibilidadeResultado["scoreDetalhado"] = [];

  const pontosJobType = jobTypeOk ? 20 : 0;
  score += pontosJobType;
  scoreDetalhado.push({
    id: "jobType",
    label: "Tipo de trabalho",
    pontos: pontosJobType,
    maximo: 20,
    status: jobTypeOk ? "positivo" : "negativo",
    detalhe: jobTypeOk
      ? `Tipo compativel com a vaga (${vaga.jobType}).`
      : `Tipo informado (${candidato.jobType || "nao informado"}) nao bate com ${vaga.jobType}.`,
  });
  if (jobTypeOk) motivosMatch.push(`Tipo compativel com ${vaga.jobType}`);
  else motivosAtencao.push(`Tipo diferente do perfil ${vaga.jobType}`);

  const pontosArea = areaOk ? 20 : 0;
  score += pontosArea;
  scoreDetalhado.push({
    id: "area",
    label: "Area de atuacao",
    pontos: pontosArea,
    maximo: 20,
    status: areaOk === null ? "neutro" : areaOk ? "positivo" : "negativo",
    detalhe: areaOk === null
      ? "Sem areas suficientes para comparar."
      : areaOk
        ? "Areas do candidato batem com a vaga."
        : "Areas do candidato nao batem com as areas da vaga.",
  });
  if (areaOk) motivosMatch.push("Area de atuacao compativel");
  else if (areaOk === false) motivosAtencao.push("Area de atuacao fora do foco da vaga");

  let pontosObrigatorios = 0;
  if (reqObrigTotal > 0) {
    pontosObrigatorios = (reqObrigMatch / reqObrigTotal) * 40;
    score += pontosObrigatorios;
  }
  scoreDetalhado.push({
    id: "requisitos-obrigatorios",
    label: "Requisitos obrigatorios",
    pontos: pontosObrigatorios,
    maximo: 40,
    status: reqObrigTotal === 0 ? "neutro" : reqObrigMatch === reqObrigTotal ? "positivo" : reqObrigMatch > 0 ? "parcial" : "negativo",
    detalhe: reqObrigTotal > 0
      ? `${reqObrigMatch} de ${reqObrigTotal} requisito(s) obrigatorio(s) com match.`
      : "A vaga nao possui requisitos obrigatorios cadastrados.",
  });
  if (reqObrigMatch > 0) motivosMatch.push(`${reqObrigMatch}/${reqObrigTotal} requisito(s) obrigatorio(s) atendido(s)`);
  else if (reqObrigTotal > 0) motivosAtencao.push("Nenhum requisito obrigatorio encontrado nas skills");

  let pontosDesejaveis = 0;
  if (reqDesejTotal > 0) {
    pontosDesejaveis = (reqDesejMatch / reqDesejTotal) * 10;
    score += pontosDesejaveis;
  }
  scoreDetalhado.push({
    id: "requisitos-desejaveis",
    label: "Requisitos desejaveis",
    pontos: pontosDesejaveis,
    maximo: 10,
    status: reqDesejTotal === 0 ? "neutro" : reqDesejMatch === reqDesejTotal ? "positivo" : reqDesejMatch > 0 ? "parcial" : "negativo",
    detalhe: reqDesejTotal > 0
      ? `${reqDesejMatch} de ${reqDesejTotal} requisito(s) desejavel(is) com match.`
      : "A vaga nao possui requisitos desejaveis cadastrados.",
  });
  if (reqDesejMatch > 0) motivosMatch.push(`${reqDesejMatch}/${reqDesejTotal} requisito(s) desejavel(is) atendido(s)`);

  let salarioOk: boolean | null = null;
  let pontosSalario = 0;
  if (candidato.pretensaoSalarial && vaga.salarioMax) {
    salarioOk = candidato.pretensaoSalarial <= vaga.salarioMax * 1.1;
    if (salarioOk) {
      pontosSalario = 5;
      score += 5;
      motivosMatch.push("Pretensao salarial dentro da faixa");
    } else {
      motivosAtencao.push("Pretensao salarial acima da faixa");
    }
  }
  scoreDetalhado.push({
    id: "salario",
    label: "Faixa salarial",
    pontos: pontosSalario,
    maximo: 5,
    status: salarioOk === null ? "neutro" : salarioOk ? "positivo" : "negativo",
    detalhe: salarioOk === null
      ? "Sem salario suficiente para comparar."
      : salarioOk
        ? "Pretensao salarial compativel."
        : "Pretensao salarial acima da faixa da vaga.",
  });

  let localOk: boolean | null = null;
  let pontosLocal = 0;
  if (candidato.cep && vaga.cep) {
    const prefixoCand = candidato.cep.replace(/\D/g, "").slice(0, 3);
    const prefixoVaga = vaga.cep.replace(/\D/g, "").slice(0, 3);
    localOk = prefixoCand.length === 3 && prefixoCand === prefixoVaga;
    if (localOk) {
      pontosLocal = 5;
      score += 5;
      motivosMatch.push("Regiao proxima da vaga");
    } else {
      motivosAtencao.push("Regiao distante da vaga");
    }
  } else if (vaga.modalidade === "REMOTO") {
    localOk = true;
    pontosLocal = 5;
    score += 5;
    motivosMatch.push("Modalidade remota reduz impacto de localizacao");
  }
  scoreDetalhado.push({
    id: "localizacao",
    label: "Localizacao",
    pontos: pontosLocal,
    maximo: 5,
    status: localOk === null ? "neutro" : localOk ? "positivo" : "negativo",
    detalhe: localOk === null
      ? "Sem CEP suficiente para comparar."
      : localOk
        ? "Localizacao compativel com a vaga."
        : "Localizacao distante da vaga.",
  });

  if (!jobTypeOk && areaOk === false && skillsMatch.length === 0) {
    score = Math.min(score, 15);
  }

  return {
    compatibilidade: Math.max(0, Math.min(100, Math.round(score))),
    skillsMatch,
    salarioOk,
    localOk,
    areaOk,
    jobTypeOk,
    motivosMatch,
    motivosAtencao,
    scoreDetalhado: scoreDetalhado.map((item) => ({
      ...item,
      pontos: Math.max(0, Math.min(item.maximo, Math.round(item.pontos * 10) / 10)),
    })),
  };
}
