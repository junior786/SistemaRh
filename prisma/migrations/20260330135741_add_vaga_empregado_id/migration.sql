-- AlterTable
ALTER TABLE "Candidato" ADD COLUMN     "vagaEmpregadoId" TEXT;

-- AddForeignKey
ALTER TABLE "Candidato" ADD CONSTRAINT "Candidato_vagaEmpregadoId_fkey" FOREIGN KEY ("vagaEmpregadoId") REFERENCES "Vaga"("id") ON DELETE SET NULL ON UPDATE CASCADE;
