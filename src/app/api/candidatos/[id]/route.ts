import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhoneBR } from "@/lib/phone";
import { validateCandidatoFields } from "@/lib/form-validations";
import { resolveRequestContext } from "@/lib/request-context";

// GET /api/candidatos/[id] - perfil completo do candidato
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveRequestContext();
  if (ctx instanceof Response) return ctx;
  const { empresa } = ctx;

  const { id } = await params;

  const candidato = await prisma.candidato.findFirst({
    where: { id, empresaId: empresa.id },
    include: {
      areas: true,
      skills: true,
      restricoes: true,
      experiencias: { orderBy: { dataInicio: "desc" } },
      formacoes: { orderBy: { dataInicio: "desc" } },
      vagaEmpregado: {
        select: { id: true, titulo: true, area: true },
      },
      triagens: {
        include: {
          vaga: { select: { id: true, titulo: true, area: true, status: true } },
          eventos: {
            where: { tipo: "OUTRAS_TRIAGENS_ENCERRADAS" },
            select: { tipo: true, descricao: true },
            take: 1,
          },
        },
        orderBy: { score: "desc" },
      },
    },
  });

  if (!candidato) {
    return Response.json({ error: "Candidato nao encontrado" }, { status: 404 });
  }

  const [mensagens, entrevistas, eventosTriagem] = await Promise.all([
    prisma.mensagem.findMany({
      where: { empresaId: empresa.id, candidatoId: id },
      orderBy: { criadoEm: "desc" },
      take: 50,
    }),
    prisma.entrevista.findMany({
      where: { triagem: { empresaId: empresa.id, candidatoId: id } },
      include: {
        triagem: {
          select: {
            id: true,
            vagaId: true,
            vaga: { select: { id: true, titulo: true, area: true } },
          },
        },
        vagaEtapa: {
          select: { id: true, nome: true },
        },
      },
      orderBy: { dataHora: "desc" },
      take: 50,
    }),
    prisma.triagemEvento.findMany({
      where: { empresaId: empresa.id, candidatoId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const timeline = [
    ...(candidato.observacao
      ? [{
          id: `observacao-${candidato.id}`,
          tipo: "OBSERVACAO",
          titulo: "Observacao do RH",
          descricao: candidato.observacao,
          createdAt: candidato.updatedAt,
          href: `/candidatos/${candidato.id}`,
          metadata: null,
        }]
      : []),
    ...mensagens.map((mensagem) => ({
      id: `mensagem-${mensagem.id}`,
      tipo: "MENSAGEM",
      titulo: mensagem.direcao === "RECEBIDA" ? "Mensagem recebida" : "Mensagem enviada",
      descricao: mensagem.conteudo,
      createdAt: mensagem.criadoEm,
      href: `/candidatos/${candidato.id}/mensagens`,
      metadata: {
        direcao: mensagem.direcao,
        status: mensagem.status,
        geradaPorIA: mensagem.geradaPorIA,
      },
    })),
    ...entrevistas.map((entrevista) => ({
      id: `entrevista-${entrevista.id}`,
      tipo: "ENTREVISTA",
      titulo: `Entrevista ${entrevista.status.toLowerCase()}`,
      descricao: `${entrevista.triagem.vaga.titulo}${entrevista.vagaEtapa?.nome ? ` • ${entrevista.vagaEtapa.nome}` : ""}${entrevista.entrevistador ? ` • ${entrevista.entrevistador}` : ""}`,
      createdAt: entrevista.dataHora,
      href: `/vagas/${entrevista.triagem.vaga.id}/triagem/${candidato.id}/entrevistas`,
      metadata: {
        status: entrevista.status,
        resultado: entrevista.resultado,
        vagaId: entrevista.triagem.vaga.id,
        vagaTitulo: entrevista.triagem.vaga.titulo,
      },
    })),
    ...eventosTriagem.map((evento) => ({
      id: `evento-${evento.id}`,
      tipo: "EVENTO_TRIAGEM",
      titulo: evento.tipo.replaceAll("_", " "),
      descricao: evento.descricao,
      createdAt: evento.createdAt,
      href: `/vagas/${evento.vagaId}/triagem`,
      metadata: {
        origem: evento.origem,
        vagaId: evento.vagaId,
        vagaTitulo: evento.vagaTitulo,
      },
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return Response.json({
    ...candidato,
    timeline,
  });
}

// PUT /api/candidatos/[id] - atualizar candidato
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveRequestContext();
  if (ctx instanceof Response) return ctx;
  const { empresa } = ctx;

  const { id } = await params;
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
  if (existente && existente.id !== id) {
    return Response.json({
      error: "Ja existe candidato com este email",
      fieldErrors: { email: "Ja existe candidato com este email" },
    }, { status: 409 });
  }

  try {
    const candidatoExiste = await prisma.candidato.findFirst({
      where: { id, empresaId: empresa.id },
      select: { id: true },
    });

    if (!candidatoExiste) {
      return Response.json({ error: "Candidato nao encontrado" }, { status: 404 });
    }

    const candidato = await prisma.candidato.update({
      where: { id },
      data: {
        ...(nome !== undefined && { nome }),
        ...(email !== undefined && { email }),
        ...(telefone !== undefined && { telefone: normalizePhoneBR(telefone) }),
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
      include: { areas: true, skills: true, experiencias: true, formacoes: true, restricoes: true },
    });

    if (areas) {
      await prisma.candidatoArea.deleteMany({ where: { candidatoId: id } });
      if (areas.length > 0) {
        await prisma.candidatoArea.createMany({
          data: areas.map((a: string) => ({ candidatoId: id, nome: a })),
        });
      }
    }

    if (skills) {
      await prisma.candidatoSkill.deleteMany({ where: { candidatoId: id } });
      await prisma.candidatoSkill.createMany({
        data: skills.map((s: string) => ({ candidatoId: id, nome: s })),
      });
    }

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

    if (restricoes) {
      await prisma.restricao.deleteMany({ where: { candidatoId: id } });
      if (restricoes.length > 0) {
        await prisma.restricao.createMany({
          data: restricoes.map((r: string) => ({ candidatoId: id, descricao: r })),
        });
      }
    }

    await prisma.triagem.updateMany({
      where: { empresaId: empresa.id, candidatoId: id, status: "CONCLUIDO" },
      data: { desatualizado: true },
    });

    return Response.json(candidato);
  } catch (err) {
    console.error("Erro ao atualizar candidato:", err);
    return Response.json({ error: "Erro interno ao atualizar candidato" }, { status: 500 });
  }
}

// DELETE /api/candidatos/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveRequestContext();
  if (ctx instanceof Response) return ctx;
  const { empresa } = ctx;

  const { id } = await params;
  const candidato = await prisma.candidato.findFirst({ where: { id, empresaId: empresa.id }, select: { id: true } });
  if (!candidato) return Response.json({ error: "Candidato nao encontrado" }, { status: 404 });

  await prisma.candidato.delete({ where: { id } });
  return Response.json({ ok: true });
}
