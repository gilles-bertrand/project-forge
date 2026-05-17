# project-forge — SprintForge (Ember + Fastify)

Monorepo pnpm + Turborepo. Backend Fastify 5 (TypeScript, vite-node), frontend Ember 6 (Octane, Embroider/Vite), PostgreSQL 16 + MikroORM 7.

## Migration en cours

Ce repo est en cours de transformation depuis un boilerplate Ember+Fastify vers **SprintForge** (outil de gestion de projets Scrum). Voir :
- `specs/todo/sprintforge-migration-macro-plan.md` (plan macro 14 phases)
- `specs/done/00-adr-sprintforge.md` (décisions structurantes)
- `specs/todo/p*.md` (plans détaillés par phase)

## Layout

```
@apps/
├── backend     Fastify REST API (point d'entrée: src/app.bootstrap.ts)
├── front       Application Ember 6
└── e2e         Tests Playwright

@libs/
├── backend-shared   Helpers JSON:API, error-handler — utilisés par les libs backend
├── users-backend    Domaine Users — auth (JWT + refresh), routes, entités
├── users-front      Addon Ember — auth UI, user management
├── shared-front     Addon Ember — services partagés (theme, error-reporter, handle-save) + design tokens SprintForge
└── repo-utils       Configs partagées (babel, tsconfig, oxlint)

Futures libs SprintForge (P1+) : projects-backend, backlog-backend, sprints-backend,
time-tracking-backend, projects-front, backlog-front, kanban-front, sprints-front,
time-tracking-front, dashboard-front — voir specs/done/00-adr-sprintforge.md
```

Les routes backend sont préfixées `/api/v1` puis montées par module : `/api/v1/auth/*`, `/api/v1/users/*`.
Les modules SprintForge (projects, backlog, sprints, time-tracking) arrivent en P2.

## Commandes

| Commande | Effet |
|---|---|
| `pnpm dev` | Lance backend + frontend en parallèle |
| `pnpm dev:back` | Backend seul (vite-node --watch, hot reload) |
| `pnpm dev:front` | Frontend seul |
| `pnpm lint` / `pnpm lint:fix` | Lint tout le monorepo (turbo) |
| `pnpm format` | Format tout le monorepo |
| `cd @apps/backend && pnpm schema:fresh` | Recrée le schéma DB (drop + create) |
| `cd @apps/backend && pnpm seed` | Seed données (development.seeder.ts) |
| `cd @apps/backend && pnpm test` | Tests vitest backend |
| `cd @apps/e2e && pnpm test` | Tests Playwright E2E |

## DB & services

PostgreSQL via Docker — `docker compose up -d` à la racine. Credentials par défaut : `backend_user` / `backend_user` / `database_dev` sur `localhost:5432`.

Le `.env` du backend (`@apps/backend/.env`) contient les secrets : `SESSION_KEY` (32 bytes hex), `JWT_SECRET`, `JWT_REFRESH_SECRET`. Il est gitignored. Template : `.env.example`.

## Conventions code

- **Validation/schémas** : Zod 4 partout (body, response, query). Les routes utilisent `fastify-type-provider-zod` v6 — toute réponse doit matcher son schéma déclaré sous peine de `FST_ERR_RESPONSE_SERIALIZATION`.
- **Sérialisation API** : conventions JSON:API via `@libs/backend-shared` (`makeJsonApiError`, `makeJsonApiDocumentSchema`). Content-Type accepté : `application/vnd.api+json` ou `application/json`.
- **Linting** : oxlint pour le backend (libs incluses), ESLint + Prettier + template-lint pour le frontend (apps et libs).
- **Commits** : `git-conventional-commits` + Lefthook (pre-commit). Format : `feat:`, `fix:`, `chore:`...
- **Branches protégées** : `main` et `dev` — PR obligatoire, pas de force push, pas de suppression (ruleset GitHub actif).
