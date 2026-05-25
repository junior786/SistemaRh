# Spec: Evolução para Multi-Tenant

## Objetivo

Evoluir o RH Selector de um sistema single-tenant para multi-tenant, onde cada empresa acessa seu ambiente isolado por subdomínio, por exemplo:

- `empresax.recrutafacil.com`
- `empresay.recrutafacil.com`

O sistema passará a usar `Firebase Auth` para autenticação, mantendo autorização e isolamento de dados por empresa no backend.

## Estado atual identificado

O projeto hoje possui estrutura predominantemente single-tenant:

- Existe o model `Empresa`, mas ele está concentrado em configurações de WhatsApp/Twilio.
- Entidades centrais como `Vaga`, `Candidato`, `Triagem` e `Entrevista` não possuem `empresaId`.
- A aplicação possui helper explícito de single-tenant que seleciona a primeira empresa cadastrada.
- APIs de dashboard, vagas, candidatos e triagens operam sem filtro por empresa.
- Rotas por `id` não validam ownership do registro contra a empresa atual.
- A sessão atual não carrega contexto de tenant.
- O layout e metadados são globais para toda a aplicação.

Conclusão: no estado atual, ao adicionar mais de uma empresa, haveria vazamento de dados entre tenants.

## Objetivos funcionais da mudança

- Cada empresa deve acessar apenas seus próprios dados.
- Cada empresa deve ter seu próprio subdomínio.
- Um usuário autenticado deve acessar somente as empresas às quais pertence.
- Toda leitura e escrita no backend deve ser escopada por tenant.
- Configurações como WhatsApp, templates, branding e permissões devem ser isoladas por empresa.

## Premissas

- O tenant será resolvido primariamente pelo subdomínio.
- O domínio base previsto é `recrutafacil.com`.
- A autenticação será feita com `Firebase Auth`.
- O backend continuará responsável por autorização e isolamento de dados.
- Prisma continuará sendo o único ponto de acesso ao banco.

## Resolução de tenant

### Regra principal

O tenant deve ser identificado a partir do `host` da requisição.

Exemplos:

- `empresax.recrutafacil.com` -> tenant `empresax`
- `empresa-beta.recrutafacil.com` -> tenant `empresa-beta`

### Campos necessários em `Empresa`

Adicionar ou consolidar os seguintes campos:

- `id`
- `nome`
- `slug` ou `subdominio`
- `dominioCustom` opcional
- `status`
- `timezone`
- `logoUrl` opcional
- `corPrimaria` opcional
- `createdAt`
- `updatedAt`

### Regras

- `slug/subdominio` deve ser único.
- O backend deve resolver a empresa antes de processar qualquer operação protegida.
- Se o subdomínio não existir, a aplicação deve responder com erro de tenant inválido ou tela apropriada.
- Se houver `dominioCustom`, a resolução também deve suportar esse host.

## Autenticação com Firebase

### Escopo

`Firebase Auth` será usado apenas para autenticação de identidade.

### Regra obrigatória

Autenticação não substitui autorização por tenant.

Mesmo com usuário autenticado no Firebase, o backend deve validar:

- quem é o usuário
- a quais empresas ele pertence
- qual papel ele possui naquela empresa
- se o tenant do host corresponde a uma empresa permitida para aquele usuário

### Modelagem recomendada

Criar modelos locais para autorização:

#### `Usuario`

- `id`
- `firebaseUid` único
- `nome`
- `email`
- `ativo`
- `createdAt`
- `updatedAt`

#### `EmpresaUsuario`

- `id`
- `empresaId`
- `usuarioId`
- `role`
- `ativo`
- `createdAt`
- `updatedAt`

### Roles sugeridos

- `OWNER`
- `ADMIN`
- `RECRUITER`
- `VIEWER`

### Fluxo esperado

1. Usuário autentica no Firebase.
2. Frontend obtém o ID token.
3. Backend valida o token.
4. Backend busca o usuário local por `firebaseUid`.
5. Backend resolve o tenant pelo host.
6. Backend valida se existe vínculo ativo em `EmpresaUsuario`.
7. Backend autoriza a ação de acordo com a role.

## Modelo de dados multi-tenant

### Regra geral

Toda entidade de domínio que representa dado de negócio de uma empresa deve ter `empresaId`.

### Entidades que devem receber `empresaId`

- `Vaga`
- `Candidato`
- `Categoria` se o catálogo for por empresa
- `Triagem`
- `TriagemEvento`
- `Mensagem`
- `ControleConversa`
- `TwilioTemplate` já possui `empresaId`

### Entidades que podem herdar escopo indiretamente

Entidades filhas que sempre dependem de uma entidade já escopada podem continuar sem `empresaId` próprio, desde que o acesso sempre passe pela relação correta:

- `VagaArea`
- `Requisito`
- `VagaEtapa`
- `CandidatoArea`
- `CandidatoSkill`
- `Experiencia`
- `Formacao`
- `Restricao`
- `TriagemEtapa`
- `Entrevista`

Ainda assim, em consultas críticas, o filtro precisa garantir que a entidade-pai pertença à empresa atual.

## Decisões de modelagem

### Candidato

Decisão recomendada: `Candidato` pertence a uma empresa.

Motivo:

- simplifica isolamento
- reduz risco de vazamento
- combina com o produto atual
- facilita filtros, mensagens, triagens e contratação

### Categoria

Há duas opções:

#### Opção A: catálogo global da plataforma

Útil se todas as empresas compartilham o mesmo conjunto fixo.

#### Opção B: catálogo por empresa

Útil se cada empresa poderá customizar áreas, tipos e classificações.

Decisão recomendada: tornar `Categoria` multi-tenant se houver expectativa de personalização por cliente.

## Ajustes de unicidade

### Estado atual problemático

- `Candidato.email` é único globalmente.
- `Categoria(tipo, nome)` é única globalmente.

### Ajuste recomendado

Trocar unicidades globais por unicidades por tenant quando fizer sentido.

Exemplos:

- `Candidato`: `@@unique([empresaId, email])`
- `Categoria`: `@@unique([empresaId, tipo, nome])` se for catálogo por empresa
- `Vaga`: opcionalmente `@@unique([empresaId, id])` não é necessário, pois `id` já é global

## Regras de autorização

### Regra obrigatória

Nenhuma rota pode confiar apenas no `id` do registro.

Toda busca por `id` deve validar que o registro pertence à empresa atual, direta ou indiretamente.

### Exemplos

- buscar candidato por `id` e `empresaId`
- buscar vaga por `id` e `empresaId`
- buscar triagem por `id` garantindo que a `vaga` ou a própria `triagem` pertença à empresa
- atualizar template garantindo `empresaId` correto

## Refatoração de backend

### Objetivo

Padronizar contexto de tenant e autorização.

### Recomendação

Criar helpers centrais como:

- `getTenantFromRequest()`
- `requireTenant()`
- `requireAuthenticatedUser()`
- `requireTenantMembership()`

### Resultado esperado

Cada rota deve:

1. resolver tenant
2. validar usuário
3. validar vínculo usuário-empresa
4. aplicar filtros de `empresaId` em todas as queries

## WhatsApp e Twilio

### Estado atual

Hoje o código usa lógica explicitamente single-tenant e assume a primeira empresa cadastrada.

### Requisito

Toda operação de WhatsApp deve ser resolvida por tenant.

### Ajustes necessários

- remover helpers `getSingleTenantEmpresa()` e `getSingleTenantWhatsappEmpresa()`
- substituir por resolução por empresa atual
- garantir que templates Twilio sejam buscados por `empresaId`
- garantir que mensagens e histórico pertençam à empresa correta

### Webhook

O webhook exige atenção especial.

Ele precisa identificar a empresa correta no recebimento da mensagem. As opções mais seguras são:

- identificar por `twilioFromNumber`
- identificar por credencial/endpoint segregado
- identificar por vínculo do candidato com a empresa, como validação complementar

### Regra recomendada

O tenant do webhook não deve depender de "primeira empresa cadastrada".

## Branding por empresa

Cada tenant deve poder personalizar:

- nome exibido
- título da aplicação
- logo
- cores principais
- textos institucionais

Esses dados devem ser carregados a partir da empresa resolvida no host atual.

## Infraestrutura

### Requisitos

- wildcard DNS para `*.recrutafacil.com`
- wildcard SSL
- suporte a subdomínio no ambiente de produção
- suporte local para testes de subdomínio

### Exemplos de hosts

- `empresax.localhost` ou equivalente em desenvolvimento
- `empresax.recrutafacil.com` em produção

## Segurança

### Regras obrigatórias

- impedir acesso cruzado entre tenants por URL ou `id`
- nunca retornar registros de outra empresa
- validar tenant e membership em toda rota protegida
- registrar logs com `tenantId`
- revisar exposição de dados sensíveis

## Portabilidade e consistência técnica

### Importante

O projeto declara Prisma como único ponto de acesso ao banco e também evita dependência de SQL direto.

Durante a migração multi-tenant, qualquer uso de SQL bruto que dificulte portabilidade ou isolamento deve ser removido ou encapsulado em solução compatível com Prisma e escopo por tenant.

## Plano de migração recomendado

### Fase 1: modelagem

- criar/ajustar campos de tenant em `Empresa`
- criar `Usuario`
- criar `EmpresaUsuario`
- adicionar `empresaId` nas entidades necessárias
- ajustar índices e unicidades

### Fase 2: contexto de tenant

- resolver tenant pelo host
- criar helpers centrais de tenant e autorização
- preparar middleware ou camada server-side equivalente

### Fase 3: autenticação/autorização

- integrar Firebase Auth
- validar token no backend
- vincular usuário autenticado ao registro local
- validar membership por empresa

### Fase 4: refatoração de APIs

- aplicar `empresaId` em todas as listagens, buscas, updates e deletes
- revisar rotas por `id`
- revisar queries agregadas de dashboard

### Fase 5: WhatsApp

- refatorar envio
- refatorar leitura de mensagens
- refatorar webhook
- validar configuração Twilio por empresa

### Fase 6: frontend

- aplicar branding por tenant
- exibir dados da empresa atual
- tratar tenant inválido ou usuário sem acesso

### Fase 7: migração de dados

- mapear dados legados para uma empresa inicial
- preencher `empresaId` nas tabelas existentes
- validar integridade antes de abrir cadastro de múltiplas empresas

### Fase 8: testes

- testar isolamento entre empresas
- testar acesso negado entre tenants
- testar login de usuário com uma ou múltiplas empresas
- testar webhook e mensagens por tenant

## Critérios de aceite

- uma empresa não pode visualizar vagas, candidatos, triagens, entrevistas, mensagens ou métricas de outra empresa
- todas as APIs protegidas validam tenant e membership
- autenticação funciona via Firebase
- autorização é controlada pela relação `EmpresaUsuario`
- WhatsApp/Twilio opera com a configuração correta da empresa
- branding e metadados variam por subdomínio
- o sistema suporta `*.recrutafacil.com`

## Riscos principais

- esquecer filtros de tenant em rotas antigas
- manter unicidades globais que bloqueiem operação multi-tenant
- confiar apenas em autenticação sem autorização por empresa
- webhook do WhatsApp roteando mensagens para empresa errada
- dashboards e contadores agregando dados globais

## Recomendação final

Fazer a migração com `single database, shared schema, tenantId em cada entidade`.

Esse modelo é o mais adequado para o estágio atual do produto porque:

- exige menos mudança operacional
- simplifica deploy
- reduz custo inicial
- permite crescer com isolamento lógico consistente

Se no futuro houver exigência forte de isolamento físico, a evolução para banco por tenant pode ser reavaliada, mas não deve ser a primeira abordagem agora.
