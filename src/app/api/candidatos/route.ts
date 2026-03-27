import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/candidatos — listar candidatos
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const busca = searchParams.get("busca");

  const where: Record<string, unknown> = {};
  if (busca) {
    where.OR = [
      { nome: { contains: busca, mode: "insensitive" } },
      { email: { contains: busca, mode: "insensitive" } },
      { cidade: { contains: busca, mode: "insensitive" } },
    ];
  }

  const candidatos = await prisma.candidato.findMany({
    where,
    include: {
      skills: true,
      _count: { select: { triagens: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(candidatos);
}

// POST /api/candidatos — criar candidato com skills, experiências, formações
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    nome, email, telefone, cidade, cep, resumo, jobType, pretensaoSalarial,
    skills, experiencias, formacoes,
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
      resumo: resumo || null,
      jobType,
      pretensaoSalarial: pretensaoSalarial ? parseFloat(pretensaoSalarial) : null,
      skills: {
        create: (skills || []).map((s: string) => ({ nome: s })),
      },
      experiencias: {
        create: (experiencias || []).map((e: {
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
        create: (formacoes || []).map((f: {
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
    },
    include: { skills: true, experiencias: true, formacoes: true },
  });

  return Response.json(candidato, { status: 201 });
}
