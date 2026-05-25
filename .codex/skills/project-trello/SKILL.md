---
name: project-trello
description: Manage this project's Trello board using the existing board/list structure, card prefixes, and label conventions. Use when Codex needs to create, update, label, move, or review Trello cards for RH Selector work such as multi-tenant planning, WhatsApp motor planning, backlog organization, or implementation tracking.
---

# Project Trello

Use this skill to operate the Trello board for this repository with the project's existing conventions.

Read [references/trello-config.md](references/trello-config.md) before making Trello changes. It contains the board ID, active list ID, naming conventions, and current labels.

## Workflow

1. Inspect the current cards in the target list before creating new ones.
2. Reuse existing cards when the user's request overlaps substantially with an existing item.
3. Create cards with the correct prefix:
   - `MT NN - ...` for multi-tenant work in `rh-selector`
   - `MVP NN - ...` for Motor WhatsApp work
4. Apply the correct label:
   - `Multi-Tenant` for tenantization work in this app
   - `Motor WhatsApp` for the standalone WhatsApp motor backlog
5. When starting implementation from an existing card, move the card to the `Dev` list.
6. When implementation is finished and ready for validation, move the card to the `QA` list.
7. Keep descriptions compact and execution-oriented:
   - objective
   - scope
   - constraints or dependencies
   - reference docs when relevant
8. When the request changes many cards at once, summarize the intended grouping first in a short commentary update, then apply the changes.

## Operating Rules

- Prefer `Trello MCP` when it is healthy.
- If `Trello MCP` fails due to auth, connection, or server errors, fall back to the direct Trello API using `PowerShell` + `Invoke-RestMethod`.
- Prefer the existing Trello API flow already used in this project via PowerShell and `Invoke-RestMethod`.
- Do not write API keys or tokens into repository files.
- Treat board/list IDs and labels as configuration; if they change, update `references/trello-config.md`.
- When adding a new backlog category, create a new label only if an existing one is not a good fit.
- Use list movement as part of execution flow, not just visual organization.
- Avoid destructive bulk actions unless the user explicitly asks for them.

## Card Writing Standard

Use this structure in card descriptions when creating implementation work:

- `Objetivo:` one sentence with the delivery outcome
- `Escopo:` short flat list of concrete tasks
- `Referencia:` relevant local spec/doc path when it exists

Keep the title specific enough that another engineer can pick up the card without reopening the original chat.

## Typical Tasks

- Create a set of cards from a new spec in `docs/`
- Split one large initiative into execution cards
- Add or fix labels for existing cards
- Separate `rh-selector` work from `Motor WhatsApp` work
- Review the backlog and point out duplicates or gaps

## Fallback

If `Trello MCP` is unavailable, continue with direct API calls instead of blocking the task.

Use the project board/list configuration from `references/trello-config.md` and preserve the same naming, labeling, and movement rules.
