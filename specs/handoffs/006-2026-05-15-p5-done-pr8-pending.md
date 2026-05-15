---
title: "Handoff #006 — P5 terminé, PR #8 en attente CI + merge"
created: 2026-05-15
branch: feat/p5-backlog-front
pr: https://github.com/gilles-bertrand/project-forge/pull/8
---

# Session Handoff — 2026-05-15

## Context

Session couvrant P5 (Backlog + User Story Map). Tout est codé, linté, testé (18/18) et pushé sur `feat/p5-backlog-front`. La PR #8 (base : `dev`) est ouverte.

## Completed

### P4 Tech Debts (via PR #7 — mergée à `e0eeb65`)
- i18n wiring complet projects-front (strings FR hardcodées → `{{t "projects.*"}}`)
- `ProjectsService.loadMembers(id)` → GET /projects/:id/members (mock MSW déjà en place)
- Tests intégration P4.12 : 6 tests rendering (ProjectCard ×2, AddProjectModal ×2, ProjectDetailModal ×2)

### P5 — Backlog + User Story Map (`@libs/backlog-front`)
- Lib scaffoldée (Embroider v2, Rollup, Vitest browser, pattern projects-front)
- **Schemas** : `epics.ts`, `user-stories.ts`, `tasks.ts` (all kind:attribute, P6+ pour relations)
- **Services** : `epics.ts` (loadByProject/findById/create), `user-stories.ts` (+ loadByEpic), `tasks.ts` (loadBacklog client-side filter, loadByUserStory)
- **MSW mocks** : 3 epics + 9 US + 15 tasks (9 backlog + 6 sprint) + handlers GET/POST. Activé dans `@apps/front/app/routes/application.ts`.
- **Composants** : TaskNatureBadge, TaskTypeBadge, TaskRow, BacklogFilters, EpicRow, UserStoryRow, AddEpicModal, AddUserStoryModal
- **Routes/templates** : `dashboard/backlog.ts+gts`, `dashboard/user-story-map.ts+gts`
- **i18n** : `translations/backlog/{fr-fr,en-us}.yaml` + `translations/user-story-map/{fr-fr,en-us}.yaml`
- **Tests** : 9 smoke schemas + 9 intégration rendering = 18/18 verts. Sanity check passé.
- **Plan** : `specs/done/p5-backlog-front.md`

## In Progress

### CI PR #8
- **PR** : https://github.com/gilles-bertrand/project-forge/pull/8
- En attente de CI au moment du handoff
- Quand CI verte → merger dans `dev`

## Next Steps

1. **Vérifier CI et merger PR #8** :
   ```bash
   gh pr checks 8 --repo gilles-bertrand/project-forge
   gh pr merge 8 --merge --delete-branch
   ```

2. **Validation visuelle P5** (à faire sur dev post-merge) :
   ```bash
   pnpm dev:front
   # naviguer sur /backlog → vérifier liste tâches, filtres, badge couleurs
   # naviguer sur /user-story-map → vérifier hiérarchie EpicRow, expand/collapse
   # tester "+ Nouvelle épique" et "+ Nouvelle US" → vérifier modales
   ```

3. **P6 — Tasks** (prochaine phase recommandée) :
   - Composant `TaskCard` (variantes dense/Kanban)
   - Modale `AddTask` (tous les champs Figma)
   - Modale `TaskDetail` (tabs Détails/Commentaires/Temps)
   - Bouton "+ Nouvelle tâche" en `/backlog` → débloquer (disabled en P5)
   - Dropdown "Ajouter" du header → débloquer pour multi-types

4. **Dettes techniques P5** (minimes) :
   - Tests BacklogFilters : le test vérifie que `onFilter` est appelé mais pas que la liste filtrée est juste (à enrichir en P6)
   - `user-story-map.ts` n'a pas de watcher sur `currentProjectId` change → refresh manuel needed (risque P5 documenté)

## Key Files

**Lib principale**
- `@libs/backlog-front/src/services/tasks.ts` — loadBacklog avec filtre client-side
- `@libs/backlog-front/src/components/epic-row.gts` — expand/collapse + UserStoryRow imbriqués
- `@libs/backlog-front/src/templates/dashboard/user-story-map.gts` — template USM + modales

**App**
- `@apps/front/app/routes/application.ts` — MSW handlers backlog activés
- `@apps/front/translations/backlog/{fr-fr,en-us}.yaml`
- `@apps/front/translations/user-story-map/{fr-fr,en-us}.yaml`

**Tests**
- `@libs/backlog-front/tests/app.ts` — TestApp SANS moduleRegistry (voir note ci-dessous)

## Blockers / Notes

### pretest: rollup -c
Le `dist/` est dans le `.gitignore` global. Sans build, Vite ne peut pas résoudre les modules en mode test. Le script `pretest` dans `package.json` rebuild automatiquement avant chaque `pnpm test`.

### TestApp sans moduleRegistry
Retrait de `moduleRegistry()` du TestApp car l'eager `import.meta.glob` dans index.ts charge les routes qui dépendent de `@libs/shell-front`. Sans le dist, Vite déclenchait un reload pendant les tests. Solution : services enregistrés manuellement dans chaque test.

### Drag-drop backlog → sprint reporté en P8
Tel que planifié. Un hint "Glissez vers un sprint (P8)" est affiché en bas de `/backlog`.

### current-project changement live
Si l'utilisateur change de projet via `ProjectSelector` du shell, les routes `/backlog` et `/user-story-map` n'auto-rafraîchissent pas. C'est un risque documenté — refresh manuel requis.

### Plan macro restant
- `specs/done/` : P0, P1, P2, P3, P3.5, P4, P5
- Prochaine phase recommandée : P6 (Tasks — TaskCard, AddTask, TaskDetail)
