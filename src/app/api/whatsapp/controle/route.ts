// POST /api/whatsapp/controle — RH assume ou retoma conversa (toggle IA)
// RF-13.1 — Modo de intervenção do RH

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { candidatoId, iaAtiva } = body;

  if (!candidatoId || typeof iaAtiva !== "boolean") {
    return Response.json(
      { error: "candidatoId e iaAtiva (boolean) são obrigatórios" },
      { status: 400 },
    );
  }

  const candidato = await prisma.candidato.findUnique({
    where: { id: candidatoId },
  });

  if (!candidato) {
    return Response.json({ error: "Candidato não encontrado" }, { status: 404 });
  }

  const controle = await prisma.controleConversa.upsert({
    where: { candidatoId },
    create: {
      candidatoId,
      iaAtiva,
      assumidoEm: iaAtiva ? null : new Date(),
    },
    update: {
      iaAtiva,
      assumidoEm: iaAtiva ? null : new Date(),
    },
  });

  return Response.json(controle);
}
