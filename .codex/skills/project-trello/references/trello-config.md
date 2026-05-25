# Trello Config

## Board

- `boardId`: `6a10bb2533bdab51f4e33010`

## Active backlog list

- `listId`: `6a10beefe1c3ba7ad81c50a7`

This is the list currently used for both:

- Motor WhatsApp cards
- Multi-tenant cards for `rh-selector`

## Delivery flow lists

- `devListId`: `6a10c0a994fbc837b1272487`
- `qaListId`: `6a10c0a9a3c307d570fc5261`

Operational rule:

- when the agent starts developing a card, move it to `Dev`
- when the agent finishes implementation, move it to `QA`

## Label conventions

- `Multi-Tenant`: use for tenantization work in `rh-selector`
- `Motor WhatsApp`: use for backlog items related to the standalone WhatsApp motor

## Prefix conventions

- `MT NN - ...`
- `MVP NN - ...`

## Current backlog groups

### Motor WhatsApp

- `MVP 01` to `MVP 11`
- `Sprint posterior - Integrar o rh-selector ao Motor WhatsApp`

### Multi-Tenant

- `MT 01` to `MT 09`

## Operational notes

- Inspect the current cards before creating new ones to avoid duplicates.
- Keep new cards in the same list unless the user explicitly asks for another list.
- Prefer concise Portuguese card titles and descriptions, matching the existing board style.
- Prefer `Trello MCP` first; if it fails, use the direct Trello REST API via `PowerShell` + `Invoke-RestMethod`.
- Do not persist Trello secrets in the repository.
