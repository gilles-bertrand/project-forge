# Session Handoff - 2026-05-27

## Context

Session axée sur l'outillage DX : création du slash command `/TPK-ember-generator` pour automatiser la génération d'éléments frontend EmberJS selon les conventions du projet. Travail secondaire par rapport à la PR #31 (epic edit/delete) toujours en attente de merge.

## Completed

- **`/TPK-ember-generator` slash command créé** : `.claude/commands/TPK-ember-generator.md`
  - Types supportés : `lib`, `component`, `route`, `service`, `form`, `table`, `schema`, `changeset`, `http-mock`
  - Invoque le skill `ember-best-practices` automatiquement
  - Suit `tuto/0_frontend.packed.md` (17 étapes pour une lib complète)
  - Hiérarchie UI : `@triptyk/ember-common-ui` → DaisyUI → proposition custom
  - Respecte toutes les conventions CLAUDE.md (authFetch DELETE, schémas WarpDrive, traductions hors-lib, etc.)
- **PR #32 ouverte** : `chore/tpk-ember-generator-command` → `dev`
  - https://github.com/gilles-bertrand/project-forge/pull/32
- Branche `feat/epic-edit-delete-inline-us-points` restaurée avec stash .eslintcache récupéré

## In Progress

- **PR #31** (epic edit/delete + inline US + estimated points) — en attente de review/merge
  - https://github.com/gilles-bertrand/project-forge/pull/31
  - Branche : `feat/epic-edit-delete-inline-us-points`
- **PR #32** (TPK-ember-generator command) — en attente de review/merge
  - https://github.com/gilles-bertrand/project-forge/pull/32
  - Branche : `chore/tpk-ember-generator-command`

## Next Steps

1. **Merger PR #31 et PR #32 dans dev** (dès review ok)
2. **Tester `/TPK-ember-generator` en conditions réelles** — essayer `component`, `form`, `lib` sur une vraie feature
3. **Prochaine feature** selon le plan macro `specs/todo/sprintforge-migration-macro-plan.md` (phases suivantes après backlog/sprints)
4. Commiter les fichiers untracked restants si pertinents :
   - `specs/done/fix-dark-mode-visibility-badges-project-card.md`
   - `specs/done/sprintforge-migration-macro-plan.md`
   - `specs/handoffs/012-2026-05-27-epic-edit-delete-inline-us.md`

## Key Files

- `.claude/commands/TPK-ember-generator.md` — nouveau slash command créé cette session
- `tuto/0_frontend.packed.md` — référence canonique utilisée pour structurer le generator
- `specs/todo/sprintforge-migration-macro-plan.md` — plan macro des phases restantes
- `@libs/backlog-front/` — lib modifiée par PR #31 (epic management)
- `@apps/front/app/services/store.ts` — à mettre à jour à chaque nouveau schema WarpDrive

## Blockers / Notes

- `.eslintcache` de 3 libs (`backlog-front`, `shell-front`, `sprints-front`) sont trackés dans git et se re-modifient automatiquement — les ignorer, ne pas commiter
- `pnpm-lock.yaml` ne peut pas être commité par Claude (hook bloquant) — toujours demander à l'utilisateur de le commiter après ajout d'une nouvelle lib
- Après création d'un fichier dans `@libs/*/src/`, redémarrer Vite obligatoire (purge cache)
- PR #31 et #32 ciblent toutes les deux `dev` (pas `main`) — le merge vers `main` se fait séparément
