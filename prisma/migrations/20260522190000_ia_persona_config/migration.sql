-- Fase A: persona/tom/FAQ/blocklist + modo draft para a IA WhatsApp
ALTER TABLE "Empresa" ADD COLUMN "iaPersona" TEXT;
ALTER TABLE "Empresa" ADD COLUMN "iaTomVoz" TEXT;
ALTER TABLE "Empresa" ADD COLUMN "iaFAQ" TEXT;
ALTER TABLE "Empresa" ADD COLUMN "iaBlocklist" TEXT;
ALTER TABLE "Empresa" ADD COLUMN "iaModoDraft" BOOLEAN NOT NULL DEFAULT false;
