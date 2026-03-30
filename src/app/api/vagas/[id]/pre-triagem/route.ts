import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatCompletion, parseAIResponse } from "@/lib/openrouter";

// POST /api/vagas/[id]/pre-triagem — Pré-triagem IA: busca candidatos disponíveis
// e usa IA para identificar quais se encaixam na vaga (sem vincular)
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: vagaId } = await params;

  const vaga = await prisma.vaga.findUnique({
    where: { id: vagaId },
    include: { requisitos: true },
  });

  if (!vaga) {
    return Response.json({ error: "Vaga não encontrada" }, { status: 404 });
  }

  if (vaga.status === "FECHADA") {
    return Response.json({ error: "Vaga está fechada" }, { status: 400 });
  }

  // Busca todos os candidatos disponíveis que ainda não estão vinculados a esta vaga
  const candidatos = await prisma.candidato.findMany({
    where: {
      statusEmprego: "DISPONIVEL",
      triagens: {
        none: { vagaId },
      },
    },
    include: {
      skills: true,
      experiencias: { orderBy: { dataInicio: "desc" }, take: 3 },
    },
  });

  if (candidatos.length === 0) {
    return Response.json({
      candidatos_ids: [],
      message: "Nenhum candidato disponível encontrado",
    });
  }

  // Monta resumo dos candidatos para a IA analisar
  const candidatosResumo = candidatos.map((c) => ({
    id: c.id,
    nome: c.nome,
    jobType: c.jobType,
    resumo: c.resumo || "",
    skills: c.skills.map((s) => s.nome),
    experiencias: c.experiencias.map((e) => `${e.cargo} em ${e.empresa}`),
  }));

  const model = process.env.MODEL_ANALISE_VAGA;
  if (!model) {
    return Response.json({ error: "MODEL_ANALISE_VAGA não configurada" }, { status: 500 });
  }

  const systemPrompt = `Você é um analista de RH. Receba uma vaga e uma lista de candidatos.
Analise cada candidato e retorne APENAS os IDs dos que têm potencial para a vaga.
Considere: jobType, resumo profissional, skills e experiências.
Seja inclusivo — se houver chance razoável de encaixe, inclua o candidato.

Retorne APENAS um JSON válido (sem markdown):
{
  "candidatos_ids": ["id1", "id2", ...],
  "motivo": "explicação breve do critério usado"
}

Se nenhum candidato se encaixar, retorne candidatos_ids como array vazio.`;

  const userPrompt = `## VAGA
Título: ${vaga.titulo}
Área: ${vaga.area}
Tipo de Trabalho: ${vaga.jobType}
Descrição: ${vaga.descricao}
Requisitos:
${vaga.requisitos.map((r) => `- [${r.tipo}] ${r.descricao}`).join("\n")}

## CANDIDATOS (${candidatosResumo.length} total)
${candidatosResumo.map((c) => `- ID: ${c.id} | Nome: ${c.nome} | Tipo: ${c.jobType} | Resumo: ${c.resumo || "N/A"} | Skills: ${c.skills.join(", ") || "N/A"} | Exp: ${c.experiencias.join("; ") || "N/A"}`).join("\n")}`;

  try {
    const raw = await chatCompletion(model, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const resultado = parseAIResponse<{ candidatos_ids: string[]; motivo: string }>(raw);

    // Filtra apenas IDs válidos
    const idsValidos = new Set(candidatos.map((c) => c.id));
    const idsFinal = resultado.candidatos_ids.filter((id) => idsValidos.has(id));

    // Persiste no banco
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
      message: idsFinal.length > 0
        ? `${idsFinal.length} candidato(s) identificado(s) pela IA`
        : `Nenhum candidato aprovado pela IA. ${resultado.motivo}`,
    });
  } catch (error) {
    console.error("Erro na pré-triagem IA:", error);
    return Response.json({ error: "Erro ao processar análise da IA" }, { status: 500 });
  }
}
