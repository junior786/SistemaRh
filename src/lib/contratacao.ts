import { prisma } from "@/lib/prisma";
import {
  registrarEventoTriagem,
  registrarEventosTriagemLote,
  TRIAGEM_EVENTO_TIPO,
} from "@/lib/triagem-eventos";

async function encerrarOutrasTriagensDosCandidatos(vagaId: string, candidatoIds: string[]) {
  if (candidatoIds.length === 0) {
    return [];
  }

  const agora = new Date();

  const outrasTriagens = await prisma.triagem.findMany({
    where: {
      candidatoId: { in: candidatoIds },
      vagaId: { not: vagaId },
    },
    select: {
      id: true,
      candidatoId: true,
      vagaId: true,
      vaga: {
        select: {
          titulo: true,
        },
      },
    },
  });

  if (outrasTriagens.length === 0) {
    return [];
  }

  const otherTriagemIds = outrasTriagens.map((triagem) => triagem.id);

  await prisma.$transaction([
    prisma.triagemEtapa.updateMany({
      where: {
        triagemId: { in: otherTriagemIds },
        status: { in: ["PENDENTE", "EM_ANDAMENTO"] },
      },
      data: {
        status: "DISPENSADO",
        concluidaEm: agora,
      },
    }),
    prisma.triagem.updateMany({
      where: {
        id: { in: otherTriagemIds },
        status: { in: ["PENDENTE", "PROCESSANDO", "ERRO"] },
      },
      data: {
        status: "CONCLUIDO",
        analisadoEm: agora,
        desatualizado: false,
      },
    }),
  ]);

  await registrarEventosTriagemLote(
    outrasTriagens.map((triagem) => ({
      triagemId: triagem.id,
      tipo: TRIAGEM_EVENTO_TIPO.OUTRAS_TRIAGENS_ENCERRADAS,
      descricao: "Triagem encerrada porque o candidato foi contratado em outra vaga.",
      origem: "SISTEMA",
      metadados: {
        vagaContratanteId: vagaId,
        vagaEncerradaId: triagem.vagaId,
        vagaEncerradaTitulo: triagem.vaga.titulo,
      },
    })),
  );

  return outrasTriagens;
}

async function validarCandidatosDaVaga(vagaId: string, candidatoIds: string[]) {
  if (candidatoIds.length === 0) {
    return;
  }

  const triagens = await prisma.triagem.findMany({
    where: {
      vagaId,
      candidatoId: { in: candidatoIds },
    },
    select: { candidatoId: true },
  });

  const idsValidos = new Set(triagens.map((triagem) => triagem.candidatoId));
  if (idsValidos.size !== candidatoIds.length) {
    throw new Error("So e permitido contratar candidatos vinculados a esta vaga.");
  }
}

async function validarDisponibilidadeContratacao(vagaId: string, candidatoIds: string[]) {
  if (candidatoIds.length === 0) {
    return;
  }

  const candidatos = await prisma.candidato.findMany({
    where: { id: { in: candidatoIds } },
    select: {
      id: true,
      nome: true,
      statusEmprego: true,
      vagaEmpregadoId: true,
    },
  });

  const conflitos = candidatos.filter(
    (candidato) =>
      candidato.statusEmprego === "EMPREGADO"
      && candidato.vagaEmpregadoId
      && candidato.vagaEmpregadoId !== vagaId,
  );

  if (conflitos.length > 0) {
    throw new Error(
      `Ja existe candidato contratado em outra vaga: ${conflitos.map((candidato) => candidato.nome).join(", ")}.`,
    );
  }
}

export async function validarContratacaoNaVaga(vagaId: string, candidatoIds: string[]) {
  const idsUnicos = Array.from(
    new Set(candidatoIds.filter((value): value is string => typeof value === "string" && value.length > 0)),
  );

  await validarCandidatosDaVaga(vagaId, idsUnicos);
  await validarDisponibilidadeContratacao(vagaId, idsUnicos);
}

export async function definirContratadosDaVaga(vagaId: string, candidatoIds: string[]) {
  const idsUnicos = Array.from(
    new Set(candidatoIds.filter((value): value is string => typeof value === "string" && value.length > 0)),
  );

  await validarContratacaoNaVaga(vagaId, idsUnicos);

  const candidatosAntes = idsUnicos.length > 0
    ? await prisma.candidato.findMany({
      where: { id: { in: idsUnicos } },
      select: {
        id: true,
        statusEmprego: true,
        vagaEmpregadoId: true,
      },
    })
    : [];
  const contratacoesNovasIds = candidatosAntes
    .filter((candidato) => candidato.statusEmprego !== "EMPREGADO" || candidato.vagaEmpregadoId !== vagaId)
    .map((candidato) => candidato.id);

  await prisma.$transaction([
    prisma.candidato.updateMany({
      where: {
        vagaEmpregadoId: vagaId,
        id: { notIn: idsUnicos },
      },
      data: {
        statusEmprego: "DISPONIVEL",
        vagaEmpregadoId: null,
      },
    }),
    prisma.candidato.updateMany({
      where: {
        id: { in: idsUnicos },
      },
      data: {
        statusEmprego: "EMPREGADO",
        vagaEmpregadoId: vagaId,
      },
    }),
  ]);

  const triagensContratadas = idsUnicos.length > 0
    ? await prisma.triagem.findMany({
      where: {
        vagaId,
        candidatoId: { in: idsUnicos },
      },
      include: {
        candidato: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    })
    : [];

  if (contratacoesNovasIds.length > 0) {
    await registrarEventosTriagemLote(
      triagensContratadas
        .filter((triagem) => contratacoesNovasIds.includes(triagem.candidatoId))
        .map((triagem) => ({
          triagemId: triagem.id,
          tipo: TRIAGEM_EVENTO_TIPO.CANDIDATO_CONTRATADO,
          descricao: `Candidato ${triagem.candidato.nome} contratado para a vaga.`,
          origem: "RH",
          metadados: {
            vagaId,
            candidatoId: triagem.candidatoId,
          },
        })),
    );
  }

  return encerrarOutrasTriagensDosCandidatos(vagaId, idsUnicos);
}

export async function contratarCandidatoNaVaga(vagaId: string, candidatoId: string) {
  await validarContratacaoNaVaga(vagaId, [candidatoId]);

  const candidatoAntes = await prisma.candidato.findUnique({
    where: { id: candidatoId },
    select: {
      statusEmprego: true,
      vagaEmpregadoId: true,
    },
  });

  await prisma.candidato.update({
    where: { id: candidatoId },
    data: {
      statusEmprego: "EMPREGADO",
      vagaEmpregadoId: vagaId,
    },
  });

  const triagem = await prisma.triagem.findUnique({
    where: {
      vagaId_candidatoId: {
        vagaId,
        candidatoId,
      },
    },
    include: {
      candidato: {
        select: {
          nome: true,
        },
      },
    },
  });

  if (triagem && (
    candidatoAntes?.statusEmprego !== "EMPREGADO"
    || candidatoAntes.vagaEmpregadoId !== vagaId
  )) {
    await registrarEventoTriagem({
      triagemId: triagem.id,
      tipo: TRIAGEM_EVENTO_TIPO.CANDIDATO_CONTRATADO,
      descricao: `Candidato ${triagem.candidato.nome} contratado para a vaga.`,
      origem: "RH",
      metadados: {
        vagaId,
        candidatoId,
      },
    });
  }

  return encerrarOutrasTriagensDosCandidatos(vagaId, [candidatoId]);
}
