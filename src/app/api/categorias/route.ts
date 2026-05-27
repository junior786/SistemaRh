import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestContext } from "@/lib/request-context";

// GET /api/categorias?tipo=AREA_ATUACAO — listar categorias por tipo
export async function GET(request: NextRequest) {
  const ctx = await resolveRequestContext();
  if (ctx instanceof Response) return ctx;
  const { empresa } = ctx;

  const tipo = request.nextUrl.searchParams.get("tipo");

  const where: Record<string, unknown> = { empresaId: empresa.id };
  if (tipo) where.tipo = tipo;

  const categorias = await prisma.categoria.findMany({
    where,
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
  });

  return Response.json(categorias);
}

// POST /api/categorias — criar nova categoria
export async function POST(request: NextRequest) {
  const ctx = await resolveRequestContext();
  if (ctx instanceof Response) return ctx;
  const { empresa } = ctx;

  const body = await request.json();
  const { tipo, nome } = body;

  if (!tipo || !nome?.trim()) {
    return Response.json({ error: "Tipo e nome são obrigatórios" }, { status: 400 });
  }

  // Verifica duplicata
  const existente = await prisma.categoria.findUnique({
    where: { empresaId_tipo_nome: { empresaId: empresa.id, tipo, nome: nome.trim() } },
  });

  if (existente) {
    return Response.json({ error: "Categoria já existe" }, { status: 409 });
  }

  // Pega a maior ordem atual para colocar no final
  const ultima = await prisma.categoria.findFirst({
    where: { tipo },
    orderBy: { ordem: "desc" },
    select: { ordem: true },
  });

  const categoria = await prisma.categoria.create({
    data: {
      empresaId: empresa.id,
      tipo,
      nome: nome.trim(),
      ordem: (ultima?.ordem ?? -1) + 1,
    },
  });

  return Response.json(categoria, { status: 201 });
}

// DELETE /api/categorias?id=xxx — remover categoria
export async function DELETE(request: NextRequest) {
  const ctx = await resolveRequestContext();
  if (ctx instanceof Response) return ctx;
  const { empresa } = ctx;

  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return Response.json({ error: "ID é obrigatório" }, { status: 400 });
  }

  const categoria = await prisma.categoria.findFirst({ where: { id, empresaId: empresa.id }, select: { id: true } });
  if (!categoria) return Response.json({ error: "Categoria nao encontrada" }, { status: 404 });

  await prisma.categoria.delete({ where: { id } });
  return Response.json({ ok: true });
}

// PATCH /api/categorias — atualizar categoria (nome, ordem, ativa)
export async function PATCH(request: NextRequest) {
  const ctx = await resolveRequestContext();
  if (ctx instanceof Response) return ctx;
  const { empresa } = ctx;

  const body = await request.json();
  const { id, nome, ordem, ativa } = body;

  if (!id) {
    return Response.json({ error: "ID é obrigatório" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (nome !== undefined) data.nome = nome.trim();
  if (ordem !== undefined) data.ordem = ordem;
  if (ativa !== undefined) data.ativa = ativa;

  const categoriaExiste = await prisma.categoria.findFirst({ where: { id, empresaId: empresa.id }, select: { id: true } });
  if (!categoriaExiste) return Response.json({ error: "Categoria nao encontrada" }, { status: 404 });

  const categoria = await prisma.categoria.update({
    where: { id },
    data,
  });

  return Response.json(categoria);
}
