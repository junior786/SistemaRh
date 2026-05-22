// PUT/DELETE /api/configuracoes/whatsapp/templates/[id]

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { slug, nome, contentSid, variaveis, descricao, ativo } = body;

  try {
    const template = await prisma.twilioTemplate.update({
      where: { id },
      data: {
        ...(slug !== undefined && { slug }),
        ...(nome !== undefined && { nome }),
        ...(contentSid !== undefined && { contentSid }),
        ...(variaveis !== undefined && { variaveis }),
        ...(descricao !== undefined && { descricao: descricao || null }),
        ...(ativo !== undefined && { ativo }),
      },
    });
    return Response.json(template);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar template";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.twilioTemplate.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
