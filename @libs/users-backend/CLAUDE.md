# users-backend — Domaine Users + Auth

Module Fastify fournissant deux groupes de routes :
- **AuthModule** monté sur `/auth` (login, logout, refresh) — accès public.
- **UserModule** monté sur `/users` (CRUD users + profile) — protégé par `jwtAuthMiddleware`.

Préfixes complets : `/api/v1/auth/*` et `/api/v1/users/*`.

## Structure

```
src/
├── init.ts                      AuthModule + UserModule (setup routes + errorHandler)
├── router.ts                    Export du router agrégé
├── context.ts                   AuthLibraryContext / UserLibraryContext
├── entities/
│   ├── user.entity.ts           UserEntity (email, password hashé, etc.)
│   └── refresh-token.entity.ts  RefreshTokenEntity (hash, deviceInfo, expiry, familyId)
├── middlewares/
│   └── jwt-auth.middleware.ts   createJwtAuthMiddleware(em, jwtSecret) — preValidation hook
├── routes/
│   ├── login.route.ts           POST /auth/login
│   ├── logout.route.ts          POST /auth/logout
│   ├── refresh.route.ts         POST /auth/refresh
│   ├── create.route.ts          POST /users
│   ├── profile.route.ts         GET /users/me
│   ├── list.route.ts            GET /users
│   ├── get.route.ts             GET /users/:id
│   ├── update.route.ts          PATCH /users/:id
│   └── delete.route.ts          DELETE /users/:id
├── serializers/
│   └── user.serializer.ts       User → JSON:API
└── utils/
    ├── auth.utils.ts            hashPassword, verifyPassword (argon2)
    ├── jwt.utils.ts             generateTokens, verifyAccessToken, verifyRefreshToken
    ├── token.utils.ts           hashToken, generateFamilyId
    └── token-cleanup.utils.ts   purge des refresh tokens expirés
```

## Auth flow

> **⚠ Asymétrie de format** : `POST /auth/login` accepte un body **flat** (pas JSON:API).
> Toutes les autres routes du projet utilisent `{ data: { attributes: {...} } }` mais login est une exception.
>
> ```bash
> # ✅ Correct
> curl -X POST /api/v1/auth/login -d '{"email":"x@x.com","password":"secret"}'
> # ❌ Incorrect (reçoit 400 Validation Error)
> curl -X POST /api/v1/auth/login -d '{"data":{"attributes":{"email":"x@x.com","password":"secret"}}}'
> ```

1. **Login** : credentials → `verifyPassword` (argon2) → `generateTokens` (access 15m / refresh 7d) → stockage du hash du refresh + `familyId` en DB.
2. **Access token** : JWT signé avec `JWT_SECRET`. Vérifié par `jwtAuthMiddleware` en preValidation des routes protégées.
3. **Refresh** : `POST /auth/refresh` avec le refresh token → vérifie hash en DB + familyId → rotation (nouveau pair, ancien refresh révoqué).
4. **Logout** : revoke le refresh token (`revokedAt`).

Le `familyId` permet la détection de réutilisation : si un refresh token déjà révoqué est présenté, toute la famille est invalidée.

## Conventions

- **Routes** : implémentent `Route<FastifyInstanceTypeForModule>` (interface de `@libs/backend-shared`). Constructor reçoit les dépendances (repository, em, secrets).
- **Schemas Zod** : déclarés inline dans `routeDefinition`. Toujours déclarer `body`, `response.200`, `response.401`, `response.404` selon le cas.
- **Erreurs** : utiliser `makeJsonApiError` de `@libs/backend-shared` (le response schema doit être `jsonApiErrorDocumentSchema`).
- **Imports internes** : `#src/*`.

## Code style

- Enforcer `.oxlintrc.json` (oxlint + oxfmt).

## Tests

- **Unit** : `tests/unit/*.test.ts` — testent les utils en isolation (auth.utils, jwt.utils, token.utils, serializers, certaines routes en mockant l'em).
- **Integration** : `tests/integration/*.route.test.ts` — démarrent un module Fastify réel via `tests/utils/setup-module.ts` avec une DB testcontainer.
- Couverture attendue : chaque route doit avoir au moins un test integration (happy path + erreur).

## Commandes

```bash
pnpm build       # tsdown
pnpm build:watch # tsdown --watch
pnpm test        # vitest
pnpm lint
pnpm lint:fix
```
