// GET/POST /api/configuracoes/whatsapp/templates — gestão de templates Twilio (ContentSid)

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestContext } from "@/lib/request-context";

export async function GET() {
  const ctx = await resolveRequestContext();
  if (ctx instanceof Response) return ctx;
  const { empresa } = ctx;

  const templates = await prisma.twilioTemplate.findMany({
    where: { empresaId: empresa.id },
    orderBy: { createdAt: "asc" },
  });
  return Response.json(templates);
}

export async function POST(request: NextRequest) {
  const ctx = await resolveRequestContext();
  if (ctx instanceof Response) return ctx;
  const { empresa } = ctx;

  const body = await request.json();
  const { slug, nome, contentSid, variaveis, descricao, ativo } = body;

  if (!slug || !nome || !contentSid) {
    return Response.json(
      { error: "slug, nome e contentSid são obrigatórios" },
      { status: 400 },
    );
  }

  try {
    const template = await prisma.twilioTemplate.create({
      data: {
        empresaId: empresa.id,
        slug,
        nome,
        contentSid,
        variaveis: typeof variaveis === "string" ? variaveis : "",
        descricao: descricao || null,
        ativo: ativo ?? true,
      },
    });
    return Response.json(template, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar template";
    return Response.json({ error: message }, { status: 400 });
  }
}
