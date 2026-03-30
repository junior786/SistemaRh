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

  if (jobTypeOk) score += 20;
  if (areaOk) score += 20;

  if (reqObrigTotal > 0) {
    score += (reqObrigMatch / reqObrigTotal) * 40;
  }

  if (reqDesejTotal > 0) {
    score += (reqDesejMatch / reqDesejTotal) * 10;
  }

  let salarioOk: boolean | null = null;
  if (candidato.pretensaoSalarial && vaga.salarioMax) {
    salarioOk = candidato.pretensaoSalarial <= vaga.salarioMax * 1.1;
    if (salarioOk) score += 5;
  }

  let localOk: boolean | null = null;
  if (candidato.cep && vaga.cep) {
    const prefixoCand = candidato.cep.replace(/\D/g, "").slice(0, 3);
    const prefixoVaga = vaga.cep.replace(/\D/g, "").slice(0, 3);
    localOk = prefixoCand.length === 3 && prefixoCand === prefixoVaga;
    if (localOk) score += 5;
  } else if (vaga.modalidade === "REMOTO") {
    localOk = true;
    score += 5;
  }

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
  };
}
