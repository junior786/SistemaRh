import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTwilioClient, sendTemplateMessage } from "@/lib/whatsapp";
import { getSingleTenantWhatsappEmpresa } from "@/lib/whatsapp-config";

const TEMPLATE_SLUG_ENTREVISTA = "entrevista_agendada";

// GET /api/entrevistas?triagemId=xxx  — entrevistas de uma triagem
// GET /api/entrevistas?from=ISO&to=ISO — entrevistas em um período (para calendário)
// GET /api/entrevistas                 — todas as entrevistas
export async function GET(request: NextRequest) {
  const triagemId = request.nextUrl.searchParams.get("triagemId");
  const vagaId = request.nextUrl.searchParams.get("vagaId");
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  // Filtro por triagem específica (usado na página de entrevistas do candidato)
  if (triagemId) {
    const entrevistas = await prisma.entrevista.findMany({
      where: { triagemId },
      include: { vagaEtapa: true },
      orderBy: { dataHora: "desc" },
    });
    return Response.json(entrevistas);
  }

  // Listagem geral (calendário) — opcionalmente filtrada por período
  const where: Record<string, unknown> = {};
  if (vagaId) {
    where.triagem = { vagaId };
  }
  if (from || to) {
    where.dataHora = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }

  const entrevistas = await prisma.entrevista.findMany({
    where,
    include: {
      triagem: {
        include: {
          candidato: { select: { id: true, nome: true, email: true, jobType: true } },
          vaga: { select: { id: true, titulo: true, area: true } },
        },
      },
      vagaEtapa: true,
    },
    orderBy: { dataHora: "asc" },
  });

  return Response.json(entrevistas);
}

// POST /api/entrevistas — agendar entrevista (RF-06)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { triagemId, vagaEtapaId, dataHora, entrevistador, notificarWhats = false } = body;

  if (!triagemId || !dataHora || !entrevistador) {
    return Response.json({ error: "triagemId, dataHora e entrevistador são obrigatórios" }, { status: 400 });
  }

  const entrevista = await prisma.entrevista.create({
    data: {
      triagemId,
      vagaEtapaId: vagaEtapaId || null,
      dataHora: new Date(dataHora),
      entrevistador,
      notificarWhats,
    },
    include: {
      triagem: {
        include: {
          candidato: { select: { id: true, telefone: true, nome: true } },
          vaga: { select: { titulo: true } },
        },
      },
    },
  });

  // RF-06 (parcial) — Notificação de entrevista via WhatsApp (opt-in, RN-08)
  if (notificarWhats && entrevista.triagem.candidato.telefone) {
    const empresa = await getSingleTenantWhatsappEmpresa();

    if (empresa) {
      try {
        const template = await prisma.twilioTemplate.findUnique({
          where: {
            empresaId_slug: { empresaId: empresa.id, slug: TEMPLATE_SLUG_ENTREVISTA },
          },
        });

        if (!template || !template.ativo) {
          console.warn(
            `Template Twilio '${TEMPLATE_SLUG_ENTREVISTA}' não encontrado para a empresa; notificação ignorada.`,
          );
        } else {
          const client = getTwilioClient(empresa.twilioAccountSid!, empresa.twilioAuthToken!);
          const dataFormatada = new Date(dataHora).toLocaleString("pt-BR");
          const sid = await sendTemplateMessage(
            client,
            empresa.twilioFromNumber!,
            entrevista.triagem.candidato.telefone,
            template.contentSid,
            { "1": dataFormatada, "2": entrevista.triagem.vaga.titulo },
          );

          await prisma.mensagem.create({
            data: {
              candidatoId: entrevista.triagem.candidato.id,
              providerMessageSid: sid,
              direcao: "ENVIADA",
              conteudo: `Entrevista agendada para ${dataFormatada} — ${entrevista.triagem.vaga.titulo}`,
              tipo: "TEMPLATE",
              templateId: template.id,
            },
          });
        }
      } catch (error) {
        console.error("Erro ao notificar via WhatsApp:", error);
        // Falha no envio não bloqueia a operação (RNF-07)
      }
    }
  }

  return Response.json(entrevista, { status: 201 });
}
