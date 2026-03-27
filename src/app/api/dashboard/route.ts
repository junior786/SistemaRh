import { prisma } from "@/lib/prisma";

// GET /api/dashboard — RF-05: métricas consolidadas
export async function GET() {
  const [
    vagasAbertas,
    totalCandidatos,
    analisesConcluidas,
    candidatosAprovados,
    vagasComMaisCandidatos,
  ] = await Promise.all([
    prisma.vaga.count({ where: { status: "ABERTA" } }),
    prisma.candidato.count(),
    prisma.triagem.count({ where: { status: "CONCLUIDO" } }),
    prisma.entrevista.count({ where: { resultado: "APROVADO" } }),
    prisma.vaga.findMany({
      where: { status: "ABERTA" },
      include: {
        _count: { select: { triagens: true } },
        triagens: {
          where: { status: "CONCLUIDO" },
          orderBy: { score: "desc" },
          take: 1,
          select: { score: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return Response.json({
    metricas: {
      vagasAbertas,
      totalCandidatos,
      analisesConcluidas,
      candidatosAprovados,
    },
    vagasDestaque: vagasComMaisCandidatos.map((v) => ({
      id: v.id,
      titulo: v.titulo,
      area: v.area,
      regime: v.regime,
      status: v.status,
      totalCandidatos: v._count.triagens,
      melhorScore: v.triagens[0]?.score ?? null,
    })),
  });
}
