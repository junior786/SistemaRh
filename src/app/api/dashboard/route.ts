import { prisma } from "@/lib/prisma";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", { month: "short" });
}

function buildMonthSeries(monthsBack: number) {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);

  return Array.from({ length: monthsBack }, (_, index) => {
    const date = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - (monthsBack - index - 1), 1);
    return {
      key: monthKey(date),
      label: monthLabel(date),
      vagas: 0,
      candidatos: 0,
      triagens: 0,
    };
  });
}

// GET /api/dashboard
export async function GET() {
  const [
    vagasStatus,
    totalCandidatos,
    candidatosDisponiveis,
    candidatosContratados,
    analisesConcluidas,
    triagensPendentes,
    triagensProcessando,
    triagensConcluidas,
    scoreAggregate,
    vagasRecentes,
    candidatosRecentes,
    triagensRecentes,
    vagasDestaque,
    atividadesRecentes,
    etapasParaFunil,
  ] = await Promise.all([
    prisma.vaga.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.candidato.count(),
    prisma.candidato.count({ where: { statusEmprego: "DISPONIVEL" } }),
    prisma.candidato.count({ where: { statusEmprego: "EMPREGADO" } }),
    prisma.triagem.count({ where: { status: "CONCLUIDO" } }),
    prisma.triagem.count({ where: { status: "PENDENTE" } }),
    prisma.triagem.count({ where: { status: "PROCESSANDO" } }),
    prisma.triagem.count({ where: { status: "CONCLUIDO" } }),
    prisma.triagem.aggregate({
      _avg: { score: true },
      where: { score: { not: null } },
    }),
    prisma.vaga.findMany({
      select: { createdAt: true },
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1),
        },
      },
    }),
    prisma.candidato.findMany({
      select: { createdAt: true },
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1),
        },
      },
    }),
    prisma.triagem.findMany({
      select: { createdAt: true },
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1),
        },
      },
    }),
    prisma.vaga.findMany({
      include: {
        _count: { select: { triagens: true, empregados: true } },
        triagens: {
          where: { status: "CONCLUIDO" },
          orderBy: { score: "desc" },
          take: 1,
          select: { score: true },
        },
      },
      orderBy: [
        { status: "asc" },
        { createdAt: "desc" },
      ],
      take: 8,
    }),
    prisma.triagemEvento.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        tipo: true,
        descricao: true,
        origem: true,
        createdAt: true,
        vagaId: true,
        vagaTitulo: true,
        candidatoId: true,
        candidatoNome: true,
      },
    }),
    // Etapas para métricas de funil (conversão + tempo médio)
    prisma.triagemEtapa.findMany({
      where: {
        status: { in: ["CONCLUIDO", "REPROVADO", "DISPENSADO", "EM_ANDAMENTO"] },
      },
      select: {
        status: true,
        iniciadaEm: true,
        concluidaEm: true,
        vagaEtapa: {
          select: { nome: true, ordem: true },
        },
      },
    }),
  ]);

  const statusCountMap = vagasStatus.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = item._count.status;
    return acc;
  }, {});

  const vagasAbertas = statusCountMap.ABERTA ?? 0;
  const vagasEmRevisao = statusCountMap.EM_REVISAO ?? 0;
  const vagasFechadas = statusCountMap.FECHADA ?? 0;

  const seriesMensal = buildMonthSeries(6);
  const seriesMap = new Map(seriesMensal.map((item) => [item.key, item]));

  vagasRecentes.forEach((vaga) => {
    const item = seriesMap.get(monthKey(vaga.createdAt));
    if (item) item.vagas += 1;
  });

  candidatosRecentes.forEach((candidato) => {
    const item = seriesMap.get(monthKey(candidato.createdAt));
    if (item) item.candidatos += 1;
  });

  triagensRecentes.forEach((triagem) => {
    const item = seriesMap.get(monthKey(triagem.createdAt));
    if (item) item.triagens += 1;
  });

  // ── Funil: conversão e tempo médio por etapa ──
  const funilMap = new Map<string, {
    nome: string;
    ordem: number;
    total: number;
    concluidos: number;
    reprovados: number;
    dispensados: number;
    temposTotalMs: number;
    temposCount: number;
  }>();

  for (const etapa of etapasParaFunil) {
    const key = etapa.vagaEtapa.nome;
    let entry = funilMap.get(key);
    if (!entry) {
      entry = {
        nome: etapa.vagaEtapa.nome,
        ordem: etapa.vagaEtapa.ordem,
        total: 0,
        concluidos: 0,
        reprovados: 0,
        dispensados: 0,
        temposTotalMs: 0,
        temposCount: 0,
      };
      funilMap.set(key, entry);
    }
    entry.total += 1;
    if (etapa.status === "CONCLUIDO") entry.concluidos += 1;
    if (etapa.status === "REPROVADO") entry.reprovados += 1;
    if (etapa.status === "DISPENSADO") entry.dispensados += 1;

    if (etapa.iniciadaEm && etapa.concluidaEm) {
      const diff = new Date(etapa.concluidaEm).getTime() - new Date(etapa.iniciadaEm).getTime();
      if (diff > 0) {
        entry.temposTotalMs += diff;
        entry.temposCount += 1;
      }
    }
  }

  const funil = Array.from(funilMap.values())
    .sort((a, b) => a.ordem - b.ordem)
    .map((entry) => ({
      nome: entry.nome,
      total: entry.total,
      concluidos: entry.concluidos,
      reprovados: entry.reprovados,
      dispensados: entry.dispensados,
      taxaConversao: entry.total > 0 ? Math.round((entry.concluidos / entry.total) * 100) : 0,
      tempoMedioDias: entry.temposCount > 0
        ? Math.round((entry.temposTotalMs / entry.temposCount) / (1000 * 60 * 60 * 24) * 10) / 10
        : null,
    }));

  return Response.json({
    metricas: {
      vagasAbertas,
      vagasEmRevisao,
      vagasFechadas,
      totalCandidatos,
      candidatosDisponiveis,
      candidatosContratados,
      analisesConcluidas,
      mediaScore: scoreAggregate._avg.score ? Math.round(scoreAggregate._avg.score) : null,
    },
    pipeline: {
      pendentes: triagensPendentes,
      processando: triagensProcessando,
      concluidas: triagensConcluidas,
    },
    statusVagas: [
      { status: "ABERTA", label: "Abertas", total: vagasAbertas, fill: "var(--color-chart-1)" },
      { status: "EM_REVISAO", label: "Em revisão", total: vagasEmRevisao, fill: "var(--color-chart-5)" },
      { status: "FECHADA", label: "Fechadas", total: vagasFechadas, fill: "var(--color-chart-4)" },
    ],
    seriesMensal,
    vagasDestaque: vagasDestaque.map((vaga) => ({
      id: vaga.id,
      titulo: vaga.titulo,
      area: vaga.area,
      regime: vaga.regime,
      status: vaga.status,
      totalCandidatos: vaga._count.triagens,
      contratados: vaga._count.empregados,
      melhorScore: vaga.triagens[0]?.score ?? null,
    })),
    funil,
    atividadesRecentes: atividadesRecentes.map((evento) => ({
      id: evento.id,
      tipo: evento.tipo,
      descricao: evento.descricao,
      origem: evento.origem,
      createdAt: evento.createdAt,
      vagaId: evento.vagaId,
      vagaTitulo: evento.vagaTitulo,
      candidatoId: evento.candidatoId,
      candidatoNome: evento.candidatoNome,
    })),
  });
}
