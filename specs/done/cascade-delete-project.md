# Plan — Suppression en cascade d'un projet

> Statut : à faire
> Créé : 2026-05-22
> Auteur : @gilles
> Branche cible : feat/projects-view-actions

## 1. Énoncé du problème

Lorsque l'utilisateur supprime un projet depuis la liste ou la modale détail, le backend
(`DELETE /api/v1/projects/:id`) répond `409 Conflict` (`PROJECT_HAS_DEPENDENCIES`) dès que
le projet contient encore des epics, user stories, tâches ou sprints. Le front affiche alors :

> « Impossible de supprimer : le projet contient encore des epics, user stories, tâches ou sprints. »

Et la modale de confirmation indique à l'utilisateur qu'il doit d'abord supprimer
manuellement tous les éléments rattachés. Ce comportement est lourd : un projet réel
contient typiquement des dizaines de tâches, donc la suppression manuelle est en pratique
impossible.

**Objectif** : la suppression d'un projet doit purger en cascade et de manière atomique
toutes les données qui lui appartiennent, dans une seule transaction côté backend.
L'utilisateur n'a plus jamais à supprimer manuellement les enfants d'un projet.

## 2. Périmètre des données à purger

D'après l'inspection de `@libs/scrum-backend/src` et `@libs/time-tracking-backend/src` :

### 2.1 Entités du bounded context Scrum (`@libs/scrum-backend`)

| Entité | FK directe vers `projectId` ? | Notes |
|---|---|---|
| `ProjectMemberEntity` | ✅ `projectId` | À supprimer |
| `EpicEntity` | ✅ `projectId` | À supprimer |
| `UserStoryEntity` | ✅ `projectId` | À supprimer |
| `SprintEntity` | ✅ `projectId` | À supprimer |
| `TaskEntity` | ✅ `projectId` | À supprimer **et** déclenche purge des enfants Task |
| `TaskAssigneeEntity` | ❌ via `taskId` | Purger via `taskId IN (...)` |
| `CommentEntity` | ❌ via `taskId` | Purger via `taskId IN (...)` |
| `AttachmentEntity` | ✅ `projectId` *nullable* + `taskId` *nullable* | Purger les deux conditions |
| `HistoryEntryEntity` | ❌ via `ownerId` (polymorphe via `ownerType`) | Purger les rows où (`ownerType='Task' AND ownerId IN tasksIds`) ou (`ownerType='Project' AND ownerId = projectId`) — voir §4.3 |

### 2.2 Entités du bounded context Time-tracking (`@libs/time-tracking-backend`)

| Entité | FK | Notes |
|---|---|---|
| `TimeEntryEntity` | ✅ `projectId` *(et `taskId`)* | À supprimer — **cross-context** |

Le cleanup TimeEntry **ne peut pas** vivre dans `@libs/scrum-backend` : la lib ne dépend
pas de `@libs/time-tracking-backend` (règle du monorepo, cf. `@libs/CLAUDE.md`). On
réutilise le pattern existant des **ports** : `TimeTrackingPort` est déjà déclaré dans
`@libs/scrum-backend/src/dashboard/time-tracking.port.ts` et implémenté par
`SqlTimeTrackingAdapter` dans `@apps/backend/src/adapters/sql-time-tracking.adapter.ts`.
On étend ce port d'une méthode `deleteByProjectId(projectId)`.

## 3. Approche technique

### 3.1 Architecture cible

```
DELETE /api/v1/projects/:id
   └─ DeleteProjectRoute.handler (em.transactional)
        ├─ assertExists(project)
        ├─ collect taskIds for project
        ├─ em.nativeDelete(TaskAssignee, { taskId IN ids })
        ├─ em.nativeDelete(Comment,      { taskId IN ids })
        ├─ em.nativeDelete(Attachment,   { taskId IN ids OR projectId = id })
        ├─ em.nativeDelete(HistoryEntry, { (ownerType=Task, ownerId IN ids) OR (ownerType=Project, ownerId=id) })
        ├─ em.nativeDelete(Task,         { projectId: id })
        ├─ em.nativeDelete(UserStory,    { projectId: id })
        ├─ em.nativeDelete(Epic,         { projectId: id })
        ├─ em.nativeDelete(Sprint,       { projectId: id })
        ├─ em.nativeDelete(ProjectMember,{ projectId: id })
        ├─ timeTrackingPort.deleteByProjectId(id)   ← cross-context via port
        └─ em.removeAndFlush(project)
```

Le tout dans un `em.transactional(async (em) => { ... })` pour atomicité. En cas
d'exception : rollback complet, le projet reste intact.

### 3.2 Pourquoi `nativeDelete` plutôt que `find` + `remove`

- Volume potentiellement important (1 projet ≈ centaines de tâches, milliers d'historiques).
- Pas de hooks `@BeforeDelete` côté MikroORM dans ces entités.
- Une seule requête SQL par table → atomicité plus simple à raisonner.

### 3.3 Ordre des deletes

L'ordre ci-dessus respecte les dépendances logiques (enfants avant parents) — même
si aucune FK n'est déclarée au niveau de la DB, garder cet ordre permet d'éviter
d'avoir des rows orphelines visibles en cours de transaction si un index ou un
trigger venait à être ajouté plus tard.

### 3.4 Pattern Port/Adapter pour le time-tracking

Étendre l'interface existante :

```ts
// @libs/scrum-backend/src/dashboard/time-tracking.port.ts
export interface TimeTrackingPort {
  sumHoursByUserAndSprint(userId: string, sprintId: string): Promise<number>;
  deleteByProjectId(projectId: string): Promise<void>;   // ← nouveau
}
```

Adapter SQL côté apps/backend :

```ts
// @apps/backend/src/adapters/sql-time-tracking.adapter.ts
public async deleteByProjectId(projectId: string): Promise<void> {
  await this.em.nativeDelete(TimeEntryEntity, { projectId });
}
```

Le port doit être passé à `DeleteProjectRoute` :

```ts
// @libs/scrum-backend/src/mounters.ts (mountProjects)
new DeleteProjectRoute(repo, em, context.timeTrackingPort)
```

→ `mountProjects` prend désormais aussi le `timeTrackingPort` (signature mise à jour),
et `init.ts` lui passe `this.context.timeTrackingPort`.

### 3.5 Réponse HTTP

- Conserver le `204 No Content` actuel pour le cas nominal.
- Supprimer le code `409 PROJECT_HAS_DEPENDENCIES` du schéma de réponse (plus émis).
- Garder `404 PROJECT_NOT_FOUND`.
- Ajouter implicitement `500` géré par le `setErrorHandler` global si la transaction échoue.

### 3.6 Frontend : nettoyage

Le front (`@libs/projects-front/src/templates/dashboard/projects.gts` et `services/projects.ts`)
contient une branche `status === 409 → projects.delete.error.hasDependencies`.

Décisions :
- **Supprimer** cette branche (catch reduit à `404` + erreur générique).
- **Supprimer** la clé i18n `projects.delete.error.hasDependencies` dans les YAML.
- **Reformuler** `projects.delete.confirm.body` : enlever « doivent être supprimés au
  préalable » et le remplacer par « Toutes les données rattachées (epics, user stories,
  tâches, sprints, temps passé) seront supprimées définitivement. »
- Le MSW mock `@libs/projects-front/src/http-mocks/projects.ts` n'a pas de branche 409 —
  rien à changer côté mock.

## 4. Plan d'implémentation

### Phase 1 — Étendre le port TimeTracking et son adapter

**Fichiers** :
- `@libs/scrum-backend/src/dashboard/time-tracking.port.ts`
- `@apps/backend/src/adapters/sql-time-tracking.adapter.ts`

**Actions** :
1. Ajouter `deleteByProjectId(projectId: string): Promise<void>` à l'interface `TimeTrackingPort`.
2. Implémenter dans `SqlTimeTrackingAdapter` via `em.nativeDelete(TimeEntryEntity, { projectId })`.
3. Vérifier les imports : l'adapter peut importer `TimeEntryEntity` depuis `@libs/time-tracking-backend` (déjà OK puisque l'adapter vit dans la couche de composition).

**Critères** :
- Le projet compile (`pnpm turbo build --filter @apps/backend`).
- Aucune autre lib ne dépend de `TimeEntryEntity` (vérifier par grep).

### Phase 2 — Réécrire `DeleteProjectRoute` en cascade transactionnelle

**Fichier** : `@libs/scrum-backend/src/project/routes/delete.route.ts`

**Actions** :
1. Injecter `TimeTrackingPort` dans le constructeur :
   ```ts
   constructor(
     private repository: EntityRepository<ProjectEntityType>,
     private em: EntityManager,
     private timeTrackingPort: TimeTrackingPort,
   ) {}
   ```
2. Supprimer le bloc `dependencies = Promise.all([count(Epic), count(UserStory), count(Task), count(Sprint)])`
   et le retour `409`.
3. Supprimer la clé `409` du `schema.response`.
4. Réécrire le handler :
   ```ts
   await this.em.transactional(async (em) => {
     const tasks = await em.find(TaskEntity, { projectId: id }, { fields: ["id"] });
     const taskIds = tasks.map((t) => t.id);

     if (taskIds.length > 0) {
       await em.nativeDelete(TaskAssigneeEntity, { taskId: { $in: taskIds } });
       await em.nativeDelete(CommentEntity, { taskId: { $in: taskIds } });
     }
     await em.nativeDelete(AttachmentEntity, {
       $or: [
         ...(taskIds.length > 0 ? [{ taskId: { $in: taskIds } }] : []),
         { projectId: id },
       ],
     });
     await em.nativeDelete(HistoryEntryEntity, {
       $or: [
         ...(taskIds.length > 0 ? [{ ownerType: "Task", ownerId: { $in: taskIds } }] : []),
         { ownerType: "Project", ownerId: id },
       ],
     });
     await em.nativeDelete(TaskEntity, { projectId: id });
     await em.nativeDelete(UserStoryEntity, { projectId: id });
     await em.nativeDelete(EpicEntity, { projectId: id });
     await em.nativeDelete(SprintEntity, { projectId: id });
     await em.nativeDelete(ProjectMemberEntity, { projectId: id });

     await this.timeTrackingPort.deleteByProjectId(id);

     em.remove(project);
   });
   return reply.code(204).send({ data: null });
   ```
5. Garder la branche `404` inchangée.
6. Garder le code `409` dans le schéma seulement si on l'utilise pour autre chose — sinon le retirer.

**Critères** :
- Lint OK (`oxlint --fix`).
- Type-check OK.

### Phase 3 — Câbler la dépendance dans le mounter

**Fichier** : `@libs/scrum-backend/src/mounters.ts` + `@libs/scrum-backend/src/init.ts`

**Actions** :
1. Modifier la signature de `mountProjects(parent, em, timeTrackingPort)`.
2. Passer `context.timeTrackingPort` depuis `init.ts` au `mountProjects`.
3. `new DeleteProjectRoute(repo, em, timeTrackingPort)`.

**Critères** :
- Compile.
- Pas de régression sur les routes existantes.

### Phase 4 — Tests d'intégration backend

**Fichier** : `@libs/scrum-backend/tests/integration/project.route.test.ts`

**Actions** :
1. **Remplacer** le test existant `DELETE /projects/:id returns 409 when dependencies exist` par
   `DELETE /projects/:id cascades when dependencies exist` :
   - Seed un projet
   - Seed 1 epic, 1 user-story, 1 sprint, 1 task (avec assignees, comments, attachments, history),
     1 project-member.
   - Si la table `time_entries` est accessible dans le module de test, seed une row aussi
     (sinon mocker le `timeTrackingPort`).
   - DELETE le projet → status 204.
   - Vérifier `count(EpicEntity, {projectId})` = 0, idem user-story, task, sprint, member, attachment, comment, assignee, history.
2. **Ajouter** un test rollback : forcer une exception dans le `timeTrackingPort` (mock qui throw)
   → vérifier que `count(ProjectEntity, {id})` = 1 (rollback).
3. **Ajouter** un test idempotence : DELETE deux fois → premier appel `204`, second `404`.

**Note** : le `ScrumTestModule` (`tests/utils/setup-module.ts`) injecte déjà un
`timeTrackingPort` factice — étendre le stub avec un `deleteByProjectId` no-op pour le
bonheur happy-path, et un `deleteByProjectId` qui throw pour le test de rollback.

**Critères bloquants** :
- ✅ Le test cascade (happy-path) passe.
- ✅ Le test rollback passe.
- ✅ L'ancien test `... returns 409 ...` est supprimé (pas conservé en xfail).

### Phase 5 — Frontend : nettoyer la gestion d'erreur 409

**Fichiers** :
- `@libs/projects-front/src/templates/dashboard/projects.gts`
- `@apps/front/translations/projects/fr-fr.yaml`
- `@apps/front/translations/projects/en-us.yaml`

**Actions** :
1. Dans `confirmDelete()`, simplifier le catch :
   ```ts
   } catch (err: unknown) {
     this.deleteError = this.intl.t('projects.delete.error.generic');
   }
   ```
   (retirer la branche `status === 409`).
2. Reformuler `projects.delete.confirm.body` :
   - FR : `'Cette action est irréversible. Toutes les données rattachées (epics, user stories, tâches, sprints, temps passé) seront supprimées définitivement.'`
   - EN : `'This action is irreversible. All linked data (epics, user stories, tasks, sprints, time entries) will be permanently deleted.'`
3. Supprimer la clé `projects.delete.error.hasDependencies` dans les deux YAML.
4. Redémarrer Vite après modification des YAML (cf. CLAUDE.md `@libs/CLAUDE.md` règle i18n).

**Critères** :
- Lint frontend OK (`pnpm turbo lint --filter @libs/projects-front`).
- La modale de confirmation affiche le nouveau libellé.

### Phase 6 — Tests d'intégration frontend

**Fichier** : `@libs/projects-front/tests/integration/projects-template-test.gts`
(ou équivalent — créer si absent)

**Actions** :
1. Vérifier qu'aucun test existant ne dépend du libellé `hasDependencies` — sinon adapter.
2. Ajouter un test `cliquer sur "Supprimer" → le projet disparaît de la liste sans message d'erreur`.
3. Pas besoin de tester le cascade côté front (responsabilité backend) : le mock MSW
   répond simplement `204`.

**Critères** :
- Tous les tests d'intégration `@libs/projects-front` passent.

### Phase 7 — Mise à jour de l'`openapi.json` et `api-types.ts`

**Action** :
```bash
cd @apps/backend && pnpm api:types
```
Cela regénère `openapi.json` et `src/api-types.ts` depuis les schémas Zod
(le `409` ne doit plus apparaître pour `DELETE /projects/:id`).

**Critères** :
- Diff de `openapi.json` montre la disparition du `409` pour cette route.
- `pnpm turbo build --filter @apps/front` reste vert.

### Phase 8 — Validation manuelle

1. `pnpm turbo lint` à la racine — toutes les libs vertes.
2. `cd @apps/backend && pnpm test` — tests backend verts (intégration + unitaires).
3. `pnpm dev` → naviguer dans le dashboard, créer un projet avec quelques epics/tâches,
   le supprimer, vérifier :
   - Pas de message d'erreur.
   - Le projet disparaît de la liste sans rechargement.
   - Une requête `DELETE /api/v1/projects/:id` retourne `204` dans l'onglet network.
4. `cd @apps/backend && pnpm seed && psql ...` — vérifier qu'après suppression d'un projet
   seedé, aucune row orpheline ne subsiste dans `epics`, `user_stories`, `tasks`,
   `sprints`, `project_members`, `task_assignees`, `comments`, `attachments`,
   `history_entries`, `time_entries`.

## 5. Architectural Context (advisory)

> `graphify-out/graph.json` n'est pas présent dans ce repo — section omise.

Cross-cutting contracts à surveiller :
- **`makeSingleJsonApiTopDocument(literal(null))`** : schéma de réponse `204` ne change pas.
- **`TimeTrackingPort`** : god node clair de cette PR — c'est le seul point qui traverse
  le bounded context Scrum vers Time-tracking. Tout consommateur du port (uniquement
  `DashboardRoute` aujourd'hui) doit continuer à fonctionner — vérifier qu'on n'a pas
  cassé la signature pour `sumHoursByUserAndSprint`.
- **`em.transactional`** : pattern à conserver atomique. Ne pas mélanger avec des appels
  hors transaction (l'`em` passé au callback doit être utilisé partout dans la closure).

## 6. Risques & mitigation

| Risque | Mitigation |
|---|---|
| Transaction longue qui bloque la table tasks/comments en prod | Limiter en pratique : un seul projet à la fois. À évaluer plus tard si soucis de scale. |
| `HistoryEntry` polymorphe (`ownerType=Project` vs `Task`) mal purgée | Couvert par le test cascade qui doit seed les deux types et vérifier `count = 0`. |
| Attachment avec `projectId=null AND taskId=null` orphelin | Inspecter en DB — si présent, il n'est pas censé exister. Pas de purge ici. |
| Cross-lib leakage (scrum importe time-tracking) | Pattern Port/Adapter garantit la séparation. Vérifier qu'aucun `import` direct de `TimeEntryEntity` n'apparaît dans `@libs/scrum-backend`. |
| Régression dashboard (le port a changé de signature) | Test `dashboard.route.test.ts` doit rester vert. |

## 7. Stratégie de test

| Niveau | Localisation | Test |
|---|---|---|
| Unit | — | (pas de test unitaire nécessaire ; route déjà testable en intégration) |
| Integration backend | `@libs/scrum-backend/tests/integration/project.route.test.ts` | cascade happy-path, rollback, idempotence |
| Integration backend | `@libs/scrum-backend/tests/integration/dashboard.route.test.ts` | doit rester vert (signature `TimeTrackingPort` étendue mais retro-compatible) |
| Integration frontend | `@libs/projects-front/tests/integration/projects-template-test.gts` | delete → projet disparaît, aucune erreur |
| Manuel | dev server | flow complet projet + epics + tâches → DELETE → DB propre |

## 8. Success criteria (bloquants pour `done/`)

1. ✅ `DELETE /api/v1/projects/:id` répond `204` même lorsque le projet a des enfants
   (test d'intégration backend cascade happy-path passant).
2. ✅ Toutes les entités enfants (epics, user-stories, sprints, tasks + leurs comments,
   attachments, assignees, history, project-members) sont supprimées en une seule
   transaction (vérifié par les `count = 0` du test d'intégration).
3. ✅ Les `TimeEntry` du projet sont également supprimées via le `TimeTrackingPort`
   étendu (`deleteByProjectId`).
4. ✅ Un échec dans la suppression (mock qui throw) provoque un rollback complet :
   `count(ProjectEntity)` = 1 (test d'intégration rollback passant).
5. ✅ Le code HTTP `409 PROJECT_HAS_DEPENDENCIES` n'est plus émis par la route ni
   déclaré dans son `schema.response`.
6. ✅ Le frontend ne traite plus le cas `409` : le catch dans `confirmDelete()` ne
   référence que l'erreur générique.
7. ✅ Les clés i18n `projects.delete.error.hasDependencies` (FR + EN) sont supprimées,
   et `projects.delete.confirm.body` reformulé pour annoncer la cascade.
8. ✅ `pnpm turbo lint` est vert sur tout le monorepo.
9. ✅ `cd @apps/backend && pnpm test` est vert (tous les tests d'intégration scrum-backend).
10. ✅ Test manuel réussi : dans le dev server, supprimer un projet seedé avec
    epics/tâches/sprints/time-entries → aucune erreur UI, DB propre vérifiée en SQL.

## 9. Hors périmètre

- Pas de soft-delete (suppression définitive, comme aujourd'hui).
- Pas d'audit log dans `history_entries` pour la suppression du projet lui-même
  (seuls les enfants sont purgés, pas ajout de trace).
- Pas de bouton « annuler » post-suppression côté UI.
- Pas de tâche asynchrone (job) — tout est synchrone dans la transaction de la requête.
