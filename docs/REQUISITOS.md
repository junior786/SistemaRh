# RH Selector — Requisitos do sistema

## Requisitos funcionais

### RF-01 — Gestão de vagas
O RH deve conseguir criar vagas com título, área, regime (CLT/PJ/Estágio/Freelancer), localização, faixa salarial e descrição. Cada vaga deve ter dois tipos de requisito: obrigatórios (eliminatórios — se o candidato não atende, score máximo é 50%) e desejáveis (influenciam o score proporcionalmente). As vagas devem ter status: aberta, em revisão, fechada.

### RF-02 — Gestão de candidatos
O RH deve conseguir cadastrar candidatos de duas formas:
- **Formulário manual:** nome, email, telefone, cidade, resumo profissional, skills (lista de tags), pretensão salarial
- **Importação de PDF:** a IA extrai os dados e preenche o formulário para revisão humana antes de salvar

O candidato possui três listas independentes:

**Experiências profissionais** — cada item contém:
- Empresa, cargo, data de início, data de fim (desabilitada quando "trabalho aqui atualmente" estiver marcado), descrição das atividades

**Formação acadêmica** — cada item contém:
- Instituição, curso, nível (graduação/pós/MBA/técnico/etc.), data de início, data de conclusão (com checkbox "cursando atualmente")

**Skills** — lista de tags livres (ex: Python, Node.js, Excel)

### RF-03 — Motor de compatibilidade (IA)
Para cada par vaga + candidato, o sistema gera automaticamente:
- Score de 0 a 100%
- Justificativa textual (pontos fortes e pontos de atenção)
- Checklist de requisitos atendidos/não atendidos

A IA usa as experiências formatadas com tempo calculado (ex: "3 anos e 2 meses como Dev Backend Sênior") como um dos principais fatores do score.

O score é marcado como desatualizado se o perfil do candidato ou os requisitos da vaga forem alterados.

### RF-04 — Triagem e ranking
- Candidatos de uma vaga ordenados por score
- Filtro por faixa mínima de compatibilidade
- Detalhamento da análise individual (checklist + justificativa)

### RF-05 — Dashboard
Métricas consolidadas: vagas abertas, total de candidatos, análises geradas, candidatos aprovados. Listagem das vagas com mais candidatos e melhores scores.

### RF-06 — Agendamento de entrevistas
A partir da triagem, o RH pode agendar entrevistas para um par candidato + vaga específico. Cada entrevista contém:
- **Data e horário** da entrevista
- **Entrevistador responsável** (nome livre — sem vínculo a usuário do sistema nesta fase)
- **Status:** agendada, realizada, cancelada
- **Observações / anotações** pós-entrevista (campo de texto livre)
- **Resultado:** aprovado, reprovado, próxima fase

Um par candidato + vaga pode ter múltiplas entrevistas (ex: entrevista técnica + entrevista com gestor). Não há envio de notificações nesta fase — o sistema apenas registra.

---

## Requisitos não funcionais

### RNF-01 — Autenticação
Autenticação simples com usuário e senha fixos definidos em variável de ambiente. Sem NextAuth nesta fase. A sessão é mantida via cookie de sessão simples (Next.js). Sem área pública para candidatos.

### RNF-02 — Performance da análise IA
A geração do score é assíncrona — o RH não aguarda na tela. O sistema enfileira a análise e atualiza quando concluída.

### RNF-03 — Segurança dos dados
Dados de candidatos são sensíveis (LGPD). Nenhum dado exposto em URLs ou logs. As chaves de API (OpenRouter) nunca vão ao cliente — sempre server-side via variáveis de ambiente.

### RNF-04 — Escalabilidade
O schema suporta múltiplas vagas simultâneas com centenas de candidatos cada, sem degradação nas listagens.

### RNF-05 — Portabilidade do banco de dados
O sistema deve permitir troca de banco de dados com mínimo esforço. Regras:
- **Prisma é o único ponto de contato com o banco** — zero queries SQL diretas no código
- Modelos `Account`, `Session`, `VerificationToken` removidos do schema (sem NextAuth nesta fase)
- `DATABASE_URL` sempre via variável de ambiente — nunca hardcoded
- Sem tipos exclusivos de banco (usar `cuid()` do Prisma, não `uuid` nativo)
- Sem `$queryRaw` — lógica complexa resolvida na camada de serviço
- Migrations versionadas com `prisma migrate`
- Schema compatível com PostgreSQL, SQLite e Supabase (mesmo provider postgresql)

### RNF-06 — Integração com IA via OpenRouter
Toda comunicação com modelos de IA passa pelo **OpenRouter** como gateway único:
- Uma só API key (`OPENROUTER_API_KEY`) para todos os modelos
- Troca de modelo sem alteração de código — apenas variável de ambiente
- Chaves e chamadas sempre server-side (nunca expostas ao cliente)
- Base URL: `https://openrouter.ai/api/v1`

**Modelos utilizados:**

| Função                        | Modelo                  | Variável de ambiente         |
|-------------------------------|-------------------------|------------------------------|
| Extração de dados de PDF      | `openai/gpt-4.1-nano`   | `MODEL_EXTRACAO_PDF`         |
| Análise de compatibilidade    | `deepseek/deepseek-chat` | `MODEL_ANALISE_VAGA`        |

---

## Regras de negócio

### RN-01 — Cálculo do score
Requisitos obrigatórios têm peso fixo alto. Se o candidato não atende qualquer requisito obrigatório, o score máximo possível é 50%. Requisitos desejáveis distribuem os pontos restantes proporcionalmente. Score calculado pela IA com base no perfil completo + requisitos da vaga.

### RN-02 — Importação de PDF
O PDF é enviado ao OpenRouter (modelo `openai/gpt-4.1-nano`) que retorna os dados estruturados em JSON. O RH revisa o rascunho gerado e confirma antes de salvar — nunca salva automaticamente sem validação humana.

### RN-03 — Reanálise
Se o perfil do candidato for editado ou os requisitos da vaga mudarem, o score anterior é marcado como desatualizado (`desatualizado = true`) e pode ser refeito manualmente pelo RH.

### RN-04 — Vínculo candidato-vaga
Um candidato pode existir no sistema sem estar vinculado a nenhuma vaga. O vínculo acontece no momento da triagem.

### RN-05 — Formato de resposta da IA
Ambos os modelos devem retornar JSON puro (sem markdown, sem blocos de código). O sistema valida e trata erros de parsing antes de persistir no banco.

---

## Telas do sistema

| Tela                   | Rota                     |
|------------------------|--------------------------|
| Dashboard              | `/`                      |
| Listagem de vagas      | `/vagas`                 |
| Cadastro de vaga       | `/vagas/nova`            |
| Detalhe da vaga        | `/vagas/[id]`            |
| Listagem de candidatos | `/candidatos`            |
| Cadastro de candidato  | `/candidatos/novo`       |
| Perfil do candidato    | `/candidatos/[id]`       |
| Triagem de uma vaga    | `/vagas/[id]/triagem`    |
| Entrevistas de uma triagem | `/vagas/[id]/triagem/[candidatoId]/entrevistas` |

---

## Stack técnica

| Camada                  | Tecnologia                                         |
|-------------------------|----------------------------------------------------|
| Framework               | Next.js 14 (App Router)                            |
| Banco de dados          | PostgreSQL (portável via Prisma)                   |
| ORM                     | Prisma                                             |
| Gateway de IA           | OpenRouter (`https://openrouter.ai/api/v1`)        |
| Extração de PDF         | GPT-4.1 Nano via OpenRouter                        |
| Análise de compatibilidade | DeepSeek V3 via OpenRouter                      |
| Autenticação            | Sessão simples via cookie (sem NextAuth)           |
| Estilização             | Tailwind CSS                                       |
| Host banco (inicial)    | PostgreSQL local / Supabase (futuro)               |

## Variáveis de ambiente necessárias

```env
# Banco de dados
DATABASE_URL="postgresql://..."

# OpenRouter
OPENROUTER_API_KEY="sk-or-..."
MODEL_EXTRACAO_PDF="openai/gpt-4.1-nano"
MODEL_ANALISE_VAGA="deepseek/deepseek-chat"

# Autenticação simples
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin"
SESSION_SECRET="troque-em-producao"
```