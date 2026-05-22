-- CreateTable
CREATE TABLE "VagaArea" (
    "id" TEXT NOT NULL,
    "vagaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VagaArea_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VagaArea" ADD CONSTRAINT "VagaArea_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "Vaga"("id") ON DELETE CASCADE ON UPDATE CASCADE;
