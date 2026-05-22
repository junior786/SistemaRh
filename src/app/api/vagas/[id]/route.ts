import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { definirContratadosDaVaga } from "@/lib/contratacao";
import { registrarEventosTriagemLote, TRIAGEM_EVENTO_TIPO } from "@/lib/triagem-eventos";
import { normalizeEtapasInput } from "@/lib/vaga-etapas";
import { validateVagaFields } from "@/lib/form-validations";

async function carregarEventosVaga(vagaId: string) {
  try {
    return await prisma.triagemEvento.findMany({
      where: { vagaId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("TableDoesNotExist")
      || message.includes("triagemevento")
      || message.includes("TriagemEvento")
    ) {
      return [];
    }

    throw error;
  }
}

async function carregarVagaComHistorico(id: string) {
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
    return null;
  }

  const eventos = await carregarEventosVaga(id);

  return { ...vaga, eventos };
}

// GET /api/vagas/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const vaga = await carregarVagaComHistorico(id);

  if (!vaga) {
    return Response.json({ error: "Vaga não encontrada" }, { status: 404 });
  }

  return Response.json(vaga);
}

// PUT /api/vagas/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const {
    titulo,
    area,
    jobType,
    regime,
    modalidade,
    localizacao,
    cep,
    salarioMin,
    salarioMax,
    descricao,
    status,
    areas,
    requisitos,
    etapas,
    contratadoIds,
  } = body;

  const fieldErrors = validateVagaFields({ titulo, area, jobType, regime, modalidade, localizacao, descricao, cep });
  if (Object.keys(fieldErrors).length > 0) {
    return Response.json({ error: "Campos obrigatorios faltando", fieldErrors }, { status: 400 });
  }

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
      const ids = Array.isArray(contratadoIds) ? contratadoIds : [];
      await definirContratadosDaVaga(id, ids);

      const triagensFinalizadas = await prisma.triagem.findMany({
        where: { vagaId: id, candidatoId: { in: ids } },
        select: { id: true, candidatoId: true },
      });

      await registrarEventosTriagemLote(
        triagensFinalizadas.map((triagem) => ({
          triagemId: triagem.id,
          tipo: TRIAGEM_EVENTO_TIPO.VAGA_FINALIZADA,
          descricao: "Vaga finalizada com o candidato marcado como contratado.",
          origem: "RH",
          metadados: {
            vagaId: id,
            candidatoId: triagem.candidatoId,
            totalContratados: ids.length,
          },
        })),
      );
    }

    if (areas) {
      await prisma.vagaArea.deleteMany({ where: { vagaId: id } });
      if (areas.length > 0) {
        await prisma.vagaArea.createMany({
          data: areas.map((nome: string) => ({ vagaId: id, nome })),
        });
      }
    }

    if (requisitos) {
      await prisma.requisito.deleteMany({ where: { vagaId: id } });
      if (requisitos.length > 0) {
        await prisma.requisito.createMany({
          data: requisitos.map((requisito: { descricao: string; tipo: string; tempoMeses?: number | null }) => ({
            vagaId: id,
            descricao: requisito.descricao,
            tipo: requisito.tipo,
            tempoMeses: requisito.tempoMeses ?? null,
          })),
        });
      }

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

    const vagaAtualizada = await carregarVagaComHistorico(id);
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
