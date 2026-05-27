import { NextRequest } from "next/server";
import { resolveRequestContext } from "@/lib/request-context";
import { prisma } from "@/lib/prisma";
import { concluirEtapaEAvancar } from "@/lib/triagem-etapas";
import { registrarEventoTriagem, TRIAGEM_EVENTO_TIPO } from "@/lib/triagem-eventos";
import { analisarCompatibilidade, formatarTempoExperiencia } from "@/services/analise-compatibilidade";

// POST /api/triagens/[id]/analisar - dispara analise de compatibilidade
// Executa assincronamente e retorna 202 imediatamente
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveRequestContext();
  if (ctx instanceof Response) return ctx;
  const { empresa } = ctx;

  const { id } = await params;

  const triagem = await prisma.triagem.findFirst({
    where: { id, empresaId: empresa.id },
    include: {
      vaga: { include: { requisitos: true, areas: true } },
      etapas: {
        include: {
          vagaEtapa: true,
        },
        orderBy: {
          vagaEtapa: {
            ordem: "asc",
          },
        },
      },
      candidato: {
        include: {
          areas: true,
          skills: true,
          restricoes: true,
          experiencias: { orderBy: { dataInicio: "desc" } },
          formacoes: { orderBy: { dataInicio: "desc" } },
        },
      },
    },
  });

  if (!triagem) {
    return Response.json({ error: "Triagem não encontrada" }, { status: 404 });
  }

  await prisma.triagem.updateMany({
    where: { id: triagem.id, empresaId: empresa.id },
    data: { status: "PROCESSANDO" },
  });

  await registrarEventoTriagem({
    triagemId: id,
    tipo: TRIAGEM_EVENTO_TIPO.ANALISE_SOLICITADA,
    descricao: "Análise de compatibilidade solicitada.",
    origem: "RH",
  });

  processarAnalise(empresa.id, id, triagem).catch(console.error);

  return Response.json({ status: "PROCESSANDO" }, { status: 202 });
}

async function processarAnalise(
  empresaId: string,
  triagemId: string,
  triagem: {
    etapas: {
      status: string;
      vagaEtapa: {
        id: string;
        tipo: string;
      };
    }[];
    vaga: {
      titulo: string;
      area: string;
      areas: { nome: string }[];
      jobType: string;
      regime: string;
      descricao: string;
      requisitos: { descricao: string; tipo: string; tempoMeses: number | null }[];
    };
    candidato: {
      nome: string;
      resumo: string | null;
      genero: string | null;
      jobType: string;
      areas: { nome: string }[];
      skills: { nome: string }[];
      restricoes: { descricao: string }[];
      experiencias: {
        empresa: string;
        cargo: string;
        descricao: string | null;
        dataInicio: Date;
        dataFim: Date | null;
      }[];
      formacoes: {
        instituicao: string;
        curso: string;
        nivel: string;
      }[];
    };
  },
) {
  try {
    const resultado = await analisarCompatibilidade(
      {
        titulo: triagem.vaga.titulo,
        area: triagem.vaga.area,
        areas: triagem.vaga.areas.map((area) => area.nome),
        jobType: triagem.vaga.jobType,
        regime: triagem.vaga.regime,
        descricao: triagem.vaga.descricao,
        requisitos: triagem.vaga.requisitos.map((r) => ({
          descricao: r.descricao,
          tipo: r.tipo as "OBRIGATORIO" | "DESEJAVEL",
          tempoMeses: r.tempoMeses,
        })),
      },
      {
        nome: triagem.candidato.nome,
        resumo: triagem.candidato.resumo,
        genero: triagem.candidato.genero,
        jobType: triagem.candidato.jobType,
        areas: triagem.candidato.areas.map((area) => area.nome),
        skills: triagem.candidato.skills.map((s) => s.nome),
        restricoes: triagem.candidato.restricoes.map((r) => r.descricao),
        experiencias: triagem.candidato.experiencias.map((e) => ({
          empresa: e.empresa,
          cargo: e.cargo,
          descricao: e.descricao,
          tempoFormatado: formatarTempoExperiencia(
            e.dataInicio.toISOString(),
            e.dataFim?.toISOString() ?? null,
          ),
        })),
        formacoes: triagem.candidato.formacoes.map((f) => ({
          instituicao: f.instituicao,
          curso: f.curso,
          nivel: f.nivel,
        })),
      },
    );

    await prisma.triagem.updateMany({
      where: { id: triagemId, empresaId },
      data: {
        score: resultado.score,
        analise: resultado.analise,
        checklist: JSON.stringify(resultado.checklist),
        status: "CONCLUIDO",
        desatualizado: false,
        analisadoEm: new Date(),
      },
    });

    await registrarEventoTriagem({
      triagemId,
      tipo: TRIAGEM_EVENTO_TIPO.ANALISE_CONCLUIDA,
      descricao: `Análise concluída com score ${resultado.score}%.`,
      origem: "SISTEMA",
      metadados: { score: resultado.score },
    });

    const etapaTriagem = triagem.etapas.find((etapa) => etapa.vagaEtapa.tipo === "TRIAGEM");
    if (etapaTriagem && etapaTriagem.status !== "CONCLUIDO") {
      await concluirEtapaEAvancar(empresaId, triagemId, etapaTriagem.vagaEtapa.id);
    }
  } catch (error) {
    console.error("Erro na analise:", error);
    await registrarEventoTriagem({
      triagemId,
      tipo: TRIAGEM_EVENTO_TIPO.ANALISE_COM_ERRO,
      descricao: "Análise de compatibilidade falhou.",
      origem: "SISTEMA",
      metadados: {
        erro: error instanceof Error ? error.message : String(error),
      },
    });
    await prisma.triagem.updateMany({
      where: { id: triagemId, empresaId },
      data: { status: "ERRO" },
    });
  }
}
