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

export async function pularParaEtapaTriagem(triagemId: string, vagaEtapaDestinoId: string) {
  const agora = new Date();

  const etapas = await prisma.triagemEtapa.findMany({
    where: { triagemId },
    include: { vagaEtapa: true },
    orderBy: {
      vagaEtapa: {
        ordem: "asc",
      },
    },
  });

  const etapaDestino = etapas.find((etapa) => etapa.vagaEtapaId === vagaEtapaDestinoId);
  if (!etapaDestino) {
    throw new Error("Etapa de destino nao encontrada para esta triagem.");
  }

  const etapaAtual = etapas.find((etapa) => etapa.status === "EM_ANDAMENTO")
    ?? etapas.find((etapa) => etapa.status === "PENDENTE")
    ?? null;

  if (!etapaAtual) {
    throw new Error("Nao ha etapa ativa ou pendente para mover.");
  }

  if (etapaDestino.vagaEtapa.ordem <= etapaAtual.vagaEtapa.ordem) {
    throw new Error("So e possivel pular para etapas futuras.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.triagemEtapa.update({
      where: { id: etapaAtual.id },
      data: {
        status: "CONCLUIDO",
        concluidaEm: etapaAtual.concluidaEm ?? agora,
      },
    });

    const etapasIntermediarias = etapas.filter(
      (etapa) =>
        etapa.vagaEtapa.ordem > etapaAtual.vagaEtapa.ordem
        && etapa.vagaEtapa.ordem < etapaDestino.vagaEtapa.ordem,
    );

    if (etapasIntermediarias.length > 0) {
      await tx.triagemEtapa.updateMany({
        where: {
          id: { in: etapasIntermediarias.map((etapa) => etapa.id) },
          status: { in: ["PENDENTE", "EM_ANDAMENTO"] },
        },
        data: {
          status: "DISPENSADO",
          concluidaEm: agora,
        },
      });
    }

    await tx.triagemEtapa.update({
      where: { id: etapaDestino.id },
      data: {
        status: "EM_ANDAMENTO",
        iniciadaEm: etapaDestino.iniciadaEm ?? agora,
      },
    });
  });
}
