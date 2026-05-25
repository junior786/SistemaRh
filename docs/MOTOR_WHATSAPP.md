# Motor WhatsApp

Documento de requisitos do **Motor WhatsApp**: um servico standalone, sem UI,
que processa o fluxo bidirecional de mensagens WhatsApp e expoe uma API REST
multi-tenant para que aplicacoes (como o rh-selector) usem como backend de
mensageria.

O rh-selector deixa de falar direto com a Twilio. Ele:

- Cadastra suas credenciais Twilio no motor (uma vez por empresa)
- Envia mensagens via API REST do motor
- Recebe eventos inbound (mensagem recebida, status atualizado, rascunho IA)
  via **webhook outbound** assinado, no estilo Stripe/Slack

---

## 1. Posicionamento

| Item | Decisao |
|---|---|
| Tipo | Servico standalone (job/worker) sem UI |
| Stack | Next.js API routes (mesmo stack do rh-selector, sem paginas) |
| Banco | MongoDB proprio do motor (Mongoose). Justificativa em §3.0 |
| Auth de clientes | Firebase Auth (ID token JWT) — mesmo IdP usado pelos usuarios do rh-selector |
| Entrega de eventos | Webhook outbound HTTP POST assinado |
| Multi-tenant | Nativo desde o dia 1 |
| Provider WhatsApp | Twilio (com abstracao para futuros providers) |
| IA | OpenRouter (configuravel por tenant) |

---

## 2. Arquitetura

```
+----------------+         +--------------------+         +-------------+
|   rh-selector  | ---->   |   Motor WhatsApp   | <-->    |   Twilio    |
|  (cliente API) | <----   |  (servico autonomo)|         | (provider)  |
+----------------+         +--------------------+         +-------------+
        ^                          |     ^
        |                          v     |
   webhook outbound          +-----------+
   (eventos)                 | Postgres  |
                             | (motor)   |
                             +-----------+
```

- **Entrada do motor**: API REST para clientes + webhook inbound do Twilio
- **Saida do motor**: chamadas Twilio + webhook outbound para clientes
- **Persistencia**: mensagens, contatos, conversas, templates, config IA, deliveries

---

## 3. Modelo de dados

### 3.0 Por que MongoDB e nao Postgres + Prisma

- Mensagens sao append-only de alto volume (writes >> updates) — modelo doc fit
- Payloads variam por tipo (text, template, media, eventos webhook) — schemaless
  evita migrations a cada novo provider/campo opcional
- `WebhookDelivery` e `IdempotencyKey` se beneficiam de TTL index nativo (auto
  expiracao sem job de limpeza)
- Sem joins complexos no dominio do motor (cada tenant e ilha)
- Indices por `{ tenantId, ... }` resolvem isolamento e busca
- Driver Mongo + Mongoose mais leve que Prisma para esse use case
- Trade-off aceito: sem transacoes ACID multi-doc tradicionais (Mongo tem
  transacoes mas com custo). Operacoes criticas (envio + persistencia +
  enqueue de evento) usam padrao "outbox" com retry, nao 2PC.

Caso aparecam joins ou reporting analitico no motor, considerar adicionar um
read store em Postgres alimentado via change stream. Fora do MVP.

### 3.1 Colecoes

| Colecao | Campos chave | Indices | Funcao |
|---|---|---|---|
| `tenants` | `_id`, `name`, `firebaseProjectId`, `firebaseServiceUid` (UID Firebase do "service account user" do rh-selector que representa esse tenant), `allowedAudiences[]`, `createdAt` | unique(`firebaseServiceUid`) | Cliente do motor |
| `channels` | `_id`, `tenantId`, `provider`, `accountSid`, `authTokenEncrypted`, `fromNumber` | unique(`tenantId`, `provider`) | Credenciais do provider |
| `contacts` | `_id`, `tenantId`, `externalId`, `displayName`, `phoneE164`, `lastInboundAt` | (`tenantId`, `externalId`) unique | Pessoa do outro lado |
| `conversations` | `_id`, `tenantId`, `contactId`, `mode` (AUTONOMOUS/SUPERVISED/HANDED_OFF), `iaEnabled`, `handedOffAt`, `lastSummaryAt`, `tags[]` | (`tenantId`, `contactId`) | Estado RH vs IA |
| `messages` | `_id`, `tenantId`, `conversationId`, `direction`, `content`, `status`, `providerMessageSid`, `type`, `templateId`, `generatedByAi`, `aiDraft`, `aiApprovedAt`, `createdAt` | (`tenantId`, `conversationId`, `createdAt`); unique(`providerMessageSid`) sparse | Append-only de mensagens |
| `templates` | `_id`, `tenantId`, `slug`, `name`, `contentSid`, `variables`, `active` | unique(`tenantId`, `slug`) | Templates aprovados |
| `aiConfigs` | `tenantId`, `enabled`, `persona`, `tone`, `faq`, `blocklist`, `draftMode`, `model`, `summaryModel`, `temperature`, `defaultMode` (AUTONOMOUS/SUPERVISED), `autonomyWhitelist[]` (intencoes que IA pode resolver sozinha), `confidenceThreshold` | unique(`tenantId`) | Config IA por tenant |
| `webhookEndpoints` | `_id`, `tenantId`, `url`, `secretHash`, `events[]`, `filters` (objeto opcional ex: `{ "conversation.mode": ["SUPERVISED"] }`), `active` | (`tenantId`) | URLs do cliente |
| `webhookDeliveries` | `_id`, `endpointId`, `eventType`, `payload`, `statusCode`, `attempts`, `nextRetryAt`, `deliveredAt`, `lastError` | (`nextRetryAt`); TTL index em `deliveredAt` (30 dias) | Fila/log outbound |
| `idempotencyKeys` | `tenantId`, `key`, `responseSnapshot`, `expiresAt` | unique(`tenantId`, `key`); TTL em `expiresAt` | Anti-duplicacao 24h |
| `outbox` | `_id`, `tenantId`, `event`, `payload`, `processedAt` | (`processedAt`) sparse | Padrao outbox: garante entrega eventual de eventos apos commit |

Todos os documentos carregam `tenantId`. Query helpers obrigam o filtro via
middleware Mongoose (`pre('find')` injeta tenantId do contexto).

---

## 4. Autenticacao (Firebase Auth)

Decisao: usar Firebase Auth como IdP unico tanto para login dos usuarios RH no
rh-selector quanto para a auth service-to-service entre rh-selector e motor.
Substitui o modelo de API key.

### 4.1 Visao geral

```
+----- usuarios RH (browser) -----+
                |
                |  email/senha ou Google
                v
            Firebase Auth
                |
                |  ID token (1h, JWT RS256)
                v
        rh-selector backend
                |
                |  Firebase Admin SDK: verifyIdToken
                |  -> sessao do usuario (uid + claims)
                |
                |  Para chamar o motor:
                |  Admin SDK: cria token com claim { tenantId, aud: "motor-whatsapp" }
                |  Authorization: Bearer <token>
                v
            Motor WhatsApp
                |  Admin SDK: verifyIdToken (verifica assinatura + aud)
                |  extrai tenantId do claim
                |  resolve tenant + executa
```

Os dois lados (rh-selector e motor) compartilham o **mesmo Firebase Project**.

### 4.2 Tokens

**Usuario RH (browser -> rh-selector backend)**

- Firebase JS SDK no browser autentica e devolve ID token
- Renovacao automatica via Firebase (refresh token guardado pelo SDK)
- rh-selector backend valida o token a cada request:
  `getAuth().verifyIdToken(token)`
- Token nao chega no motor. So no rh-selector. Browser nao conhece o motor.

**Service-to-service (rh-selector backend -> motor)**

Modelo recomendado: cada Empresa do rh-selector tem associado um **"service
user"** no Firebase Auth (UID dedicado, sem senha, criado via Admin SDK durante
onboarding). Custom claims desse user carregam `{ tenantId, role: "service" }`.

A cada chamada ao motor, rh-selector backend:

1. `getAuth().createCustomToken(empresa.firebaseServiceUid, { tenantId, aud: "motor-whatsapp" })`
2. Troca custom token por ID token: `signInWithCustomToken` via REST (uma vez,
   cacheado por 50min)
3. Envia `Authorization: Bearer <idToken>` ao motor

Motor verifica:

```ts
const decoded = await getAuth().verifyIdToken(token);
if (decoded.aud !== "motor-whatsapp") throw 403;
const tenant = await Tenant.findOne({ firebaseServiceUid: decoded.uid });
if (!tenant) throw 403;
```

Token expira em 1h naturalmente. Sem necessidade de rotacao manual.

### 4.3 **Credenciais NUNCA podem chegar no navegador**

Mesmo com Firebase no jogo, regras se mantem:

- **Service Account JSON** do Firebase (usado pelo rh-selector backend para
  Admin SDK) fica em variavel de ambiente do servidor, nunca em `NEXT_PUBLIC_*`,
  nunca em client component
- ID tokens gerados para falar com o motor sao **gerados e consumidos somente
  no servidor**. Nao trafegam para o browser
- O browser usa **somente** o ID token do usuario RH (gerado pelo Firebase JS
  SDK) para chamar **rotas internas do rh-selector**. Nao chama o motor direto
- Config publica do Firebase (apiKey do projeto, authDomain) pode estar em
  `NEXT_PUBLIC_*` — esses sao identificadores publicos, nao credenciais
- Service Account JSON nunca commitado, nunca em log, scrubbed em Sentry

### 4.4 Provisionamento de novo tenant

Operacao do admin do motor (CLI ou rota interna protegida):

1. Admin recebe identificacao da empresa cliente
2. Motor cria registro `tenants` com nome e gera `firebaseServiceUid` chamando
   `createUser({ disabled: false, displayName: "service-<empresa>" })`
3. Define custom claims via `setCustomUserClaims(uid, { tenantId, role: "service" })`
4. rh-selector salva `firebaseServiceUid` em `Empresa` (campo nao secreto, e
   um UID Firebase)
5. rh-selector configura webhook outbound e Channel (Twilio) via API do motor
   ja autenticando com Firebase token

### 4.5 Revogacao

- Desativar tenant: `updateUser(uid, { disabled: true })` na console/script.
  Tokens existentes deixam de validar imediatamente (Firebase invalida apos
  ate 1h de cache de `verifyIdToken`, configuravel com `checkRevoked: true`)
- Para revogacao **imediata** em incidente, motor liga `checkRevoked: true` na
  verificacao — paga ida ao Firebase a cada token. Em cenario normal, manter
  desligado (performance)
- Auditoria via Firebase Audit Logs (GCP)

### 4.6 Por que nao API key

| Aspecto | API key | Firebase ID token |
|---|---|---|
| Expiracao | manual (90d) | 1h automatica |
| Revogacao | rotaciona | `disabled: true` no Firebase |
| Identidade unificada com usuarios | nao | sim |
| Operacao | gerenciar hash + rotacao | gerenciado pelo Firebase |
| Lock-in | nenhum | Firebase |
| Custo | nada extra | Firebase Auth (free tier generoso) |

Trade-off aceito: lock-in Firebase em troca de IdP unificado + tokens curtos +
revogacao centralizada.

---

## 5. API REST publica

Base path: `/v1`. Todas as rotas exigem `Authorization: Bearer <firebaseIdToken>`
com claim `aud: "motor-whatsapp"`. Respostas JSON.

### 5.1 Mensagens

```
POST /v1/messages
  Body: {
    "to": "+5551984735359",                  // E164, sem prefixo whatsapp:
    "type": "text" | "template",
    "text"?: "ola, tudo bem?",
    "templateSlug"?: "entrevista_agendada",
    "variables"?: { "1": "12/1", "2": "3pm" },
    "metadata"?: { ... }                     // armazenado, ecoado em eventos
  }
  Headers opcionais:
    Idempotency-Key: <uuid>                  // anti-duplicacao 24h
  Response 201: { id, providerMessageSid, status, conversationId, ... }
```

### 5.2 Conversas e historico

```
GET  /v1/conversations
GET  /v1/conversations/:id
GET  /v1/conversations/:id/messages?limit=50&before=<ts>
POST /v1/conversations/:id/handoff      // RH assume (iaEnabled=false)
POST /v1/conversations/:id/resume       // RH retoma (iaEnabled=true)
```

### 5.3 Rascunhos da IA (modo draft)

```
GET    /v1/drafts                       // lista pendentes do tenant
POST   /v1/drafts/:id/approve           // aprova e envia
  Body opcional: { "content": "..." }   // sobrescreve antes do envio
PATCH  /v1/drafts/:id                   // edita conteudo sem enviar
DELETE /v1/drafts/:id                   // descarta
```

### 5.4 Templates

```
GET    /v1/templates
POST   /v1/templates
  Body: { slug, name, contentSid, variables: "data,horario", description?, active? }
PUT    /v1/templates/:id
DELETE /v1/templates/:id
```

### 5.5 Tenant / config

```
GET /v1/tenants/me
  Response: { id, name, channel: {...}, aiConfig: {...}, webhookEndpoints: [...] }

PUT /v1/tenants/me
  Body: { name?, channel?: { accountSid, authToken, fromNumber }, aiConfig?: {...} }
```

### 5.6 Webhook endpoints

```
GET    /v1/webhooks
POST   /v1/webhooks
  Body: { url, events: ["message.received", "ai.draft_created", ...] }
  Response: { id, secret }                // secret so retornado nesta resposta
PUT    /v1/webhooks/:id
DELETE /v1/webhooks/:id
POST   /v1/webhooks/:id/test             // dispara evento de teste
```

### 5.7 Health

```
GET /v1/health
  Response: { status: "ok", version, dbLatencyMs }
```

---

## 6. Webhook inbound — Twilio para motor

Endpoint publico que o Twilio bate:

```
POST /webhooks/twilio
  Content-Type: application/x-www-form-urlencoded
  Header: X-Twilio-Signature
```

Motor identifica o **tenant** pelo campo `To` recebido (mesmo numero
configurado em `Channel.fromNumber`). Valida assinatura usando o `authToken`
desse tenant. Roteia para:

- **Status update**: atualiza `Message.status` via `MessageSid`
- **Inbound message**: persiste `Message` direction=IN, atualiza
  `Contact.lastInboundAt`, dispara IA se aplicavel, enfileira eventos outbound

Erros de identificacao do tenant retornam 200 (para evitar retry do Twilio)
mas geram log warn.

---

## 7. Webhook outbound — motor para cliente

### 7.1 Eventos

Catalogo completo (ver §8.5.4 para prioridades e modelo de assinatura):

| Evento | Quando | Payload principal |
|---|---|---|
| `message.received` | Inbound persistido | `message`, `contact`, `conversation` |
| `message.sent` | Envio outbound bem sucedido | `message` |
| `message.status_updated` | Callback do Twilio | `message` (status novo) |
| `message.failed` | Envio falhou | `message`, `error` |
| `ai.draft_created` | IA gerou rascunho (draftMode) | `message` (com `aiDraft: true`) |
| `ai.replied` | IA respondeu automaticamente | `message` (com `generatedByAi: true`) |
| `ai.action_taken` | IA executou tool do cliente com efeito real | `tool`, `arguments`, `result` |
| `ai.escalated` | IA desistiu / chamou `escalar_para_rh` | `conversation`, `reason`, `summary` |
| `ai.tool_call_requested` | IA precisa de tool do cliente | ver §8.3.5 |
| `ai.tool_call_timeout` | Cliente nao respondeu a tool no prazo | `callId`, `tool` |
| `conversation.handed_off` | Mudou para HANDED_OFF | `conversation`, `reason`, `summary` |
| `conversation.resumed` | Voltou para AUTONOMOUS | `conversation` |
| `conversation.flagged` | Sentimento ruim, palavra-chave, reclamacao | `conversation`, `signals` |
| `conversation.summarized` | Resumo periodico/encerramento | `conversation`, `summary`, `period` |

Cliente assina apenas os eventos que importam (via `events[]` e `filters` no
`POST /v1/webhooks`). Eventos `ai.tool_call_requested` sao sempre entregues
se ha tool registrada (nao e opt-in — IA depende disso pra continuar).

### 7.2 Formato do POST

```
POST <url-do-cliente>
Content-Type: application/json
X-Motor-Event: message.received
X-Motor-Delivery: 01J3F4...                  // uuid unico desta entrega
X-Motor-Timestamp: 1716422400
X-Motor-Signature: t=1716422400,v1=<hmac-sha256>

Body:
{
  "id": "evt_01J3F4...",
  "type": "message.received",
  "tenantId": "tnt_...",
  "createdAt": "2026-05-22T18:00:00Z",
  "data": {
    "message": { ... },
    "contact": { ... },
    "conversation": { ... }
  }
}
```

### 7.3 Assinatura

`X-Motor-Signature: t=<unix>,v1=<hex>` onde `v1 = HMAC_SHA256(secret, "<unix>.<raw_body>")`.
Cliente recalcula com `WebhookEndpoint.secret` e compara em tempo constante.

Janela de tolerancia: 5 minutos entre `t` e o relogio do cliente para rejeitar
replay.

### 7.4 Retry

Considerado sucesso: resposta `2xx` em ate 5s. Caso contrario, retry com
backoff exponencial:

```
tentativa 1 -> imediata
tentativa 2 -> +1 min
tentativa 3 -> +5 min
tentativa 4 -> +30 min
tentativa 5 -> +2h
tentativa 6 -> +6h
tentativa 7 -> +24h
tentativa 8 -> +48h
```

Apos 8 falhas, marca delivery `FAILED` e desativa o endpoint se o tenant tiver
mais de 80% das ultimas 100 entregas em FAILED.

### 7.5 Idempotencia para o cliente

Cliente deve tratar `X-Motor-Delivery` como idempotency key: a mesma entrega
pode chegar mais de uma vez (retries) e deve produzir o mesmo efeito.

---

## 8. IA interna ao motor

### 8.1 Config por tenant (`AiConfig`)

- `enabled` — toggle global
- `draftMode` — quando true, gera rascunho ao inves de enviar
- `persona`, `tone`, `faq`, `blocklist` — comportamento
- `model` — modelo OpenRouter (default `deepseek/deepseek-chat`)
- `temperature` — default 0.5

### 8.2 Contexto da IA — dominio agnostico

Motor enriquece a IA com dados internos dele: contato, conversa, historico de
mensagens, templates ativos do tenant, persona/tom/FAQ/blocklist. Dados de
dominio do cliente (vagas, candidato detalhado, entrevistas, scores) ficam
**fora** do motor — sao expostos sob demanda via **tools** (proximo bloco).

Motor nunca persiste dados de dominio do cliente. Privacidade preservada e
contrato fino.

### 8.3 Tool registry + MCP pattern

A IA do motor segue o mesmo padrao do **Model Context Protocol (MCP)**: motor
e o **host** que orquestra o modelo; cliente (rh-selector) e o **server** que
expoe ferramentas (`tools`). A IA decide quando chamar, motor delega ao
cliente via webhook outbound, cliente executa e devolve o resultado, motor
continua o loop.

#### 8.3.1 Modelo conceitual

```
+----------+        +-------------+        +-------------+
|   LLM    | <-->   | Motor (host)| <-->   | rh-selector |
+----------+        +-------------+        |  (server)   |
                          ^                +-------------+
                          |                       ^
                          | webhook outbound      |
                          | ai.tool_call_requested|
                          v                       |
                    +-------------+                |
                    | rh-selector | ---------------+
                    | route       |   POST /v1/ai/tool_results/:callId
                    +-------------+
```

#### 8.3.2 Registro de tools

Cliente registra tools por tenant:

```
POST /v1/ai/tools
  Body:
  {
    "name": "agendar_entrevista",
    "description": "Cria uma nova entrevista para o candidato na vaga em
                    processo. Retorna id da entrevista e link de confirmacao.",
    "parameters": {
      "type": "object",
      "properties": {
        "triagemId": { "type": "string", "description": "Id da triagem ativa" },
        "dataHora":  { "type": "string", "format": "date-time" },
        "entrevistador": { "type": "string" },
        "vagaEtapaId": { "type": "string" }
      },
      "required": ["triagemId", "dataHora", "entrevistador"]
    },
    "timeoutMs": 10000,
    "scopes": ["write:entrevista"]
  }

GET    /v1/ai/tools
PUT    /v1/ai/tools/:name
DELETE /v1/ai/tools/:name
```

- `parameters` segue **JSON Schema** (compativel com function calling de
  OpenAI/Anthropic)
- `timeoutMs` define quanto motor espera pela resposta do cliente antes de
  declarar falha
- `scopes` sao opcionais e usados para futura UI de aprovacao por tenant

#### 8.3.3 Tools internas do motor (sempre disponiveis)

Algumas tools sao **nativas** do motor, nao requerem registro do cliente:

| Tool | Funcao |
|---|---|
| `enviar_texto(content)` | Envia mensagem livre (dentro da janela 24h) |
| `enviar_template(slug, variables)` | Envia template aprovado do tenant |
| `escalar_para_rh(motivo)` | Desliga `iaEnabled` da conversa e gera evento |
| `propor_horarios(opcoes[])` | Envia carrossel/lista de horarios para escolha |
| `consultar_historico(n)` | Le ultimas N mensagens (motor ja tem) |
| `marcar_intencao(label)` | Adiciona tag a conversa (ex: "interessado", "duvida_salario") |

Essas tools executam direto dentro do motor — nao geram webhook outbound.

#### 8.3.4 Lifecycle de uma tool call

```
1. Motor recebe inbound do candidato
2. Monta prompt: system (persona/FAQ) + historico + lista de tools do tenant
   (registradas + internas)
3. POST OpenRouter -> LLM responde com tool_calls[]
4. Para cada tool_call:
   a. Se for tool interna -> motor executa direto
   b. Se for tool registrada pelo cliente:
      - Motor persiste em coleção `ai_tool_calls` { _id, conversationId,
        tenantId, toolName, arguments, status: "pending", expiresAt }
      - Dispara webhook outbound: ai.tool_call_requested
      - Cliente recebe, executa em rota /api/motor-tools/<nome>
      - Cliente responde:
        POST /v1/ai/tool_results/:callId
          { "result": { ... }, "isError": false }
      - Motor atualiza ai_tool_calls.status = "completed"
5. Motor reenvia ao LLM: messages + tool_results
6. LLM gera proximo turno (mais tool calls OU resposta final em texto)
7. Repete ate LLM produzir mensagem final
8. Motor envia mensagem final via Twilio (ou cria rascunho se draftMode=true)
```

Limite por defeito: **8 turnos de tool call** por inbound. Acima disso, motor
encerra o loop e responde fallback `escalar_para_rh("loop excedido")`.

#### 8.3.5 Webhook outbound `ai.tool_call_requested`

```
POST <url-do-cliente>
X-Motor-Event: ai.tool_call_requested
X-Motor-Delivery: <uuid>
X-Motor-Signature: t=...,v1=...

{
  "id": "evt_...",
  "type": "ai.tool_call_requested",
  "tenantId": "tnt_...",
  "data": {
    "callId": "tc_01J3...",
    "conversationId": "conv_...",
    "messageId": "msg_...",            // inbound que disparou
    "tool": "agendar_entrevista",
    "arguments": {
      "triagemId": "trg_...",
      "dataHora": "2026-05-25T15:00:00-03:00",
      "entrevistador": "Ana"
    },
    "deadline": "2026-05-22T18:00:10Z" // motor desistira em 10s
  }
}
```

Cliente deve responder ao webhook com **200 OK em ate 5s** (confirmacao de
recebimento, nao do resultado), e depois enviar:

```
POST /v1/ai/tool_results/:callId
{
  "result": {
    "entrevistaId": "ent_...",
    "linkConfirmacao": "https://rh-selector/entrevista/ent_..."
  },
  "isError": false
}
```

Se erro:

```
POST /v1/ai/tool_results/:callId
{
  "result": null,
  "isError": true,
  "errorMessage": "Triagem nao encontrada ou ja encerrada"
}
```

Motor inclui o erro na proxima iteracao do LLM. LLM decide se tenta de outro
jeito, pede mais dados ao candidato, ou escala.

#### 8.3.6 Timeout e fallback

Se cliente nao responder ate `deadline`:
- Motor marca `ai_tool_calls.status = "timeout"`
- Inclui erro sintetico no historico: `{ "isError": true, "errorMessage": "tool_timeout" }`
- LLM continua o loop com essa informacao (geralmente chamando
  `escalar_para_rh` em sequencia)
- Dispara evento `ai.tool_call_timeout` no webhook outbound (observabilidade)

#### 8.3.7 Seguranca

- Cada tool call e idempotente do lado do cliente (callId e idempotency key)
- Motor valida que `tool.name` esta registrado para aquele tenant antes de
  dispatchar
- LLM nao pode chamar tool de outro tenant (impossivel pois o registry e
  filtrado por tenantId no prompt)
- Cliente valida o `X-Motor-Signature` do webhook como qualquer outro evento
- Considerar adicionar `scopes` validados pelo cliente (ex: tool com escopo
  `write:entrevista` requer permissao explicita no cliente)

### 8.4 Exemplo end-to-end

Cenario: candidato escreve "posso ir terca as 15h" sobre uma entrevista.

```
1. Twilio -> motor: inbound "posso ir terca as 15h"
2. Motor monta contexto:
   - tools internas: enviar_texto, enviar_template, escalar_para_rh, ...
   - tools registradas do tenant rh-selector:
     - consultar_status_candidato()
     - agendar_entrevista(triagemId, dataHora, entrevistador)
     - listar_horarios_disponiveis(entrevistador, dataInicio, dataFim)
3. LLM responde: tool_call consultar_status_candidato()
4. Motor -> rh-selector (webhook): ai.tool_call_requested
5. rh-selector -> motor: result { triagemId, vaga, etapa: "entrevista_tecnica", proximaEntrevista: null }
6. LLM responde: tool_call listar_horarios_disponiveis(entrevistador="Ana", dataInicio="2026-05-26", dataFim="2026-05-26")
7. Motor -> rh-selector: ai.tool_call_requested
8. rh-selector -> motor: result { slots: ["10:00", "15:00", "16:30"] }
9. LLM responde: tool_call agendar_entrevista(triagemId="trg_x", dataHora="2026-05-26T15:00:00-03:00", entrevistador="Ana")
10. Motor -> rh-selector: ai.tool_call_requested
11. rh-selector cria Entrevista, retorna: result { entrevistaId: "ent_y", linkConfirmacao: "..." }
12. LLM responde: tool_call enviar_template(slug="entrevista_confirmada", variables={ data: "26/5", horario: "15h" })
13. Motor: executa internamente, envia template via Twilio
14. LLM responde: tool_call (final, sem mais chamadas)
15. Motor: finaliza. Dispara evento ai.replied.
```

rh-selector recebe 3 webhooks tool_call_requested + 1 webhook ai.replied.
Toda a logica de "qual horario, qual entrevistador, qual triagem" ficou na IA
do motor + tools do rh-selector. Zero IA no rh-selector.

### 8.5 Modos de conversa — autonomo vs supervisionado

Nem toda conversa precisa envolver o rh-selector. Conversas simples (FAQ,
cordialidade, esclarecimento) podem rodar **inteiramente dentro do motor**,
sem disparar webhook, sem chamar tool, sem custo de roundtrip. Conversas
complexas ou criticas seguem o fluxo supervisionado.

#### 8.5.1 Modos disponiveis

| Modo | Quem decide a resposta | rh-selector envolvido? |
|---|---|---|
| `AUTONOMOUS` | IA do motor sozinha | Apenas em eventos de alto valor (escalou, agendou, falhou) |
| `SUPERVISED` | IA gera, RH aprova (draftMode) ou RH responde direto | Sim, recebe `ai.draft_created` ou `message.received` em todo turno |
| `HANDED_OFF` | RH humano via API | Sim, recebe `message.received` em todo turno; IA fica inativa |

`Conversation.mode` armazena o modo. Default vem de `AiConfig.defaultMode`
do tenant. RH pode forcar modo via `POST /v1/conversations/:id/mode { mode }`.

Transicoes automaticas (configuraveis):
- `AUTONOMOUS` -> `HANDED_OFF` quando IA chama `escalar_para_rh` ou detecta
  baixa confianca em N turnos
- `SUPERVISED` -> `HANDED_OFF` quando RH responde manualmente via UI
- `HANDED_OFF` -> `AUTONOMOUS` somente manualmente via RH

#### 8.5.2 Quando uma conversa pode ser autonoma

Heuristicas que a IA do motor usa para confiar em si mesma:

- Pergunta casa com a FAQ (`AiConfig.faq`) com alta similaridade
- Intencao detectada esta em whitelist do tenant
  (ex: `["duvida_simples", "agradecimento", "info_processo"]`)
- Nao requer tool call que escreva no rh-selector (write tools sempre fazem
  passar pelo cliente)
- Score de confianca da resposta acima do threshold do tenant

Caso contrario, IA escala automaticamente ou cai pra modo SUPERVISED.

#### 8.5.3 Que tools afetam o modo

- **Tools internas read-only** (`consultar_historico`, `marcar_intencao`):
  sao seguras em modo autonomo. Nao acordam o cliente
- **Tools internas write** (`enviar_texto`, `enviar_template`,
  `escalar_para_rh`): permitidas em autonomo, geram evento `ai.replied` ou
  `ai.escalated`
- **Tools do cliente** (registradas pelo rh-selector): **sempre** acordam o
  cliente via webhook tool_call_requested, independente do modo. Esse e o
  ponto. Se IA precisar de dado de dominio, rh-selector entra na jogada
  pontualmente

#### 8.5.4 Modelo de assinatura de eventos pelo cliente

Cliente registra webhook com **filtro fino** de eventos:

```
POST /v1/webhooks
{
  "url": "https://rh-selector/api/motor-callback",
  "events": [
    "ai.escalated",           // alto valor, sempre receber
    "ai.action_taken",        // tool executou (agendou, atualizou)
    "message.failed",
    "conversation.summarized" // resumo diario/da conversa
  ],
  "filters": {
    "conversation.mode": ["SUPERVISED", "HANDED_OFF"]
    // message.received so chega se conversa nao for autonoma
  }
}
```

Categorias de evento:

| Evento | Prioridade | Quando |
|---|---|---|
| `message.received` | baixa | Inbound persistido. Opt-in por filtro de modo |
| `message.sent` | baixa | Outbound efetivado |
| `message.status_updated` | media | Status callback do Twilio |
| `message.failed` | alta | Envio falhou (erro Twilio) |
| `ai.replied` | baixa | IA respondeu em autonomo (info, geralmente nao precisa entregar) |
| `ai.draft_created` | media | IA gerou rascunho em draftMode (RH precisa aprovar) |
| `ai.action_taken` | alta | IA chamou tool do cliente que executou acao com efeito (ex: agendou entrevista) |
| `ai.escalated` | **critica** | IA desistiu / escalou pro RH. Cliente DEVE assinar |
| `conversation.handed_off` | media | Modo mudou para HANDED_OFF |
| `conversation.resumed` | baixa | Modo voltou para AUTONOMOUS |
| `conversation.flagged` | alta | Sentimento ruim, palavra-chave (configurada por tenant), reclamacao |
| `conversation.summarized` | baixa | Resumo automatico (diario ou ao final da conversa) |
| `ai.tool_call_requested` | execucao | Sempre entregue se houver tool registrada — nao e opt-in |
| `ai.tool_call_timeout` | media | Cliente nao respondeu no prazo |

Eventos marcados como "execucao" (tool_call_requested) nao seguem filtro: se
a IA precisa da tool, cliente recebe sim ou sim.

#### 8.5.5 Visibilidade do rh-selector

Em modo `AUTONOMOUS`, rh-selector pode nao receber `message.received`. Como o
RH vai ver o historico?

- UI `/candidatos/:id/mensagens` puxa **on-demand** do motor:
  `GET /v1/conversations/:id/messages`
- Cache local opcional para offline / performance
- Resumo periodico via `conversation.summarized` ja entrega o essencial sem
  exigir polling
- Eventos de alto valor (`ai.action_taken`, `ai.escalated`) ja chegam push

Em modo `SUPERVISED` / `HANDED_OFF`, rh-selector mantem espelho local
atualizado via `message.received`.

#### 8.5.6 Resumos automaticos

Motor gera resumo periodico de cada conversa autonoma:

- **Resumo ao escalar**: quando muda para HANDED_OFF, motor gera resumo
  "tudo que aconteceu ate aqui" e entrega no payload do
  `conversation.handed_off` para o RH ja entrar contextualizado
- **Resumo diario**: jobs ao final do dia consolidam conversas ativas e
  enviam `conversation.summarized` (opt-in)
- **Resumo de encerramento**: quando conversa fica idle X dias, motor envia
  resumo final e marca conversa arquivada

Resumos sao gerados pelo modelo configurado em `AiConfig.summaryModel` (pode
ser mais barato que o `model` principal).

#### 8.5.7 Por que isso importa

- **Custo**: conversa autonoma com modelo pequeno + FAQ embedding = centavos.
  Conversa que envolve rh-selector + N tools + modelo grande = ordem de
  grandeza maior
- **Latencia**: resposta direta do motor ~1s. Resposta passando por webhook
  + tool call + roundtrip + LLM novamente ~5-10s
- **Carga no cliente**: rh-selector nao processa eventos que nao precisa
- **Privacidade**: dados conversacionais ficam no motor, cliente acessa
  apenas o necessario
- **Escala**: motor pode atender milhoes de conversas autonomas em paralelo
  sem comprometer o cliente

### 8.6 Comparacao com MCP (Model Context Protocol)

O padrao acima e essencialmente MCP, com pequenas adaptacoes para HTTP/webhook:

| Conceito MCP | Equivalente no motor |
|---|---|
| MCP Host | Motor WhatsApp |
| MCP Server | rh-selector (e qualquer cliente registrando tools) |
| MCP Tool | Tool registrada via `POST /v1/ai/tools` |
| MCP Resource | (futuro) `GET /v1/ai/resources` registrado pelo cliente |
| MCP Prompt | persona/tom/FAQ do `AiConfig` |
| stdio/SSE transport | HTTP webhook outbound + REST callback |

Se no futuro o motor quiser adotar MCP nativo, os adapters sao
straightforward — o contrato ja e equivalente.

---

## 9. Integracao do rh-selector

### 9.1 Provisionamento (uma vez, operacao server-side)

1. Admin cria Tenant no motor:
   - `tenants.insertOne({ name, ... })`
   - `firebase.auth().createUser({ displayName: "service-<empresa>" })`
   - `firebase.auth().setCustomUserClaims(uid, { tenantId, role: "service", aud: "motor-whatsapp" })`
   - Salva `firebaseServiceUid` no documento do tenant
2. Admin entrega `firebaseServiceUid` ao rh-selector
3. rh-selector salva em `Empresa.motorFirebaseServiceUid` (NAO secreto — e um
   UID Firebase)
4. rh-selector configura Channel Twilio:
   `PUT /v1/tenants/me { channel: { accountSid, authToken, fromNumber } }`
5. rh-selector cadastra webhook outbound:
   `POST /v1/webhooks { url: "https://rh-selector/api/motor-callback", events: [...] }`
   Salva `secret` em `Empresa.motorWhatsappWebhookSecret` (criptografado,
   server-side)

O segredo de verdade fica do lado do rh-selector: a **Service Account JSON
do Firebase Admin SDK**, em variavel de ambiente do servidor. Sem essa,
rh-selector nao consegue gerar tokens em nome do tenant.

### 9.2 Arquitetura de chamadas

```
Browser (rh-selector)                              [usuario RH ja logado via Firebase]
   |  Authorization: Bearer <userIdToken>
   |  POST /api/whatsapp/send
   v
Next.js Route Handler (rh-selector, server)
   |  1. verifyIdToken(userIdToken) -> valida sessao
   |  2. busca Empresa do usuario -> firebaseServiceUid
   |  3. createCustomToken(serviceUid, { tenantId, aud: "motor-whatsapp" })
   |  4. trocaCustom->Id (cacheado 50min em memoria)
   |  5. Authorization: Bearer <serviceIdToken>
   v
Motor WhatsApp /v1/messages
   |  verifyIdToken -> tenantId do claim -> executa
```

O **browser nunca conhece**:
- URL do motor
- Service Account JSON do Firebase
- Token usado para falar com o motor

O browser conhece apenas:
- Config publica do Firebase (apiKey do projeto, authDomain) em `NEXT_PUBLIC_*`
- Seu proprio ID token de usuario

### 9.3 Que dados precisam ser salvos no rh-selector

| Campo na `Empresa` | Sensivel? | Onde |
|---|---|---|
| `motorFirebaseServiceUid` | Nao (UID publico) | DB texto puro |
| `motorWhatsappWebhookSecret` | Sim | DB criptografado |
| URL do motor | Nao | env var (`MOTOR_WHATSAPP_BASE_URL`) |
| Firebase Service Account JSON | **MUITO** | env var (`FIREBASE_ADMIN_CREDENTIALS`) — NUNCA no client |

### 9.4 Operacao

| Acao | Antes (Twilio direto) | Depois (via motor) |
|---|---|---|
| RH envia mensagem | `client.messages.create({...})` | `POST {motor}/v1/messages` |
| Twilio inbound | Endpoint do rh-selector | Endpoint do motor; rh-selector recebe `message.received` |
| Status callback | Endpoint do rh-selector | Idem; recebe `message.status_updated` |
| Aprovar rascunho | UI -> rota interna -> Twilio | UI -> `POST {motor}/v1/drafts/:id/approve` |
| Config Twilio | Salvo no `Empresa` do rh-selector | Salvo no `Channel` do motor (via PUT tenant) |
| Templates | CRUD local | Proxy do `/v1/templates` do motor |
| Login do RH | `admin/admin` | Firebase Auth (Email/Password ou Google) |

### 9.5 Novo endpoint no rh-selector

```
POST /api/motor-callback     // recebe webhook outbound do motor
  Valida X-Motor-Signature com Empresa.motorWhatsappWebhookSecret
  Despacha por X-Motor-Event:
    message.received    -> persiste Mensagem local + dispara lógicas
    ai.draft_created    -> marca como rascunho
    message.status_*    -> atualiza status local
```

### 9.6 Compatibilidade

Schema atual do rh-selector (`Mensagem`, `Empresa`, `TwilioTemplate`,
`ControleConversa`) **continua existindo** como cache/snapshot local para
performance e UI offline-first. Diferenca: o "source of truth" passa a ser o
motor.

---

## 10. Observabilidade

### 10.1 Logs estruturados

JSON por linha. Campos minimos: `ts`, `level`, `tenantId`, `requestId`,
`event`, dados especificos.

### 10.2 Metricas (Prometheus ou similar)

- `motor_messages_sent_total{tenant, type, status}`
- `motor_messages_received_total{tenant}`
- `motor_webhook_deliveries_total{tenant, event, outcome}`
- `motor_webhook_delivery_latency_seconds`
- `motor_ai_tokens_total{tenant, model, direction}`
- `motor_ai_cost_usd_total{tenant, model}`
- `motor_ai_latency_seconds{model}`

### 10.3 Dashboard interno

Pagina admin (fora do v1 publico) com filtros por tenant: ultimos eventos,
falhas, deliveries pendentes, custos IA, etc. Protegida por master key.

---

## 11. Limites e quotas (por tenant)

| Limite | Default | Configuravel |
|---|---|---|
| Mensagens outbound por minuto | 60 | sim |
| Eventos da IA por hora por contato | 30 | sim |
| Tamanho do payload do webhook | 1 MB | nao |
| Templates ativos | 100 | sim |
| Webhook endpoints | 5 | sim |
| Custo IA por dia (USD) | 10 | sim |

Limites excedidos retornam `429 Too Many Requests` com header `Retry-After`.

---

## 12. Seguranca

- Auth tokens do Twilio criptografados em repouso (libsodium/sealed-box ou
  AES-GCM com key do KMS)
- Firebase Service Account JSON apenas em env var do servidor; nunca commitado,
  nunca em log, scrubbed em telemetria (ver §4.3)
- Motor valida `aud: "motor-whatsapp"` no token para evitar reuso de tokens
  emitidos para outras audiences do mesmo Firebase Project
- HMAC tempo-constante na verificacao de assinatura
- Rate limit por IP no nivel da rota publica (defesa contra abuso de
  enumeracao de chaves)
- Webhook do Twilio so aceita com X-Twilio-Signature valido (em production)
- Logs nunca registram conteudo de mensagem se tenant marcar
  `redactLogs=true`
- Auditoria de toda mudanca de config sensivel (credenciais, webhooks,
  rotacao de API key)

---

## 13. Roadmap

1. **MVP**: tenants, channel Twilio, send/receive, webhook outbound, templates
2. **IA assistida**: AiConfig + draftMode + opcao B (delegated AI)
3. **Tool calling**: registry de tools + loop tool_call/tool_result
4. **Pluggable providers**: abstracao Channel -> implementar Meta Cloud,
   Gupshup, etc.
5. **Quotas & billing**: medicao + planos
6. **Multimodal**: audios (transcricao), imagens (OCR), documentos
7. **Console admin**: UI minimalista para suporte (interna, fora do v1)
8. **SDKs**: pacote `@motor-whatsapp/node` e `python` para clientes

---

## 14. Decisoes em aberto

- Onde rodar (Vercel/Fly/AWS)?
- Fila para webhook outbound (BullMQ + Redis? change stream do Mongo? Agenda?
  SQS? Inngest?)
- KMS para credenciais (proprio? gerenciado?)
- Cobranca/billing — fora do escopo MVP
- Como onboardar o primeiro tenant em producao (CLI script vs rota interna)
- Versionamento da API alem de `/v1` (estrategia para `/v2`)

---

## 15. Checklist MVP

- [ ] Repo separado, projeto Next.js standalone, sem pages
- [ ] MongoDB + Mongoose: schemas + indices (incluindo TTL) + seed de tenant
- [ ] Firebase Project compartilhado (motor + rh-selector) configurado
- [ ] Firebase Admin SDK em ambos os lados; service account JSON em env
- [ ] Middleware do motor: `verifyIdToken` + valida `aud: "motor-whatsapp"`
  + resolve tenant pelo `firebaseServiceUid` no claim
- [ ] rh-selector: migrar login admin/admin para Firebase Auth (esforco a parte)
- [ ] rh-selector: criar service user no Firebase para cada Empresa durante
  onboarding (Admin SDK)
- [ ] Cache de ID token service-to-service (50min) para evitar exchange por
  request
- [ ] Lint/scrubbing garantindo que Service Account JSON nao vaza para client
- [ ] `POST /v1/messages` (texto + template)
- [ ] `POST /webhooks/twilio` (inbound + status)
- [ ] Sistema de fila para entrega outbound + retry
- [ ] Assinatura HMAC outbound + verificacao no cliente
- [ ] CRUD de templates
- [ ] CRUD de webhook endpoints
- [ ] AiConfig + opcao B (delegated AI)
- [ ] Endpoint de teste de webhook (`POST /v1/webhooks/:id/test`)
- [ ] Criptografia de credenciais Twilio em repouso
- [ ] Logs estruturados
- [ ] Health endpoint
- [ ] Docs publicos (OpenAPI/Redoc) do contrato `/v1`
- [ ] Migracao do rh-selector para consumir o motor (sprint propria no
  rh-selector apos motor estar disponivel)
