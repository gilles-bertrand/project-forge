# E2E rules — Playwright

Tests end-to-end avec Playwright. Lance le frontend + backend réels (pas de mocks).

## Setup avant un run

`pnpm setup` exécute :
1. `scripts/setup.ts` — démarrage des services nécessaires
2. `scripts/setup-db.ts` — reset DB + seed E2E (utilise `E2ESeeder` du backend via `pnpm --filter @apps/backend e2e:setup`)

La DB E2E utilise `@apps/backend/.env.e2e` (séparé du `.env` de dev). Les fixtures de seed sont dans `@apps/backend/src/seeders/e2e.seeder.ts`.

## Conventions tests

- **Fichiers** : `tests/*.spec.ts`
- **Sélecteurs** : préférer `getByRole`, `getByLabel`, `data-testid` — éviter les sélecteurs CSS fragiles.
- **Auth** : ne pas hardcoder les credentials. Utiliser les fixtures seedées par `E2ESeeder`.
- **Cleanup** : chaque test doit être idempotent. La DB est reset au début du run, pas entre chaque test.

## Commandes

```bash
pnpm test          # run headless
pnpm test:ui       # interface Playwright UI
pnpm test:headed   # ouvre les navigateurs (debug visuel)
pnpm test:debug    # debug mode
```

## CI

Workflow `.github/workflows/playwright.yml` à la racine. Tourne sur PR vers `main` et `dev`.
