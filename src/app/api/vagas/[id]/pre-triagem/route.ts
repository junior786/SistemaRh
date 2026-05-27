import { NextRequest } from "next/server";
import { resolveRequestContext } from "@/lib/request-context";
import { prisma } from "@/lib/prisma";
import { chatCompletion, parseAIResponse } from "@/lib/openrouter";
import {
  atendeCorteMinimoPreTriagem,
  calcularCompatibilidadeBase,
} from "@/lib/candidato-compatibilidade";

const SHORTLIST_LIMIT = 30;

// POST /api/vagas/[id]/pre-triagem
// Faz um filtro heuristico barato antes de chamar a IA.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveRequestContext();
  if (ctx instanceof Response) return ctx;
  const { empresa } = ctx;

  const { id: vagaId } = await params;

  const vaga = await prisma.vaga.findFirst({
    where: { id: vagaId, empresaId: empresa.id },
    include: { requisitos: true, areas: true },
  });

  if (!vaga) {
    return Response.json({ error: "Vaga não encontrada" }, { status: 404 });
  }

  if (vaga.status === "FECHADA") {
    return Response.json({ error: "Vaga esta fechada" }, { status: 400 });
  }

  const areasVaga = Array.from(new Set([vaga.area, ...vaga.areas.map((area) => area.nome)].filter(Boolean)));

  const candidatos = await prisma.candidato.findMany({
    where: {
      empresaId: empresa.id,
      statusEmprego: "DISPONIVEL",
      triagens: {
        none: { vagaId },
      },
      OR: [
        { jobType: { contains: vaga.jobType, mode: "insensitive" } },
        ...areasVaga.map((area) => ({
          areas: { some: { nome: { contains: area, mode: "insensitive" as const } } },
        })),
      ],
    },
    include: {
      areas: true,
      skills: true,
      experiencias: { orderBy: { dataInicio: "desc" }, take: 3 },
    },
  });

  if (candidatos.length === 0) {
    return Response.json({
      candidatos_ids: [],
      message: "Nenhum candidato disponivel encontrado",
    });
  }

  const vagaScoring = {
    area: vaga.area,
    areas: vaga.areas,
    jobType: vaga.jobType,
    modalidade: vaga.modalidade,
    cep: vaga.cep,
    salarioMax: vaga.salarioMax,
    requisitos: vaga.requisitos.map((requisito) => ({
      descricao: requisito.descricao,
      tipo: requisito.tipo,
    })),
  } as const;

  const candidatosComScore = candidatos
    .map((candidato) => ({
      candidato,
      scoreBase: calcularCompatibilidadeBase(
        {
          jobType: candidato.jobType,
          cep: candidato.cep,
          pretensaoSalarial: candidato.pretensaoSalarial,
          skills: candidato.skills,
          areas: candidato.areas,
        },
        vagaScoring,
      ),
    }))
    .filter(({ scoreBase }) => atendeCorteMinimoPreTriagem(scoreBase))
    .sort((a, b) => b.scoreBase.compatibilidade - a.scoreBase.compatibilidade);

  const shortlist = (candidatosComScore.length > 0
    ? candidatosComScore
    : candidatos.map((candidato) => ({
        candidato,
        scoreBase: {
          compatibilidade: 0,
          skillsMatch: [],
          salarioOk: null,
          localOk: null,
          areaOk: null,
          jobTypeOk: null,
        },
      })))
    .slice(0, SHORTLIST_LIMIT);

  const candidatosResumo = shortlist.map(({ candidato, scoreBase }) => ({
    id: candidato.id,
    nome: candidato.nome,
    jobType: candidato.jobType,
    areas: candidato.areas.map((area) => area.nome),
    resumo: (candidato.resumo || "").slice(0, 280),
    skills: candidato.skills.slice(0, 8).map((skill) => skill.nome),
    experiencias: candidato.experiencias.slice(0, 2).map((experiencia) => `${experiencia.cargo} em ${experiencia.empresa}`),
    scoreBase: scoreBase.compatibilidade,
    sinais: [
      scoreBase.jobTypeOk ? "jobType compativel" : null,
      scoreBase.areaOk ? "area compativel" : null,
      scoreBase.skillsMatch.length > 0 ? `${scoreBase.skillsMatch.length} requisito(s) com match` : null,
    ].filter(Boolean),
  }));

  const model = process.env.MODEL_ANALISE_VAGA;
  if (!model) {
    return Response.json({ error: "MODEL_ANALISE_VAGA não configurada" }, { status: 500 });
  }

  const systemPrompt = `Voce e um analista de RH. Receba uma vaga e uma lista de candidatos.
Analise cada candidato e retorne APENAS os IDs dos que tem potencial para a vaga.
Considere: jobType, areas de atuacao, resumo profissional, skills e experiencias.
Use o scoreBase apenas como pista inicial barata. Ele nao substitui sua analise.
Seja inclusivo: se houver chance razoavel de encaixe, inclua o candidato.

Retorne APENAS um JSON valido:
{
  "candidatos_ids": ["id1", "id2"],
  "motivo": "explicacao breve do criterio usado"
}

Se nenhum candidato se encaixar, retorne candidatos_ids como array vazio.`;

  const userPrompt = `## VAGA
Titulo: ${vaga.titulo}
Area principal: ${vaga.area}
Areas de atuacao: ${areasVaga.join(", ") || "N/A"}
Tipo de Trabalho: ${vaga.jobType}
Descricao: ${vaga.descricao}
Requisitos:
${vaga.requisitos.map((requisito) => `- [${requisito.tipo}] ${requisito.descricao}`).join("\n")}

## CANDIDATOS (${candidatosResumo.length} total)
${candidatosResumo.map((candidato) => `- ID: ${candidato.id} | Nome: ${candidato.nome} | Tipo: ${candidato.jobType} | Areas: ${candidato.areas.join(", ") || "N/A"} | ScoreBase: ${candidato.scoreBase} | Sinais: ${candidato.sinais.join(", ") || "N/A"} | Resumo: ${candidato.resumo || "N/A"} | Skills: ${candidato.skills.join(", ") || "N/A"} | Exp: ${candidato.experiencias.join("; ") || "N/A"}`).join("\n")}`;

  try {
    const raw = await chatCompletion(model, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const resultado = parseAIResponse<{ candidatos_ids: string[]; motivo: string }>(raw);
    const idsValidos = new Set(shortlist.map(({ candidato }) => candidato.id));
    const idsFinal = resultado.candidatos_ids.filter((id) => idsValidos.has(id));

    await prisma.vaga.update({
      where: { id: vagaId },
      data: {
        preTriagemIds: JSON.stringify(idsFinal),
        preTriagemMotivo: resultado.motivo,
      },
    });

    return Response.json({
      candidatos_ids: idsFinal,
      motivo: resultado.motivo,
      avaliados: shortlist.length,
      message: idsFinal.length > 0
        ? `${idsFinal.length} candidato(s) identificado(s) pela IA`
        : `Nenhum candidato aprovado pela IA. ${resultado.motivo}`,
    });
  } catch (error) {
    console.error("Erro na pre-triagem IA:", error);
    return Response.json({ error: "Erro ao processar análise da IA" }, { status: 500 });
  }
}
