# todos-backend — Domaine Todos

Module Fastify fournissant le CRUD des Todos, monté sur `/todos`. Préfixe complet : `/api/v1/todos/*`. Routes protégées par `jwtAuthMiddleware` (importé depuis `@libs/users-backend`).

## Structure

```
src/
├── init.ts                  Module (setup routes + errorHandler + JWT middleware)
├── context.ts               TodoLibraryContext (em, jwtSecret)
├── types.ts                 Types domaine
├── entities/
│   └── todo.entity.ts       TodoEntity (title, description, completed, owner)
├── routes/
│   ├── create.route.ts      POST /todos
│   ├── list.route.ts        GET /todos
│   ├── get.route.ts         GET /todos/:id
│   ├── update.route.ts      PATCH /todos/:id
│   └── delete.route.ts      DELETE /todos/:id
└── serializers/
    └── todo.serializer.ts   Todo → JSON:API
```

## Conventions

- **Routes** : implémentent `Route<FastifyInstanceTypeForModule>` (interface de `@libs/backend-shared`).
- **Schemas Zod** : inline dans `routeDefinition`. Toujours déclarer `body`, `response.200/201`, `response.404` (todo not found), `response.401` (jwt invalide).
- **Ownership** : un todo appartient à un user. Les routes `get`/`update`/`delete` doivent vérifier que `todo.owner === request.user.id` (sinon 404, jamais 403, pour ne pas leaker l'existence).
- **Erreurs** : `makeJsonApiError` de `@libs/backend-shared`.
- **Imports internes** : `#src/*`.

## Dépendances

- `@libs/backend-shared` (helpers JSON:API + interfaces module/route).
- `@libs/users-backend` (re-export du `createJwtAuthMiddleware` et types associés).

## Code style

- Enforcer `.oxlintrc.json` (oxlint + oxfmt).

## Tests

- **Unit** : `tests/unit/*.test.ts` (serializers, helpers).
- **Integration** : `tests/integration/*.route.test.ts` — module Fastify réel via `tests/utils/setup-module.ts` + DB testcontainer.
- Couverture : chaque route doit avoir un test happy path + un test pour la règle d'ownership (un user ne peut pas accéder aux todos d'un autre).

## Commandes

```bash
pnpm build       # tsdown
pnpm build:watch # tsdown --watch
pnpm test        # vitest
pnpm lint
pnpm lint:fix
```
