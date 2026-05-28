# Session Handoff - 2026-05-28

## Context

Refactorisation majeure du modèle de données agile de SprintForge pour l'aligner sur le modèle iceScrum. 6 propositions de refacto (P0→P5) ont été planifiées, implémentées et validées en une seule session. La branche `refactor/icescrum-model-alignment` est prête à être poussée et une PR ouverte vers `dev`.

## Completed

- ✅ **P0 — Migrations MikroORM** : `@mikro-orm/migrations` installé, config, baseline `Migration20260528125012.ts`, scripts `migration:*`, ADR documenté, `docker-compose.yaml` fixé
- ✅ **P1 — Comment + Attachment polymorphiques** : `taskId` → `ownerType + ownerId`, routes nested sur Epic/Story/Project, factory `satelliteRoutesFor`, helper `ensureOwnerExists`
- ✅ **P2 — Epic→Feature + UserStory enrichis** : Epic (+notes/color/type/value/rank/createdById/tags), UserStory (status 6 valeurs `suggested→done`, priority string enum, points nullable, +notes/color/rank/value/createdById/tags), transitions strictes `assertStoryTransition`
- ✅ **P3 — AcceptanceTest + StoryDependency** : 2 nouvelles entités, cycle detection DFS, 5 erreurs typées → 422, routes + tests intégration
- ✅ **P4 — Audit trail automatique** : `AuditSubscriber.onFlush` + `AsyncLocalStorage auditContext`, hook Fastify `withAuditContext`, `uow.computeChangeSet(entry)` pour persist intra-flush, 5 tests intégration
- ✅ **P5 — Time model + Task counter + Tags** : `Task.remainingHours` (auto reset → 0 on done), `ProjectTaskCounter` + `UPDATE...RETURNING` atomique (no race), burndown service + route, Tags `TEXT[]` sur Epic/Story/Task
- ✅ **Frontend sync** : schémas WarpDrive mis à jour (Epic + UserStory enrichis), services adaptés (priority string, points nullable, transitions), modaux (priority select, status 6 valeurs, color picker Epic), MSW handlers (fixtures + 422 transition), i18n
- ✅ **Plan déplacé** : `specs/todo/icescrum-refacto-03-proposals.md` → `specs/done/`
- ✅ **Tests** : 255/255 passent (213 backend + 40 front + 2 app), lint 0 erreur 15/15 packages

## In Progress

- ⚠️ **`pnpm-lock.yaml` non commité** : le hook Claude bloque `git add pnpm-lock.yaml`. À commiter manuellement avant push.
- ⚠️ **Migration consolidée P1-P5 reportée** : bug runtime `TypeError: MigrationClass is not a constructor` avec jiti/vite-node pour les migrations générées après P0. La baseline P0 seule est en place. Pour dev : utiliser `schema:fresh`. Pour prod : investigation séparée ~2h (voir §Blockers).
- 📋 **Branche non poussée** : `refactor/icescrum-model-alignment` prête, 6 commits, push + PR à créer vers `dev`.

## Next Steps

1. **Commiter le lock file** : `git add pnpm-lock.yaml && git commit -m "chore: update pnpm-lock for iceScrum refacto"`
2. **Pousser la branche et ouvrir la PR** : `git push -u origin refactor/icescrum-model-alignment` puis `gh pr create --base dev --title "refactor: iceScrum model alignment (P0→P5)" ...`
3. **Investiguer le bug migration jiti** : le CLI MikroORM 7 via `vite-node` charge les migrations via jiti (CommonJS). Le pattern `override up()` fonctionne pour la baseline (auto-générée), mais échoue pour les migrations créées manuellement après (même contenu). Piste : tester avec `emit: 'js'` au lieu de `'ts'`, ou ajouter un `scripts/migrate.ts` compilé via `tsdown` au lieu de `vite-node`.
4. **Features frontend manquantes** (hors scope P0-P5, futurs chantiers) :
   - UI AcceptanceTest (liste + état par story dans l'edit modal)
   - UI StoryDependency (graphe ou liste dans l'edit modal)
   - UI Burndown chart sprint (graphe)
   - Filtres backlog par status (Sandbox / Product Backlog / Sprint Backlog)
5. **Déploiement** : pas de migration DB automatique possible actuellement (bug #3). Avant de déployer en staging, résoudre le bug migration ou appliquer les ALTER manuellement (script SQL disponible dans la spec `icescrum-refacto-03-proposals.md`).

## Key Files

### Backend modifié
- `@libs/scrum-backend/src/types.ts` — tous les enums Zod (Epic, Story, AcceptanceTest, StoryDependency, SatelliteOwnerType)
- `@libs/scrum-backend/src/epic/epic.entity.ts` — +notes/color/type/value/rank/createdById/tags
- `@libs/scrum-backend/src/user-story/user-story.entity.ts` — status 6 val, priority string, points nullable, +champs
- `@libs/scrum-backend/src/user-story/transitions.ts` — state machine transitions strictes
- `@libs/scrum-backend/src/task/comment.entity.ts` + `attachment.entity.ts` — ownerType/ownerId (polymorphe)
- `@libs/scrum-backend/src/task/owner-resolver.ts` — helper `ensureOwnerExists`, `AuditableOwnerType`
- `@libs/scrum-backend/src/satellite-routes.ts` — factory `satelliteRoutesFor`
- `@libs/scrum-backend/src/mounters.ts` — toutes les nouvelles routes montées
- `@libs/scrum-backend/src/init.ts` — `withAuditContext` hook + mounters AT/StoryDep
- `@libs/scrum-backend/src/audit/audit.subscriber.ts` — AuditSubscriber (onFlush + uow.computeChangeSet)
- `@libs/scrum-backend/src/audit/audit-context.ts` — AsyncLocalStorage userId
- `@libs/scrum-backend/src/acceptance-test/` — entité, serializer, aggregate, 5 routes
- `@libs/scrum-backend/src/story-dependency/` — entité, serializer, service (cycle-detection.ts), 3 routes
- `@libs/scrum-backend/src/sprint/burndown.service.ts` — computeSnapshot + getBurndown
- `@libs/scrum-backend/src/sprint/sprint-burndown-snapshot.entity.ts`
- `@libs/scrum-backend/src/project/project-task-counter.entity.ts`
- `@libs/scrum-backend/src/utils/task-numbering.ts` — UPDATE...RETURNING atomique
- `@libs/scrum-backend/src/index.ts` — re-exports de toutes les nouvelles entités

### Frontend modifié
- `@libs/backlog-front/src/schemas/epics.ts` + `user-stories.ts` — types enrichis
- `@libs/backlog-front/src/services/user-stories.ts` — priority string, transitions, InvalidStoryTransitionError
- `@libs/backlog-front/src/services/epics.ts` — payloads enrichis
- `@libs/backlog-front/src/components/add-user-story-modal.gts` + `edit-user-story-modal.gts`
- `@libs/backlog-front/src/components/add-epic-modal.gts` + `edit-epic-modal.gts`
- `@libs/backlog-front/src/components/epic-row.gts` + `user-story-row.gts`
- `@libs/backlog-front/src/http-mocks/backlog.ts` — fixtures + routes polymorphiques
- `@apps/front/translations/backlog/` + `user-story-map/` — nouvelles clés i18n

### App backend
- `@apps/backend/src/app/database.connection.ts` — `subscribers: [new AuditSubscriber()]`
- `@apps/backend/src/seeders/development.seeder.ts` — données seed mises à jour (priority string, status 6 val, nouveaux champs)
- `@apps/backend/src/migrations/Migration20260528125012.ts` — baseline P0 (13 tables initiales)

### Specs
- `specs/todo/icescrum-refacto-01-current-model.md` — inventaire modèle actuel
- `specs/todo/icescrum-refacto-02-gap-analysis.md` — gap analysis vs iceScrum
- `specs/done/icescrum-refacto-03-proposals.md` — propositions P0→P5 (plan déplacé = done)
- `specs/done/adr-migrations-mikroorm.md` — ADR migrations

## Blockers / Notes

### Bug migration jiti (`MigrationClass is not a constructor`)

Symptôme : `pnpm mikro-orm migration:up` échoue avec `TypeError: MigrationClass is not a constructor` pour toutes les migrations sauf la baseline auto-générée. La baseline `Migration20260528125012.ts` (générée via `--initial`) fonctionne. Les migrations créées manuellement après (même contenu exact) échouent.

Hypothèses :
- L'auto-générateur de MikroORM produit un fichier légèrement différent (absence de `override`, utilisation de `void | Promise<void>`)
- Le runtime jiti charge les fichiers via `dynamicImport` → CJS. Les exports nommés (`export class`) fonctionnent pour la baseline mais pas après rechargement du cache avec un nouveau fichier.
- Possible collision de hashes jiti entre sessions.

Pistes :
1. Changer `emit: 'ts'` → `emit: 'js'` dans la config migrations (compile avant d'exécuter)
2. Créer un wrapper `src/migrations/runner.ts` compilé via `tsdown` qui importe explicitement les migrations et les passe à `Migrator`
3. Utiliser `mikro-orm migration:up --dump` pour extraire le SQL et l'appliquer via `psql` directement (workaround pragmatique)

Commande de repro : `pnpm --filter @apps/backend mikro-orm migration:up` après avoir créé une migration manuellement.

### pnpm-lock.yaml

Hook Claude (`bash-tool-guard`) bloque `git add pnpm-lock.yaml`. Doit être commité manuellement par le user. Sans ça, la CI CI échouera avec `ERR_PNPM_OUTDATED_LOCKFILE`.

### Story.status transitions côté front

Les transitions via PATCH redirigent vers 422 avec `INVALID_STORY_TRANSITION` si la transition est invalide. L'`EditUserStoryModal` affiche le message d'erreur i18n `invalidTransition`. Mais l'UI ne guide pas encore l'utilisateur vers les transitions valides (pas de boutons contextuels "Accepter" / "Estimer"). À considérer dans un futur chantier UX.

### Données existantes en prod/staging

Si des données `user_story.priority = 1|2|3|4` ou `status = 'todo'` existent en base, appliquer le SQL de migration P2 manuellement (voir `icescrum-refacto-03-proposals.md` §Migration DB) avant de déployer le code.
