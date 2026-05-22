import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  pularParaEtapaTriagem,
  reabrirEtapaTriagem,
  reprovarEtapaAtualTriagem,
  voltarParaEtapaAnteriorTriagem,
} from "@/lib/triagem-etapas";
import { registrarEventoTriagem, TRIAGEM_EVENTO_TIPO } from "@/lib/triagem-eventos";

// GET /api/triagens/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const triagem = await prisma.triagem.findUnique({
    where: { id },
    include: {
      candidato: {
        include: { skills: true, experiencias: true, formacoes: true },
      },
      vaga: {
        include: {
          requisitos: true,
          etapas: { orderBy: { ordem: "asc" } },
        },
      },
      entrevistas: {
        include: { vagaEtapa: true },
        orderBy: { dataHora: "desc" },
      },
      eventos: {
        orderBy: { createdAt: "desc" },
      },
      etapas: {
        include: {
          vagaEtapa: true,
        },
        orderBy: {
          vagaEtapa: {
            ordem: "asc",
          },
        },
      },
    },
  });

  if (!triagem) {
    return Response.json({ error: "Triagem não encontrada" }, { status: 404 });
  }

  return Response.json(triagem);
}

// PUT /api/triagens/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { acao, vagaEtapaId } = body;

  const triagem = await prisma.triagem.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!triagem) {
    return Response.json({ error: "Triagem não encontrada" }, { status: 404 });
  }

  try {
    const triagemAntes = await prisma.triagem.findUnique({
      where: { id },
      include: {
        etapas: {
          include: { vagaEtapa: true },
          orderBy: { vagaEtapa: { ordem: "asc" } },
        },
      },
    });

    if (acao === "PULAR_PARA_ETAPA") {
      if (!vagaEtapaId) {
        return Response.json({ error: "vagaEtapaId e obrigatorio" }, { status: 400 });
      }
      await pularParaEtapaTriagem(id, vagaEtapaId);
    } else if (acao === "VOLTAR_ETAPA") {
      await voltarParaEtapaAnteriorTriagem(id);
    } else if (acao === "REABRIR_ETAPA") {
      if (!vagaEtapaId) {
        return Response.json({ error: "vagaEtapaId e obrigatorio" }, { status: 400 });
      }
      await reabrirEtapaTriagem(id, vagaEtapaId);
    } else if (acao === "REPROVAR_ETAPA") {
      await reprovarEtapaAtualTriagem(id);
    } else {
      return Response.json({ error: "Acao invalida" }, { status: 400 });
    }

    const triagemAtualizada = await prisma.triagem.findUnique({
      where: { id },
      include: {
        candidato: {
          include: { skills: true },
        },
        etapas: {
          include: {
            vagaEtapa: true,
          },
          orderBy: {
            vagaEtapa: {
              ordem: "asc",
            },
          },
        },
      },
    });

    const etapaOrigem = triagemAntes?.etapas.find((etapa) => etapa.status === "EM_ANDAMENTO")
      ?? triagemAntes?.etapas.find((etapa) => etapa.status === "PENDENTE");
    const etapaDestino = triagemAtualizada?.etapas.find((etapa) => etapa.vagaEtapa.id === vagaEtapaId);
    const etapaAtualizada = triagemAtualizada?.etapas.find((etapa) => etapa.status === "EM_ANDAMENTO")
      ?? triagemAtualizada?.etapas.find((etapa) => etapa.status === "PENDENTE");

    if (acao === "PULAR_PARA_ETAPA") {
      await registrarEventoTriagem({
        triagemId: id,
        tipo: TRIAGEM_EVENTO_TIPO.ETAPA_PULADA,
        descricao: `Candidato movido de etapa para ${etapaDestino?.vagaEtapa.nome ?? "outra etapa"}.`,
        origem: "RH",
        metadados: {
          etapaOrigemId: etapaOrigem?.vagaEtapa.id ?? null,
          etapaOrigemNome: etapaOrigem?.vagaEtapa.nome ?? null,
          etapaDestinoId: etapaDestino?.vagaEtapa.id ?? vagaEtapaId,
          etapaDestinoNome: etapaDestino?.vagaEtapa.nome ?? null,
        },
      });
    }

    if (acao === "VOLTAR_ETAPA") {
      await registrarEventoTriagem({
        triagemId: id,
        tipo: TRIAGEM_EVENTO_TIPO.ETAPA_RETORNADA,
        descricao: `Candidato retornado para a etapa ${etapaAtualizada?.vagaEtapa.nome ?? "anterior"}.`,
        origem: "RH",
        metadados: {
          etapaOrigemId: etapaOrigem?.vagaEtapa.id ?? null,
          etapaOrigemNome: etapaOrigem?.vagaEtapa.nome ?? null,
          etapaDestinoId: etapaAtualizada?.vagaEtapa.id ?? null,
          etapaDestinoNome: etapaAtualizada?.vagaEtapa.nome ?? null,
        },
      });
    }

    if (acao === "REABRIR_ETAPA") {
      await registrarEventoTriagem({
        triagemId: id,
        tipo: TRIAGEM_EVENTO_TIPO.ETAPA_REABERTA,
        descricao: `Etapa ${etapaAtualizada?.vagaEtapa.nome ?? "selecionada"} reaberta manualmente.`,
        origem: "RH",
        metadados: {
          etapaDestinoId: etapaAtualizada?.vagaEtapa.id ?? vagaEtapaId ?? null,
          etapaDestinoNome: etapaAtualizada?.vagaEtapa.nome ?? null,
        },
      });
    }

    if (acao === "REPROVAR_ETAPA") {
      await registrarEventoTriagem({
        triagemId: id,
        tipo: TRIAGEM_EVENTO_TIPO.ETAPA_REPROVADA_MANUALMENTE,
        descricao: `Candidato reprovado manualmente na etapa ${etapaOrigem?.vagaEtapa.nome ?? "atual"}.`,
        origem: "RH",
        metadados: {
          etapaOrigemId: etapaOrigem?.vagaEtapa.id ?? null,
          etapaOrigemNome: etapaOrigem?.vagaEtapa.nome ?? null,
        },
      });
    }

    return Response.json(triagemAtualizada);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar triagem" },
      { status: 400 },
    );
  }
}

// DELETE /api/triagens/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await registrarEventoTriagem({
    triagemId: id,
    tipo: TRIAGEM_EVENTO_TIPO.TRIAGEM_REMOVIDA,
    descricao: "Candidato removido da triagem da vaga.",
    origem: "RH",
  });
  await prisma.triagem.delete({ where: { id } });
  return Response.json({ ok: true });
}
