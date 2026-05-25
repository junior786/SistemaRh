// POST /api/whatsapp/mensagens/[id]/aprovar — RH aprova rascunho da IA e envia via Twilio
// body opcional: { conteudo?: string }  — se enviado, sobrescreve antes do envio

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTwilioClient, sendTextMessage } from "@/lib/whatsapp";
import { getSingleTenantWhatsappEmpresa } from "@/lib/whatsapp-config";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const conteudoOverride: string | undefined = body?.conteudo;

  const mensagem = await prisma.mensagem.findUnique({
    where: { id },
    include: { candidato: true },
  });
  if (!mensagem) {
    return Response.json({ error: "Mensagem não encontrada" }, { status: 404 });
  }
  if (!mensagem.iaRascunho) {
    return Response.json({ error: "Mensagem não é um rascunho" }, { status: 400 });
  }
  if (!mensagem.candidato.telefone) {
    return Response.json(
      { error: "Candidato não possui telefone cadastrado" },
      { status: 400 },
    );
  }

  const empresa = await getSingleTenantWhatsappEmpresa();
  if (!empresa) {
    return Response.json({ error: "Credenciais Twilio não configuradas" }, { status: 400 });
  }

  const conteudoFinal = conteudoOverride ?? mensagem.conteudo;

  try {
    const client = getTwilioClient(empresa.twilioAccountSid!, empresa.twilioAuthToken!);
    const sid = await sendTextMessage(
      client,
      empresa.twilioFromNumber!,
      mensagem.candidato.telefone,
      conteudoFinal,
    );

    const atualizada = await prisma.mensagem.update({
      where: { id },
      data: {
        conteudo: conteudoFinal,
        providerMessageSid: sid,
        iaRascunho: false,
        iaAprovadaEm: new Date(),
        status: "ENVIADA",
      },
    });

    return Response.json(atualizada);
  } catch (error) {
    console.error("Erro ao aprovar rascunho IA:", error);
    const message = error instanceof Error ? error.message : "Falha ao enviar";
    return Response.json({ error: message }, { status: 500 });
  }
}
