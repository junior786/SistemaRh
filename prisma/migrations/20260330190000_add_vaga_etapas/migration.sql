CREATE TYPE "VagaEtapaTipo" AS ENUM (
  'TRIAGEM',
  'ENTREVISTA',
  'TESTE_TECNICO',
  'DINAMICA',
  'ENTREVISTA_GESTOR',
  'OFERTA',
  'ADMISSAO',
  'OUTRO'
);

CREATE TYPE "TriagemEtapaStatus" AS ENUM (
  'PENDENTE',
  'EM_ANDAMENTO',
  'CONCLUIDO',
  'REPROVADO',
  'DISPENSADO'
);

CREATE TABLE "VagaEtapa" (
  "id" TEXT NOT NULL,
  "vagaId" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "tipo" "VagaEtapaTipo" NOT NULL,
  "ordem" INTEGER NOT NULL,
  "obrigatoria" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VagaEtapa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TriagemEtapa" (
  "id" TEXT NOT NULL,
  "triagemId" TEXT NOT NULL,
  "vagaEtapaId" TEXT NOT NULL,
  "status" "TriagemEtapaStatus" NOT NULL DEFAULT 'PENDENTE',
  "observacao" TEXT,
  "iniciadaEm" TIMESTAMP(3),
  "concluidaEm" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TriagemEtapa_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Entrevista" ADD COLUMN "vagaEtapaId" TEXT;

CREATE UNIQUE INDEX "VagaEtapa_vagaId_ordem_key" ON "VagaEtapa"("vagaId", "ordem");
CREATE UNIQUE INDEX "TriagemEtapa_triagemId_vagaEtapaId_key" ON "TriagemEtapa"("triagemId", "vagaEtapaId");

ALTER TABLE "VagaEtapa" ADD CONSTRAINT "VagaEtapa_vagaId_fkey"
FOREIGN KEY ("vagaId") REFERENCES "Vaga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TriagemEtapa" ADD CONSTRAINT "TriagemEtapa_triagemId_fkey"
FOREIGN KEY ("triagemId") REFERENCES "Triagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TriagemEtapa" ADD CONSTRAINT "TriagemEtapa_vagaEtapaId_fkey"
FOREIGN KEY ("vagaEtapaId") REFERENCES "VagaEtapa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Entrevista" ADD CONSTRAINT "Entrevista_vagaEtapaId_fkey"
FOREIGN KEY ("vagaEtapaId") REFERENCES "VagaEtapa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
