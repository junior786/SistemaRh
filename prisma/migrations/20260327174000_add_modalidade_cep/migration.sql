-- CreateEnum
CREATE TYPE "Modalidade" AS ENUM ('PRESENCIAL', 'REMOTO', 'HIBRIDO');

-- AlterTable Vaga: add modalidade with default, then remove default
ALTER TABLE "Vaga" ADD COLUMN "modalidade" "Modalidade" NOT NULL DEFAULT 'PRESENCIAL';
ALTER TABLE "Vaga" ADD COLUMN "cep" TEXT;

-- AlterTable Candidato: add cep
ALTER TABLE "Candidato" ADD COLUMN "cep" TEXT;
