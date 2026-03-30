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
      { status: "EM_REVISAO", label: "Em revisao", total: vagasEmRevisao, fill: "var(--color-chart-5)" },
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
  });
}
