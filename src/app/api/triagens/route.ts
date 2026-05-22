import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { inicializarEtapasTriagem } from "@/lib/triagem-etapas";
import { registrarEventoTriagem, TRIAGEM_EVENTO_TIPO } from "@/lib/triagem-eventos";

// GET /api/triagens?vagaId=xxx — listar triagens de uma vaga
export async function GET(request: NextRequest) {
  const vagaId = request.nextUrl.searchParams.get("vagaId");

  if (!vagaId) {
    return Response.json({ error: "vagaId é obrigatório" }, { status: 400 });
  }

  const triagens = await prisma.triagem.findMany({
    where: { vagaId },
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
    orderBy: { score: "desc" },
  });

  return Response.json(triagens);
}

// POST /api/triagens — vincular candidato à vaga (RN-04) e disparar análise
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { vagaId, candidatoId } = body;

  if (!vagaId || !candidatoId) {
    return Response.json({ error: "vagaId e candidatoId são obrigatórios" }, { status: 400 });
  }

  // Verifica se já existe triagem para esse par
  const existente = await prisma.triagem.findUnique({
    where: { vagaId_candidatoId: { vagaId, candidatoId } },
  });

  if (existente) {
    return Response.json({ error: "Candidato já vinculado a esta vaga" }, { status: 409 });
  }

  const candidato = await prisma.candidato.findUnique({
    where: { id: candidatoId },
    select: { statusEmprego: true },
  });

  if (!candidato) {
    return Response.json({ error: "Candidato não encontrado" }, { status: 404 });
  }

  if (candidato.statusEmprego === "EMPREGADO") {
    return Response.json(
      { error: "Não é possível vincular um candidato já contratado a uma nova triagem." },
      { status: 409 },
    );
  }

  const triagem = await prisma.triagem.create({
    data: { vagaId, candidatoId, status: "PENDENTE" },
    include: { candidato: true, vaga: true },
  });

  await inicializarEtapasTriagem(triagem.id, vagaId);

  await registrarEventoTriagem({
    triagemId: triagem.id,
    tipo: TRIAGEM_EVENTO_TIPO.TRIAGEM_VINCULADA,
    descricao: "Candidato vinculado a vaga e triagem iniciada.",
    origem: "RH",
    metadados: {
      vagaId,
      candidatoId,
    },
  });

  return Response.json(triagem, { status: 201 });
}
