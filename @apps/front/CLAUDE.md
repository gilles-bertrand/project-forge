# Frontend rules — Ember 6

Application Ember 6 (Octane) avec Embroider + Vite.

## Conventions

- **Composants** : fichiers `.gts` (template Glimmer + TS dans le même fichier). Pas de `.hbs` séparé.
- **Routes** : `app/routes/*.ts`, templates `.gts` dans `app/templates/`.
- **Services** : `app/services/*.ts` (session, store, current-user via injection).
- **i18n** : `ember-intl`. Fichiers `translations/<namespace>/<locale>.yaml`. Locales : `en-us`, `fr-fr`.
- **Styling** : Tailwind 4 + DaisyUI 5. Classes utilitaires en priorité, CSS custom dans `app/styles/`.

## Linting & format

- **ESLint** : `eslint.config.mjs` — règles Ember/Glimmer/TypeScript. **NE PAS utiliser oxlint ici** (oxlint est réservé au backend).
- **Prettier** : `.prettierrc.mjs` — formatage TS/JS/GTS.
- **template-lint** : `.template-lintrc.mjs` — règles templates Glimmer.
- **Stylelint** : `.stylelintrc.cjs` pour CSS.

## Commandes locales

```bash
pnpm start             # dev server (sans backend)
pnpm start:with-back   # dev server + backend
pnpm test              # ember test
pnpm test:ember        # acceptance tests
pnpm lint              # ESLint + template-lint + Stylelint + Prettier check
pnpm lint:fix          # auto-fix
```

## Mocks & dev

`@apps/front` consomme les addons `@libs/users-front` et `@libs/shared-front` (design tokens, service theme). Les mocks MSW sont définis dans les libs (`src/http-mocks/`). Activés via `mockServiceWorker.js` en dev.

## Tests

- **Acceptance** : `tests/acceptance/*.gts` — Qunit + Ember test helpers.
- **Integration / Unit** : `tests/integration/`, `tests/unit/`.
- **E2E** : voir `@apps/e2e/` (Playwright).
