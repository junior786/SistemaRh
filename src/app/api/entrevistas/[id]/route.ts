import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { contratarCandidatoNaVaga, validarContratacaoNaVaga } from "@/lib/contratacao";
import { concluirEtapaEAvancar, reprovarEtapaTriagem } from "@/lib/triagem-etapas";
import { registrarEventoTriagem, TRIAGEM_EVENTO_TIPO } from "@/lib/triagem-eventos";

// PUT /api/entrevistas/[id] — atualizar entrevista (status, observações, resultado)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { dataHora, entrevistador, status, observacoes, resultado } = body;

  const entrevistaAtual = await prisma.entrevista.findUnique({
    where: { id },
    include: {
      triagem: { select: { id: true, candidatoId: true, vagaId: true } },
    },
  });

  if (!entrevistaAtual) {
    return Response.json({ error: "Entrevista não encontrada" }, { status: 404 });
  }

  if (resultado === "APROVADO") {
    try {
      await validarContratacaoNaVaga(entrevistaAtual.triagem.vagaId, [entrevistaAtual.triagem.candidatoId]);
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Não foi possível contratar o candidato" },
        { status: 409 },
      );
    }
  }

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
    await contratarCandidatoNaVaga(entrevista.triagem.vagaId, entrevista.triagem.candidatoId);
  }

  if (resultado !== undefined) {
    await registrarEventoTriagem({
      triagemId: entrevista.triagem.id,
      tipo: TRIAGEM_EVENTO_TIPO.ENTREVISTA_RESULTADO,
      descricao: `Entrevista atualizada com resultado ${resultado}.`,
      origem: "RH",
      metadados: {
        entrevistaId: entrevista.id,
        vagaEtapaId: entrevista.vagaEtapaId,
        vagaEtapaNome: entrevista.vagaEtapa?.nome ?? null,
        resultado,
        status: entrevista.status,
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
