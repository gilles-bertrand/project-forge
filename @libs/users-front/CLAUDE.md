# users-front — Addon Ember (domaine Users)

Addon Embroider v2 fournissant l'UI du domaine Users : auth (login/logout/forgot-password), gestion des utilisateurs (CRUD).

## Contenu

- `src/routes/login.gts`, `forgot-password.gts`, `logout.ts` — routes auth.
- `src/routes/dashboard/users/*` — CRUD users (index, create, edit).
- `src/components/forms/login-form.gts`, `user-form.gts`, `forgot-password.gts` — formulaires + validations associées (`*-validation.ts`).
- `src/components/auth-layout.gts` — layout des pages auth.
- `src/services/current-user.ts` — service courant utilisateur (chargé après login).
- `src/services/user.ts` — service Users (appels API).
- `src/handlers/auth.ts` — handler de session/token.
- `src/http-mocks/login.ts`, `users.ts` — mocks MSW activables en dev.
- `src/schemas/users.ts` — schémas Zod côté front (validation formulaires).

## Build & packaging

- **Bundler** : Rollup (`rollup.config.mjs`).
- **Entrée addon** : `addon-main.cjs` (Embroider v2).
- **Imports internes** : `#src/*`.

## Linting & format

- **ESLint** : `eslint.config.mjs`. **PAS oxlint**.
- **Prettier** + **template-lint** comme les autres libs front.

## Conventions

- Les schémas Zod doivent matcher ceux du backend (`@libs/users-backend`). Si désynchro → API types regen via `cd @apps/backend && pnpm api:types`.
- Les mocks MSW (`src/http-mocks/`) doivent rester alignés sur les routes réelles du backend.
- Dépendances : peut importer `@libs/shared-front`. Ne PAS importer `@libs/todos-front`.

## Commandes

```bash
pnpm build       # rollup build
pnpm start       # rollup watch
pnpm test        # ember test
pnpm lint        # ESLint + Prettier + template-lint
```
