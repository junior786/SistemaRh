-- AlterTable
ALTER TABLE "Candidato" ADD COLUMN     "jobType" TEXT;

-- AlterTable
ALTER TABLE "Vaga" ADD COLUMN     "jobType" TEXT,
ALTER COLUMN "modalidade" DROP DEFAULT;
