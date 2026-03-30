-- CreateEnum
CREATE TYPE "StatusEmprego" AS ENUM ('DISPONIVEL', 'EMPREGADO', 'INATIVO');

-- AlterTable
ALTER TABLE "Candidato" ADD COLUMN     "genero" TEXT,
ADD COLUMN     "observacao" TEXT,
ADD COLUMN     "statusEmprego" "StatusEmprego" NOT NULL DEFAULT 'DISPONIVEL';

-- CreateTable
CREATE TABLE "Restricao" (
    "id" TEXT NOT NULL,
    "candidatoId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Restricao_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Restricao" ADD CONSTRAINT "Restricao_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "Candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE;
