-- CreateEnum
CREATE TYPE "MensagemDirecao" AS ENUM ('ENVIADA', 'RECEBIDA');

-- CreateEnum
CREATE TYPE "MensagemStatus" AS ENUM ('ENVIADA', 'ENTREGUE', 'LIDA', 'FALHA');

-- CreateEnum
CREATE TYPE "MensagemTipo" AS ENUM ('LIVRE', 'TEMPLATE');

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "iaWhatsappAtivo" BOOLEAN NOT NULL DEFAULT false,
    "waPhoneNumberId" TEXT,
    "waBusinessAccountId" TEXT,
    "waAccessToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mensagem" (
    "id" TEXT NOT NULL,
    "candidatoId" TEXT NOT NULL,
    "waMessageId" TEXT,
    "direcao" "MensagemDirecao" NOT NULL,
    "conteudo" TEXT NOT NULL,
    "status" "MensagemStatus" NOT NULL DEFAULT 'ENVIADA',
    "tipo" "MensagemTipo" NOT NULL DEFAULT 'LIVRE',
    "templateId" TEXT,
    "geradaPorIA" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mensagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControleConversa" (
    "id" TEXT NOT NULL,
    "candidatoId" TEXT NOT NULL,
    "iaAtiva" BOOLEAN NOT NULL DEFAULT true,
    "assumidoEm" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ControleConversa_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Entrevista" ADD COLUMN "notificarWhats" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_waPhoneNumberId_key" ON "Empresa"("waPhoneNumberId");

-- CreateIndex
CREATE UNIQUE INDEX "Mensagem_waMessageId_key" ON "Mensagem"("waMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "ControleConversa_candidatoId_key" ON "ControleConversa"("candidatoId");

-- AddForeignKey
ALTER TABLE "Mensagem" ADD CONSTRAINT "Mensagem_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "Candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControleConversa" ADD CONSTRAINT "ControleConversa_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "Candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE;
