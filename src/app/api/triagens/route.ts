import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { inicializarEtapasTriagem } from "@/lib/triagem-etapas";

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

  const triagem = await prisma.triagem.create({
    data: { vagaId, candidatoId, status: "PENDENTE" },
    include: { candidato: true, vaga: true },
  });

  await inicializarEtapasTriagem(triagem.id, vagaId);

  return Response.json(triagem, { status: 201 });
}
