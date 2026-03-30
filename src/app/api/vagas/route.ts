import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/vagas — listar vagas com contagem de candidatos
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const area = searchParams.get("area");
  const busca = searchParams.get("busca");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (area) where.area = area;
  if (busca) {
    where.OR = [
      { titulo: { contains: busca, mode: "insensitive" } },
      { area: { contains: busca, mode: "insensitive" } },
    ];
  }

  const vagas = await prisma.vaga.findMany({
    where,
    include: {
      _count: { select: { triagens: true } },
      requisitos: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(vagas);
}

// POST /api/vagas — criar vaga com requisitos
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { titulo, area, jobType, regime, modalidade, localizacao, cep, salarioMin, salarioMax, descricao, requisitos } = body;

  if (!titulo || !area || !regime || !modalidade || !localizacao || !descricao) {
    return Response.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  }

  if ((modalidade === "PRESENCIAL" || modalidade === "HIBRIDO") && !cep) {
    return Response.json({ error: "CEP é obrigatório para vagas presenciais ou híbridas" }, { status: 400 });
  }

  try {
    const vaga = await prisma.vaga.create({
      data: {
        titulo,
        area,
        jobType,
        regime,
        modalidade,
        localizacao,
        cep: cep || null,
        salarioMin: salarioMin ? parseFloat(salarioMin) : null,
        salarioMax: salarioMax ? parseFloat(salarioMax) : null,
        descricao,
        requisitos: {
          create: (requisitos || []).map((r: { descricao: string; tipo: string; tempoMeses?: number | null }) => ({
            descricao: r.descricao,
            tipo: r.tipo,
            tempoMeses: r.tempoMeses ?? null,
          })),
        },
      },
      include: { requisitos: true },
    });

    return Response.json(vaga, { status: 201 });
  } catch (err) {
    console.error("Erro ao criar vaga:", err);
    return Response.json({ error: "Erro interno ao criar vaga", details: String(err) }, { status: 500 });
  }
}
