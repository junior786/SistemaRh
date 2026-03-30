import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/candidatos/[id] — perfil completo do candidato
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const candidato = await prisma.candidato.findUnique({
    where: { id },
    include: {
      skills: true,
      restricoes: true,
      experiencias: { orderBy: { dataInicio: "desc" } },
      formacoes: { orderBy: { dataInicio: "desc" } },
      triagens: {
        include: { vaga: true },
        orderBy: { score: "desc" },
      },
    },
  });

  if (!candidato) {
    return Response.json({ error: "Candidato não encontrado" }, { status: 404 });
  }

  return Response.json(candidato);
}

// PUT /api/candidatos/[id] — atualizar candidato (marca triagens como desatualizadas - RN-03)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const {
    nome, email, telefone, cidade, cep, genero, resumo, jobType, pretensaoSalarial,
    observacao, statusEmprego,
    skills, experiencias, formacoes, restricoes,
  } = body;

  const candidato = await prisma.candidato.update({
    where: { id },
    data: {
      ...(nome && { nome }),
      ...(email && { email }),
      ...(telefone !== undefined && { telefone: telefone || null }),
      ...(cidade !== undefined && { cidade: cidade || null }),
      ...(cep !== undefined && { cep: cep || null }),
      ...(genero !== undefined && { genero: genero || null }),
      ...(resumo !== undefined && { resumo: resumo || null }),
      ...(jobType !== undefined && { jobType }),
      ...(pretensaoSalarial !== undefined && {
        pretensaoSalarial: pretensaoSalarial ? parseFloat(pretensaoSalarial) : null,
      }),
      ...(observacao !== undefined && { observacao: observacao || null }),
      ...(statusEmprego !== undefined && { statusEmprego }),
    },
    include: { skills: true, experiencias: true, formacoes: true, restricoes: true },
  });

  // Atualiza skills se fornecidas
  if (skills) {
    await prisma.candidatoSkill.deleteMany({ where: { candidatoId: id } });
    await prisma.candidatoSkill.createMany({
      data: skills.map((s: string) => ({ candidatoId: id, nome: s })),
    });
  }

  // Atualiza experiências se fornecidas
  if (experiencias) {
    await prisma.experiencia.deleteMany({ where: { candidatoId: id } });
    const expValidas = experiencias.filter((e: { dataInicio: string }) => e.dataInicio);
    if (expValidas.length > 0) {
      await prisma.experiencia.createMany({
        data: expValidas.map((e: {
          empresa: string; cargo: string; descricao?: string;
          dataInicio: string; dataFim?: string; atual?: boolean;
        }) => ({
          candidatoId: id,
          empresa: e.empresa,
          cargo: e.cargo,
          descricao: e.descricao || null,
          dataInicio: new Date(e.dataInicio),
          dataFim: e.dataFim ? new Date(e.dataFim) : null,
          atual: e.atual || false,
        })),
      });
    }
  }

  // Atualiza formações se fornecidas
  if (formacoes) {
    await prisma.formacao.deleteMany({ where: { candidatoId: id } });
    const formValidas = formacoes.filter((f: { dataInicio: string }) => f.dataInicio);
    if (formValidas.length > 0) {
      await prisma.formacao.createMany({
        data: formValidas.map((f: {
          instituicao: string; curso: string; nivel: string;
          dataInicio: string; dataFim?: string; atual?: boolean;
        }) => ({
          candidatoId: id,
          instituicao: f.instituicao,
          curso: f.curso,
          nivel: f.nivel,
          dataInicio: new Date(f.dataInicio),
          dataFim: f.dataFim ? new Date(f.dataFim) : null,
          atual: f.atual || false,
        })),
      });
    }
  }

  // Atualiza restrições se fornecidas
  if (restricoes) {
    await prisma.restricao.deleteMany({ where: { candidatoId: id } });
    if (restricoes.length > 0) {
      await prisma.restricao.createMany({
        data: restricoes.map((r: string) => ({ candidatoId: id, descricao: r })),
      });
    }
  }

  // RN-03: marca triagens como desatualizadas
  await prisma.triagem.updateMany({
    where: { candidatoId: id, status: "CONCLUIDO" },
    data: { desatualizado: true },
  });

  return Response.json(candidato);
}

// DELETE /api/candidatos/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.candidato.delete({ where: { id } });
  return Response.json({ ok: true });
}
