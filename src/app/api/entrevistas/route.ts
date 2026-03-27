import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/entrevistas?triagemId=xxx — listar entrevistas de uma triagem
export async function GET(request: NextRequest) {
  const triagemId = request.nextUrl.searchParams.get("triagemId");

  if (!triagemId) {
    return Response.json({ error: "triagemId é obrigatório" }, { status: 400 });
  }

  const entrevistas = await prisma.entrevista.findMany({
    where: { triagemId },
    orderBy: { dataHora: "desc" },
  });

  return Response.json(entrevistas);
}

// POST /api/entrevistas — agendar entrevista (RF-06)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { triagemId, dataHora, entrevistador } = body;

  if (!triagemId || !dataHora || !entrevistador) {
    return Response.json({ error: "triagemId, dataHora e entrevistador são obrigatórios" }, { status: 400 });
  }

  const entrevista = await prisma.entrevista.create({
    data: {
      triagemId,
      dataHora: new Date(dataHora),
      entrevistador,
    },
  });

  return Response.json(entrevista, { status: 201 });
}
