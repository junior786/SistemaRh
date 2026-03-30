import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { concluirEtapaEAvancar } from "@/lib/triagem-etapas";
import { analisarCompatibilidade, formatarTempoExperiencia } from "@/services/analise-compatibilidade";

// POST /api/triagens/[id]/analisar — RF-03: dispara análise de compatibilidade
// RNF-02: executa assincronamente, retorna 202 imediatamente
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const triagem = await prisma.triagem.findUnique({
    where: { id },
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

  // Marca como processando
  await prisma.triagem.update({
    where: { id },
    data: { status: "PROCESSANDO" },
  });

  // Dispara análise em background (não bloqueia a resposta)
  processarAnalise(id, triagem).catch(console.error);

  return Response.json({ status: "PROCESSANDO" }, { status: 202 });
}

async function processarAnalise(
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

    await prisma.triagem.update({
      where: { id: triagemId },
      data: {
        score: resultado.score,
        analise: resultado.analise,
        checklist: JSON.stringify(resultado.checklist),
        status: "CONCLUIDO",
        desatualizado: false,
        analisadoEm: new Date(),
      },
    });

    const etapaTriagem = triagem.etapas.find((etapa) => etapa.vagaEtapa.tipo === "TRIAGEM");
    if (etapaTriagem && etapaTriagem.status !== "CONCLUIDO") {
      await concluirEtapaEAvancar(triagemId, etapaTriagem.vagaEtapa.id);
    }
  } catch (error) {
    console.error("Erro na análise:", error);
    await prisma.triagem.update({
      where: { id: triagemId },
      data: { status: "ERRO" },
    });
  }
}
