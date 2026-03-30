import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { concluirEtapaEAvancar, reprovarEtapaTriagem } from "@/lib/triagem-etapas";

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
    include: {
      triagem: { select: { id: true, candidatoId: true, vagaId: true } },
      vagaEtapa: true,
    },
  });

  if (entrevista.vagaEtapaId && resultado === "PROXIMA_FASE") {
    await concluirEtapaEAvancar(entrevista.triagem.id, entrevista.vagaEtapaId);
  }

  if (entrevista.vagaEtapaId && resultado === "REPROVADO") {
    await reprovarEtapaTriagem(entrevista.triagem.id, entrevista.vagaEtapaId);
  }

  if (entrevista.vagaEtapaId && resultado === "APROVADO") {
    await concluirEtapaEAvancar(entrevista.triagem.id, entrevista.vagaEtapaId);
  }

  // Quando resultado = APROVADO, marca candidato como EMPREGADO e vincula à vaga
  if (resultado === "APROVADO" && entrevista.triagem) {
    await prisma.candidato.update({
      where: { id: entrevista.triagem.candidatoId },
      data: {
        statusEmprego: "EMPREGADO",
        vagaEmpregadoId: entrevista.triagem.vagaId,
      },
    });
  }

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
