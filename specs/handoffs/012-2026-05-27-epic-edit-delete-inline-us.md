# Session Handoff - 2026-05-27

## Context

Implémentation des fonctionnalités d'édition/suppression d'épiques et d'amélioration UX de la User Story Map (`/dashboard/user-story-map`) dans `@libs/backlog-front`. PR #31 créée et en attente de review.

## Completed

- **PR #30 mergée** sur `dev` (WarpDrive schemas + project selection UI + navigation fixes) — branche `fix/warpd-schemas-and-nav-links`
- **Plan rédigé** : `specs/done/epic-edit-and-inline-us-creation.md`
- **Branche créée** : `feat/epic-edit-delete-inline-us-points`
- **EpicsService** (`@libs/backlog-front/src/services/epics.ts`) : ajout `update()` (PATCH via `store.request`) et `delete()` (via `authFetch` — contournement bug Content-Type Fastify v5)
- **EditEpicModal** (`src/components/edit-epic-modal.gts`) : nouveau composant, pré-remplit depuis `@epic`, soumet via `epics.update()`, guard `isDestroying`
- **DeleteEpicConfirmModal** (`src/components/delete-epic-confirm-modal.gts`) : `<dialog>` custom DaisyUI, affiche le nombre d'US orphelines, bouton `btn-error`, guard `isDestroying`
- **EpicRow** (`src/components/epic-row.gts`) : restructuré — header `<div>` + `<button>` toggle séparé des 3 boutons icônes (+ US / crayon / poubelle) avec tooltips DaisyUI ; stat `Z pts` ajoutée
- **user-story-map.gts** (`src/templates/dashboard/user-story-map.gts`) : états tracked `editEpicTarget` / `deleteEpicTarget`, actions open/close/confirm, getter `orphanCountFor`, modals branchés
- **MSW** (`src/http-mocks/backlog.ts`) : handlers PATCH + DELETE `/api/v1/epics/:id` avec mutation du tableau `mockUserStories` (détachement épique = null)
- **i18n** : clés `user-story-map.*` (pointsAbbr, tooltips, deleteEpicConfirm*) et `backlog.modal.editEpic.*` en fr-fr + en-us
- **Audit bugs Opus** : 3 bugs bloquants corrigés (Content-Type Fastify v5, authFetch pour DELETE, guards isDestroying)
- **PR #31 créée** : `feat/epic-edit-delete-inline-us-points` → `dev`

## In Progress

- PR #31 en attente de review/merge : https://github.com/gilles-bertrand/project-forge/pull/31

## Next Steps

1. **Merger PR #31** une fois validée
2. **Validation manuelle Playwright** (Phase 8 du plan) — non faite faute de temps :
   - Login → sélectionner projet → `/dashboard/user-story-map`
   - Vérifier les 3 icônes visibles sur chaque épique
   - Tester clic ✎ (modal pré-rempli) + modifier → ligne mise à jour
   - Tester clic 🗑 → modal avec count US → confirmer → épique disparaît
   - Tester clic + → modal AddUS avec épique pré-sélectionnée
   - Vérifier `X US • Y tâches • Z pts`
   - Console zéro erreur WarpDrive
3. **Tests d'intégration** (Phase 7 du plan — non implémentée) :
   - `@libs/backlog-front/tests/integration/components/epic-row-test.gts`
   - `@libs/backlog-front/tests/integration/components/edit-epic-modal-test.gts`
4. **Prochaine feature** : à définir selon le plan macro `specs/todo/sprintforge-migration-macro-plan.md`

## Key Files

- `@libs/backlog-front/src/services/epics.ts` — service principal, update/delete ajoutés
- `@libs/backlog-front/src/components/edit-epic-modal.gts` — NOUVEAU
- `@libs/backlog-front/src/components/delete-epic-confirm-modal.gts` — NOUVEAU
- `@libs/backlog-front/src/components/epic-row.gts` — restructuré
- `@libs/backlog-front/src/templates/dashboard/user-story-map.gts` — template principal
- `@libs/backlog-front/src/http-mocks/backlog.ts` — mocks MSW (PATCH/DELETE ajoutés)
- `@apps/front/translations/user-story-map/fr-fr.yaml` + `en-us.yaml` — i18n
- `@apps/front/translations/backlog/fr-fr.yaml` + `en-us.yaml` — i18n editEpic modal
- `specs/done/epic-edit-and-inline-us-creation.md` — plan complet archivé

## Blockers / Notes

- **Bug Fastify v5 Content-Type** : WarpDrive ajoute `Content-Type: application/json` aux DELETE sans body → 415 en prod. Pattern de contournement : `authFetch` pour les DELETE (voir `EpicsService.delete()` et pattern dans `projects-front`, `sprints-front`, `time-tracking-front`).
- **US orphelines non rafraîchies** : après suppression d'une épique, les US avec `epicId` stale restent dans le model snapshot de la route jusqu'à navigation. Scope futur — la route model n'est pas rechargée automatiquement.
- **Tests intégration non écrits** : la Phase 7 du plan listait 2 fichiers de tests comme "bloquants" mais n'ont pas été implémentés. À faire avant PR merge si standard du projet le requiert.
- **Branche courante** : `feat/epic-edit-delete-inline-us-points` (1 commit au-dessus de `dev`)
