# Libs rules

Ce dossier contient les libs partagées du monorepo, séparées en deux familles :

- **Libs backend** (`backend-shared`, `users-backend`) — TypeScript pour Fastify, build via `tsdown`.
  Futures libs P1+ : `projects-backend`, `backlog-backend`, `sprints-backend`, `time-tracking-backend`.
- **Libs frontend** (`shared-front`, `users-front`) — Addons Ember v2 (Embroider), build via Rollup.
  Futures libs P4+ : `projects-front`, `backlog-front`, `kanban-front`, `sprints-front`, `time-tracking-front`, `dashboard-front`.

## Code style

- **Libs backend** : enforcer les règles de l'`.oxlintrc.json` de la lib courante (oxlint + oxfmt).
- **Libs frontend** : enforcer les règles d'`eslint.config.mjs`, `.prettierrc.mjs`, et `.template-lintrc.mjs` de la lib courante. **NE PAS** utiliser oxlint pour les libs front.

## Dépendances inter-libs

- `@libs/backend-shared` ne dépend de rien d'autre.
- `@libs/users-backend` peut importer `@libs/backend-shared`. Les futures libs Scrum backend idem.
- `@libs/shared-front` ne dépend de rien d'autre (c'est la base de tout).
- `@libs/users-front` et les futures libs front Scrum peuvent importer `@libs/shared-front`, jamais l'une l'autre (pas de cycle).
- Les libs front peuvent consommer les types générés depuis `@apps/backend/src/api-types.ts` (import read-only).

## Tests

Chaque lib backend a son `vitest.config.mts` et ses tests dans `tests/{unit,integration}/`. Les libs front utilisent Ember test runner.
