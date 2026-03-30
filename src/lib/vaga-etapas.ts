export const VAGA_ETAPA_TIPOS = [
  "TRIAGEM",
  "ENTREVISTA",
  "TESTE_TECNICO",
  "DINAMICA",
  "ENTREVISTA_GESTOR",
  "OFERTA",
  "ADMISSAO",
  "OUTRO",
] as const;

export type VagaEtapaTipo = (typeof VAGA_ETAPA_TIPOS)[number];

export type EtapaFormInput = {
  nome: string;
  tipo: VagaEtapaTipo;
  obrigatoria: boolean;
};

export const ETAPA_TIPO_LABEL: Record<VagaEtapaTipo, string> = {
  TRIAGEM: "Triagem IA",
  ENTREVISTA: "Entrevista",
  TESTE_TECNICO: "Teste técnico",
  DINAMICA: "Dinâmica",
  ENTREVISTA_GESTOR: "Entrevista com gestor",
  OFERTA: "Oferta",
  ADMISSAO: "Admissão",
  OUTRO: "Outro",
};

export const ETAPA_STATUS_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluída",
  REPROVADO: "Reprovada",
  DISPENSADO: "Dispensada",
};

export function getDefaultEtapas(): EtapaFormInput[] {
  return [
    {
      nome: "Triagem IA",
      tipo: "TRIAGEM",
      obrigatoria: true,
    },
    {
      nome: "Entrevista RH",
      tipo: "ENTREVISTA",
      obrigatoria: true,
    },
  ];
}

export function normalizeEtapasInput(value: unknown): EtapaFormInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    return getDefaultEtapas();
  }

  const etapas = value
    .map((item) => {
      const etapa = item as Partial<EtapaFormInput> | null;
      const nome = etapa?.nome?.trim();
      const tipo = etapa?.tipo;

      if (!nome || !tipo || !VAGA_ETAPA_TIPOS.includes(tipo)) {
        return null;
      }

      return {
        nome,
        tipo,
        obrigatoria: etapa.obrigatoria ?? true,
      } satisfies EtapaFormInput;
    })
    .filter((item): item is EtapaFormInput => item !== null);

  if (etapas.length === 0) {
    return getDefaultEtapas();
  }

  if (etapas[0].tipo !== "TRIAGEM") {
    throw new Error("A primeira etapa da vaga deve ser a triagem.");
  }

  return etapas;
}
