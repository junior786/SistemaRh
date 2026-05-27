import { prisma } from "@/lib/prisma";

export async function inicializarEtapasTriagem(empresaId: string, triagemId: string, vagaId: string) {
  const etapas = await prisma.vagaEtapa.findMany({
    where: { vagaId, vaga: { empresaId } },
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

export async function concluirEtapaEAvancar(empresaId: string, triagemId: string, vagaEtapaId: string) {
  const agora = new Date();

  await prisma.triagemEtapa.updateMany({
    where: {
      triagemId,
      vagaEtapaId,
      triagem: { empresaId },
      vagaEtapa: { vaga: { empresaId } },
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
      triagem: { empresaId },
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

export async function reprovarEtapaTriagem(empresaId: string, triagemId: string, vagaEtapaId: string) {
  await prisma.triagemEtapa.updateMany({
    where: { triagemId, vagaEtapaId, triagem: { empresaId }, vagaEtapa: { vaga: { empresaId } } },
    data: {
      status: "REPROVADO",
      concluidaEm: new Date(),
    },
  });
}

export async function reprovarEtapaAtualTriagem(empresaId: string, triagemId: string) {
  const agora = new Date();
  const etapas = await prisma.triagemEtapa.findMany({
    where: { triagemId, triagem: { empresaId } },
    include: { vagaEtapa: true },
    orderBy: {
      vagaEtapa: {
        ordem: "asc",
      },
    },
  });

  const etapaAtual = etapas.find((etapa) => etapa.status === "EM_ANDAMENTO")
    ?? etapas.find((etapa) => etapa.status === "PENDENTE");

  if (!etapaAtual) {
    throw new Error("Não há etapa ativa ou pendente para reprovar.");
  }

  const etapasPosteriores = etapas.filter((etapa) => etapa.vagaEtapa.ordem > etapaAtual.vagaEtapa.ordem);

  await prisma.$transaction(async (tx) => {
    await tx.triagemEtapa.update({
      where: { id: etapaAtual.id },
      data: {
        status: "REPROVADO",
        concluidaEm: agora,
      },
    });

    if (etapasPosteriores.length > 0) {
      await tx.triagemEtapa.updateMany({
        where: {
          id: { in: etapasPosteriores.map((etapa) => etapa.id) },
          status: { in: ["PENDENTE", "EM_ANDAMENTO"] },
        },
        data: {
          status: "DISPENSADO",
          concluidaEm: agora,
        },
      });
    }
  });
}

export async function voltarParaEtapaAnteriorTriagem(empresaId: string, triagemId: string) {
  const agora = new Date();
  const etapas = await prisma.triagemEtapa.findMany({
    where: { triagemId, triagem: { empresaId } },
    include: { vagaEtapa: true },
    orderBy: {
      vagaEtapa: {
        ordem: "asc",
      },
    },
  });

  const etapaReferencia = etapas.find((etapa) => etapa.status === "EM_ANDAMENTO")
    ?? etapas.find((etapa) => etapa.status === "PENDENTE")
    ?? [...etapas].reverse().find((etapa) =>
      ["CONCLUIDO", "REPROVADO", "DISPENSADO"].includes(etapa.status));

  if (!etapaReferencia) {
    throw new Error("Não há etapa válida para retornar.");
  }

  const etapaAnterior = [...etapas]
    .reverse()
    .find((etapa) => etapa.vagaEtapa.ordem < etapaReferencia.vagaEtapa.ordem);

  if (!etapaAnterior) {
    throw new Error("Nao existe etapa anterior para esta triagem.");
  }

  const etapasParaResetar = etapas.filter((etapa) => etapa.vagaEtapa.ordem >= etapaReferencia.vagaEtapa.ordem);

  await prisma.$transaction(async (tx) => {
    if (etapasParaResetar.length > 0) {
      await tx.triagemEtapa.updateMany({
        where: {
          id: { in: etapasParaResetar.map((etapa) => etapa.id) },
        },
        data: {
          status: "PENDENTE",
          concluidaEm: null,
        },
      });
    }

    await tx.triagemEtapa.update({
      where: { id: etapaAnterior.id },
      data: {
        status: "EM_ANDAMENTO",
        concluidaEm: null,
        iniciadaEm: etapaAnterior.iniciadaEm ?? agora,
      },
    });
  });
}

export async function reabrirEtapaTriagem(empresaId: string, triagemId: string, vagaEtapaId: string) {
  const agora = new Date();
  const etapas = await prisma.triagemEtapa.findMany({
    where: { triagemId, triagem: { empresaId } },
    include: { vagaEtapa: true },
    orderBy: {
      vagaEtapa: {
        ordem: "asc",
      },
    },
  });

  const etapaDestino = etapas.find((etapa) => etapa.vagaEtapaId === vagaEtapaId);
  if (!etapaDestino) {
    throw new Error("Etapa não encontrada para esta triagem.");
  }

  if (!["CONCLUIDO", "REPROVADO", "DISPENSADO"].includes(etapaDestino.status)) {
    throw new Error("Apenas etapas concluidas, reprovadas ou dispensadas podem ser reabertas.");
  }

  const etapasPosteriores = etapas.filter((etapa) => etapa.vagaEtapa.ordem > etapaDestino.vagaEtapa.ordem);
  const etapasAtivas = etapas.filter(
    (etapa) => etapa.id !== etapaDestino.id && etapa.status === "EM_ANDAMENTO",
  );

  await prisma.$transaction(async (tx) => {
    if (etapasPosteriores.length > 0) {
      await tx.triagemEtapa.updateMany({
        where: {
          id: { in: etapasPosteriores.map((etapa) => etapa.id) },
        },
        data: {
          status: "PENDENTE",
          concluidaEm: null,
          iniciadaEm: null,
        },
      });
    }

    if (etapasAtivas.length > 0) {
      await tx.triagemEtapa.updateMany({
        where: {
          id: { in: etapasAtivas.map((etapa) => etapa.id) },
        },
        data: {
          status: "PENDENTE",
          concluidaEm: null,
        },
      });
    }

    await tx.triagemEtapa.update({
      where: { id: etapaDestino.id },
      data: {
        status: "EM_ANDAMENTO",
        concluidaEm: null,
        iniciadaEm: etapaDestino.iniciadaEm ?? agora,
      },
    });
  });
}

export async function pularParaEtapaTriagem(empresaId: string, triagemId: string, vagaEtapaDestinoId: string) {
  const agora = new Date();

  const etapas = await prisma.triagemEtapa.findMany({
    where: { triagemId, triagem: { empresaId } },
    include: { vagaEtapa: true },
    orderBy: {
      vagaEtapa: {
        ordem: "asc",
      },
    },
  });

  const etapaDestino = etapas.find((etapa) => etapa.vagaEtapaId === vagaEtapaDestinoId);
  if (!etapaDestino) {
    throw new Error("Etapa de destino não encontrada para esta triagem.");
  }

  const etapaAtual = etapas.find((etapa) => etapa.status === "EM_ANDAMENTO")
    ?? etapas.find((etapa) => etapa.status === "PENDENTE")
    ?? null;

  if (!etapaAtual) {
    throw new Error("Não há etapa ativa ou pendente para mover.");
  }

  if (etapaDestino.vagaEtapa.ordem <= etapaAtual.vagaEtapa.ordem) {
    throw new Error("Só é possível pular para etapas futuras.");
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
