# todos-front — Addon Ember (domaine Todos)

Addon Embroider v2 fournissant l'UI du domaine Todos : liste, création, édition, suppression.

## Contenu

- `src/routes/dashboard/todos/*` — routes Todos (index, create, edit).
- `src/components/forms/todo-form.gts` + `todo-validation.ts` — formulaire de todo.
- `src/components/todo-table.gts` — tableau de listing.
- `src/services/todo.ts` — service Todos (appels API).
- `src/schemas/todos.ts` — schémas Zod côté front.
- `src/changesets/todo.ts` — changeset pour édition.
- `src/http-mocks/todos.ts` — mocks MSW.
- `src/assets/icons/*.gts` — icônes SVG inline (completed, delete, edit).

## Build & packaging

- **Bundler** : Rollup.
- **Entrée addon** : `addon-main.cjs` (Embroider v2).
- **Imports internes** : `#src/*`.

## Linting & format

- **ESLint** + **Prettier** + **template-lint**. **PAS oxlint**.

## Conventions

- Les schémas Zod doivent matcher ceux du backend (`@libs/todos-backend`). Sync via `cd @apps/backend && pnpm api:types` après modif backend.
- Dépendances : peut importer `@libs/shared-front`. Ne PAS importer `@libs/users-front`.
- Les changesets utilisent `ember-changeset` — toujours valider via le validation schema avant save.

## Commandes

```bash
pnpm build
pnpm start       # watch
pnpm test
pnpm lint
```
