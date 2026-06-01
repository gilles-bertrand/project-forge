# Refonte UX/UI de l'édition des tasks + fonctionnel d'assignation

> Statut : `todo` · Créé le 2026-05-29 · Cible : `@libs/backlog-front`, `@libs/projects-front`, `@libs/scrum-backend`, `@apps/front`
> Construire avec : `/TPK-build specs/todo/task-edit-ux-and-assignment-overhaul.md`

## 1. Problème & objectifs

La modale de task (`task-detail-modal.gts`) est aujourd'hui **lecture seule** : le bouton « Edit » est `disabled`, l'assignation n'est pas modifiable, et plusieurs fonctionnels sont cassés ou absents. Les deux maquettes fournies définissent la cible :

- **Maquette 1 (édition)** : header `#1018` + badges + chip « Tag », titre éditable avec badge « Mode édition », `STATUT`/`PRIORITÉ` en ligne, colonne gauche (description, critères d'acceptation cochables, pièces jointes), colonne droite (assigné à avec avatar, projet, user story, points), footer « ● Modifications non enregistrées » + Annuler/Enregistrer.
- **Maquette 2 (vue + commentaires)** : mêmes header/onglets `Détails | Commentaires | Historique`, thread de commentaires avec réactions, réponses imbriquées, mentions `@user`, liens `#1042`, éditer/supprimer, et composer « Tapez @ pour mentionner ».

### Décisions produit (validées avec l'utilisateur)

1. **Assignation multiple** — on conserve le modèle backend many-to-many (`task_assignees`). UI : multi-select des **membres du projet** + affichage en **pile d'avatars**.
2. **Modale unifiée avec mode édition** — on rend `task-detail-modal.gts` éditable in-place (pas de modale séparée). Badge « Mode édition », footer dirty-state.
3. **Critères d'acceptation sur les tasks** — ajout du support **backend** (extension de l'entité `AcceptanceTest` aux tasks, routes task-scopées).
4. **Projet en lecture seule** — affiché mais non modifiable (évite les incohérences sprint/US/membres).

### Objectifs vérifiables

- L'utilisateur peut basculer la modale task en mode édition, modifier titre/statut/priorité/description/points/user-story, et enregistrer (PATCH `/tasks/:id`).
- L'utilisateur peut ajouter/retirer des assignés parmi **les membres du projet** ; les changements persistent via `POST`/`DELETE /tasks/:id/assignees`.
- Les assignés s'affichent en pile d'avatars (vue) et en multi-select (édition).
- Les critères d'acceptation d'une task sont listables, créables, cochables (état), et supprimables (backend + UI).
- Le projet est affiché mais jamais éditable.
- Le thread de commentaires (maquette 2) est vérifié conforme (réactions, réponses, mentions, éditer/supprimer) — gaps corrigés si nécessaire.

---

## 2. Contexte architectural (graph grounding — advisory)

> Vérifié par lecture directe des fichiers (le graphe ne fait pas foi).

- **Communautés touchées** : `scrum-backend` (modules `task`, `acceptance-test`), `backlog-front` (components + services + schemas), `projects-front` (membres), `shared-front` (`CommentThread`, `AttachmentList`), `@apps/front` (registre de schémas WarpDrive).
- **Contrats transverses à risque** (god nodes) :
  - `makeSingleJsonApiTopDocument` / `makeJsonApiError` (`@libs/backend-shared`) : toute nouvelle route doit déclarer un schéma de réponse exact sous peine de `FST_ERR_RESPONSE_SERIALIZATION`.
  - **Registre WarpDrive** (`@apps/front/app/services/store.ts`) : tout `type:` renvoyé (`acceptance-tests` existe déjà ; vérifier `project-members`) doit y être enregistré.
  - **Pattern polymorphe** `comments`/`attachments` (`shared-front`) déjà en place — modèle de réutilisation à suivre pour les critères d'acceptation task-scopés.
- **Fichiers god-node à reviewer avec soin** : `@libs/scrum-backend/src/mounters.ts` (montage des routes), `@libs/scrum-backend/src/acceptance-test/acceptance-test.entity.ts` (changement de schéma → migration).

---

## 3. État des lieux (cartographie code réel)

| Élément | Fichier | État |
|---|---|---|
| Modale task | `@libs/backlog-front/src/components/task-detail-modal.gts` | Lecture seule, bouton Edit `disabled`, onglets OK, `CommentThread`/`AttachmentList` branchés |
| Service task | `@libs/backlog-front/src/services/tasks.ts` | `update()` (attributs) OK ; `loadAssignees()` OK ; **pas** de `addAssignee`/`removeAssignee` |
| Création task | `@libs/backlog-front/src/components/add-task-modal.gts` | Charge **tous** les users (`/api/v1/users`) au lieu des membres ; **ne sauvegarde pas** les assignees (commentaire « P12 ») |
| Membres projet | `@libs/projects-front/src/services/projects.ts` → `loadMembers(projectId)` | OK, source correcte (`MemberLite[]`) |
| Assignees backend | `@libs/scrum-backend/src/task/routes/assignees.routes.ts` | `GET`/`POST`/`DELETE` OK ; M2M `task_assignees` |
| PATCH task | `@libs/scrum-backend/src/task/routes/update.route.ts` | Attributs only (pas d'assignees — normal) |
| Acceptance tests | `@libs/scrum-backend/src/acceptance-test/*` + `@libs/backlog-front/src/services/acceptance-tests.ts` + `components/acceptance-test-list.gts` | **Mono-owner** : `userStoryId` non-nullable, routes `/user-stories/:id/acceptance-tests`. Composant front prend `@userStoryId` |
| Schémas WarpDrive | `@apps/front/app/services/store.ts` | `tasks`, `acceptance-tests`, `project-members`, `users`, `user-stories` enregistrés |

---

## 4. Approche technique

### Phase 1 — Backend : critères d'acceptation polymorphes (task + user-story)

**But** : permettre à un critère d'acceptation d'appartenir soit à une user-story, soit à une task.

1. **Entité** `@libs/scrum-backend/src/acceptance-test/acceptance-test.entity.ts` :
   - Rendre `userStoryId` **nullable** : `p.string().nullable().index()`.
   - Ajouter `taskId: p.string().nullable().index()`.
   - (Invariant applicatif : exactement un des deux est non-null. Pas de contrainte DB cross-column ; validé côté route.)

2. **Migration** MikroORM :
   ```bash
   cd @apps/backend && pnpm migration:create
   ```
   Vérifier le diff généré (ALTER `acceptance_tests` : `user_story_id` nullable + ajout `task_id` nullable index). **Ne pas** utiliser `schema:fresh` sur un environnement à conserver.

3. **Serializer** `acceptance-test.serializer.ts` : ajouter `taskId` (nullable) au `SerializedAcceptanceTestSchema` et au mapping. Garder `userStoryId` nullable dans le schéma.

4. **Routes task-scopées** (mirroir des routes story) :
   - `routes/list-by-task.route.ts` → `GET /:id/acceptance-tests` monté sous `/tasks` : valide l'existence de la `TaskEntity` (404 `TASK_NOT_FOUND` sinon), `where: { taskId: id }`, `orderBy rank ASC`.
   - `routes/create-on-task.route.ts` → `POST /:id/acceptance-tests` monté sous `/tasks` : crée avec `taskId = id`, `userStoryId = null`.
   - Les routes **`update`/`delete` existantes (by id) sont réutilisées** sans changement.
   - (Optionnel : `summary.route.ts` task-scopé si un compteur est affiché ailleurs — sinon hors scope.)

5. **Montage** `mounters.ts` : dans `mountTasks(...)`, ajouter `new ListByTaskAcceptanceTestRoute(em)` et `new CreateOnTaskAcceptanceTestRoute(em)`. Suivre exactement le pattern de `mountUserStories` (lignes ~166-168).

6. **Tests backend** (`@libs/scrum-backend/tests/integration/`) — **bloquants** :
   - `POST /tasks/:id/acceptance-tests` crée un critère lié à la task (taskId set, userStoryId null).
   - `GET /tasks/:id/acceptance-tests` ne renvoie que les critères de cette task.
   - `PATCH /acceptance-tests/:id` (état `to-check`→`success`) fonctionne pour un critère task-scopé.
   - `DELETE /acceptance-tests/:id` supprime.
   - Régression : `GET /user-stories/:id/acceptance-tests` inchangé (userStoryId nullable n'a pas cassé la liste story).

### Phase 2 — Backend : durcissement assignation (vérification)

**But** : valider que l'assignation accepte uniquement des membres du projet et est idempotente.

1. Dans `AddTaskAssigneeRoute` : avant insert, vérifier que `userId` est **membre du projet de la task** (`ProjectMember` où `projectId = task.projectId && userId = body.userId`). Renvoyer `422`/`409` JSON:API si non-membre (utiliser `makeJsonApiError`). Conserver le 409 doublon existant.
2. Confirmer le `404` task inexistante sur `POST`/`DELETE`.
3. **Tests** : assign d'un non-membre → rejet ; assign membre → 201/200 ; double assign → 409 ; remove → 204 ; remove inexistant → 404/204 idempotent (choisir et documenter).

### Phase 3 — Frontend : service tasks + acceptance-tests polymorphes

1. **`services/tasks.ts`** : ajouter
   ```ts
   async addAssignee(taskId: string, userId: string): Promise<void> {
     await this.store.request({
       url: `/api/v1/tasks/${taskId}/assignees`,
       method: 'POST',
       body: JSON.stringify({ data: { type: 'task-assignees', attributes: { userId } } }),
     });
   }
   async removeAssignee(taskId: string, userId: string): Promise<void> {
     await this.store.request({
       url: `/api/v1/tasks/${taskId}/assignees/${userId}`,
       method: 'DELETE',
     });
   }
   // Diff helper : applique ajouts/suppressions à partir d'un état désiré
   async syncAssignees(taskId: string, desiredIds: string[], currentIds: string[]): Promise<void> {
     const toAdd = desiredIds.filter((id) => !currentIds.includes(id));
     const toRemove = currentIds.filter((id) => !desiredIds.includes(id));
     await Promise.all([
       ...toAdd.map((id) => this.addAssignee(taskId, id)),
       ...toRemove.map((id) => this.removeAssignee(taskId, id)),
     ]);
   }
   ```
   > ⚠️ Respecter la règle projet : passer par `store.request()` (Bearer via `AuthHandler`), jamais `fetch()` nu.

2. **`services/acceptance-tests.ts`** : ajouter `loadByTask(taskId)`, `createOnTask(taskId, payload)` (mirroir des méthodes story, URL `/api/v1/tasks/:id/acceptance-tests`). `update`/`remove` (by id) déjà génériques — réutilisées.

3. **`schemas/acceptance-tests.ts`** : ajouter `{ name: 'taskId', kind: 'attribute' }` au schema WarpDrive et `taskId: string | null` à l'interface. Rendre `userStoryId` typé `string | null`.

4. **`components/acceptance-test-list.gts`** : rendre **polymorphe**. Remplacer `Args: { userStoryId }` par `Args: { ownerType: 'task' | 'user-story'; ownerId: string }` et router `load`/`create` vers la bonne méthode du service. Mettre à jour le call site `edit-user-story-modal.gts` (`@ownerType="user-story" @ownerId={{@userStory.id}}`).
   > Garder une rétro-compat minimale n'est pas requise : le seul call site est `edit-user-story-modal`.

### Phase 4 — Frontend : composant avatar stack assignés

1. Créer `@libs/backlog-front/src/components/assignee-avatar-stack.gts` (ou réutiliser un existant dans `shared-front` s'il y en a un — vérifier d'abord `grep -ri "avatar" @libs/shared-front/src`).
   - `Args: { members: MemberLite[] }` (les membres résolus, pas juste les ids).
   - Rendu : avatars superposés (initiales + `color`), `+N` au-delà de 3-4, tooltip nom complet.
   - `data-test-assignee-avatar` pour les tests E2E.
2. Réutilise le type `MemberLite` de `@libs/projects-front/src/services/projects.ts`.

### Phase 5 — Frontend : modale task unifiée éditable (cœur UX)

**Fichier** : `@libs/backlog-front/src/components/task-detail-modal.gts` (refonte in-place).

1. **État** : ajouter `@tracked isEditing = false`, plus les champs éditables (`title`, `status`, `priority`, `description`, `points`, `userStoryId`, `assigneeIds: string[]`), `@tracked dirty = false`, `@tracked submitting`, `@tracked error`, et `@tracked projectMembers: MemberLite[]`.
2. **Chargement** (`loadAll`) : en plus de history + assignees, charger `projectMembers` via `projects.loadMembers(this.args.task.projectId)`. Initialiser les champs éditables depuis `args.task` et `assigneeIds` depuis les assignees chargés.
3. **Toggle édition** : action `enterEdit()` / `cancelEdit()` (réinitialise les champs depuis `args.task`, `isEditing=false`, `dirty=false`). Le badge « Mode édition » s'affiche quand `isEditing`.
4. **Dirty tracking** : chaque `on input/change` set `dirty=true`. Footer affiche « ● Modifications non enregistrées » quand `dirty`.
5. **Layout (mode édition)** conforme maquette 1 :
   - Header : `#number` + badges (`TaskTypeBadge`, `TaskNatureBadge`) + chip « Tag » (placeholder, hors scope si pas de backend tags task → masquer ou désactiver).
   - `TITRE` (input) + badge « Mode édition ».
   - Ligne `STATUT` (select) | `PRIORITÉ` (select) — réutiliser les unions Zod du schema tasks pour les options.
   - Colonne gauche : `DESCRIPTION` (textarea), `CRITÈRES D'ACCEPTATION` (`<AcceptanceTestList @ownerType="task" @ownerId={{@task.id}} />`), `PIÈCES JOINTES` (`AttachmentList` existant).
   - Colonne droite : `ASSIGNÉ À` (multi-select des `projectMembers` + `AssigneeAvatarStack` au-dessus), `PROJET` (texte **lecture seule**), `USER STORY` (select), `POINTS` (select Fibonacci).
6. **Layout (mode vue)** : conserver l'affichage actuel mais remplacer `firstAssignee` par `AssigneeAvatarStack` (tous les assignés). Onglets `Détails | Commentaires | Historique` inchangés (le `CommentThread` reste branché).
7. **Submit** (`save`) :
   ```ts
   @action async save(e) {
     e.preventDefault();
     this.submitting = true; this.error = '';
     try {
       await this.tasks.update(this.args.task.id, {
         title: this.title.trim(), status: this.status, priority: this.priority,
         description: this.description.trim(), points: this.points, userStoryId: this.userStoryId,
       });
       await this.tasks.syncAssignees(this.args.task.id, this.assigneeIds, this.initialAssigneeIds);
       // refresh assignees affichés
       this.assignees = await this.tasks.loadAssignees(this.args.task.id);
       this.initialAssigneeIds = this.assigneeIds.slice();
       this.dirty = false; this.isEditing = false;
     } catch (err) { this.error = err instanceof Error ? err.message : this.intl.t('...errorFallback'); }
     finally { if (!this.isDestroying) this.submitting = false; }
   }
   ```
8. **Footer** : `Annuler` (→ `cancelEdit`) + `Enregistrer` (`disabled` si `submitting` ou titre vide). En mode vue : bouton « Modifier » (remplace l'ancien Edit `disabled`), « Log Time », « Fermer ».
9. Retirer le commentaire « P12 » dans `add-task-modal.gts` et **brancher la création d'assignees** : remplacer `loadUsers()` (tous les users) par `projects.loadMembers(projectId)`, et après `create()`, appeler `syncAssignees(newTask.id, assigneeIds, [])`.

### Phase 6 — i18n, store, qualité

1. **i18n** : ajouter les nouvelles clés sous `@apps/front/translations/<namespace>/` (PAS dans la lib). Namespaces concernés : `backlog` (modal.taskDetail.*, modal.editTask.*), `acceptance-tests`/`shared`. Clés : `editMode`, `unsavedChanges`, `actions.edit/save/saving/cancel`, `meta.assignee`, `assigneePlaceholder`, etc. **Redémarrer Vite** après ajout de YAML.
2. **Store** : vérifier (`@apps/front/app/services/store.ts`) que `task-assignees` n'a pas besoin de schema (les assignees sont chargés en JSON brut via le service, pas via le cache WarpDrive — confirmer qu'aucun `type:` non enregistré n'est mappé dans le cache). `acceptance-tests` déjà enregistré.
3. **Lint/format** : `pnpm turbo lint` depuis la racine **avant push** (cf. mémoire — partiel insuffisant). `pnpm format`.
4. **Lockfile** : si une nouvelle dépendance est ajoutée (non prévu ici), demander à l'utilisateur de commiter `pnpm-lock.yaml`.

---

## 5. Stratégie de test (critères bloquants)

> Les tests d'intégration listés ne peuvent **pas** être remplacés par un smoke test manuel.

### Backend (vitest, `@libs/scrum-backend`)
- **T1** `POST /tasks/:id/acceptance-tests` → critère avec `taskId` set, `userStoryId` null. *(bloquant)*
- **T2** `GET /tasks/:id/acceptance-tests` → ne renvoie que les critères de la task. *(bloquant)*
- **T3** `GET /user-stories/:id/acceptance-tests` → inchangé (non-régression nullable). *(bloquant)*
- **T4** `POST /tasks/:id/assignees` avec un **non-membre** → rejet ; avec membre → OK ; doublon → 409. *(bloquant)*
- **T5** `DELETE /tasks/:id/assignees/:userId` → 204 + l'assignee disparaît du `GET`. *(bloquant)*

### Frontend (Ember test runner, `@libs/backlog-front`)
- **T6** Test d'intégration `task-detail-modal` : bascule en mode édition, modifie le titre, save → `tasks.update` appelé avec le bon payload (mock). *(bloquant)*
- **T7** Test d'intégration : ajout/retrait d'un assigné → `syncAssignees` calcule le bon diff (add/remove). *(bloquant)*
- **T8** `acceptance-test-list` rendu en `@ownerType="task"` charge via `loadByTask`. *(bloquant)*
- **T9** `AssigneeAvatarStack` : affiche N avatars + `+M` au-delà du seuil.

> ⚠️ Mémoire projet : nommer les fichiers `*-test.gts` (dash, sinon ignoré silencieusement). Forcer un échec volontaire avant d'annoncer « vert ». Si « Vite unexpectedly reloaded a test » en CI, ajouter les deps dans `optimizeDeps.include` du `vite.config` de la lib.

### E2E (Playwright, `@apps/e2e`) — optionnel mais recommandé
- **T10** Ouvrir une task → Modifier → changer l'assigné parmi les membres → Enregistrer → vérifier l'avatar mis à jour. Sélecteurs `data-test-*` uniquement.

### Vérification visuelle
- Comparer la modale rendue aux 2 maquettes via `/TPK-visual-verify` (mode édition + onglet commentaires). Vérifier le dark mode (badges `badge-soft` — cf. override `theme.css`).

---

## 6. Critères de succès (vérifiés par `/TPK-build` avant `done/`)

1. ☐ Entité `AcceptanceTest` : `userStoryId` nullable + `taskId` nullable ; migration créée et appliquée (`migration:up` OK).
2. ☐ Routes `GET`/`POST /tasks/:id/acceptance-tests` montées et fonctionnelles ; `update`/`delete` by id réutilisées.
3. ☐ `AddTaskAssigneeRoute` rejette les non-membres du projet (test T4 vert).
4. ☐ `tasks.ts` expose `addAssignee`/`removeAssignee`/`syncAssignees` (via `store.request`, pas de `fetch` nu).
5. ☐ `acceptance-tests.ts` + schema + `acceptance-test-list.gts` rendus polymorphes (task & user-story), call site user-story migré.
6. ☐ `AssigneeAvatarStack` créé et utilisé en vue + édition.
7. ☐ `task-detail-modal.gts` : mode édition fonctionnel (titre/statut/priorité/description/points/user-story éditables), badge « Mode édition », footer dirty « Modifications non enregistrées », Annuler/Enregistrer ; **projet en lecture seule**.
8. ☐ Assignation multiple parmi les **membres du projet** persiste (PATCH attributs + sync assignees) ; vérifié en vrai (curl/UI).
9. ☐ `add-task-modal.gts` : source = membres du projet (plus `/api/v1/users`), assignees **réellement sauvegardés** à la création.
10. ☐ Critères d'acceptation task : list/create/toggle/delete fonctionnels en UI.
11. ☐ Thread commentaires (maquette 2) vérifié conforme (réactions, réponses, mentions, éditer/supprimer) ; gaps documentés/corrigés.
12. ☐ Tests T1–T9 verts (T1–T8 bloquants) ; `pnpm turbo lint` vert depuis la racine ; `pnpm format` appliqué.
13. ☐ Rendu conforme aux 2 maquettes (light + dark mode) via vérification visuelle.

---

## 7. Risques & points d'attention

- **Migration nullable** : passer `userStoryId` de non-null à nullable est non destructif, mais vérifier qu'aucune contrainte/seed ne suppose la non-nullité. Tester `migration:down` aussi.
- **`FST_ERR_RESPONSE_SERIALIZATION`** : les nouvelles routes doivent matcher exactement `SerializedAcceptanceTestSchema` (incluant `taskId` nullable).
- **Refonte in-place de `task-detail-modal`** : c'est le composant le plus dense touché ; garder les `data-test-*` existants pour ne pas casser les tests/E2E en place.
- **Type `task-assignees`** : si jamais le POST renvoie une ressource mappée dans le cache WarpDrive, enregistrer son schema dans `store.ts` (sinon « Missing Resource Type » silencieux). Sinon laisser en JSON brut via le service.
- **Tags task** (chip « Tag » maquette 1) : `TaskEntity.tags` existe (`p.array()`), mais pas d'UI ; si non couvert, masquer le chip plutôt que de laisser un bouton mort.
- **Scope** : la maquette 2 (commentaires) est **majoritairement déjà couverte** par `CommentThread` — ne réécrire que les gaps réels constatés à la vérification (Phase 6/critère 11).

---

**Prochaine étape** : `/TPK-build specs/todo/task-edit-ux-and-assignment-overhaul.md`
