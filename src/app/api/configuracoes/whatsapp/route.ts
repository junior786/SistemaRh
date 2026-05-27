// GET/PUT /api/configuracoes/whatsapp — credenciais Twilio, toggle IA e config comportamento

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestContext } from "@/lib/request-context";

function maskToken(token: string | null): string | null {
  if (!token) return null;
  return `${token.slice(0, 8)}${"*".repeat(20)}`;
}

function shape(empresa: {
  iaWhatsappAtivo: boolean;
  twilioAccountSid: string | null;
  twilioAuthToken: string | null;
  twilioFromNumber: string | null;
  iaPersona: string | null;
  iaTomVoz: string | null;
  iaFAQ: string | null;
  iaBlocklist: string | null;
  iaModoDraft: boolean;
}) {
  return {
    iaWhatsappAtivo: empresa.iaWhatsappAtivo,
    twilioAccountSid: empresa.twilioAccountSid,
    twilioAuthToken: maskToken(empresa.twilioAuthToken),
    twilioFromNumber: empresa.twilioFromNumber,
    iaPersona: empresa.iaPersona,
    iaTomVoz: empresa.iaTomVoz,
    iaFAQ: empresa.iaFAQ,
    iaBlocklist: empresa.iaBlocklist,
    iaModoDraft: empresa.iaModoDraft,
  };
}

export async function GET() {
  const ctx = await resolveRequestContext();
  if (ctx instanceof Response) return ctx;
  const { empresa } = ctx;

  return Response.json(shape(empresa));
}

export async function PUT(request: NextRequest) {
  const ctx = await resolveRequestContext();
  if (ctx instanceof Response) return ctx;
  let { empresa } = ctx;

  const body = await request.json();
  const {
    iaWhatsappAtivo,
    twilioAccountSid,
    twilioAuthToken,
    twilioFromNumber,
    iaPersona,
    iaTomVoz,
    iaFAQ,
    iaBlocklist,
    iaModoDraft,
    nome,
  }: {
    iaWhatsappAtivo?: boolean;
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    twilioFromNumber?: string;
    iaPersona?: string | null;
    iaTomVoz?: string | null;
    iaFAQ?: string | null;
    iaBlocklist?: string | null;
    iaModoDraft?: boolean;
    nome?: string;
  } = body;

  {
    empresa = await prisma.empresa.update({
      where: { id: empresa.id },
      data: {
        ...(nome !== undefined && { nome }),
        ...(iaWhatsappAtivo !== undefined && { iaWhatsappAtivo }),
        ...(twilioAccountSid !== undefined && { twilioAccountSid: twilioAccountSid || null }),
        ...(twilioAuthToken !== undefined && { twilioAuthToken: twilioAuthToken || null }),
        ...(twilioFromNumber !== undefined && { twilioFromNumber: twilioFromNumber || null }),
        ...(iaPersona !== undefined && { iaPersona: iaPersona || null }),
        ...(iaTomVoz !== undefined && { iaTomVoz: iaTomVoz || null }),
        ...(iaFAQ !== undefined && { iaFAQ: iaFAQ || null }),
        ...(iaBlocklist !== undefined && { iaBlocklist: iaBlocklist || null }),
        ...(iaModoDraft !== undefined && { iaModoDraft }),
      },
    });
  }

  return Response.json(shape(empresa));
}
