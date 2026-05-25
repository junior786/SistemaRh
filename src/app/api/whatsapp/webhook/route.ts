// POST /api/whatsapp/webhook — recebe mensagens e status updates do Twilio
// Twilio POSTa application/x-www-form-urlencoded com X-Twilio-Signature.

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildWebhookUrl,
  getTwilioClient,
  mapTwilioStatus,
  parseTwilioInboundForm,
  parseTwilioStatusForm,
  sendTextMessage,
  validateTwilioSignature,
} from "@/lib/whatsapp";
import { ContextoIA, gerarRespostaIA } from "@/lib/whatsapp-ia";
import { getSingleTenantWhatsappEmpresa } from "@/lib/whatsapp-config";
import { getPhoneMatchVariations } from "@/lib/phone";

export async function POST(request: NextRequest) {
  const empresa = await getSingleTenantWhatsappEmpresa();
  if (!empresa) {
    console.warn("Webhook Twilio recebido mas empresa não está configurada.");
    return new Response("Empresa não configurada", { status: 200 });
  }

  const rawBody = await request.text();
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(rawBody)) params[k] = v;

  const signature = request.headers.get("x-twilio-signature") ?? "";
  const url = buildWebhookUrl("/api/whatsapp/webhook");

  console.log("Twilio webhook recebido", {
    hasSignature: Boolean(signature),
    url,
    keys: Object.keys(params),
  });

  if (process.env.NODE_ENV === "production") {
    const ok = validateTwilioSignature(empresa.twilioAuthToken!, signature, url, params);
    if (!ok) {
      console.warn("Twilio webhook assinatura inválida");
      return new Response("Invalid signature", { status: 401 });
    }
  }

  // Twilio envia tanto inbound quanto status updates no mesmo endpoint configurado.
  const status = parseTwilioStatusForm(params);
  if (status && !params.Body) {
    if (status.status === "failed" || status.status === "undelivered" || status.errorCode) {
      console.warn("Twilio status FALHA", {
        messageSid: status.messageSid,
        status: status.status,
        errorCode: status.errorCode,
        errorMessage: status.errorMessage,
        to: status.to,
        from: status.from,
      });
    } else {
      console.log("Twilio status update", status);
    }
    await prisma.mensagem.updateMany({
      where: { providerMessageSid: status.messageSid },
      data: { status: mapTwilioStatus(status.status) },
    });
    return Response.json({ ok: true });
  }

  const inbound = parseTwilioInboundForm(params);
  if (!inbound) {
    return Response.json({ ok: true });
  }

  console.log("Twilio mensagem recebida", {
    from: inbound.from,
    waId: inbound.waId,
    hasBody: Boolean(inbound.body),
  });

  // Localiza candidato comparando apenas digitos do telefone (qualquer formato salvo casa).
  // Tambem tenta com/sem o 9 da nona posicao do celular BR.
  const phoneDigits = (inbound.waId ?? inbound.from.replace(/^whatsapp:/, "")).replace(/\D/g, "");
  const variations = getPhoneMatchVariations(phoneDigits);
  const matches = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Candidato"
    WHERE REGEXP_REPLACE(COALESCE("telefone", ''), '[^0-9]', '', 'g') = ANY(${variations}::text[])
    LIMIT 1
  `;

  if (matches.length === 0) {
    console.warn("Twilio mensagem ignorada: candidato não encontrado", {
      from: inbound.from,
      tentadas: variations,
    });
    return Response.json({ ok: true });
  }

  const candidato = await prisma.candidato.findUnique({
    where: { id: matches[0].id },
    include: {
      skills: true,
      areas: true,
      restricoes: true,
      experiencias: { orderBy: { dataInicio: "desc" }, take: 1 },
      triagens: {
        where: { status: { in: ["PENDENTE", "PROCESSANDO", "CONCLUIDO"] } },
        orderBy: { updatedAt: "desc" },
        take: 1,
        include: {
          vaga: true,
          etapas: {
            where: { status: { in: ["EM_ANDAMENTO", "PENDENTE"] } },
            orderBy: { createdAt: "asc" },
            take: 1,
            include: { vagaEtapa: true },
          },
        },
      },
    },
  });

  if (!candidato) {
    console.warn("Twilio mensagem ignorada: candidato sumiu apos match", { id: matches[0].id });
    return Response.json({ ok: true });
  }

  await prisma.mensagem.create({
    data: {
      candidatoId: candidato.id,
      providerMessageSid: inbound.messageSid,
      direcao: "RECEBIDA",
      conteudo: inbound.body,
      status: "ENTREGUE",
    },
  });

  if (!empresa.iaWhatsappAtivo) {
    console.log("IA nao respondera: empresa.iaWhatsappAtivo=false");
    return Response.json({ ok: true });
  }
  if (!inbound.body) {
    console.log("IA nao respondera: mensagem sem body");
    return Response.json({ ok: true });
  }

  const controle = await prisma.controleConversa.findUnique({
    where: { candidatoId: candidato.id },
  });
  if (controle && !controle.iaAtiva) {
    console.log("IA nao respondera: controle.iaAtiva=false (RH no controle)", {
      candidatoId: candidato.id,
      assumidoEm: controle.assumidoEm,
    });
    return Response.json({ ok: true });
  }

  const historicoRaw = await prisma.mensagem.findMany({
    where: { candidatoId: candidato.id },
    orderBy: { criadoEm: "desc" },
    take: 10,
    select: { direcao: true, conteudo: true },
  });

  // Vagas abertas (top 5 mais recentes) para a IA conseguir recomendar.
  const vagasAbertas = await prisma.vaga.findMany({
    where: { status: "ABERTA" },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      titulo: true,
      area: true,
      modalidade: true,
      localizacao: true,
      salarioMin: true,
      salarioMax: true,
    },
  });

  const triagem = candidato.triagens[0] ?? null;
  const vagaAtual = triagem?.vaga ?? null;

  // Proxima entrevista agendada do candidato em qualquer triagem ativa.
  const proximaEntrevista = triagem
    ? await prisma.entrevista.findFirst({
        where: {
          triagemId: triagem.id,
          status: "AGENDADA",
          dataHora: { gte: new Date() },
        },
        orderBy: { dataHora: "asc" },
        include: { triagem: { include: { vaga: { select: { titulo: true } } } } },
      })
    : null;

  const ctx: ContextoIA = {
    empresa: {
      nome: empresa.nome,
      iaPersona: empresa.iaPersona,
      iaTomVoz: empresa.iaTomVoz,
      iaFAQ: empresa.iaFAQ,
      iaBlocklist: empresa.iaBlocklist,
    },
    candidato: {
      nome: candidato.nome,
      jobType: candidato.jobType,
      cidade: candidato.cidade,
      resumo: candidato.resumo,
      skills: candidato.skills.map((s) => s.nome),
      areas: candidato.areas.map((a) => a.nome),
      restricoes: candidato.restricoes.map((r) => r.descricao),
      ultimaExperiencia: candidato.experiencias[0]
        ? {
            empresa: candidato.experiencias[0].empresa,
            cargo: candidato.experiencias[0].cargo,
          }
        : null,
    },
    vagaAtual: vagaAtual
      ? {
          titulo: vagaAtual.titulo,
          area: vagaAtual.area,
          regime: vagaAtual.regime,
          modalidade: vagaAtual.modalidade,
          localizacao: vagaAtual.localizacao,
          salarioMin: vagaAtual.salarioMin,
          salarioMax: vagaAtual.salarioMax,
          descricao: vagaAtual.descricao,
          etapaAtual: triagem?.etapas[0]?.vagaEtapa.nome ?? null,
        }
      : null,
    vagasAbertas,
    proximaEntrevista: proximaEntrevista
      ? {
          dataHora: proximaEntrevista.dataHora,
          entrevistador: proximaEntrevista.entrevistador,
          vagaTitulo: proximaEntrevista.triagem.vaga.titulo,
        }
      : null,
    historico: historicoRaw.reverse(),
    mensagemAtual: inbound.body,
  };

  try {
    const resposta = await gerarRespostaIA(ctx);

    // Modo draft: persiste rascunho e nao envia. RH aprova/edita/descarta pela UI.
    if (empresa.iaModoDraft) {
      await prisma.mensagem.create({
        data: {
          candidatoId: candidato.id,
          direcao: "ENVIADA",
          conteudo: resposta,
          geradaPorIA: true,
          iaRascunho: true,
        },
      });
      console.log("IA gerou rascunho aguardando aprovacao do RH", { candidatoId: candidato.id });
      return Response.json({ ok: true });
    }

    const client = getTwilioClient(empresa.twilioAccountSid!, empresa.twilioAuthToken!);
    const sid = await sendTextMessage(client, empresa.twilioFromNumber!, inbound.from, resposta);

    await prisma.mensagem.create({
      data: {
        candidatoId: candidato.id,
        providerMessageSid: sid,
        direcao: "ENVIADA",
        conteudo: resposta,
        geradaPorIA: true,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar resposta IA WhatsApp:", error);
  }

  return Response.json({ ok: true });
}
