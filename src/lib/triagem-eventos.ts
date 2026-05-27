import { prisma } from "@/lib/prisma";

export const TRIAGEM_EVENTO_TIPO = {
  TRIAGEM_VINCULADA: "TRIAGEM_VINCULADA",
  TRIAGEM_REMOVIDA: "TRIAGEM_REMOVIDA",
  ANALISE_SOLICITADA: "ANALISE_SOLICITADA",
  ANALISE_CONCLUIDA: "ANALISE_CONCLUIDA",
  ANALISE_COM_ERRO: "ANALISE_COM_ERRO",
  ETAPA_PULADA: "ETAPA_PULADA",
  ETAPA_RETORNADA: "ETAPA_RETORNADA",
  ETAPA_REABERTA: "ETAPA_REABERTA",
  ETAPA_REPROVADA_MANUALMENTE: "ETAPA_REPROVADA_MANUALMENTE",
  ENTREVISTA_RESULTADO: "ENTREVISTA_RESULTADO",
  CANDIDATO_CONTRATADO: "CANDIDATO_CONTRATADO",
  OUTRAS_TRIAGENS_ENCERRADAS: "OUTRAS_TRIAGENS_ENCERRADAS",
  VAGA_FINALIZADA: "VAGA_FINALIZADA",
} as const;

interface RegistrarEventoInput {
  triagemId: string;
  tipo: string;
  descricao: string;
  origem?: string;
  metadados?: Record<string, unknown> | null;
}

async function carregarSnapshotsTriagem(triagemIds: string[]) {
  if (triagemIds.length === 0) {
    return new Map();
  }

  const triagens = await prisma.triagem.findMany({
    where: {
      id: { in: triagemIds },
    },
    select: {
      id: true,
      empresaId: true,
      vagaId: true,
      candidatoId: true,
      vaga: {
        select: {
          titulo: true,
        },
      },
      candidato: {
        select: {
          nome: true,
        },
      },
    },
  });

  return new Map(
    triagens.map((triagem) => [
      triagem.id,
      {
        empresaId: triagem.empresaId,
        vagaId: triagem.vagaId,
        vagaTitulo: triagem.vaga.titulo,
        candidatoId: triagem.candidatoId,
        candidatoNome: triagem.candidato.nome,
      },
    ]),
  );
}

export async function registrarEventoTriagem({
  triagemId,
  tipo,
  descricao,
  origem = "SISTEMA",
  metadados,
}: RegistrarEventoInput) {
  const snapshots = await carregarSnapshotsTriagem([triagemId]);
  const snapshot = snapshots.get(triagemId);

  if (!snapshot) {
    throw new Error(`Não foi possível registrar evento. Triagem ${triagemId} não encontrada.`);
  }

  try {
    await prisma.triagemEvento.create({
      data: {
        empresaId: snapshot.empresaId,
        triagemId,
        vagaId: snapshot.vagaId,
        vagaTitulo: snapshot.vagaTitulo,
        candidatoId: snapshot.candidatoId,
        candidatoNome: snapshot.candidatoNome,
        tipo,
        descricao,
        origem,
        metadados: metadados ? JSON.stringify(metadados) : null,
      },
    });
  } catch (error) {
    if (isTabelaEventosAusente(error)) {
      return;
    }

    throw error;
  }
}

export async function registrarEventosTriagemLote(eventos: RegistrarEventoInput[]) {
  if (eventos.length === 0) {
    return;
  }

  const snapshots = await carregarSnapshotsTriagem(
    Array.from(new Set(eventos.map((evento) => evento.triagemId))),
  );

  try {
    await prisma.triagemEvento.createMany({
      data: eventos.flatMap((evento) => {
        const snapshot = snapshots.get(evento.triagemId);
        if (!snapshot) {
          return [];
        }

        return [{
          empresaId: snapshot.empresaId,
          triagemId: evento.triagemId,
          vagaId: snapshot.vagaId,
          vagaTitulo: snapshot.vagaTitulo,
          candidatoId: snapshot.candidatoId,
          candidatoNome: snapshot.candidatoNome,
          tipo: evento.tipo,
          descricao: evento.descricao,
          origem: evento.origem ?? "SISTEMA",
          metadados: evento.metadados ? JSON.stringify(evento.metadados) : null,
        }];
      }),
    });
  } catch (error) {
    if (isTabelaEventosAusente(error)) {
      return;
    }

    throw error;
  }
}
function isTabelaEventosAusente(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("TableDoesNotExist")
    || message.includes("TriagemEvento")
    || message.includes("triagemevento")
  );
}
