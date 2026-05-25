# Catalogo de Tools do rh-selector (v1)

Define todas as tools que o rh-selector expoe ao Motor WhatsApp para a IA
consumir. Documento e contrato: a IA do motor opera dentro do que esta listado
aqui. Mudancas exigem versionamento.

Referencia: [docs/MOTOR_WHATSAPP.md](MOTOR_WHATSAPP.md) §8.3 (tool registry +
MCP pattern).

---

## 1. Politica geral

### 1.1 Endpoint base

Cada tool sera servida em:

```
POST /api/motor-tools/<nome>
  Headers:
    X-Motor-Signature: t=...,v1=...
    X-Motor-Delivery: <uuid>          // idempotency key
  Body:
    {
      "callId": "tc_...",             // id da tool call no motor
      "conversationId": "conv_...",
      "tenantId": "tnt_...",
      "arguments": { ... }            // parametros da tool
    }
  Response 200:
    {
      "result": { ... },              // payload da tool (schema definido)
      "isError": false
    }
  ou
    {
      "result": null,
      "isError": true,
      "errorMessage": "..."           // legivel pelo LLM
    }
```

rh-selector valida `X-Motor-Signature` (HMAC-SHA256 com `motorWhatsappWebhookSecret`).
Sem assinatura valida = 401.

### 1.2 Resolucao de tenant -> empresa

`tenantId` recebido no body do motor mapeia para `Empresa` no rh-selector via
`Empresa.motorFirebaseServiceUid` (ver MOTOR_WHATSAPP.md §9.1). Toda query
subsequente e escopada a essa empresa.

> Pre-requisito: multi-tenant resolvido (PRIORIDADES_SISTEMA.md item Backlog
> #19). Enquanto for single-tenant, tools ignoram `tenantId` e usam a unica
> empresa.

### 1.3 Validacao

Validacao em duas camadas:
- **Motor** valida `arguments` contra o `parameters` (JSON Schema) registrado
- **rh-selector** revalida no servidor (cinto + suspensorio). Nao confia em
  nada que veio do LLM

### 1.4 Auditoria

Toda tool **write** gera `TriagemEvento { origem: "IA", tipo, descricao, metadados }`
quando aplicavel ao funil. Permite rastrear o que a IA fez.

### 1.5 Dados sensiveis

**Nunca** retornar nos payloads das tools (mesmo se a IA pedir):
- Scores internos da triagem (numerico)
- Observacoes privadas do RH (`Candidato.observacao`)
- Analise textual gerada por IA anterior (`Triagem.analise`, `Triagem.checklist`)
- Dados de **outros** candidatos (ex: nao listar quem mais esta competindo na
  vaga)
- Salario exato de outros candidatos
- Email/telefone de contatos internos

### 1.6 Idempotencia

- `X-Motor-Delivery` e tratado como idempotency key (24h em cache)
- Tools de escrita devem suportar replay sem efeito duplicado (ex: agendar
  com mesma data+entrevistador devolve a entrevista existente, nao cria nova)

### 1.7 Erros

Erros legiveis para o LLM (ele vai reagir ao texto):

| Padrao | Significado |
|---|---|
| `not_found:<entidade>` | Entidade nao existe ou nao pertence ao tenant |
| `validation:<campo>:<motivo>` | Argumento invalido |
| `forbidden:<motivo>` | Operacao nao permitida nesse estado |
| `conflict:<motivo>` | Conflito de estado (ex: triagem ja finalizada) |
| `internal_error` | Erro inesperado — IA deve escalar |

Exemplo: `{ isError: true, errorMessage: "not_found:triagem" }`

### 1.8 Versionamento

Cada tool tem versao implicita v1. Mudanca breaking exige nova tool com
sufixo: `agendar_entrevista_v2`. Tools antigas ficam ativas ate motor remover
do registry.

---

## 2. Tools de leitura

### 2.1 `consultar_status_candidato`

Devolve em qual processo o candidato esta e em que ponto.

```json
{
  "name": "consultar_status_candidato",
  "description": "Retorna a triagem ativa do candidato (vaga, etapa atual, proxima entrevista). Use sempre que o candidato perguntar sobre o processo dele.",
  "parameters": {
    "type": "object",
    "properties": {
      "candidatoId": { "type": "string", "description": "Id do candidato. Se nao souber, o motor injeta automaticamente a partir do conversationId." }
    }
  }
}
```

Retorno:
```json
{
  "candidato": { "id": "...", "nome": "..." },
  "triagemAtiva": {
    "id": "...",
    "vaga": { "id": "...", "titulo": "...", "area": "..." },
    "etapaAtual": "entrevista_tecnica",
    "status": "EM_ANDAMENTO",
    "iniciadaEm": "2026-05-20T10:00:00Z"
  },
  "proximaEntrevista": {
    "id": "...",
    "dataHora": "2026-05-25T15:00:00-03:00",
    "entrevistador": "Ana"
  } | null,
  "outrasVagas": [{ "id": "...", "titulo": "..." }]
}
```

Mapping: `GET /api/candidatos/[id]` + filtro de triagens ativas + proxima
entrevista. Reutiliza logica existente.

### 2.2 `listar_vagas_abertas`

Vagas que a IA pode recomendar ao candidato.

```json
{
  "name": "listar_vagas_abertas",
  "description": "Lista vagas abertas da empresa para recomendar ao candidato. Filtros opcionais por area, jobType, cidade.",
  "parameters": {
    "type": "object",
    "properties": {
      "area": { "type": "string" },
      "jobType": { "type": "string" },
      "cidade": { "type": "string" },
      "limite": { "type": "integer", "minimum": 1, "maximum": 20, "default": 5 }
    }
  }
}
```

Retorno:
```json
{
  "vagas": [
    {
      "id": "...",
      "titulo": "Dev Frontend Senior",
      "area": "Desenvolvimento",
      "jobType": "Desenvolvedor",
      "modalidade": "REMOTO",
      "localizacao": "Sao Paulo",
      "salarioMin": 8000,
      "salarioMax": 12000
    }
  ]
}
```

Mapping: `GET /api/vagas?status=ABERTA` + filtros. Ja existe.

### 2.3 `consultar_perfil_candidato`

Dados do candidato (para IA contextualizar respostas, ex: confirmar habilidades).

```json
{
  "name": "consultar_perfil_candidato",
  "description": "Retorna perfil resumido do candidato: cargo pretendido, cidade, skills, areas, ultima experiencia. Nao retorna observacoes internas do RH nem scores.",
  "parameters": {
    "type": "object",
    "properties": {
      "candidatoId": { "type": "string" }
    }
  }
}
```

Retorno:
```json
{
  "id": "...",
  "nome": "...",
  "jobType": "Desenvolvedor",
  "cidade": "Sao Paulo",
  "areas": ["Desenvolvimento"],
  "skills": ["React", "TypeScript", "Node"],
  "ultimaExperiencia": { "empresa": "Acme", "cargo": "Tech Lead" },
  "pretensaoSalarial": 10000,
  "restricoes": ["Disponivel apenas tarde"]
}
```

Mapping: `GET /api/candidatos/[id]` com filtragem de campos sensiveis no
backend.

### 2.4 `consultar_proxima_entrevista`

```json
{
  "name": "consultar_proxima_entrevista",
  "description": "Retorna a proxima entrevista agendada do candidato. Util quando ele pergunta 'quando e minha entrevista' ou pede confirmacao.",
  "parameters": {
    "type": "object",
    "properties": {
      "candidatoId": { "type": "string" }
    }
  }
}
```

Retorno:
```json
{
  "entrevista": {
    "id": "...",
    "dataHora": "2026-05-25T15:00:00-03:00",
    "entrevistador": "Ana Silva",
    "vaga": { "id": "...", "titulo": "Dev Frontend" },
    "etapa": "entrevista_tecnica",
    "status": "AGENDADA"
  } | null
}
```

Mapping: `GET /api/entrevistas?triagemId=...` filtrado.

### 2.5 `listar_horarios_disponiveis`

Pra propor horarios de entrevista.

```json
{
  "name": "listar_horarios_disponiveis",
  "description": "Retorna slots livres do entrevistador num intervalo. Use antes de agendar entrevista para sugerir horarios ao candidato.",
  "parameters": {
    "type": "object",
    "properties": {
      "entrevistador": { "type": "string" },
      "dataInicio": { "type": "string", "format": "date" },
      "dataFim": { "type": "string", "format": "date" },
      "duracaoMinutos": { "type": "integer", "default": 60 }
    },
    "required": ["entrevistador", "dataInicio", "dataFim"]
  }
}
```

Retorno:
```json
{
  "slots": [
    { "inicio": "2026-05-26T10:00:00-03:00", "fim": "2026-05-26T11:00:00-03:00" },
    { "inicio": "2026-05-26T15:00:00-03:00", "fim": "2026-05-26T16:00:00-03:00" }
  ]
}
```

Mapping: **TODO** — nao existe ainda. Hoje rh-selector nao tem agenda de
entrevistadores. Pode ser implementado consultando entrevistas existentes
desse entrevistador e gerando slots livres em horario comercial. Versao v1
pode retornar horarios fixos sugeridos (9h, 10h, 14h, 15h) e validar conflito
ao agendar.

### 2.6 `consultar_requisitos_vaga`

```json
{
  "name": "consultar_requisitos_vaga",
  "description": "Lista requisitos da vaga (obrigatorios e desejaveis). Util quando candidato pergunta 'o que precisa pra essa vaga'.",
  "parameters": {
    "type": "object",
    "properties": {
      "vagaId": { "type": "string" }
    },
    "required": ["vagaId"]
  }
}
```

Retorno:
```json
{
  "requisitos": [
    { "descricao": "React 3+ anos", "obrigatorio": true, "tempoMeses": 36 },
    { "descricao": "Conhecer TypeScript", "obrigatorio": false }
  ]
}
```

Mapping: `GET /api/vagas/[id]` ja retorna requisitos. Filtrar campos.

### 2.7 `consultar_etapas_processo`

```json
{
  "name": "consultar_etapas_processo",
  "description": "Retorna as etapas do processo seletivo dessa vaga (ex: triagem, teste tecnico, entrevista RH, entrevista gestor, oferta). Util pra explicar pro candidato o que vem pela frente.",
  "parameters": {
    "type": "object",
    "properties": {
      "vagaId": { "type": "string" }
    },
    "required": ["vagaId"]
  }
}
```

Retorno:
```json
{
  "etapas": [
    { "ordem": 1, "nome": "Triagem", "tipo": "TRIAGEM" },
    { "ordem": 2, "nome": "Teste tecnico", "tipo": "TESTE_TECNICO" },
    { "ordem": 3, "nome": "Entrevista RH", "tipo": "ENTREVISTA" }
  ]
}
```

Mapping: `GET /api/vagas/[id]` (campo `etapas`). Ja existe.

---

## 3. Tools de escrita

### 3.1 `agendar_entrevista`

```json
{
  "name": "agendar_entrevista",
  "description": "Cria entrevista para o candidato na triagem ativa. Use depois de confirmar horario com o candidato e checar disponibilidade do entrevistador.",
  "parameters": {
    "type": "object",
    "properties": {
      "triagemId":     { "type": "string" },
      "dataHora":      { "type": "string", "format": "date-time" },
      "entrevistador": { "type": "string" },
      "vagaEtapaId":   { "type": "string", "description": "Etapa do processo (opcional)" }
    },
    "required": ["triagemId", "dataHora", "entrevistador"]
  }
}
```

Retorno:
```json
{
  "entrevistaId": "...",
  "dataHora": "...",
  "vagaTitulo": "...",
  "linkConfirmacao": "https://rh-selector/entrevista/..."
}
```

Validacoes:
- Triagem existe e pertence ao tenant
- Triagem nao esta finalizada
- dataHora > now
- Nao colide com outra entrevista do mesmo entrevistador (mesma janela)

Efeitos:
- Cria `Entrevista { status: AGENDADA }`
- Gera `TriagemEvento { origem: "IA", tipo: "ENTREVISTA_AGENDADA" }`
- Idempotencia: se ja existe entrevista AGENDADA pra essa triagem na mesma
  dataHora, devolve a existente

Mapping: `POST /api/entrevistas` ja existe (precisa expor o flag de origem
"IA" e adicionar idempotencia).

### 3.2 `cancelar_entrevista`

```json
{
  "name": "cancelar_entrevista",
  "description": "Cancela uma entrevista agendada. Sempre pedir motivo ao candidato antes de chamar.",
  "parameters": {
    "type": "object",
    "properties": {
      "entrevistaId": { "type": "string" },
      "motivo":       { "type": "string", "minLength": 3 }
    },
    "required": ["entrevistaId", "motivo"]
  }
}
```

Retorno: `{ "ok": true }`

Efeitos:
- `Entrevista.status = CANCELADA`
- `TriagemEvento { tipo: "ENTREVISTA_CANCELADA", origem: "IA", metadados: { motivo } }`

Mapping: **TODO** — `PUT /api/entrevistas/[id]` ja existe pra alterar; precisa
expor `cancelar` semanticamente ou usar status na rota atual.

### 3.3 `reagendar_entrevista`

```json
{
  "name": "reagendar_entrevista",
  "description": "Troca data/hora de uma entrevista AGENDADA. Use quando candidato pedir adiamento e novo horario foi confirmado.",
  "parameters": {
    "type": "object",
    "properties": {
      "entrevistaId":  { "type": "string" },
      "novaDataHora":  { "type": "string", "format": "date-time" }
    },
    "required": ["entrevistaId", "novaDataHora"]
  }
}
```

Retorno: `{ "entrevistaId": "...", "dataHora": "..." }`

Validacoes: novaDataHora > now, sem conflito com outra do entrevistador.

Mapping: `PUT /api/entrevistas/[id]` (existente).

### 3.4 `atualizar_dado_candidato`

```json
{
  "name": "atualizar_dado_candidato",
  "description": "Atualiza um campo do perfil do candidato. Campos permitidos: cidade, pretensaoSalarial, disponibilidade.",
  "parameters": {
    "type": "object",
    "properties": {
      "candidatoId": { "type": "string" },
      "campo":       { "type": "string", "enum": ["cidade", "pretensaoSalarial", "disponibilidade"] },
      "valor":       { "type": ["string", "number"] }
    },
    "required": ["candidatoId", "campo", "valor"]
  }
}
```

Retorno: `{ "ok": true }`

Whitelist explicita: IA so pode mexer nesses campos. Tudo o que nao esta na
whitelist = `forbidden:campo_nao_permitido`.

> Nota: `disponibilidade` hoje nao e campo dedicado no schema. Ate existir,
> tool grava como `Restricao` adicional do candidato.

Mapping: `PUT /api/candidatos/[id]` com whitelist server-side.

### 3.5 `adicionar_observacao_candidato`

```json
{
  "name": "adicionar_observacao_candidato",
  "description": "Adiciona nota livre ao perfil do candidato, visivel pro RH. Use pra registrar coisas que o candidato disse e que sao relevantes (ex: 'tem entrevista em outra empresa na proxima semana').",
  "parameters": {
    "type": "object",
    "properties": {
      "candidatoId": { "type": "string" },
      "observacao":  { "type": "string", "minLength": 3, "maxLength": 1000 }
    },
    "required": ["candidatoId", "observacao"]
  }
}
```

Retorno: `{ "ok": true }`

Efeito: append em `Candidato.observacao` com prefixo `[IA <data>] ...` para
distinguir do que o RH escreveu.

Mapping: `PUT /api/candidatos/[id]` (campo `observacao`).

### 3.6 `confirmar_presenca_entrevista`

```json
{
  "name": "confirmar_presenca_entrevista",
  "description": "Registra que o candidato confirmou presenca na entrevista.",
  "parameters": {
    "type": "object",
    "properties": {
      "entrevistaId": { "type": "string" }
    },
    "required": ["entrevistaId"]
  }
}
```

Retorno: `{ "ok": true }`

Efeito: `TriagemEvento { tipo: "ENTREVISTA_CONFIRMADA", origem: "IA" }`.

Mapping: **TODO** — schema atual nao tem `confirmadaEm` em `Entrevista`.
Pode-se adicionar campo ou apenas registrar evento.

### 3.7 `registrar_desistencia`

```json
{
  "name": "registrar_desistencia",
  "description": "Candidato desistiu do processo. Marca triagem como reprovada e registra motivo.",
  "parameters": {
    "type": "object",
    "properties": {
      "triagemId": { "type": "string" },
      "motivo":    { "type": "string", "minLength": 3 }
    },
    "required": ["triagemId", "motivo"]
  }
}
```

Retorno: `{ "ok": true }`

Efeitos:
- `Triagem.status = ERRO` ou nova etapa `DISPENSADO` (depende da regra)
- `TriagemEvento { tipo: "DESISTENCIA", origem: "IA", metadados: { motivo } }`

Mapping: reusa servico de finalizacao de triagem em `src/lib/triagem-etapas.ts`
(ja existe).

---

## 4. Tools utilitarias

### 4.1 `gerar_link_calendario`

```json
{
  "name": "gerar_link_calendario",
  "description": "Gera link/arquivo ICS para o candidato adicionar entrevista no calendario dele.",
  "parameters": {
    "type": "object",
    "properties": {
      "entrevistaId": { "type": "string" }
    },
    "required": ["entrevistaId"]
  }
}
```

Retorno:
```json
{
  "googleCalendarUrl": "https://calendar.google.com/calendar/render?action=TEMPLATE&...",
  "icsUrl": "https://rh-selector/entrevista/<id>/ics"
}
```

Mapping: **TODO** — nao existe. Implementacao simples gerando URL do Google
Calendar com query params.

### 4.2 `solicitar_documento`

```json
{
  "name": "solicitar_documento",
  "description": "Registra solicitacao de documento pendente do candidato (CV atualizado, comprovante, etc). RH vai cobrar depois.",
  "parameters": {
    "type": "object",
    "properties": {
      "candidatoId": { "type": "string" },
      "tipo":        { "type": "string", "enum": ["cv", "comprovante_endereco", "certificacao", "outro"] },
      "descricao":   { "type": "string" }
    },
    "required": ["candidatoId", "tipo"]
  }
}
```

Retorno: `{ "ok": true }`

Efeito: registra como `Restricao` ou nova coleção `SolicitacaoDocumento` (a
definir).

Mapping: **TODO** — modelo nao existe ainda.

---

## 5. Tools que **nao** entram em v1

Itens deliberadamente fora da v1 por risco ou complexidade:

| Tool descartada | Motivo |
|---|---|
| `aprovar_candidato` | IA nao decide aprovacao. Sempre humano. |
| `reprovar_candidato` | Idem. So manual. |
| `contratar_candidato` | Idem. Acao financeira/legal sensivel. |
| `mover_etapa` | Mudanca de etapa requer julgamento. Pode entrar em v2 com regras. |
| `acessar_score_internos` | Score nunca exposto ao LLM. |
| `listar_outros_candidatos_vaga` | Privacidade. Candidato nao deve saber quem mais aplicou. |
| `enviar_proposta_salarial` | Negociacao salarial e atribuicao humana. |
| `consultar_dados_de_outro_candidato` | Vazamento entre tenants/candidatos. |

Quando IA precisa de qualquer um desses, chama tool interna `escalar_para_rh`
do motor.

---

## 6. Resumo: o que precisa ser criado no rh-selector

Mapping consolidado (`X` = ja existe; `TODO` = precisa criar):

| Tool | Status | Acao |
|---|---|---|
| consultar_status_candidato | X | Adaptar `GET /api/candidatos/[id]` para versao tool (omite sensiveis) |
| listar_vagas_abertas | X | `GET /api/vagas?status=ABERTA` |
| consultar_perfil_candidato | X | Idem 1, com filtragem |
| consultar_proxima_entrevista | X | `GET /api/entrevistas` filtrado |
| listar_horarios_disponiveis | TODO | Implementar gerador de slots a partir de entrevistas existentes |
| consultar_requisitos_vaga | X | `GET /api/vagas/[id]` |
| consultar_etapas_processo | X | Idem |
| agendar_entrevista | X | `POST /api/entrevistas` + idempotencia + flag origem IA |
| cancelar_entrevista | parcial | Expor semantica `cancelar` na rota `PUT /api/entrevistas/[id]` |
| reagendar_entrevista | X | `PUT /api/entrevistas/[id]` |
| atualizar_dado_candidato | X | `PUT /api/candidatos/[id]` com whitelist server-side |
| adicionar_observacao_candidato | X | Append em `Candidato.observacao` via PUT |
| confirmar_presenca_entrevista | TODO | Adicionar campo `confirmadaEm` ou apenas evento |
| registrar_desistencia | X | Servico em `src/lib/triagem-etapas.ts` |
| gerar_link_calendario | TODO | Util novo (ICS + Google Calendar URL) |
| solicitar_documento | TODO | Decidir modelo (Restricao? SolicitacaoDocumento?) |

Soma: ~16 tools no catalogo v1. Dessas, 4 sao TODO real (precisam codigo
novo) e 1 e parcial.

---

## 7. Estrutura sugerida de implementacao

```
src/app/api/motor-tools/
  consultar_status_candidato/route.ts
  listar_vagas_abertas/route.ts
  ...
src/lib/motor-tools/
  validate-signature.ts      // verifica X-Motor-Signature
  resolve-tenant.ts          // tenantId -> Empresa
  schema-validators.ts       // Zod por tool
  index.ts                   // registry local
```

Cada rota:
1. Valida assinatura
2. Resolve tenant -> empresa
3. Valida arguments com Zod (mesmo schema do JSON Schema registrado)
4. Executa logica (preferencialmente chamando servicos ja existentes)
5. Filtra campos sensiveis no retorno
6. Responde `{ result, isError: false }` ou `{ result: null, isError: true, errorMessage }`

---

## 8. Versionamento e evolucao

- **v1** (este doc) — leitura + escrita basica + utilidades
- **v2** (futuro) — `mover_etapa` com regras, fluxos multi-step de
  rescheduling, integracao com Google Calendar real (OAuth do entrevistador),
  consulta por video (Zoom/Meet link)
- Cada tool nova ou breaking change vira PR separado, atualiza este doc e
  motor faz update do registry via `POST /v1/ai/tools`

Removal: tool nunca e deletada da v1. Pode virar `deprecated: true` no
registry, motor para de oferece-la ao LLM, mas continua respondendo.
