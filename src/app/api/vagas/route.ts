import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaginationMeta, parsePage, parsePageSize } from "@/lib/pagination";
import { normalizeEtapasInput } from "@/lib/vaga-etapas";
import { validateVagaFields } from "@/lib/form-validations";
import { resolveRequestContext } from "@/lib/request-context";

// GET /api/vagas — listar vagas com contagem de candidatos
export async function GET(request: NextRequest) {
  const ctx = await resolveRequestContext();
  if (ctx instanceof Response) return ctx;
  const { empresa } = ctx;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const area = searchParams.get("area");
  const busca = searchParams.get("busca");
  const page = parsePage(searchParams.get("page"));
  const pageSize = parsePageSize(searchParams.get("pageSize"));

  const where: Record<string, unknown> = { empresaId: empresa.id };
  if (status) where.status = status;
  if (area) where.area = area;
  if (busca) {
    where.OR = [
      { titulo: { contains: busca, mode: "insensitive" } },
      { area: { contains: busca, mode: "insensitive" } },
    ];
  }

  const total = await prisma.vaga.count({ where });
  const { totalPages, page: currentPage } = getPaginationMeta(total, page, pageSize);

  const vagas = await prisma.vaga.findMany({
    where,
    include: {
      _count: { select: { triagens: true } },
      areas: true,
      requisitos: true,
      etapas: { orderBy: { ordem: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
  });

  return Response.json({
    items: vagas,
    page: currentPage,
    pageSize,
    total,
    totalPages,
  });
}

// POST /api/vagas — criar vaga com requisitos
export async function POST(request: NextRequest) {
  const ctx = await resolveRequestContext();
  if (ctx instanceof Response) return ctx;
  const { empresa } = ctx;

  const body = await request.json();
  const { titulo, area, jobType, regime, modalidade, localizacao, cep, salarioMin, salarioMax, descricao, areas, requisitos, etapas } = body;
  const fieldErrors = validateVagaFields({ titulo, area, jobType, regime, modalidade, localizacao, descricao, cep });
  if (Object.keys(fieldErrors).length > 0) {
    return Response.json({ error: "Campos obrigatorios faltando", fieldErrors }, { status: 400 });
  }

  if (!titulo || !area || !regime || !modalidade || !localizacao || !descricao) {
    return Response.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  }

  if ((modalidade === "PRESENCIAL" || modalidade === "HIBRIDO") && !cep) {
    return Response.json({ error: "CEP é obrigatório para vagas presenciais ou híbridas" }, { status: 400 });
  }

  try {
    const etapasNormalizadas = normalizeEtapasInput(etapas);
    const vaga = await prisma.vaga.create({
      data: {
        empresaId: empresa.id,
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
        areas: {
          create: (areas || []).map((a: string) => ({ nome: a })),
        },
        requisitos: {
          create: (requisitos || []).map((r: { descricao: string; tipo: string; tempoMeses?: number | null }) => ({
            descricao: r.descricao,
            tipo: r.tipo,
            tempoMeses: r.tempoMeses ?? null,
          })),
        },
        etapas: {
          create: etapasNormalizadas.map((etapa, index) => ({
            nome: etapa.nome,
            tipo: etapa.tipo,
            obrigatoria: etapa.obrigatoria,
            ordem: index,
          })),
        },
      },
      include: {
        areas: true,
        requisitos: true,
        etapas: { orderBy: { ordem: "asc" } },
      },
    });

    return Response.json(vaga, { status: 201 });
  } catch (err) {
    console.error("Erro ao criar vaga:", err);
    return Response.json({ error: "Erro interno ao criar vaga", details: String(err) }, { status: 500 });
  }
}
