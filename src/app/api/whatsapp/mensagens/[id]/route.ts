// PUT/DELETE /api/whatsapp/mensagens/[id] — editar conteudo ou descartar rascunho IA

import { NextRequest } from "next/server";
import { resolveRequestContext } from "@/lib/request-context";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveRequestContext();
  if (ctx instanceof Response) return ctx;
  const { empresa } = ctx;

  const { id } = await params;
  const { conteudo } = await request.json();

  if (!conteudo || typeof conteudo !== "string") {
    return Response.json({ error: "conteudo é obrigatório" }, { status: 400 });
  }

  const mensagem = await prisma.mensagem.findFirst({ where: { id, empresaId: empresa.id } });
  if (!mensagem) {
    return Response.json({ error: "Mensagem não encontrada" }, { status: 404 });
  }
  if (!mensagem.iaRascunho) {
    return Response.json(
      { error: "Apenas rascunhos podem ser editados" },
      { status: 400 },
    );
  }

  const atualizada = await prisma.mensagem.update({
    where: { id },
    data: { conteudo },
  });

  return Response.json(atualizada);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveRequestContext();
  if (ctx instanceof Response) return ctx;
  const { empresa } = ctx;

  const { id } = await params;

  const mensagem = await prisma.mensagem.findFirst({ where: { id, empresaId: empresa.id } });
  if (!mensagem) {
    return Response.json({ error: "Mensagem não encontrada" }, { status: 404 });
  }
  if (!mensagem.iaRascunho) {
    return Response.json(
      { error: "Apenas rascunhos podem ser descartados" },
      { status: 400 },
    );
  }

  await prisma.mensagem.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
