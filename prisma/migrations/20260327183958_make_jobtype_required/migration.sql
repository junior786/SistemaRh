-- Preenche registros existentes com jobType NULL antes de tornar obrigatório
UPDATE "Candidato" SET "jobType" = 'Não especificado' WHERE "jobType" IS NULL;
UPDATE "Vaga" SET "jobType" = 'Não especificado' WHERE "jobType" IS NULL;

-- AlterTable
ALTER TABLE "Candidato" ALTER COLUMN "jobType" SET NOT NULL;

-- AlterTable
ALTER TABLE "Vaga" ALTER COLUMN "jobType" SET NOT NULL;
