import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { inicializarEtapasTriagem } from "@/lib/triagem-etapas";
import { registrarEventoTriagem, TRIAGEM_EVENTO_TIPO } from "@/lib/triagem-eventos";
import { resolveRequestContext } from "@/lib/request-context";

// GET /api/triagens?vagaId=xxx — listar triagens de uma vaga
export async function GET(request: NextRequest) {
  const ctx = await resolveRequestContext();
  if (ctx instanceof Response) return ctx;
  const { empresa } = ctx;

  const vagaId = request.nextUrl.searchParams.get("vagaId");

  if (!vagaId) {
    return Response.json({ error: "vagaId é obrigatório" }, { status: 400 });
  }

  const triagens = await prisma.triagem.findMany({
    where: { vagaId, empresaId: empresa.id },
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
  const ctx = await resolveRequestContext();
  if (ctx instanceof Response) return ctx;
  const { empresa } = ctx;

  const body = await request.json();
  const { vagaId, candidatoId } = body;

  if (!vagaId || !candidatoId) {
    return Response.json({ error: "vagaId e candidatoId são obrigatórios" }, { status: 400 });
  }

  const [vaga, candidato, existente] = await Promise.all([
    prisma.vaga.findFirst({
      where: { id: vagaId, empresaId: empresa.id },
      select: { id: true },
    }),
    prisma.candidato.findFirst({
      where: { id: candidatoId, empresaId: empresa.id },
      select: { statusEmprego: true },
    }),
    prisma.triagem.findFirst({
      where: { vagaId, candidatoId, empresaId: empresa.id },
      select: { id: true },
    }),
  ]);

  if (!vaga) {
    return Response.json({ error: "Vaga não encontrada" }, { status: 404 });
  }

  if (!candidato) {
    return Response.json({ error: "Candidato não encontrado" }, { status: 404 });
  }

  if (existente) {
    return Response.json({ error: "Candidato já vinculado a esta vaga" }, { status: 409 });
  }

  if (candidato.statusEmprego === "EMPREGADO") {
    return Response.json(
      { error: "Não é possível vincular um candidato já contratado a uma nova triagem." },
      { status: 409 },
    );
  }

  const triagem = await prisma.triagem.create({
    data: { empresaId: empresa.id, vagaId, candidatoId, status: "PENDENTE" },
    include: { candidato: true, vaga: true },
  });

  await inicializarEtapasTriagem(empresa.id, triagem.id, vagaId);

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
