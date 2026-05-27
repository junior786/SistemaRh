import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const prisma = {
    vaga: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    candidato: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    triagem: {
      count: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    triagemEvento: {
      findMany: vi.fn(),
    },
    triagemEtapa: {
      findMany: vi.fn(),
    },
  };

  return {
    empresaId: "empresa-a",
    resolveRequestContext: vi.fn(),
    prisma,
  };
});

vi.mock("@/lib/request-context", () => ({
  resolveRequestContext: mocks.resolveRequestContext,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

import { GET } from "./route";

describe("GET /api/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.resolveRequestContext.mockResolvedValue({
      empresa: { id: mocks.empresaId },
      usuario: { id: "usuario-a" },
      membership: { id: "membership-a" },
    });

    mocks.prisma.vaga.groupBy.mockResolvedValue([]);
    mocks.prisma.candidato.count.mockResolvedValue(0);
    mocks.prisma.triagem.count.mockResolvedValue(0);
    mocks.prisma.triagem.aggregate.mockResolvedValue({ _avg: { score: null } });
    mocks.prisma.vaga.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mocks.prisma.candidato.findMany.mockResolvedValue([]);
    mocks.prisma.triagem.findMany.mockResolvedValue([]);
    mocks.prisma.triagemEvento.findMany.mockResolvedValue([]);
    mocks.prisma.triagemEtapa.findMany.mockResolvedValue([]);
  });

  it("escopa todas as agregacoes e consultas pelo tenant autenticado", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      metricas: {
        vagasAbertas: 0,
        totalCandidatos: 0,
      },
      pipeline: {
        pendentes: 0,
        processando: 0,
        concluidas: 0,
      },
    });

    expect(mocks.prisma.vaga.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { empresaId: mocks.empresaId } }),
    );

    for (const call of mocks.prisma.candidato.count.mock.calls) {
      expect(call[0].where).toEqual(expect.objectContaining({ empresaId: mocks.empresaId }));
    }

    for (const call of mocks.prisma.triagem.count.mock.calls) {
      expect(call[0].where).toEqual(expect.objectContaining({ empresaId: mocks.empresaId }));
    }

    expect(mocks.prisma.triagem.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ empresaId: mocks.empresaId }),
      }),
    );

    const [vagasRecentesCall, vagasDestaqueCall] = mocks.prisma.vaga.findMany.mock.calls;
    expect(vagasRecentesCall[0].where).toEqual(expect.objectContaining({ empresaId: mocks.empresaId }));
    expect(vagasDestaqueCall[0].where).toEqual({ empresaId: mocks.empresaId });
    expect(vagasDestaqueCall[0].include._count.select.triagens.where).toEqual({ empresaId: mocks.empresaId });
    expect(vagasDestaqueCall[0].include._count.select.empregados.where).toEqual({ empresaId: mocks.empresaId });
    expect(vagasDestaqueCall[0].include.triagens.where).toEqual({
      empresaId: mocks.empresaId,
      status: "CONCLUIDO",
    });

    expect(mocks.prisma.candidato.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ empresaId: mocks.empresaId }),
      }),
    );
    expect(mocks.prisma.triagem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ empresaId: mocks.empresaId }),
      }),
    );
    expect(mocks.prisma.triagemEvento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { empresaId: mocks.empresaId } }),
    );
    expect(mocks.prisma.triagemEtapa.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          triagem: { empresaId: mocks.empresaId },
        }),
      }),
    );
  });
});
