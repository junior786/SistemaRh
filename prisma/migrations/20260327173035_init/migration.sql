-- CreateEnum
CREATE TYPE "Regime" AS ENUM ('CLT', 'PJ', 'ESTAGIO', 'FREELANCER');

-- CreateEnum
CREATE TYPE "VagaStatus" AS ENUM ('ABERTA', 'EM_REVISAO', 'FECHADA');

-- CreateEnum
CREATE TYPE "RequisitoTipo" AS ENUM ('OBRIGATORIO', 'DESEJAVEL');

-- CreateEnum
CREATE TYPE "NivelFormacao" AS ENUM ('TECNICO', 'GRADUACAO', 'POS_GRADUACAO', 'MBA', 'MESTRADO', 'DOUTORADO', 'CURSO_LIVRE');

-- CreateEnum
CREATE TYPE "TriagemStatus" AS ENUM ('PENDENTE', 'PROCESSANDO', 'CONCLUIDO', 'ERRO');

-- CreateEnum
CREATE TYPE "EntrevistaStatus" AS ENUM ('AGENDADA', 'REALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EntrevistaResultado" AS ENUM ('APROVADO', 'REPROVADO', 'PROXIMA_FASE');

-- CreateTable
CREATE TABLE "Vaga" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "regime" "Regime" NOT NULL,
    "localizacao" TEXT NOT NULL,
    "salarioMin" DOUBLE PRECISION,
    "salarioMax" DOUBLE PRECISION,
    "descricao" TEXT NOT NULL,
    "status" "VagaStatus" NOT NULL DEFAULT 'ABERTA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vaga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requisito" (
    "id" TEXT NOT NULL,
    "vagaId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" "RequisitoTipo" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Requisito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidato" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "cidade" TEXT,
    "resumo" TEXT,
    "pretensaoSalarial" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidatoSkill" (
    "id" TEXT NOT NULL,
    "candidatoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidatoSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experiencia" (
    "id" TEXT NOT NULL,
    "candidatoId" TEXT NOT NULL,
    "empresa" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "descricao" TEXT,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "atual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experiencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formacao" (
    "id" TEXT NOT NULL,
    "candidatoId" TEXT NOT NULL,
    "instituicao" TEXT NOT NULL,
    "curso" TEXT NOT NULL,
    "nivel" "NivelFormacao" NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "atual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Formacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Triagem" (
    "id" TEXT NOT NULL,
    "vagaId" TEXT NOT NULL,
    "candidatoId" TEXT NOT NULL,
    "status" "TriagemStatus" NOT NULL DEFAULT 'PENDENTE',
    "score" DOUBLE PRECISION,
    "analise" TEXT,
    "checklist" TEXT,
    "desatualizado" BOOLEAN NOT NULL DEFAULT false,
    "analisadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Triagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entrevista" (
    "id" TEXT NOT NULL,
    "triagemId" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "entrevistador" TEXT NOT NULL,
    "status" "EntrevistaStatus" NOT NULL DEFAULT 'AGENDADA',
    "observacoes" TEXT,
    "resultado" "EntrevistaResultado",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entrevista_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Candidato_email_key" ON "Candidato"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Triagem_vagaId_candidatoId_key" ON "Triagem"("vagaId", "candidatoId");

-- AddForeignKey
ALTER TABLE "Requisito" ADD CONSTRAINT "Requisito_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "Vaga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatoSkill" ADD CONSTRAINT "CandidatoSkill_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "Candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiencia" ADD CONSTRAINT "Experiencia_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "Candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Formacao" ADD CONSTRAINT "Formacao_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "Candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Triagem" ADD CONSTRAINT "Triagem_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "Vaga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Triagem" ADD CONSTRAINT "Triagem_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "Candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrevista" ADD CONSTRAINT "Entrevista_triagemId_fkey" FOREIGN KEY ("triagemId") REFERENCES "Triagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
