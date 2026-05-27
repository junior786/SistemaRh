import { prisma } from "@/lib/prisma";
import { resolveRequestContext } from "@/lib/request-context";

// GET /api/candidatos/filtros — valores distintos para chips de filtro
export async function GET() {
  const ctx = await resolveRequestContext();
  if (ctx instanceof Response) return ctx;
  const { empresa } = ctx;

  const [tiposRaw, cidadesRaw] = await Promise.all([
    prisma.candidato.findMany({
      where: { empresaId: empresa.id, statusEmprego: "DISPONIVEL", jobType: { not: "" } },
      select: { jobType: true },
      distinct: ["jobType"],
      orderBy: { jobType: "asc" },
    }),
    prisma.candidato.findMany({
      where: { empresaId: empresa.id, statusEmprego: "DISPONIVEL", cidade: { not: null } },
      select: { cidade: true },
      distinct: ["cidade"],
      orderBy: { cidade: "asc" },
    }),
  ]);

  return Response.json({
    tipos: tiposRaw.map((r) => r.jobType).filter(Boolean),
    cidades: cidadesRaw.map((r) => r.cidade).filter(Boolean),
  });
}
