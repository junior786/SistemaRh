import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularCompatibilidadeBase, normalize } from "@/lib/candidato-compatibilidade";
import { getPaginationMeta, parsePage, parsePageSize } from "@/lib/pagination";

// GET /api/vagas/[id]/sugestoes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: vagaId } = await params;
  const { searchParams } = request.nextUrl;
  const busca = searchParams.get("busca")?.trim() ?? "";
  const page = parsePage(searchParams.get("page"));
  const pageSize = parsePageSize(searchParams.get("pageSize"));

  const vaga = await prisma.vaga.findUnique({
    where: { id: vagaId },
    include: {
      requisitos: true,
      areas: true,
    },
  });

  if (!vaga) {
    return Response.json({ error: "Vaga nao encontrada" }, { status: 404 });
  }

  const idsPreTriagem = (() => {
    if (!vaga.preTriagemIds) return null;
    try {
      const parsed = JSON.parse(vaga.preTriagemIds);
      return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : null;
    } catch {
      return null;
    }
  })();

  const areasVaga = Array.from(new Set([vaga.area, ...vaga.areas.map((area) => area.nome)].filter(Boolean)));

  const where: Record<string, unknown> = {
    statusEmprego: "DISPONIVEL",
    triagens: {
      none: { vagaId },
    },
  };

  if (idsPreTriagem && idsPreTriagem.length > 0) {
    where.id = { in: idsPreTriagem };
  } else {
    where.OR = [
      { jobType: { contains: vaga.jobType, mode: "insensitive" } },
      ...areasVaga.map((area) => ({
        areas: { some: { nome: { contains: area, mode: "insensitive" as const } } },
      })),
      { skills: { some: {} } },
    ];
  }

  if (busca) {
    where.AND = [
      {
        OR: [
          { nome: { contains: busca, mode: "insensitive" } },
          { email: { contains: busca, mode: "insensitive" } },
          { jobType: { contains: busca, mode: "insensitive" } },
          { cidade: { contains: busca, mode: "insensitive" } },
          { skills: { some: { nome: { contains: busca, mode: "insensitive" } } } },
          { areas: { some: { nome: { contains: busca, mode: "insensitive" } } } },
        ],
      },
    ];
  }

  const candidatos = await prisma.candidato.findMany({
    where,
    include: {
      areas: true,
      skills: true,
      _count: { select: { triagens: true } },
    },
  });

  const sugestoes = candidatos
    .map((candidato) => ({
      ...candidato,
      ...calcularCompatibilidadeBase(
        {
          jobType: candidato.jobType,
          cep: candidato.cep,
          pretensaoSalarial: candidato.pretensaoSalarial,
          skills: candidato.skills,
          areas: candidato.areas,
        },
        {
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
        },
      ),
    }))
    .filter((candidato) => {
      if (idsPreTriagem && idsPreTriagem.length > 0) {
        return true;
      }

      return candidato.compatibilidade >= 20
        || candidato.jobTypeOk
        || candidato.areaOk
        || candidato.skillsMatch.length > 0;
    })
    .sort((a, b) => {
      if (b.compatibilidade !== a.compatibilidade) {
        return b.compatibilidade - a.compatibilidade;
      }

      const aSkills = a.skillsMatch.length;
      const bSkills = b.skillsMatch.length;
      if (bSkills !== aSkills) {
        return bSkills - aSkills;
      }

      return normalize(a.nome).localeCompare(normalize(b.nome));
    });

  const total = sugestoes.length;
  const { totalPages, page: currentPage } = getPaginationMeta(total, page, pageSize);
  const items = sugestoes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return Response.json({
    items,
    page: currentPage,
    pageSize,
    total,
    totalPages,
    origem: idsPreTriagem && idsPreTriagem.length > 0 ? "PRE_TRIAGEM" : "HEURISTICA",
  });
}
