// POST /api/whatsapp/send — RH envia mensagem para candidato
// body: { candidatoId, conteudo, tipo?: "LIVRE" | "TEMPLATE", templateSlug?, variaveis? }

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getTwilioClient,
  sendTextMessage,
  sendTemplateMessage,
} from "@/lib/whatsapp";
import { resolveRequestContext } from "@/lib/request-context";

export async function POST(request: NextRequest) {
  const ctx = await resolveRequestContext();
  if (ctx instanceof Response) return ctx;
  const { empresa } = ctx;

  const body = await request.json();
  const {
    candidatoId,
    conteudo,
    tipo = "LIVRE",
    templateSlug,
    variaveis,
  }: {
    candidatoId?: string;
    conteudo?: string;
    tipo?: "LIVRE" | "TEMPLATE";
    templateSlug?: string;
    variaveis?: Record<string, string>;
  } = body;

  if (!candidatoId) {
    return Response.json({ error: "candidatoId é obrigatório" }, { status: 400 });
  }
  if (tipo === "LIVRE" && !conteudo) {
    return Response.json({ error: "conteudo é obrigatório para mensagem livre" }, { status: 400 });
  }
  if (tipo === "TEMPLATE" && !templateSlug) {
    return Response.json({ error: "templateSlug é obrigatório para mensagem template" }, { status: 400 });
  }

  const candidato = await prisma.candidato.findFirst({ where: { id: candidatoId, empresaId: empresa.id } });
  if (!candidato) {
    return Response.json({ error: "Candidato não encontrado" }, { status: 404 });
  }
  if (!candidato.telefone) {
    return Response.json({ error: "Candidato não possui telefone cadastrado" }, { status: 400 });
  }

  if (!empresa.twilioAccountSid || !empresa.twilioAuthToken || !empresa.twilioFromNumber) {
    return Response.json({ error: "Credenciais Twilio não configuradas" }, { status: 400 });
  }

  // Modo temporario para testes locais: envio manual liberado sem checar janela de 24h.

  try {
    const client = getTwilioClient(empresa.twilioAccountSid!, empresa.twilioAuthToken!);
    const from = empresa.twilioFromNumber!;

    let providerMessageSid: string;
    let conteudoPersistido = conteudo ?? "";
    let templateIdPersistido: string | null = null;

    if (tipo === "TEMPLATE") {
      const template = await prisma.twilioTemplate.findUnique({
        where: { empresaId_slug: { empresaId: empresa.id, slug: templateSlug! } },
      });
      if (!template || !template.ativo) {
        return Response.json({ error: `Template '${templateSlug}' não encontrado ou inativo` }, { status: 404 });
      }
      providerMessageSid = await sendTemplateMessage(
        client,
        from,
        candidato.telefone,
        template.contentSid,
        variaveis,
      );
      templateIdPersistido = template.id;
      conteudoPersistido = conteudo ?? `[template:${template.slug}]`;
    } else {
      providerMessageSid = await sendTextMessage(
        client,
        from,
        candidato.telefone,
        conteudo!,
      );
    }

    const mensagem = await prisma.mensagem.create({
      data: {
        empresaId: empresa.id,
        candidatoId,
        providerMessageSid,
        direcao: "ENVIADA",
        conteudo: conteudoPersistido,
        tipo,
        templateId: templateIdPersistido,
      },
    });

    return Response.json(mensagem, { status: 201 });
  } catch (error) {
    console.error("Erro ao enviar WhatsApp:", error);
    const message = error instanceof Error ? error.message : "Falha ao enviar mensagem";
    return Response.json({ error: message }, { status: 500 });
  }
}
