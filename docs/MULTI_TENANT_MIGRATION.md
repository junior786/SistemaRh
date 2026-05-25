# Estratégia de migração multi-tenant — MT 01

Suporte para a Fase 1 do plano de [MULTI_TENANT_SPEC.md](./MULTI_TENANT_SPEC.md).

## Premissa

Banco atual contém dados single-tenant. O schema multi-tenant introduz colunas `NOT NULL` (`empresaId`, `slug`, etc.) que exigem backfill antes de habilitar restrições.

## Estratégia (single database, shared schema)

1. Criar empresa default (`slug = "default"`, `nome` herdado do registro existente).
2. Backfill de `empresaId` em todas as tabelas escopadas com o id da empresa default.
3. Aplicar `NOT NULL` + `UNIQUE` por tenant após o backfill.

## Empresas existentes

- Se já existe uma única `Empresa`, preencher `slug` com um valor estável (ex: `default` ou variante do `nome` normalizado).
- Se existem múltiplas `Empresa`, validar manualmente o mapeamento — não há vínculo automático entre dados antigos e cada empresa.

## Tabelas que recebem `empresaId`

- `Vaga`
- `Candidato`
- `Categoria`
- `Triagem`
- `TriagemEvento`
- `Mensagem`
- `ControleConversa`

`TwilioTemplate` já possui `empresaId` e não precisa de backfill.

## Tabelas que herdam escopo indireto

Permanecem sem `empresaId` direto, mas o acesso deve passar pela entidade-pai:

- `VagaArea`, `Requisito`, `VagaEtapa`
- `CandidatoArea`, `CandidatoSkill`, `Experiencia`, `Formacao`, `Restricao`
- `TriagemEtapa`, `Entrevista`

## Unicidades alteradas

- `Candidato.email`: deixa de ser único global e passa a `@@unique([empresaId, email])`.
- `Categoria(tipo, nome)`: passa a `@@unique([empresaId, tipo, nome])`.

Antes de aplicar a unicidade nova: deduplicar e-mails de candidatos repetidos entre tenants (não deve existir em base single-tenant) e validar pares `(tipo, nome)` em categorias.

## Roteiro de execução (dev)

1. `npx prisma migrate dev --create-only --name multi_tenant_modelagem` gera SQL inicial.
2. Editar a migration manualmente para:
   - Criar `Empresa` default antes de adicionar `NOT NULL`.
   - Backfill de `empresaId` (`UPDATE ... SET empresaId = '<id-default>'`).
   - Só então aplicar `NOT NULL` / `UNIQUE`.
3. `npx prisma migrate dev` aplica a migration editada.
4. Validar com queries de contagem por tenant.

## Roteiro de execução (prod)

1. Snapshot do banco antes de qualquer alteração.
2. Identificar a empresa default conforme `nome` real do cliente atual.
3. Rodar migration em janela controlada — backfill é o ponto crítico.
4. Validar amostragem de leitura por tenant antes de liberar cadastro de novas empresas.

## Checks pós-migration

- `SELECT COUNT(*) FROM "Vaga" WHERE "empresaId" IS NULL` → 0
- Mesmo check para Candidato, Categoria, Triagem, TriagemEvento, Mensagem, ControleConversa.
- `SELECT slug, COUNT(*) FROM "Empresa" GROUP BY slug HAVING COUNT(*) > 1` → vazio.
- `SELECT "empresaId", email, COUNT(*) FROM "Candidato" GROUP BY "empresaId", email HAVING COUNT(*) > 1` → vazio.

## Riscos

- Esquecer alguma tabela de domínio no backfill → erro `NOT NULL violation` na hora de aplicar a constraint.
- Aplicar `@@unique([empresaId, email])` sem deduplicar → migration falha.
- Rodar migration sem snapshot em produção → rollback inviável.
