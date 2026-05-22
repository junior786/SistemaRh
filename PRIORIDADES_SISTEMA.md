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

1. Completar a operacao manual do pipeline (CONCLUIDO)
2. Escalar o painel de sugeridos da triagem (CONCLUIDO)
3. Melhorar analytics do dashboard (CONCLUIDO)
4. Exibir melhor o vinculo empregaticio do candidato (CONCLUIDO)
5. Padronizar respostas e erros das APIs (CONCLUIDO)

6. Validação inline nos formulários
   Mostrar erros inline em cada campo e resumo de validação no topo dos formulários de vaga e candidato.

7. Explicabilidade das sugestões na triagem
   Exibir "por que este candidato foi sugerido" e "por que não foi sugerido" no painel de sugeridos.

8. Score com pesos visíveis
   Criar score detalhado com pesos visíveis: área, skills, cidade, regime, experiência, restrições.
   O RH deve entender de onde vem cada ponto.

9. Histórico unificado do candidato
   Na tela do candidato, consolidar em uma timeline única: mensagens, triagens, entrevistas, observações e decisões.

10. Agendamento de entrevistas a partir da triagem
    Permitir agendar entrevista direto da triagem ou do perfil do candidato, não só via calendário.

## Medio

1. Templates de vaga por função
   Criar templates pré-preenchidos (ex: Desenvolvedor, Analista, Suporte) para reduzir cadastro manual de vagas.

2. Pipeline operacional na triagem
   Transformar a triagem em pipeline visual de verdade com estados claros: novo, em análise, entrevista RH, aguardando retorno, aprovado, reprovado.

3. Estados vazios com próxima ação
   Melhorar telas vazias com CTA claro: "cadastre requisito", "importe currículo", "vincule candidato", "rode pré-triagem".

## Nice to Have

1. Limpeza completa de encoding e textos quebrados (CONCLUIDO)
2. Ações em lote na triagem
3. Filtros avançados por etapa, score e status
4. Exportação de relatórios
5. Kanban por etapa da vaga
6. Notificações internas de eventos do processo seletivo

## Ordem Recomendada

1. ~~Unificar regra de contratação~~ (CONCLUIDO)
2. ~~Criar auditoria de eventos~~ (CONCLUIDO)
3. ~~Completar a operação manual do pipeline~~ (CONCLUIDO)
4. ~~Melhorar sugestão e ranking de candidatos em escala~~ (CONCLUIDO)
5. ~~Evoluir dashboard e analytics~~ (CONCLUIDO)
6. ~~Limpar UX residual e textos antigos~~ (CONCLUIDO)
7. Validação inline nos formulários
8. Score com pesos visíveis
9. Explicabilidade das sugestões
10. Estados vazios com próxima ação
11. Histórico unificado do candidato
12. Templates de vaga
13. Pipeline operacional na triagem
14. Agendamento de entrevistas

---

## Backlog Tecnico

### 1. Unificar regra de contratacao

- Prioridade: Critico
- Esforco: Medio
- Status: Concluido
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
  - servico unificado consolidado e operacional
  - data de contratacao (contratadoEm) registrada automaticamente

### 2. Encerrar outras triagens do candidato contratado

- Prioridade: Critico
- Esforco: Medio
- Status: Concluido
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
  - tela do candidato agora exibe badge "Encerrada — contratado em outra vaga" nas triagens dispensadas
  - status das triagens e da vaga visíveis na listagem de vagas vinculadas

### 3. Auditoria de eventos da triagem

- Prioridade: Critico
- Esforco: Alto
- Status: Concluido
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
- Status: Concluido
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
  - endpoint dedicado /api/candidatos/filtros substitui carga parcial local
  - chips de filtro agora vem do backend (tipos e cidades distintos)

### 6. Padronizar feedback visual e erros

- Prioridade: Critico
- Esforco: Baixo
- Status: Concluido
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
- Status: Concluido
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
  - tabela de funil com conversao por etapa, tempo medio, reprovados e dispensados
  - dados calculados a partir de TriagemEtapa (iniciadaEm/concluidaEm)

### 8. Exibir melhor vinculo empregaticio do candidato

- Prioridade: Importante
- Esforco: Baixo
- Status: Concluido
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
  - campo contratadoEm adicionado ao schema e preenchido automaticamente na contratacao
  - data de contratacao exibida no perfil do candidato
  - triagens dispensadas mostram badge com motivo (contratado em outra vaga / vaga finalizada)
  - status detalhado de cada triagem visivel na listagem de vagas vinculadas

### 9. Limpeza de encoding e textos antigos

- Prioridade: Nice to Have
- Esforco: Medio
- Status: Concluido
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
- Status: Adiado
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

### 11. Validação inline nos formulários

- Prioridade: Importante
- Esforco: Medio
- Status: Pendente
- Dependencias: nenhuma
- Objetivo:
  Mostrar erros de validação diretamente no campo e um resumo no topo do formulário para guiar o usuário.
- Arquivos impactados:
  - src/app/(dashboard)/vagas/nova/page.tsx
  - src/app/(dashboard)/vagas/[id]/editar/page.tsx
  - src/app/(dashboard)/candidatos/novo/page.tsx
  - src/app/(dashboard)/candidatos/[id]/editar/page.tsx
- Entregas:
  - validação client-side com feedback visual por campo (borda vermelha + mensagem)
  - resumo de erros no topo do formulário com âncora para o campo
  - bloquear submit até resolver erros obrigatórios

### 12. Explicabilidade das sugestões na triagem

- Prioridade: Importante
- Esforco: Medio
- Status: Pendente
- Dependencias: nenhuma
- Objetivo:
  Tornar transparente para o RH por que um candidato foi ou não sugerido para a vaga.
- Arquivos impactados:
  - src/app/api/vagas/[id]/sugestoes/route.ts
  - src/app/(dashboard)/vagas/[id]/triagem/page.tsx
  - src/lib/candidato-compatibilidade.ts
- Entregas:
  - cada candidato sugerido exibe os motivos do match (área, skills, cidade, etc.)
  - candidatos não sugeridos podem ser consultados com motivo da exclusão
  - tooltip ou expandível com detalhes do cálculo

### 13. Score com pesos visíveis

- Prioridade: Importante
- Esforco: Medio
- Status: Pendente
- Dependencias: nenhuma
- Objetivo:
  Criar score detalhado com pesos visíveis para que o RH entenda de onde vem cada ponto.
- Arquivos impactados:
  - src/lib/candidato-compatibilidade.ts
  - src/app/(dashboard)/vagas/[id]/triagem/page.tsx
  - src/app/api/vagas/[id]/sugestoes/route.ts
- Entregas:
  - breakdown do score: área, skills, cidade, regime, experiência, restrições
  - exibir pesos individuais no card do candidato na triagem
  - permitir que o RH entenda e questione o score

### 14. Histórico unificado do candidato

- Prioridade: Importante
- Esforco: Alto
- Status: Pendente
- Dependencias: 3. Auditoria de eventos
- Objetivo:
  Consolidar na tela do candidato uma timeline única com todas as interações.
- Arquivos impactados:
  - src/app/api/candidatos/[id]/route.ts
  - src/app/(dashboard)/candidatos/[id]/page.tsx
- Entregas:
  - timeline cronológica: mensagens WhatsApp, triagens, entrevistas, observações e decisões
  - filtro por tipo de evento
  - cada item com link para o contexto original (vaga, triagem, entrevista)

### 15. Agendamento de entrevistas a partir da triagem

- Prioridade: Importante
- Esforco: Medio
- Status: Pendente
- Dependencias: nenhuma
- Objetivo:
  Permitir agendar entrevistas diretamente da triagem ou perfil do candidato.
- Arquivos impactados:
  - src/app/(dashboard)/vagas/[id]/triagem/page.tsx
  - src/app/(dashboard)/candidatos/[id]/page.tsx
  - src/app/api/entrevistas/route.ts
- Entregas:
  - botão "Agendar entrevista" no card do candidato na triagem
  - modal de agendamento com data, hora e observações
  - entrevista criada e vinculada à triagem/etapa correta

### 16. Templates de vaga por função

- Prioridade: Medio
- Esforco: Baixo
- Status: Pendente
- Dependencias: nenhuma
- Objetivo:
  Reduzir cadastro manual oferecendo templates pré-preenchidos por função.
- Arquivos impactados:
  - src/app/(dashboard)/vagas/nova/page.tsx
  - src/lib/vaga-templates.ts (novo)
- Entregas:
  - seletor de template no início do formulário de nova vaga
  - templates para funções comuns (Desenvolvedor, Analista, Suporte, etc.)
  - preencher título, área, requisitos e etapas automaticamente

### 17. Pipeline operacional na triagem

- Prioridade: Medio
- Esforco: Alto
- Status: Pendente
- Dependencias: nenhuma
- Objetivo:
  Transformar a triagem em pipeline visual com estados operacionais claros.
- Arquivos impactados:
  - src/app/(dashboard)/vagas/[id]/triagem/page.tsx
  - prisma/schema.prisma (possível novo enum)
- Entregas:
  - visualização tipo kanban com colunas: novo, em análise, entrevista RH, aguardando retorno, aprovado, reprovado
  - drag and drop entre colunas
  - contadores e filtros por coluna

### 18. Estados vazios com próxima ação

- Prioridade: Medio
- Esforco: Baixo
- Status: Pendente
- Dependencias: nenhuma
- Objetivo:
  Melhorar telas vazias com CTAs claros que guiam o próximo passo.
- Arquivos impactados:
  - src/app/(dashboard)/vagas/[id]/page.tsx
  - src/app/(dashboard)/vagas/[id]/triagem/page.tsx
  - src/app/(dashboard)/candidatos/page.tsx
  - src/app/(dashboard)/page.tsx
- Entregas:
  - cada estado vazio com mensagem contextual e botão de ação
  - exemplos: "Cadastre requisitos", "Importe currículo", "Vincule candidato", "Rode pré-triagem"
  - ícone ilustrativo e texto amigável
