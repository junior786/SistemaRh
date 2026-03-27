import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT /api/entrevistas/[id] — atualizar entrevista (status, observações, resultado)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { dataHora, entrevistador, status, observacoes, resultado } = body;

  const entrevista = await prisma.entrevista.update({
    where: { id },
    data: {
      ...(dataHora && { dataHora: new Date(dataHora) }),
      ...(entrevistador && { entrevistador }),
      ...(status && { status }),
      ...(observacoes !== undefined && { observacoes }),
      ...(resultado !== undefined && { resultado }),
    },
  });

  return Response.json(entrevista);
}

// DELETE /api/entrevistas/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.entrevista.delete({ where: { id } });
  return Response.json({ ok: true });
}
