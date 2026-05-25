-- Fase C: rascunhos da IA aguardando aprovacao do RH
ALTER TABLE "Mensagem" ADD COLUMN "iaRascunho" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Mensagem" ADD COLUMN "iaAprovadaEm" TIMESTAMP(3);
