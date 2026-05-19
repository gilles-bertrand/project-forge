# Backend rules — Fastify 5

API REST en TypeScript, lancée via `vite-node --watch` (hot reload). Préfixe global des routes : `/api/v1`.

## Architecture

```
src/
├── app.bootstrap.ts        Point d'entrée : load config → App.init → app.start
├── configuration.ts        Schéma Zod du .env (loadConfiguration)
├── app/
│   ├── app.ts              Construction Fastify (plugins, validators, errorHandler)
│   ├── app.router.ts       Montage des modules sur prefix /api/v1
│   ├── application.context.ts  Contexte (ORM + config)
│   ├── database.connection.ts  Init MikroORM
│   ├── logger.ts           Pino logger config
│   ├── status.route.ts     Healthcheck
│   └── ...
├── cli/
│   ├── schema-fresh.ts     Drop + create schéma DB
│   └── migration-fresh.ts
├── seeders/
│   ├── development.seeder.ts
│   └── e2e.seeder.ts
├── mikro-orm.config.ts     Config ORM (postgresql, entities, debug)
└── gen-openapi.ts          Génère openapi.json depuis les schémas Zod des routes
```

Les domaines (Users en P0, puis Projects/Backlog/Sprints/TimeTracking en P1+) sont dans `@libs/*-backend` et montés via `appRouter()`.

## Stack & conventions clés

- **Validation** : Zod 4 partout. Body, query, params, **et response** sont déclarés dans `schema:` de chaque route.
- **Serializer** : `fastify-type-provider-zod` v6 — `safeParse` la response sortante. Si le payload renvoyé ne matche pas le schéma déclaré → `FST_ERR_RESPONSE_SERIALIZATION`. Toujours déclarer un schéma pour chaque code HTTP retourné (200, 201, 401, 404...).
- **JSON:API** : helpers dans `@libs/backend-shared` — `makeJsonApiError(status, title, opts)`, `makeJsonApiDocumentSchema`, `jsonApiErrorDocumentSchema`. Content-Type accepté : `application/vnd.api+json` et `application/json`.
- **Auth** : JWT (access 15m) + refresh token (7d, hashé en DB). Middleware `createJwtAuthMiddleware` dans `@libs/users-backend`. Sessions Passport pour les hooks legacy.
- **ORM** : MikroORM 7 PostgreSQL. Repository pattern, EntityManager forkée par module.
- **Logger** : Pino, format pretty en dev.
- **Error handling** : `setErrorHandler` global dans `app.ts` capture les erreurs non gérées. Chaque module a son propre `setErrorHandler` qui catch les erreurs de validation Zod via `handleJsonApiErrors` (`@libs/backend-shared`).

## Code style

- Enforcer les règles dictées par `.oxlintrc.json`. Format : `oxfmt`.

## .env

Géré par `ts-dotenv` + schéma Zod (`configuration.ts`). Variables :
- `SERVER_URL`, `PORT`, `PRODUCTION_ENV`, `DEBUG`
- `DATABASE_URI`, `QUEUE_URL`, `SEED`
- `SESSION_KEY` (32 bytes hex — pour `@fastify/secure-session`)
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `SMTP_*`

Templates : `.env.example`, `.env.e2e`. Le `.env` réel est gitignored.

## Commandes

```bash
pnpm dev               # vite-node --watch
pnpm start             # vite-node sans watch
pnpm test              # vitest run
pnpm schema:fresh      # drop + recreate DB schema
pnpm seed              # run development seeder
pnpm e2e:setup         # seed E2E (utilisé par @apps/e2e)
pnpm api:types         # regen openapi.json + src/api-types.ts depuis les schémas Zod
pnpm lint              # oxlint + oxfmt check
pnpm lint:fix
```

## Tests

- **Unit** : `tests/unit/*.test.ts`
- **Integration** : `tests/integration/*.test.ts` — utilisent `tests/utils/test-app.ts` qui démarre une vraie instance Fastify + DB testcontainer.
- Toujours fork l'EntityManager dans les tests pour éviter les fuites d'état.
