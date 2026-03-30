import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaginationMeta, parsePage, parsePageSize } from "@/lib/pagination";

// GET /api/candidatos — listar candidatos
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const busca = searchParams.get("busca");
  const jobType = searchParams.get("jobType");
  const cidade = searchParams.get("cidade");
  const page = parsePage(searchParams.get("page"));
  const pageSize = parsePageSize(searchParams.get("pageSize"));

  const where: Record<string, unknown> = {};
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

  const total = await prisma.candidato.count({ where });
  const { totalPages, page: currentPage } = getPaginationMeta(total, page, pageSize);

  const candidatos = await prisma.candidato.findMany({
    where,
    include: {
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

// POST /api/candidatos — criar candidato com skills, experiências, formações
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    nome, email, telefone, cidade, cep, genero, resumo, jobType, pretensaoSalarial,
    observacao, statusEmprego,
    skills, experiencias, formacoes, restricoes,
  } = body;

  if (!nome || !email) {
    return Response.json({ error: "Nome e email são obrigatórios" }, { status: 400 });
  }

  // Verifica email duplicado
  const existente = await prisma.candidato.findUnique({ where: { email } });
  if (existente) {
    return Response.json({ error: "Já existe candidato com este email" }, { status: 409 });
  }

  const candidato = await prisma.candidato.create({
    data: {
      nome,
      email,
      telefone: telefone || null,
      cidade: cidade || null,
      cep: cep || null,
      genero: genero || null,
      resumo: resumo || null,
      jobType,
      pretensaoSalarial: pretensaoSalarial ? parseFloat(pretensaoSalarial) : null,
      observacao: observacao || null,
      statusEmprego: statusEmprego || "DISPONIVEL",
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
    include: { skills: true, experiencias: true, formacoes: true, restricoes: true },
  });

  return Response.json(candidato, { status: 201 });
}
