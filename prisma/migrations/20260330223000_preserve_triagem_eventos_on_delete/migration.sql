ALTER TABLE "TriagemEvento"
ALTER COLUMN "triagemId" DROP NOT NULL;

ALTER TABLE "TriagemEvento"
ADD COLUMN "vagaId" TEXT,
ADD COLUMN "vagaTitulo" TEXT,
ADD COLUMN "candidatoId" TEXT,
ADD COLUMN "candidatoNome" TEXT;

UPDATE "TriagemEvento" te
SET
  "vagaId" = t."vagaId",
  "vagaTitulo" = v."titulo",
  "candidatoId" = t."candidatoId",
  "candidatoNome" = c."nome"
FROM "Triagem" t
JOIN "Vaga" v ON v."id" = t."vagaId"
JOIN "Candidato" c ON c."id" = t."candidatoId"
WHERE te."triagemId" = t."id";

ALTER TABLE "TriagemEvento"
ALTER COLUMN "vagaId" SET NOT NULL,
ALTER COLUMN "vagaTitulo" SET NOT NULL,
ALTER COLUMN "candidatoId" SET NOT NULL,
ALTER COLUMN "candidatoNome" SET NOT NULL;

ALTER TABLE "TriagemEvento"
DROP CONSTRAINT "TriagemEvento_triagemId_fkey";

ALTER TABLE "TriagemEvento"
ADD CONSTRAINT "TriagemEvento_triagemId_fkey"
FOREIGN KEY ("triagemId") REFERENCES "Triagem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
