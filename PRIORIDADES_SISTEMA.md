# Prioridades do Sistema

## Critico

1. Encerramento cruzado de triagens
   Quando um candidato for contratado em uma vaga, o sistema deve decidir e aplicar uma regra clara para as outras triagens abertas desse mesmo candidato.
   Estado atual: o candidato pode ficar vinculado como empregado e ainda manter outros processos em aberto.

2. Auditoria de acoes operacionais
   Mover etapa, dispensar etapa, remover da triagem, contratar candidato e finalizar vaga ainda nao deixam historico persistido com usuario, data e alteracao realizada.

3. Regra unica de contratacao
   Hoje existe contratacao por entrevista aprovada e tambem por fechamento manual da vaga.
   Precisamos consolidar a regra para evitar conflitos e comportamento divergente.

4. Remover `alert` de fluxos criticos
   Substituir por feedback consistente com `toast` e tratamento visual de erro/sucesso.

## Importante

1. Completar a operacao manual do pipeline
   Implementar:
   - reprovar candidato manualmente
   - voltar etapa
   - reabrir etapa quando necessario

2. Escalar o painel de sugeridos da triagem
   Hoje ele ainda depende de carga limitada de candidatos para scoring local.
   O ideal e um endpoint dedicado, paginado e ordenado por compatibilidade.

3. Melhorar analytics do dashboard
   Adicionar:
   - conversao por etapa
   - tempo medio por etapa
   - gargalos do funil
   - ranking de skills contratadas

4. Exibir melhor o vinculo empregaticio do candidato
   Mostrar com mais clareza:
   - vaga contratante
   - data da contratacao
   - situacao nas outras vagas relacionadas

5. Padronizar respostas e erros das APIs
   Algumas rotas ainda retornam mensagens muito simples ou inconsistentes.

## Nice to Have

1. Limpeza completa de encoding e textos quebrados
2. Acoes em lote na triagem
3. Filtros avancados por etapa, score e status
4. Exportacao de relatorios
5. Kanban por etapa da vaga
6. Notificacoes internas de eventos do processo seletivo

## Ordem Recomendada

1. Unificar regra de contratacao
2. Criar auditoria de eventos
3. Completar a operacao manual do pipeline
4. Melhorar sugestao e ranking de candidatos em escala
5. Evoluir dashboard e analytics
6. Limpar UX residual e textos antigos

---

## Backlog Tecnico

### 1. Unificar regra de contratacao

- Prioridade: Critico
- Esforco: Medio
- Status: Em andamento
- Dependencias: nenhuma
- Objetivo:
  Garantir uma unica regra de verdade para contratacao do candidato, evitando conflito entre aprovacao de entrevista e fechamento manual da vaga.
- Arquivos impactados:
  - [src/app/api/entrevistas/[id]/route.ts](/C:/Estudos/Sass/mvp-vagas/rh-selector/src/app/api/entrevistas/[id]/route.ts)
  - [src/app/api/vagas/[id]/route.ts](/C:/Estudos/Sass/mvp-vagas/rh-selector/src/app/api/vagas/[id]/route.ts)
  - [src/app/api/candidatos/[id]/route.ts](/C:/Estudos/Sass/mvp-vagas/rh-selector/src/app/api/candidatos/[id]/route.ts)
  - [prisma/schema.prisma](/C:/Estudos/Sass/mvp-vagas/rh-selector/prisma/schema.prisma)
- Entregas:
  - decidir se contratacao acontece so no fechamento da vaga, so na entrevista final, ou nas duas com mesma regra
  - impedir contratacao duplicada ou ambigua
  - opcional: registrar data de contratacao no schema
- Progresso atual:
  - servico unificado de contratacao criado
  - fechamento manual da vaga usa a mesma validacao
  - aprovacao de entrevista usa a mesma validacao
  - falta fechar regra de impacto nas outras triagens do candidato

### 2. Encerrar outras triagens do candidato contratado

- Prioridade: Critico
- Esforco: Medio
- Status: Em andamento
- Dependencias: 1. Unificar regra de contratacao
- Objetivo:
  Ao contratar um candidato, encerrar ou bloquear processos paralelos dele em outras vagas segundo a regra de negocio definida.
- Arquivos impactados:
  - [src/app/api/vagas/[id]/route.ts](/C:/Estudos/Sass/mvp-vagas/rh-selector/src/app/api/vagas/[id]/route.ts)
  - [src/app/api/entrevistas/[id]/route.ts](/C:/Estudos/Sass/mvp-vagas/rh-selector/src/app/api/entrevistas/[id]/route.ts)
  - [src/lib/triagem-etapas.ts](/C:/Estudos/Sass/mvp-vagas/rh-selector/src/lib/triagem-etapas.ts)
- Entregas:
  - definir se outras triagens viram `DISPENSADO`, `REPROVADO` ou bloqueadas
  - refletir isso nas telas de vaga e candidato
- Progresso atual:
  - outras triagens do candidato contratado agora sao encerradas automaticamente
  - etapas pendentes/em andamento passam para `DISPENSADO`
  - novas triagens para candidato ja empregado passaram a ser bloqueadas
  - ainda falta refletir melhor esse encerramento nas telas com mensagem/status mais explicitos

### 3. Auditoria de eventos da triagem

- Prioridade: Critico
- Esforco: Alto
- Status: Em andamento
- Dependencias: 1. Unificar regra de contratacao
- Objetivo:
  Registrar historico de operacoes importantes do funil.
- Arquivos impactados:
  - [prisma/schema.prisma](/C:/Estudos/Sass/mvp-vagas/rh-selector/prisma/schema.prisma)
  - [src/app/api/triagens/[id]/route.ts](/C:/Estudos/Sass/mvp-vagas/rh-selector/src/app/api/triagens/[id]/route.ts)
  - [src/app/api/triagens/route.ts](/C:/Estudos/Sass/mvp-vagas/rh-selector/src/app/api/triagens/route.ts)
  - [src/app/api/vagas/[id]/route.ts](/C:/Estudos/Sass/mvp-vagas/rh-selector/src/app/api/vagas/[id]/route.ts)
  - [src/app/api/entrevistas/[id]/route.ts](/C:/Estudos/Sass/mvp-vagas/rh-selector/src/app/api/entrevistas/[id]/route.ts)
- Entregas:
  - novo modelo de evento/auditoria
  - logar vinculacao, remocao, mover etapa, dispensar etapa, reprovacao, contratacao, finalizacao da vaga
  - exibir historico no detalhe da triagem ou da vaga
- Progresso atual:
  - modelo `TriagemEvento` criado no Prisma
  - vinculacao, analise, erro de analise, mover etapa, entrevista, contratacao e finalizacao da vaga passaram a gerar evento
  - detalhe da vaga agora exibe atividade recente consolidada
  - remocao da triagem agora preserva historico por snapshot no evento, sem depender da triagem continuar existindo

### 4. Completar operacao manual do pipeline

- Prioridade: Importante
- Esforco: Medio
- Status: Concluido
- Dependencias: 3. Auditoria de eventos da triagem
- Objetivo:
  Fechar o conjunto de acoes manuais do RH sobre o candidato.
- Arquivos impactados:
  - [src/lib/triagem-etapas.ts](/C:/Estudos/Sass/mvp-vagas/rh-selector/src/lib/triagem-etapas.ts)
  - [src/app/api/triagens/[id]/route.ts](/C:/Estudos/Sass/mvp-vagas/rh-selector/src/app/api/triagens/[id]/route.ts)
  - [src/app/(dashboard)/vagas/[id]/triagem/page.tsx](/C:/Estudos/Sass/mvp-vagas/rh-selector/src/app/(dashboard)/vagas/[id]/triagem/page.tsx)
- Entregas:
  - reprovar manualmente
  - voltar para etapa anterior
  - reabrir etapa
  - bloquear acoes invalidas conforme status
- Progresso atual:
  - pular para etapa futura ja implementado
  - reprovar manualmente, voltar etapa e reabrir etapa agora estao disponiveis na triagem
  - backend passou a validar transicoes e registrar eventos das acoes manuais

### 5. Escalar sugestoes de candidatos

- Prioridade: Importante
- Esforco: Medio
- Status: Em andamento
- Dependencias: nenhuma
- Objetivo:
  Parar de depender de carga parcial de candidatos no cliente para o painel de sugestoes.
- Arquivos impactados:
  - [src/app/(dashboard)/vagas/[id]/triagem/page.tsx](/C:/Estudos/Sass/mvp-vagas/rh-selector/src/app/(dashboard)/vagas/[id]/triagem/page.tsx)
  - [src/app/api/candidatos/route.ts](/C:/Estudos/Sass/mvp-vagas/rh-selector/src/app/api/candidatos/route.ts)
  - [src/app/api/vagas/[id]/pre-triagem/route.ts](/C:/Estudos/Sass/mvp-vagas/rh-selector/src/app/api/vagas/[id]/pre-triagem/route.ts)
  - [src/lib/candidato-compatibilidade.ts](/C:/Estudos/Sass/mvp-vagas/rh-selector/src/lib/candidato-compatibilidade.ts)
- Entregas:
  - endpoint dedicado para recomendacao
  - paginacao real
  - ordenacao por score compartilhado no backend
- Progresso atual:
  - heuristica e shortlist ja foram movidos para o backend da pre-triagem
  - endpoint dedicado de sugestoes com paginação e ranking server-side implementado
  - painel de sugeridos da triagem agora consome o ranking paginado do backend
  - ainda falta remover a dependencia da carga parcial local do modal para chips de filtro

### 6. Padronizar feedback visual e erros

- Prioridade: Critico
- Esforco: Baixo
- Status: Pendente
- Dependencias: nenhuma
- Objetivo:
  Remover `alert` e respostas cruas nos fluxos principais.
- Arquivos impactados:
  - [src/app/(dashboard)/vagas/[id]/triagem/page.tsx](/C:/Estudos/Sass/mvp-vagas/rh-selector/src/app/(dashboard)/vagas/[id]/triagem/page.tsx)
  - [src/app/(dashboard)/vagas/[id]/page.tsx](/C:/Estudos/Sass/mvp-vagas/rh-selector/src/app/(dashboard)/vagas/[id]/page.tsx)
  - [src/app/(dashboard)/candidatos/[id]/page.tsx](/C:/Estudos/Sass/mvp-vagas/rh-selector/src/app/(dashboard)/candidatos/[id]/page.tsx)
  - demais telas com `alert`
- Entregas:
  - trocar por `sonner`
  - mensagens padronizadas de sucesso e erro
  - estados de loading e retry mais claros

### 7. Evoluir dashboard com funil real

- Prioridade: Importante
- Esforco: Medio
- Status: Em andamento
- Dependencias: 3. Auditoria de eventos da triagem
- Objetivo:
  Transformar o dashboard em ferramenta gerencial de conversao do processo.
- Arquivos impactados:
  - [src/app/api/dashboard/route.ts](/C:/Estudos/Sass/mvp-vagas/rh-selector/src/app/api/dashboard/route.ts)
  - [src/app/(dashboard)/page.tsx](/C:/Estudos/Sass/mvp-vagas/rh-selector/src/app/(dashboard)/page.tsx)
- Entregas:
  - conversao por etapa
  - tempo medio por etapa
  - gargalos por vaga
  - skills mais presentes em contratados
- Progresso atual:
  - dashboard visual e graficos ja implementados
  - ainda faltam metricas de conversao e tempo por etapa

### 8. Exibir melhor vinculo empregaticio do candidato

- Prioridade: Importante
- Esforco: Baixo
- Status: Parcial
- Dependencias: 1. Unificar regra de contratacao
- Objetivo:
  Tornar o perfil do candidato mais claro para o RH.
- Arquivos impactados:
  - [src/app/api/candidatos/[id]/route.ts](/C:/Estudos/Sass/mvp-vagas/rh-selector/src/app/api/candidatos/[id]/route.ts)
  - [src/app/(dashboard)/candidatos/[id]/page.tsx](/C:/Estudos/Sass/mvp-vagas/rh-selector/src/app/(dashboard)/candidatos/[id]/page.tsx)
- Entregas:
  - mostrar vaga contratante com mais destaque
  - opcional: data da contratacao
  - opcional: situacao das outras candidaturas
- Progresso atual:
  - vaga contratante ja aparece no perfil do candidato
  - ainda faltam data da contratacao e contexto das outras candidaturas

### 9. Limpeza de encoding e textos antigos

- Prioridade: Nice to Have
- Esforco: Medio
- Status: Pendente
- Dependencias: nenhuma
- Objetivo:
  Corrigir labels e textos com caracteres quebrados.
- Arquivos impactados:
  - varias telas e rotas antigas
- Entregas:
  - padronizar textos PT-BR
  - remover mojibake
  - revisar mensagens de erro e placeholders

### 10. Testes dos fluxos criticos

- Prioridade: Importante
- Esforco: Alto
- Status: Pendente
- Dependencias: 1, 2, 3 e 4
- Objetivo:
  Cobrir os fluxos mais sensiveis do sistema com testes.
- Arquivos impactados:
  - estrutura de testes a ser criada
  - fluxos de vagas, triagem, entrevistas e contratacao
- Entregas:
  - testes de pipeline
  - testes de contratacao
  - testes de pre-triagem
  - testes de regras de bloqueio
