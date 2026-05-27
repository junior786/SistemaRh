# Project Trello

Use this skill when operating the Trello board for this repository.

## Scope

Apply these conventions when creating, updating, labeling, or reorganizing cards related to:

- multi-tenant work in `rh-selector`
- Motor WhatsApp planning
- backlog cleanup and organization

## Board config

- `boardId`: `6a10bb2533bdab51f4e33010`
- `activeListId`: `6a10beefe1c3ba7ad81c50a7`
- `devListId`: `6a10c0a994fbc837b1272487`
- `qaListId`: `6a10c0a9a3c307d570fc5261`

## Labels

- `Multi-Tenant`: use for tenantization work in `rh-selector`
- `Motor WhatsApp`: use for backlog items related to the standalone WhatsApp motor

## Naming conventions

- `MT NN - ...` for multi-tenant cards
- `MVP NN - ...` for Motor WhatsApp cards

## Operating rules

1. Inspect the current cards before creating new ones.
2. Reuse or update an existing card if the new request overlaps with it.
3. Keep titles specific and execution-oriented.
4. Use concise Portuguese in titles and descriptions to match the current board style.
5. Apply the correct label after creating or updating the card.
6. Keep all new cards in the current active list unless the user asks for a different list.
7. When starting development from an existing card, create a dedicated git branch before changing code.
8. When starting development from an existing card, move it to `Dev`.
9. When implementation is finished and ready for validation, move it to `QA`.
10. Prefer `Trello MCP` when available.
11. If `Trello MCP` fails because of auth, connection, or server issues, fall back to the direct Trello API via `PowerShell` + `Invoke-RestMethod`.

## Card description standard

Use this structure for implementation cards:

- `Objetivo:` one sentence with the intended outcome
- `Escopo:` compact flat list of concrete tasks
- `Referencia:` local spec/doc path when applicable

## Current groups

### Motor WhatsApp

- `MVP 01` to `MVP 11`
- `Sprint posterior - Integrar o rh-selector ao Motor WhatsApp`

### Multi-Tenant

- `MT 01` to `MT 09`

## Safety

- Do not persist Trello secrets in repository files.
- Avoid destructive bulk moves or deletions unless explicitly requested.
- If board IDs, list IDs, or labels change, update this file and the Codex skill reference together.
- If `Trello MCP` is down, do not block the task when direct API access is available.
- Use a dedicated branch per card under active development.
