import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/triagens/[id] — detalhe da triagem
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
      vaga: { include: { requisitos: true } },
      entrevistas: { orderBy: { dataHora: "desc" } },
    },
  });

  if (!triagem) {
    return Response.json({ error: "Triagem não encontrada" }, { status: 404 });
  }

  return Response.json(triagem);
}

// DELETE /api/triagens/[id] — remover triagem
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.triagem.delete({ where: { id } });
  return Response.json({ ok: true });
}
