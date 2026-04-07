CREATE TABLE "TriagemEvento" (
    "id" TEXT NOT NULL,
    "triagemId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "origem" TEXT NOT NULL DEFAULT 'SISTEMA',
    "metadados" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TriagemEvento_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TriagemEvento"
ADD CONSTRAINT "TriagemEvento_triagemId_fkey"
FOREIGN KEY ("triagemId") REFERENCES "Triagem"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
