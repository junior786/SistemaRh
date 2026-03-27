import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/vagas/[id] — detalhe da vaga
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const vaga = await prisma.vaga.findUnique({
    where: { id },
    include: {
      requisitos: true,
      triagens: {
        include: {
          candidato: {
            include: { skills: true },
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
  const { titulo, area, jobType, regime, modalidade, localizacao, cep, salarioMin, salarioMax, descricao, status, requisitos } = body;

  try {
    // Atualiza vaga
    const vaga = await prisma.vaga.update({
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
      include: { requisitos: true },
    });

    // Se requisitos mudaram, atualiza-os e marca triagens como desatualizadas
    if (requisitos) {
      await prisma.requisito.deleteMany({ where: { vagaId: id } });
      if (requisitos.length > 0) {
        await prisma.requisito.createMany({
          data: requisitos.map((r: { descricao: string; tipo: string }) => ({
            vagaId: id,
            descricao: r.descricao,
            tipo: r.tipo,
          })),
        });
      }

      // RN-03: marca triagens existentes como desatualizadas
      await prisma.triagem.updateMany({
        where: { vagaId: id, status: "CONCLUIDO" },
        data: { desatualizado: true },
      });
    }

    // Retorna vaga atualizada com requisitos frescos
    const vagaAtualizada = await prisma.vaga.findUnique({
      where: { id },
      include: { requisitos: true },
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
