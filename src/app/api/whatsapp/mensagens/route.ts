// GET /api/whatsapp/mensagens?candidatoId=xxx — histórico de mensagens do candidato

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const candidatoId = request.nextUrl.searchParams.get("candidatoId");

  if (!candidatoId) {
    return Response.json({ error: "candidatoId é obrigatório" }, { status: 400 });
  }

  const mensagens = await prisma.mensagem.findMany({
    where: { candidatoId },
    orderBy: { criadoEm: "asc" },
  });

  const controle = await prisma.controleConversa.findUnique({
    where: { candidatoId },
  });

  // Última mensagem recebida para verificar janela de 24h
  const ultimaRecebida = await prisma.mensagem.findFirst({
    where: { candidatoId, direcao: "RECEBIDA" },
    orderBy: { criadoEm: "desc" },
    select: { criadoEm: true },
  });

  return Response.json({
    mensagens,
    controle: controle ?? { iaAtiva: true, assumidoEm: null },
    ultimaRecebidaEm: ultimaRecebida?.criadoEm ?? null,
  });
}
