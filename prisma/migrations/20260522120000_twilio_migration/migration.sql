-- Migracao Meta -> Twilio
-- 1) Empresa: dropar campos waMeta, renomear/adicionar campos Twilio
-- 2) Mensagem: renomear waMessageId -> providerMessageSid (preserva dados)
-- 3) Criar tabela TwilioTemplate

-- ─────────────────────────────────────────────
-- Empresa
-- ─────────────────────────────────────────────
ALTER TABLE "Empresa" DROP CONSTRAINT IF EXISTS "Empresa_waPhoneNumberId_key";
DROP INDEX IF EXISTS "Empresa_waPhoneNumberId_key";

ALTER TABLE "Empresa" DROP COLUMN IF EXISTS "waPhoneNumberId";
ALTER TABLE "Empresa" DROP COLUMN IF EXISTS "waBusinessAccountId";
ALTER TABLE "Empresa" DROP COLUMN IF EXISTS "waAccessToken";

ALTER TABLE "Empresa" ADD COLUMN "twilioAccountSid" TEXT;
ALTER TABLE "Empresa" ADD COLUMN "twilioAuthToken" TEXT;
ALTER TABLE "Empresa" ADD COLUMN "twilioFromNumber" TEXT;

CREATE UNIQUE INDEX "Empresa_twilioAccountSid_key" ON "Empresa"("twilioAccountSid");

-- ─────────────────────────────────────────────
-- Mensagem
-- ─────────────────────────────────────────────
ALTER INDEX IF EXISTS "Mensagem_waMessageId_key" RENAME TO "Mensagem_providerMessageSid_key";
ALTER TABLE "Mensagem" RENAME COLUMN "waMessageId" TO "providerMessageSid";

-- ─────────────────────────────────────────────
-- TwilioTemplate
-- ─────────────────────────────────────────────
CREATE TABLE "TwilioTemplate" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "contentSid" TEXT NOT NULL,
    "variaveis" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwilioTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TwilioTemplate_empresaId_slug_key" ON "TwilioTemplate"("empresaId", "slug");

ALTER TABLE "TwilioTemplate" ADD CONSTRAINT "TwilioTemplate_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
