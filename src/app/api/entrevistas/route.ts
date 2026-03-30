import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/entrevistas?triagemId=xxx  — entrevistas de uma triagem
// GET /api/entrevistas?from=ISO&to=ISO — entrevistas em um período (para calendário)
// GET /api/entrevistas                 — todas as entrevistas
export async function GET(request: NextRequest) {
  const triagemId = request.nextUrl.searchParams.get("triagemId");
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  // Filtro por triagem específica (usado na página de entrevistas do candidato)
  if (triagemId) {
    const entrevistas = await prisma.entrevista.findMany({
      where: { triagemId },
      orderBy: { dataHora: "desc" },
    });
    return Response.json(entrevistas);
  }

  // Listagem geral (calendário) — opcionalmente filtrada por período
  const where: Record<string, unknown> = {};
  if (from || to) {
    where.dataHora = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }

  const entrevistas = await prisma.entrevista.findMany({
    where,
    include: {
      triagem: {
        include: {
          candidato: { select: { id: true, nome: true, email: true, jobType: true } },
          vaga: { select: { id: true, titulo: true, area: true } },
        },
      },
    },
    orderBy: { dataHora: "asc" },
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
