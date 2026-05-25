-- Multi-tenant modelagem (MT 01)
-- Estratégia: shared database / shared schema com empresaId em cada entidade de domínio.
-- Pré-condição: existe pelo menos 1 registro em "Empresa". Caso contrário, abortar.

-- ─────────────────────────────────────────────
-- Enums novos
-- ─────────────────────────────────────────────
CREATE TYPE "EmpresaStatus" AS ENUM ('ATIVA', 'SUSPENSA', 'INATIVA');
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'RECRUITER', 'VIEWER');

-- ─────────────────────────────────────────────
-- Empresa: adicionar colunas. "slug" entra nullable para backfill.
-- ─────────────────────────────────────────────
ALTER TABLE "Empresa"
  ADD COLUMN "slug"          TEXT,
  ADD COLUMN "dominioCustom" TEXT,
  ADD COLUMN "status"        "EmpresaStatus" NOT NULL DEFAULT 'ATIVA',
  ADD COLUMN "timezone"      TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  ADD COLUMN "logoUrl"       TEXT,
  ADD COLUMN "corPrimaria"   TEXT;

-- Backfill slug para empresas existentes.
-- Se houver mais de uma empresa, ajuste manualmente antes de aplicar a constraint.
UPDATE "Empresa"
SET "slug" = CONCAT('empresa-', LOWER(SUBSTRING("id" FROM 1 FOR 8)))
WHERE "slug" IS NULL;

ALTER TABLE "Empresa" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "Empresa_slug_key" ON "Empresa"("slug");
CREATE UNIQUE INDEX "Empresa_dominioCustom_key" ON "Empresa"("dominioCustom");

-- ─────────────────────────────────────────────
-- Entidades de domínio: adicionar empresaId nullable, backfill, depois NOT NULL.
-- ─────────────────────────────────────────────
ALTER TABLE "Vaga"             ADD COLUMN "empresaId" TEXT;
ALTER TABLE "Candidato"        ADD COLUMN "empresaId" TEXT;
ALTER TABLE "Categoria"        ADD COLUMN "empresaId" TEXT;
ALTER TABLE "Triagem"          ADD COLUMN "empresaId" TEXT;
ALTER TABLE "TriagemEvento"    ADD COLUMN "empresaId" TEXT;
ALTER TABLE "Mensagem"         ADD COLUMN "empresaId" TEXT;
ALTER TABLE "ControleConversa" ADD COLUMN "empresaId" TEXT;

-- Backfill com a empresa mais antiga (assume single-tenant legado).
DO $$
DECLARE
  default_empresa_id TEXT;
BEGIN
  SELECT "id" INTO default_empresa_id
  FROM "Empresa"
  ORDER BY "createdAt" ASC
  LIMIT 1;

  IF default_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma empresa cadastrada — backfill multi-tenant abortado';
  END IF;

  UPDATE "Vaga"             SET "empresaId" = default_empresa_id WHERE "empresaId" IS NULL;
  UPDATE "Candidato"        SET "empresaId" = default_empresa_id WHERE "empresaId" IS NULL;
  UPDATE "Categoria"        SET "empresaId" = default_empresa_id WHERE "empresaId" IS NULL;
  UPDATE "Triagem"          SET "empresaId" = default_empresa_id WHERE "empresaId" IS NULL;
  UPDATE "TriagemEvento"    SET "empresaId" = default_empresa_id WHERE "empresaId" IS NULL;
  UPDATE "Mensagem"         SET "empresaId" = default_empresa_id WHERE "empresaId" IS NULL;
  UPDATE "ControleConversa" SET "empresaId" = default_empresa_id WHERE "empresaId" IS NULL;
END $$;

ALTER TABLE "Vaga"             ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "Candidato"        ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "Categoria"        ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "Triagem"          ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "TriagemEvento"    ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "Mensagem"         ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "ControleConversa" ALTER COLUMN "empresaId" SET NOT NULL;

-- ─────────────────────────────────────────────
-- Trocar unicidades globais por unicidades por tenant
-- ─────────────────────────────────────────────
DROP INDEX "Candidato_email_key";
DROP INDEX "Categoria_tipo_nome_key";

CREATE INDEX        "Candidato_empresaId_idx"            ON "Candidato"("empresaId");
CREATE UNIQUE INDEX "Candidato_empresaId_email_key"      ON "Candidato"("empresaId", "email");

CREATE INDEX        "Categoria_empresaId_idx"            ON "Categoria"("empresaId");
CREATE UNIQUE INDEX "Categoria_empresaId_tipo_nome_key"  ON "Categoria"("empresaId", "tipo", "nome");

CREATE INDEX "ControleConversa_empresaId_idx" ON "ControleConversa"("empresaId");
CREATE INDEX "Mensagem_empresaId_idx"         ON "Mensagem"("empresaId");
CREATE INDEX "Triagem_empresaId_idx"          ON "Triagem"("empresaId");
CREATE INDEX "TriagemEvento_empresaId_idx"    ON "TriagemEvento"("empresaId");
CREATE INDEX "Vaga_empresaId_idx"             ON "Vaga"("empresaId");

-- ─────────────────────────────────────────────
-- Usuario e EmpresaUsuario (autorização local)
-- ─────────────────────────────────────────────
CREATE TABLE "Usuario" (
  "id"          TEXT NOT NULL,
  "firebaseUid" TEXT NOT NULL,
  "nome"        TEXT NOT NULL,
  "email"       TEXT NOT NULL,
  "ativo"       BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Usuario_firebaseUid_key" ON "Usuario"("firebaseUid");
CREATE UNIQUE INDEX "Usuario_email_key"       ON "Usuario"("email");

CREATE TABLE "EmpresaUsuario" (
  "id"        TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "role"      "Role" NOT NULL DEFAULT 'RECRUITER',
  "ativo"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EmpresaUsuario_pkey" PRIMARY KEY ("id")
);

CREATE INDEX        "EmpresaUsuario_usuarioId_idx"            ON "EmpresaUsuario"("usuarioId");
CREATE UNIQUE INDEX "EmpresaUsuario_empresaId_usuarioId_key"  ON "EmpresaUsuario"("empresaId", "usuarioId");

-- ─────────────────────────────────────────────
-- Foreign keys
-- ─────────────────────────────────────────────
ALTER TABLE "EmpresaUsuario"
  ADD CONSTRAINT "EmpresaUsuario_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmpresaUsuario"
  ADD CONSTRAINT "EmpresaUsuario_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Categoria"
  ADD CONSTRAINT "Categoria_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Vaga"
  ADD CONSTRAINT "Vaga_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Candidato"
  ADD CONSTRAINT "Candidato_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Triagem"
  ADD CONSTRAINT "Triagem_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TriagemEvento"
  ADD CONSTRAINT "TriagemEvento_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Mensagem"
  ADD CONSTRAINT "Mensagem_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ControleConversa"
  ADD CONSTRAINT "ControleConversa_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
