// GET/PUT /api/configuracoes/whatsapp — credenciais Twilio e toggle IA (RF-12)

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSingleTenantEmpresa } from "@/lib/whatsapp-config";

function maskToken(token: string | null): string | null {
  if (!token) return null;
  return `${token.slice(0, 8)}${"*".repeat(20)}`;
}

export async function GET() {
  const empresa = await getSingleTenantEmpresa();

  if (!empresa) {
    return Response.json({
      iaWhatsappAtivo: false,
      twilioAccountSid: null,
      twilioAuthToken: null,
      twilioFromNumber: null,
    });
  }

  return Response.json({
    iaWhatsappAtivo: empresa.iaWhatsappAtivo,
    twilioAccountSid: empresa.twilioAccountSid,
    twilioAuthToken: maskToken(empresa.twilioAuthToken),
    twilioFromNumber: empresa.twilioFromNumber,
  });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const {
    iaWhatsappAtivo,
    twilioAccountSid,
    twilioAuthToken,
    twilioFromNumber,
    nome,
  }: {
    iaWhatsappAtivo?: boolean;
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    twilioFromNumber?: string;
    nome?: string;
  } = body;

  let empresa = await getSingleTenantEmpresa();

  if (!empresa) {
    empresa = await prisma.empresa.create({
      data: {
        nome: nome || "Minha Empresa",
        iaWhatsappAtivo: iaWhatsappAtivo ?? false,
        twilioAccountSid: twilioAccountSid || null,
        twilioAuthToken: twilioAuthToken || null,
        twilioFromNumber: twilioFromNumber || null,
      },
    });
  } else {
    empresa = await prisma.empresa.update({
      where: { id: empresa.id },
      data: {
        ...(nome !== undefined && { nome }),
        ...(iaWhatsappAtivo !== undefined && { iaWhatsappAtivo }),
        ...(twilioAccountSid !== undefined && { twilioAccountSid: twilioAccountSid || null }),
        ...(twilioAuthToken !== undefined && { twilioAuthToken: twilioAuthToken || null }),
        ...(twilioFromNumber !== undefined && { twilioFromNumber: twilioFromNumber || null }),
      },
    });
  }

  return Response.json({
    iaWhatsappAtivo: empresa.iaWhatsappAtivo,
    twilioAccountSid: empresa.twilioAccountSid,
    twilioAuthToken: maskToken(empresa.twilioAuthToken),
    twilioFromNumber: empresa.twilioFromNumber,
  });
}
