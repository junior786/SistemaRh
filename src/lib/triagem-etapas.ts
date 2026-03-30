import { prisma } from "@/lib/prisma";

export async function inicializarEtapasTriagem(triagemId: string, vagaId: string) {
  const etapas = await prisma.vagaEtapa.findMany({
    where: { vagaId },
    orderBy: { ordem: "asc" },
  });

  if (etapas.length === 0) {
    return;
  }

  await prisma.triagemEtapa.createMany({
    data: etapas.map((etapa, index) => ({
      triagemId,
      vagaEtapaId: etapa.id,
      status: index === 0 ? "EM_ANDAMENTO" : "PENDENTE",
      iniciadaEm: index === 0 ? new Date() : null,
    })),
  });
}

export async function concluirEtapaEAvancar(triagemId: string, vagaEtapaId: string) {
  const agora = new Date();

  await prisma.triagemEtapa.updateMany({
    where: {
      triagemId,
      vagaEtapaId,
      status: { not: "CONCLUIDO" },
    },
    data: {
      status: "CONCLUIDO",
      concluidaEm: agora,
    },
  });

  const proximaPendente = await prisma.triagemEtapa.findFirst({
    where: {
      triagemId,
      status: "PENDENTE",
    },
    include: {
      vagaEtapa: true,
    },
    orderBy: {
      vagaEtapa: {
        ordem: "asc",
      },
    },
  });

  if (!proximaPendente) {
    return;
  }

  await prisma.triagemEtapa.update({
    where: { id: proximaPendente.id },
    data: {
      status: "EM_ANDAMENTO",
      iniciadaEm: proximaPendente.iniciadaEm ?? agora,
    },
  });
}

export async function reprovarEtapaTriagem(triagemId: string, vagaEtapaId: string) {
  await prisma.triagemEtapa.updateMany({
    where: { triagemId, vagaEtapaId },
    data: {
      status: "REPROVADO",
      concluidaEm: new Date(),
    },
  });
}
