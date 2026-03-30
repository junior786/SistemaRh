import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeEtapasInput } from "@/lib/vaga-etapas";

// GET /api/vagas/[id] — detalhe da vaga
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const vaga = await prisma.vaga.findUnique({
    where: { id },
    include: {
      areas: true,
      requisitos: true,
      etapas: { orderBy: { ordem: "asc" } },
      empregados: {
        select: { id: true, nome: true, email: true },
      },
      triagens: {
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
      },
    },
  });

  if (!vaga) {
    return Response.json({ error: "Vaga não encontrada" }, { status: 404 });
  }

  return Response.json(vaga);
}

// PUT /api/vagas/[id] — atualizar vaga (marca triagens como desatualizadas - RN-03)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { titulo, area, jobType, regime, modalidade, localizacao, cep, salarioMin, salarioMax, descricao, status, areas, requisitos, etapas, contratadoIds } = body;

  try {
    if (etapas !== undefined) {
      const triagensCount = await prisma.triagem.count({ where: { vagaId: id } });
      if (triagensCount > 0) {
        return Response.json(
          { error: "Não é possível alterar as etapas de uma vaga que já possui candidatos vinculados." },
          { status: 409 },
        );
      }
    }

    // Atualiza vaga
    await prisma.vaga.update({
      where: { id },
      data: {
        ...(titulo && { titulo }),
        ...(area && { area }),
        ...(jobType && { jobType }),
        ...(regime && { regime }),
        ...(modalidade && { modalidade }),
        ...(localizacao && { localizacao }),
        ...(cep !== undefined && { cep: cep || null }),
        ...(salarioMin !== undefined && { salarioMin: salarioMin ? parseFloat(salarioMin) : null }),
        ...(salarioMax !== undefined && { salarioMax: salarioMax ? parseFloat(salarioMax) : null }),
        ...(descricao && { descricao }),
        ...(status && { status }),
      },
    });

    if (contratadoIds !== undefined) {
      const idsContratados = Array.isArray(contratadoIds)
        ? Array.from(new Set(contratadoIds.filter((value): value is string => typeof value === "string" && value.length > 0)))
        : [];

      const triagensValidas = await prisma.triagem.findMany({
        where: {
          vagaId: id,
          candidatoId: { in: idsContratados },
        },
        select: { candidatoId: true },
      });

      const idsValidos = new Set(triagensValidas.map((triagem) => triagem.candidatoId));
      if (idsValidos.size !== idsContratados.length) {
        return Response.json(
          { error: "So e permitido contratar candidatos vinculados a esta vaga." },
          { status: 400 },
        );
      }

      await prisma.$transaction([
        prisma.candidato.updateMany({
          where: {
            vagaEmpregadoId: id,
            id: { notIn: idsContratados },
          },
          data: {
            statusEmprego: "DISPONIVEL",
            vagaEmpregadoId: null,
          },
        }),
        prisma.candidato.updateMany({
          where: {
            id: { in: idsContratados },
          },
          data: {
            statusEmprego: "EMPREGADO",
            vagaEmpregadoId: id,
          },
        }),
      ]);
    }

    // Atualiza áreas se fornecidas
    if (areas) {
      await prisma.vagaArea.deleteMany({ where: { vagaId: id } });
      if (areas.length > 0) {
        await prisma.vagaArea.createMany({
          data: areas.map((a: string) => ({ vagaId: id, nome: a })),
        });
      }
    }

    // Se requisitos mudaram, atualiza-os e marca triagens como desatualizadas
    if (requisitos) {
      await prisma.requisito.deleteMany({ where: { vagaId: id } });
      if (requisitos.length > 0) {
        await prisma.requisito.createMany({
          data: requisitos.map((r: { descricao: string; tipo: string; tempoMeses?: number | null }) => ({
            vagaId: id,
            descricao: r.descricao,
            tipo: r.tipo,
            tempoMeses: r.tempoMeses ?? null,
          })),
        });
      }

      // RN-03: marca triagens existentes como desatualizadas
      await prisma.triagem.updateMany({
        where: { vagaId: id, status: "CONCLUIDO" },
        data: { desatualizado: true },
      });
    }

    if (etapas !== undefined) {
      const etapasNormalizadas = normalizeEtapasInput(etapas);
      await prisma.vagaEtapa.deleteMany({ where: { vagaId: id } });
      await prisma.vagaEtapa.createMany({
        data: etapasNormalizadas.map((etapa, index) => ({
          vagaId: id,
          nome: etapa.nome,
          tipo: etapa.tipo,
          obrigatoria: etapa.obrigatoria,
          ordem: index,
        })),
      });
    }

    // Retorna vaga atualizada com requisitos frescos
    const vagaAtualizada = await prisma.vaga.findUnique({
      where: { id },
      include: {
        areas: true,
        requisitos: true,
        etapas: { orderBy: { ordem: "asc" } },
        empregados: {
          select: { id: true, nome: true, email: true },
        },
      },
    });

    return Response.json(vagaAtualizada);
  } catch (err) {
    console.error("Erro ao atualizar vaga:", err);
    return Response.json({ error: "Erro interno ao atualizar vaga", details: String(err) }, { status: 500 });
  }
}

// DELETE /api/vagas/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.vaga.delete({ where: { id } });
  return Response.json({ ok: true });
}
