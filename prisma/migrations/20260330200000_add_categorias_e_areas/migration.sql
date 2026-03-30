-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidatoArea" (
    "id" TEXT NOT NULL,
    "candidatoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidatoArea_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Vaga" ADD COLUMN "preTriagemIds" TEXT;
ALTER TABLE "Vaga" ADD COLUMN "preTriagemMotivo" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_tipo_nome_key" ON "Categoria"("tipo", "nome");

-- AddForeignKey
ALTER TABLE "CandidatoArea" ADD CONSTRAINT "CandidatoArea_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "Candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: Áreas de atuação pré-definidas
INSERT INTO "Categoria" ("id", "tipo", "nome", "ordem", "updatedAt") VALUES
  (gen_random_uuid()::text, 'AREA_ATUACAO', 'Desenvolvimento', 0, NOW()),
  (gen_random_uuid()::text, 'AREA_ATUACAO', 'Líder Técnico', 1, NOW()),
  (gen_random_uuid()::text, 'AREA_ATUACAO', 'Arquitetura de Software', 2, NOW()),
  (gen_random_uuid()::text, 'AREA_ATUACAO', 'DevOps / Infra', 3, NOW()),
  (gen_random_uuid()::text, 'AREA_ATUACAO', 'QA / Testes', 4, NOW()),
  (gen_random_uuid()::text, 'AREA_ATUACAO', 'Dados / Analytics', 5, NOW()),
  (gen_random_uuid()::text, 'AREA_ATUACAO', 'Produto / PM', 6, NOW()),
  (gen_random_uuid()::text, 'AREA_ATUACAO', 'Design / UX', 7, NOW()),
  (gen_random_uuid()::text, 'AREA_ATUACAO', 'Suporte / Helpdesk', 8, NOW()),
  (gen_random_uuid()::text, 'AREA_ATUACAO', 'Administração', 9, NOW()),
  (gen_random_uuid()::text, 'AREA_ATUACAO', 'Financeiro', 10, NOW()),
  (gen_random_uuid()::text, 'AREA_ATUACAO', 'RH / Pessoas', 11, NOW()),
  (gen_random_uuid()::text, 'AREA_ATUACAO', 'Comercial / Vendas', 12, NOW()),
  (gen_random_uuid()::text, 'AREA_ATUACAO', 'Marketing', 13, NOW()),
  (gen_random_uuid()::text, 'AREA_ATUACAO', 'Logística', 14, NOW()),
  (gen_random_uuid()::text, 'AREA_ATUACAO', 'Operações', 15, NOW()),
  (gen_random_uuid()::text, 'AREA_ATUACAO', 'Jurídico', 16, NOW()),
  (gen_random_uuid()::text, 'AREA_ATUACAO', 'Saúde', 17, NOW()),
  (gen_random_uuid()::text, 'AREA_ATUACAO', 'Educação', 18, NOW()),
  (gen_random_uuid()::text, 'AREA_ATUACAO', 'Engenharia', 19, NOW()),
  (gen_random_uuid()::text, 'AREA_ATUACAO', 'Serviços Gerais', 20, NOW()),
  (gen_random_uuid()::text, 'AREA_ATUACAO', 'Motorista / Transporte', 21, NOW()),
  (gen_random_uuid()::text, 'AREA_ATUACAO', 'Outro', 22, NOW());
