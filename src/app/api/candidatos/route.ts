import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaginationMeta, parsePage, parsePageSize } from "@/lib/pagination";
import { normalizePhoneBR } from "@/lib/phone";
import { validateCandidatoFields } from "@/lib/form-validations";
import { resolveRequestContext } from "@/lib/request-context";

// GET /api/candidatos - listar candidatos
export async function GET(request: NextRequest) {
  const ctx = await resolveRequestContext();
  if (ctx instanceof Response) return ctx;
  const { empresa } = ctx;

  const { searchParams } = request.nextUrl;
  const busca = searchParams.get("busca");
  const jobType = searchParams.get("jobType");
  const cidade = searchParams.get("cidade");
  const statusEmprego = searchParams.get("statusEmprego");
  const page = parsePage(searchParams.get("page"));
  const pageSize = parsePageSize(searchParams.get("pageSize"));

  const where: Record<string, unknown> = { empresaId: empresa.id };
  if (busca) {
    where.OR = [
      { nome: { contains: busca, mode: "insensitive" } },
      { email: { contains: busca, mode: "insensitive" } },
      { jobType: { contains: busca, mode: "insensitive" } },
      { cidade: { contains: busca, mode: "insensitive" } },
      { skills: { some: { nome: { contains: busca, mode: "insensitive" } } } },
    ];
  }
  if (jobType) {
    where.jobType = { contains: jobType, mode: "insensitive" };
  }
  if (cidade) {
    where.cidade = { contains: cidade, mode: "insensitive" };
  }
  if (statusEmprego) {
    where.statusEmprego = statusEmprego;
  }

  const total = await prisma.candidato.count({ where });
  const { totalPages, page: currentPage } = getPaginationMeta(total, page, pageSize);

  const candidatos = await prisma.candidato.findMany({
    where,
    include: {
      areas: true,
      skills: true,
      restricoes: true,
      _count: { select: { triagens: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
  });

  return Response.json({
    items: candidatos,
    page: currentPage,
    pageSize,
    total,
    totalPages,
  });
}

// POST /api/candidatos - criar candidato com skills, experiencias, formacoes
export async function POST(request: NextRequest) {
  const ctx = await resolveRequestContext();
  if (ctx instanceof Response) return ctx;
  const { empresa } = ctx;

  const body = await request.json();
  const {
    nome, email, telefone, cidade, cep, genero, resumo, jobType, pretensaoSalarial,
    observacao, statusEmprego,
    areas, skills, experiencias, formacoes, restricoes,
  } = body;

  const fieldErrors = validateCandidatoFields({ nome, email, jobType });
  if (Object.keys(fieldErrors).length > 0) {
    return Response.json({ error: "Campos obrigatorios faltando", fieldErrors }, { status: 400 });
  }

  const existente = await prisma.candidato.findUnique({ where: { empresaId_email: { empresaId: empresa.id, email } } });
  if (existente) {
    return Response.json({
      error: "Ja existe candidato com este email",
      fieldErrors: { email: "Ja existe candidato com este email" },
    }, { status: 409 });
  }

  try {
    const candidato = await prisma.candidato.create({
      data: {
        empresaId: empresa.id,
        nome,
        email,
        telefone: normalizePhoneBR(telefone),
        cidade: cidade || null,
        cep: cep || null,
        genero: genero || null,
        resumo: resumo || null,
        jobType,
        pretensaoSalarial: pretensaoSalarial ? parseFloat(pretensaoSalarial) : null,
        observacao: observacao || null,
        statusEmprego: statusEmprego || "DISPONIVEL",
        areas: {
          create: (areas || []).map((a: string) => ({ nome: a })),
        },
        skills: {
          create: (skills || []).map((s: string) => ({ nome: s })),
        },
        experiencias: {
          create: (experiencias || [])
            .filter((e: { dataInicio: string }) => e.dataInicio)
            .map((e: {
              empresa: string; cargo: string; descricao?: string;
              dataInicio: string; dataFim?: string; atual?: boolean;
            }) => ({
              empresa: e.empresa,
              cargo: e.cargo,
              descricao: e.descricao || null,
              dataInicio: new Date(e.dataInicio),
              dataFim: e.dataFim ? new Date(e.dataFim) : null,
              atual: e.atual || false,
            })),
        },
        formacoes: {
          create: (formacoes || [])
            .filter((f: { dataInicio: string }) => f.dataInicio)
            .map((f: {
              instituicao: string; curso: string; nivel: string;
              dataInicio: string; dataFim?: string; atual?: boolean;
            }) => ({
              instituicao: f.instituicao,
              curso: f.curso,
              nivel: f.nivel,
              dataInicio: new Date(f.dataInicio),
              dataFim: f.dataFim ? new Date(f.dataFim) : null,
              atual: f.atual || false,
            })),
        },
        restricoes: {
          create: (restricoes || []).map((r: string) => ({ descricao: r })),
        },
      },
      include: { areas: true, skills: true, experiencias: true, formacoes: true, restricoes: true },
    });

    return Response.json(candidato, { status: 201 });
  } catch (err) {
    console.error("Erro ao criar candidato:", err);
    return Response.json({ error: "Erro interno ao criar candidato" }, { status: 500 });
  }
}
