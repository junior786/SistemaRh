import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { pularParaEtapaTriagem } from "@/lib/triagem-etapas";

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
    return Response.json({ error: "Triagem nao encontrada" }, { status: 404 });
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
    return Response.json({ error: "Triagem nao encontrada" }, { status: 404 });
  }

  try {
    if (acao !== "PULAR_PARA_ETAPA") {
      return Response.json({ error: "Acao invalida" }, { status: 400 });
    }

    if (!vagaEtapaId) {
      return Response.json({ error: "vagaEtapaId e obrigatorio" }, { status: 400 });
    }

    await pularParaEtapaTriagem(id, vagaEtapaId);

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
  await prisma.triagem.delete({ where: { id } });
  return Response.json({ ok: true });
}
