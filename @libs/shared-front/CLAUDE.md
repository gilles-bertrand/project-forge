# shared-front — Addon Ember partagé

Addon Embroider v2 fournissant les services et utilitaires partagés entre les libs frontend (`users-front`, `todos-front`) et l'app `@apps/front`.

## Contenu

- `src/styles/theme.css` — design tokens SprintForge (dark/light, palette teal, sidebar) exposés à Tailwind v4 via `@theme inline`.
- `src/services/theme.ts` — service de bascule dark/light (localStorage, classe `.light` sur `<html>`).
- `src/services/error-reporter.ts` — service de reporting d'erreurs (injecté via DI Ember).
- `src/services/handle-save.ts` — helper pour gérer les save + notifications + redirections.

## Build & packaging

- **Bundler** : Rollup (`rollup.config.mjs`).
- **Entrée addon** : `addon-main.cjs` (Embroider v2).
- **Output** : `dist/` (publié) + `declarations/` (types `.d.ts`).
- **Imports internes** : `#src/*` (résolu via `package.json#imports`).

## Linting & format

- **ESLint** : `eslint.config.mjs`. **PAS oxlint** (oxlint est réservé aux libs backend).
- **Prettier** : `.prettierrc.mjs`.
- **template-lint** : `.template-lintrc.mjs`.

## Commandes

```bash
pnpm build       # rollup build → dist/
pnpm start       # rollup watch
pnpm lint        # ESLint + Prettier + template-lint
pnpm lint:fix
```

## Conventions

- Tous les services doivent être consommables par DI Ember (`@service ...`).
- Pas de dépendance vers `@libs/users-front` ou `@libs/todos-front` (interdiction de cycle).
- Re-exporter via `src/index.ts`.
