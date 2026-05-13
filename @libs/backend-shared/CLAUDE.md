# backend-shared — Helpers backend partagés

Lib de bas niveau utilisée par les modules backend (`users-backend`, `todos-backend`) et l'app `@apps/backend`. **Ne contient aucune route métier.**

## Exports principaux

- **`serialization/json-api.ts`** :
  - `makeJsonApiDocumentSchema(type, attributesSchema)` — construit un schéma Zod `{ id, type, attributes }`.
  - `makeSingleJsonApiTopDocument(dataSchema)` — wrap dans `{ data, meta? }`.
  - `jsonApiErrorSchema` / `jsonApiErrorDocumentSchema` — schémas d'erreur JSON:API.
  - `makeJsonApiError(status, title, options?)` — fabrique un payload d'erreur `{ errors: [{ status, title, code, detail, source, meta }] }`.

- **`error-handler.ts`** :
  - `handleJsonApiErrors(error, request, reply)` — à utiliser dans `setErrorHandler` d'un sub-router. Catch les erreurs de validation Zod (`hasZodFastifySchemaValidationErrors`) et renvoie un 400 JSON:API. Re-throw toute autre erreur (qui remonte au errorHandler global).

- **`module.ts`** :
  - `Route<T>` — interface : `routeDefinition(f: T): void`.
  - `ModuleInterface<T>` — interface : `setupRoutes(fastify: T): Promise<void>`.

## Build & packaging

- **Bundler** : `tsdown` (TypeScript → ESM bundlé).
- **Watch** : `tsdown --watch` (utilisé par `pnpm dev` du backend).
- **Imports internes** : `#src/*` (résolu via `package.json#imports`).

## Code style

- Enforcer `.oxlintrc.json` (oxlint + oxfmt).

## Conventions

- Pas de logique métier ici. Si une fonction est spécifique à Users ou Todos, elle va dans la lib correspondante.
- Tous les schémas Zod doivent être exportés depuis `serialization/json-api.ts` et nommés `*Schema`.
- Les helpers de construction de payload (`makeXxx`) doivent retourner un objet typé via `z.infer<...>`.

## Pièges MikroORM 7 (Postgres)

Ces pièges s'appliquent à toutes les libs backend. Les ignorer produit des erreurs runtime silencieuses ou des crashs Postgres.

1. **`raw()` obligatoire pour toute expression SQL dans `.select(...)`**
   - ❌ `qb.select("COALESCE(SUM(hours), 0) as total")` → Postgres le traite comme un nom de colonne → erreur `column does not exist`
   - ✅ `qb.select(raw("COALESCE(SUM(hours), 0) as total"))` (import `raw` depuis `@mikro-orm/core`)
   - Cas concernés : `SUM`, `MAX`, `MIN`, `COUNT`, `COALESCE`, toute fonction SQL avec alias

2. **`createQueryBuilder` n'existe que sur `SqlEntityManager`**
   - `EntityManager` (depuis `@mikro-orm/core`) n'a pas cette méthode — elle est SQL-spécifique
   - Tout helper qui utilise `qb` doit typer `em: SqlEntityManager` (depuis `@mikro-orm/postgresql`)

3. **`repository.insert()` et `em.insert()` bypass les hooks `onCreate` / `onUpdate`**
   - Les champs comme `createdAt`, `updatedAt`, `joinedAt`, `assignedAt` ne sont PAS auto-remplis
   - Toujours fournir ces champs explicitement dans le payload `.insert(...)`
   - Alternative sans bypass : `em.create(entity, data)` + `em.flush()` (préserve les hooks)
   - S'applique en seeds, tests, et tout code qui utilise `insert()` directement

## Commandes

```bash
pnpm build       # tsdown
pnpm build:watch # tsdown --watch
pnpm lint
pnpm lint:fix
```
