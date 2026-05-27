import { prisma } from "@/lib/prisma";
import {
  registrarEventoTriagem,
  registrarEventosTriagemLote,
  TRIAGEM_EVENTO_TIPO,
} from "@/lib/triagem-eventos";

async function encerrarOutrasTriagensDosCandidatos(empresaId: string, vagaId: string, candidatoIds: string[]) {
  if (candidatoIds.length === 0) {
    return [];
  }

  const agora = new Date();

  const outrasTriagens = await prisma.triagem.findMany({
    where: {
      empresaId,
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

async function validarCandidatosDaVaga(empresaId: string, vagaId: string, candidatoIds: string[]) {
  if (candidatoIds.length === 0) {
    return;
  }

  const triagens = await prisma.triagem.findMany({
    where: {
      empresaId,
      vagaId,
      candidatoId: { in: candidatoIds },
    },
    select: { candidatoId: true },
  });

  const idsValidos = new Set(triagens.map((triagem) => triagem.candidatoId));
  if (idsValidos.size !== candidatoIds.length) {
    throw new Error("Só é permitido contratar candidatos vinculados a esta vaga.");
  }
}

async function validarDisponibilidadeContratacao(empresaId: string, vagaId: string, candidatoIds: string[]) {
  if (candidatoIds.length === 0) {
    return;
  }

  const candidatos = await prisma.candidato.findMany({
    where: { empresaId, id: { in: candidatoIds } },
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
      `Já existe candidato contratado em outra vaga: ${conflitos.map((candidato) => candidato.nome).join(", ")}.`,
    );
  }
}

export async function validarContratacaoNaVaga(empresaId: string, vagaId: string, candidatoIds: string[]) {
  const idsUnicos = Array.from(
    new Set(candidatoIds.filter((value): value is string => typeof value === "string" && value.length > 0)),
  );

  await validarCandidatosDaVaga(empresaId, vagaId, idsUnicos);
  await validarDisponibilidadeContratacao(empresaId, vagaId, idsUnicos);
}

export async function definirContratadosDaVaga(empresaId: string, vagaId: string, candidatoIds: string[]) {
  const idsUnicos = Array.from(
    new Set(candidatoIds.filter((value): value is string => typeof value === "string" && value.length > 0)),
  );

  await validarContratacaoNaVaga(empresaId, vagaId, idsUnicos);

  const candidatosAntes = idsUnicos.length > 0
    ? await prisma.candidato.findMany({
      where: { empresaId, id: { in: idsUnicos } },
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

  const agora = new Date();

  await prisma.$transaction([
    prisma.candidato.updateMany({
      where: {
        vagaEmpregadoId: vagaId,
        empresaId,
        id: { notIn: idsUnicos },
      },
      data: {
        statusEmprego: "DISPONIVEL",
        vagaEmpregadoId: null,
        contratadoEm: null,
      },
    }),
    prisma.candidato.updateMany({
      where: {
        empresaId,
        id: { in: idsUnicos },
      },
      data: {
        statusEmprego: "EMPREGADO",
        vagaEmpregadoId: vagaId,
        contratadoEm: agora,
      },
    }),
  ]);

  const triagensContratadas = idsUnicos.length > 0
    ? await prisma.triagem.findMany({
      where: {
        vagaId,
        empresaId,
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

  return encerrarOutrasTriagensDosCandidatos(empresaId, vagaId, idsUnicos);
}

export async function contratarCandidatoNaVaga(empresaId: string, vagaId: string, candidatoId: string) {
  await validarContratacaoNaVaga(empresaId, vagaId, [candidatoId]);

  const candidatoAntes = await prisma.candidato.findFirst({
    where: { id: candidatoId, empresaId },
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
      contratadoEm: new Date(),
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

  return encerrarOutrasTriagensDosCandidatos(empresaId, vagaId, [candidatoId]);
}
