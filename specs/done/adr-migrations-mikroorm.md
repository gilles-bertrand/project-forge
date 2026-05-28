# ADR — Mise en place des migrations MikroORM

**Date** : 2026-05-28
**Statut** : Accepté
**Contexte** : Chantier P0 du refacto iceScrum (cf. `specs/todo/icescrum-refacto-03-proposals.md`)

## Décision

Mettre en place `@mikro-orm/migrations` pour versionner l'évolution du schéma PostgreSQL. Toute modification d'entité **doit** désormais passer par une migration générée (`pnpm migration:create`) avant d'être mergée.

## Conséquences

- `pnpm schema:fresh` reste disponible pour le dev local (drop + recreate depuis entités) mais n'est plus le chemin de déploiement.
- `pnpm migration:fresh` = drop + rejoue toutes les migrations + seed. C'est le chemin prod/staging.
- La baseline `Migration20260528125012` matérialise l'état du schéma au 2026-05-28.

## Scripts ajoutés

| Script | Description |
|---|---|
| `migration:create` | Génère une migration depuis le diff entités→DB |
| `migration:up` | Applique les migrations en attente |
| `migration:down` | Rollback la dernière migration |
| `migration:status` | Liste l'état des migrations |
| `migration:fresh` | Drop + up + seed (prod path) |

## Package ajouté

- `@mikro-orm/migrations: 7.0.14` dans `@apps/backend/dependencies`
- Catalog entry dans `pnpm-workspace.yaml`

## Configuration

`@apps/backend/src/app/database.connection.ts` — bloc `migrations` :
```typescript
migrations: {
  path: './src/migrations',
  glob: '!(*.d).{js,ts}',
  transactional: true,
  allOrNothing: true,
  emit: 'ts',
}
```
