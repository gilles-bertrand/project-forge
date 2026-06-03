# Session Handoff - 2026-06-02

## Context

Refonte UX/UI complète de l'édition des tasks : modale task-detail éditable in-place, gestion multi-assignation, critères d'acceptation polymorphes (task + user-story), audit enrichi. Les deux PRs (#42, #43) ont été mergées dans `dev` au cours de la session.

## Completed

- **Backend `@libs/scrum-backend`**
  - Entité `AcceptanceTest` : `userStoryId` nullable + `taskId` nullable (migration `Migration20260601081449` appliquée)
  - Routes `GET/POST /tasks/:id/acceptance-tests` montées dans `mountTasks`
  - `AddTaskAssigneeRoute` : rejet 422 si l'utilisateur n'est pas membre du projet
  - `AuditSubscriber` étendu : trace statut + titre + priorité + points (Epic/US/Task) + ajout/retrait assignés (`TaskAssignee` create/delete)
  - 228 tests verts, lint clean

- **Frontend `@libs/backlog-front`**
  - `task-detail-modal.gts` : mode édition complet (titre, statut, priorité, **type, nature**, description, points, **temps estimé**, user story, assignés) — projet en lecture seule
  - Assignation : dropdown recherchable (+ pile d'avatars), `syncAssignees` idempotente (tolère 409/404)
  - `AcceptanceTestList` polymorphe (`@ownerType`/`@ownerId`) — call site `edit-user-story-modal` migré
  - `AssigneeAvatarStack` créé dans backlog-front (sans dépendance projects-front)
  - `add-task-modal.gts` : source = membres du projet, assignés réellement sauvegardés à la création
  - Historique : interface `TaskHistoryEvent` alignée sur le serializer réel, description lisible, rechargé automatiquement après save
  - 49 tests verts, lint clean

- **`@libs/shared-front`**
  - Fix `comment-thread.gts` : le textarea se vide après post (binding `value=` réactif)

- **UX User Story Map**
  - Espacement vertical aéré (epic-row, user-story-row, task-row, template)

- **Tooling**
  - `/TPK-build` : mode PARALLÈLE workflow via l'outil Workflow (worktrees isolés, vérification adversariale) — PR #43 mergée séparément

- **PRs mergées**
  - #42 `feat/task-edit-ux-and-assignment` → dev
  - #43 `chore/tpk-build-workflows` → dev

## In Progress

- Rien d'actif. `dev` est propre, toutes les branches de feature supprimées.

## Next Steps

1. **Autre plan à builder** : `specs/todo/icescrum-refacto-04-comments-attachments-ui.md` (7.5 KB) — UI commentaires et pièces jointes, phase 4 de la refacto iScrum. Lancer avec `/TPK-build specs/todo/icescrum-refacto-04-comments-attachments-ui.md`.
2. **Vérification visuelle** (critère #13 du plan terminé) : lancer l'app, comparer la modale task aux 2 maquettes originales (mode édition + onglet commentaires) via `/TPK-visual-verify`.
3. **Mode PARALLÈLE `/TPK-build`** : le bug « worktrees forkent depuis une base périmée » est documenté en mémoire (`feedback-tpk-build-parallel-stale-base.md`) mais pas corrigé dans la commande — préférer le mode LINÉAIRE pour l'instant.
4. **Audit assignés : résolution userId** : si un assigné quitte le projet, son nom n'est plus résolvable dans l'historique (affiche l'userId brut). Amélioration possible via un endpoint de résolution utilisateurs ou un cache local.

## Key Files

- `@libs/backlog-front/src/components/task-detail-modal.gts` — modale task éditable (composant central de la session)
- `@libs/backlog-front/src/services/tasks.ts` — addAssignee/removeAssignee/syncAssignees/loadProjectMembers
- `@libs/backlog-front/src/components/assignee-avatar-stack.gts` — nouveau composant avatar stack
- `@libs/backlog-front/src/components/acceptance-test-list.gts` — rendu polymorphe (@ownerType/@ownerId)
- `@libs/scrum-backend/src/audit/audit.subscriber.ts` — audit enrichi (champs + assignés)
- `@libs/scrum-backend/src/acceptance-test/routes/list-by-task.route.ts` — nouvelle route (créée)
- `@libs/scrum-backend/src/acceptance-test/routes/create-on-task.route.ts` — nouvelle route (créée)
- `@apps/backend/src/migrations/Migration20260601081449.ts` — migration AT nullable (appliquée)
- `@libs/shared-front/src/components/comment-thread.gts` — fix textarea se vide après post
- `specs/done/task-edit-ux-and-assignment-overhaul.md` — plan de la feature (archivé)
- `specs/todo/icescrum-refacto-04-comments-attachments-ui.md` — prochain plan à builder
- `.claude/commands/TPK-build.md` — commande mise à jour (mode workflow parallèle)

## Blockers / Notes

- **Branche active** : `dev` (les branches feature ont été mergées et supprimées par GitHub)
- **Migration DB** : `Migration20260601081449` déjà appliquée sur la DB de dev locale. Sur un nouvel environnement, `pnpm migration:up` suffira.
- **Limite connue `/TPK-build` mode PARALLÈLE** : les worktrees peuvent forker depuis un commit ancien si Git n'a pas l'HEAD à jour. Utilisé avec prudence — mode LINÉAIRE recommandé pour l'instant (cf. mémoire `feedback-tpk-build-parallel-stale-base.md`).
- **Audit des assignés** : les entrées `assignee-added`/`assignee-removed` dans l'historique résolvent le userId via `projectMembers`. Si l'utilisateur a quitté le projet, le nom n'est pas résolu (affichage de l'userId brut) — comportement acceptable pour l'instant.
- **Critère #13 du plan** (conformité visuelle aux maquettes) : non vérifié formellement via `/TPK-visual-verify` — à faire si une vérification officielle est nécessaire avant release.
