# P6 — Tasks (composants partagés dans `@libs/backlog-front`)

> Objectif : implémenter le domaine **Tasks** côté frontend : composants `TaskCard` (variantes kanban/dashboard, complément à `TaskRow` livré en P5), modale `AddTask` complète, modale `TaskDetail` avec onglets (Détails, Commentaires, Historique) et panneau meta latéral. Référence visuelle : `docs/figma-screenshots/04-kanban.png`, `12-modal-add-task.png`, `20-modal-task-detail.png`.

---

## 1. Contexte & rappels

### Acquis (P0–P5)
- Backend P2 expose toutes les routes nécessaires (cf. `@libs/scrum-backend`) :
  - **Tasks CRUD** : `GET/POST /api/v1/tasks/`, `GET/PATCH/DELETE /api/v1/tasks/{id}`, `GET /api/v1/projects/{id}/tasks`, `GET /api/v1/user-stories/{id}/tasks`, `GET /api/v1/epics/{id}/tasks`, `GET /api/v1/sprints/{id}/tasks`.
  - **Sub-resources** : `GET/POST /api/v1/tasks/{id}/comments`, `DELETE /api/v1/tasks/{id}/comments/{commentId}`, `GET/POST /api/v1/tasks/{id}/attachments`, `DELETE /api/v1/tasks/{id}/attachments/{attachmentId}`, `GET /api/v1/tasks/{id}/history`, `GET/POST /api/v1/tasks/{id}/assignees`, `DELETE /api/v1/tasks/{id}/assignees/{userId}`.
- Types backend `types.ts` (cf. `@libs/scrum-backend/src/types.ts`) confirmés en P5.1 :
  - `TaskStatus = "todo" | "in-progress" | "testing" | "uat" | "done"`
  - `TaskType = "Frontend" | "Backend" | "Database" | "UX" | "Analyse" | "DevOps" | "API" | "Security" | "Testing"`
  - `TaskNature = "Bug" | "Feature" | "Maintenance" | "Hotfix" | "Refacto" | "Techdebt" | "Spike" | "Review" | "Deployment" | "Infra"`
  - `TaskPriority = "Basse" | "Moyenne" | "Haute" | "Critique"`
  - `STORY_POINTS = [1, 2, 3, 5, 8, 13, 21]`
- P5 a livré (déjà dans `@libs/backlog-front`) :
  - `TaskSchema` (17 attributs, tous `kind: "attribute"`)
  - `TasksService` : `loadBacklog`, `loadAllByProject`, `loadByUserStory`, `findById` (pas de `create`/`update` — P6)
  - `TaskRow` (variante dense pour `/backlog`)
  - `TaskNatureBadge`, `TaskTypeBadge` (TOC + i18n)
  - i18n complet `backlog.filters.{type,nature}.*`, `backlog.status.*`
- Lib `@libs/users-front` expose `current-user` et `users` services + endpoint `/api/v1/users` (utile pour le sélecteur assignés).

### Cible Figma
- **TaskCard (variante kanban)** (`04-kanban.png`, colonnes) : carte verticale avec `#number` haut-gauche, ⚡ points haut-droite, titre, description courte, badges Nature+Type, lien US (`US-us3`), avatars assignés (stack). Cliquable → ouvre `TaskDetail`.
- **TaskCard (variante dashboard)** : ligne compacte sans description (à confirmer avec dashboard Figma — cf. `01-dashboard.png`).
- **AddTaskModal** (`12-modal-add-task.png`) :
  - **Projet*** (select), **Titre*** (input), **Description** (textarea), **Type** (select), **Nature** (select), **Priorité** (select), **Points d'efforts** (select Fibonacci), **Temps estimé (heures)** (number), **User Story (optionnel)** (select avec "Aucune"), **Assignés** (multi-checkbox grille avec avatars). Bouton "Créer la tâche".
- **TaskDetailModal** (`20-modal-task-detail.png`) :
  - **Header** : `#1008` + badges (Nature, Type, Status, Priorité) + titre + métadata "Créé par X • 20 janvier 2025 à 01:00".
  - **Onglets** : Détails / Commentaires / Historique. Onglet actif souligné teal.
  - **Onglet Détails** (2 colonnes) :
    - **Colonne gauche** : Description, Critères d'acceptation (liste de checkboxes — affichage seul P6), Pièces jointes (placeholder "Aucune pièce jointe" + bouton upload disabled).
    - **Colonne droite (meta)** : Assigné à (avatar + nom + role), Projet, Sprint (nom + dates + objectif), User Story, Points d'efforts, Temps.
  - **Footer** : `Éditer` (button — disabled P6), `Logger du temps` (button — disabled, P9), `Fermer`.

### Hors périmètre P6
- **Édition inline du status** depuis la card kanban → reportée en P7 (Kanban).
- **Drag-drop** entre colonnes Kanban → P7. Entre Backlog et Sprints → P8.
- **Édition inline du panneau Détails** (cliquer pour modifier le titre, description, etc.) → P12 (Settings + édition globale).
- **Persistance des critères d'acceptation** (cocher/décocher) → P12. En P6 affichage statique uniquement.
- **Upload réel de pièces jointes** → P12. En P6 placeholder + button disabled.
- **Logger du temps depuis TaskDetail** → P9 (Time Tracking).
- **Tab Commentaires interactif** (poster un commentaire) → P12. En P6 lecture seule.
- **Tab Historique** : affichage chronologique simple, pas de filtrage → P12.

---

## 2. Décisions techniques

### D1. Enrichir `@libs/backlog-front` (pas de nouvelle lib)
Conformément au macro-plan ("Composants `TaskCard` … dans `@libs/backlog-front`"). Pas de scaffold, on étend l'addon existant. Pas de nouveaux schemas WarpDrive — `TaskSchema` (P5) suffit, on lui ajoute les relations qu'on charge en P6.

### D2. Variantes TaskCard
Composant `task-card.gts` polymorphe avec `@variant="kanban" | "dashboard"` (défaut `kanban`).
- Variante **kanban** : carte DaisyUI verticale, header (#number + points), titre, description (ligne tronquée), badges Nature+Type, lien US, avatars (3 max + counter).
- Variante **dashboard** : ligne horizontale dense (proche de `TaskRow` mais sans filtres, avec status pill).
- `TaskRow` (P5) reste pour `/backlog` — non touché.

### D3. TasksService : ajouter `create`, `update`, `loadComments`, `loadHistory`, `loadAssignees`
- `create(payload: NewTaskPayload)` → POST `/api/v1/tasks/` ; refresh via `loadAllByProject` après.
- `update(id, partial)` → PATCH `/api/v1/tasks/{id}` ; refresh.
- `loadComments(taskId)`, `loadHistory(taskId)`, `loadAssignees(taskId)` → GET sub-resources.
- **Pas de `delete` en P6** (édition globale P12).
- **Pas de POST comments/attachments/assignees en P6** — placeholders disabled.

### D4. AddTaskModal
Wiring **multi-points d'entrée** (critère macro-plan : "réutilisable depuis Backlog, Kanban, USM, et `Ajouter` global") :
- Bouton "+ Nouvelle tâche" de `/backlog` (actuellement disabled tooltip P6) → débloquer.
- Bouton "+ Nouvelle tâche" de `/user-story-map` (idem disabled) → débloquer.
- Header global "+ Ajouter" (P3 disabled tooltip "Disponible en P4") → reste géré en P12 comme dropdown multi-type. Hors scope P6.
- Champs : projet (auto-rempli `current-project`, modifiable via select projets actifs), titre*, description, type (select 9 valeurs), nature (select 10), priorité (select 4), points (select Fibonacci 1-21), estimatedHours (number ≥ 0), userStoryId (select avec "Aucune US"), assignees (grille checkbox avec avatars, alimentée par GET `/api/v1/users`).
- Validation client : titre obligatoire, estimatedHours ≥ 0.
- POST → refresh `tasks.loadAllByProject(currentProjectId)` (pattern P5 — feedback-warpd-create).

### D5. TaskDetailModal : tabs avec `<details>` ou `tracked activeTab`
- 3 onglets : Détails, Commentaires, Historique.
- `@tracked activeTab: 'details' | 'comments' | 'history' = 'details'`.
- Boutons d'onglet en haut, contenu en dessous.
- **Détails** : layout 2 colonnes (Tailwind grid `grid-cols-3` avec col-span-2 pour gauche).
- **Commentaires** : liste tirée de `tasks.loadComments(taskId)` au mount. Lecture seule en P6.
- **Historique** : liste tirée de `tasks.loadHistory(taskId)`. Lecture seule.
- Footer : 3 boutons. `Éditer` et `Logger du temps` disabled avec tooltip "P12" / "P9".

### D6. Multi-point d'ouverture TaskDetail
Critère macro : "ouvre depuis Dashboard, Backlog, Kanban et le Sprint en cours".
- **`/backlog`** : `TaskRow` cliquable (modifier `task-row.gts` pour appeler un `@onOpen` callback).
- **`/user-story-map`** : `TaskRow` imbriqué dans `UserStoryRow` cliquable.
- **`/kanban`** : `TaskCard` cliquable. **Mais Kanban n'est pas en P6** — on prépare l'API mais on ne déclare pas la route.
- **`/dashboard`** : `TaskCard` cliquable. Le dashboard P3 a des stubs KPI — on n'ajoute pas une vraie liste de tasks en P6 (cela vient avec `dashboard-front` P10).

P6 priorise les ouvertures depuis `/backlog` et `/user-story-map` (déjà routées). Les autres viendront avec leurs phases respectives.

### D7. Palette badges P6 — confirmation P5
Les badges Type+Nature ont été définis en P5 (`task-type-badge.gts`, `task-nature-badge.gts`). En P6, on ajoute :
- `TaskStatusBadge` (5 valeurs : `todo`, `in-progress`, `testing`, `uat`, `done`) — pour le header de `TaskDetail`.
- `TaskPriorityBadge` (4 valeurs : `Basse`, `Moyenne`, `Haute`, `Critique`) — header `TaskDetail`.

### D8. MSW mocks à enrichir
Étendre `@libs/backlog-front/src/http-mocks/backlog.ts` :
- **POST `/api/v1/tasks/`** : ajoute la task à `mockTasks` (number auto-incrémenté).
- **PATCH `/api/v1/tasks/:id`** : update task.
- **GET `/api/v1/tasks/:id/comments`** : retourne 0-3 mock comments par task.
- **GET `/api/v1/tasks/:id/history`** : retourne 1-2 mock events.
- **GET `/api/v1/tasks/:id/assignees`** : retourne 1-3 mock users.
- Étoffer `mockTasks` à 18+ pour matcher la cible spec P5 (criterion #4 partiellement comblé).

### D9. i18n
Nouveau namespace `tasks` (`@apps/front/translations/tasks/{fr-fr,en-us}.yaml`) pour :
- Labels colonnes/badges status (todo: 'À faire', in-progress: 'En cours', testing: 'À tester', uat: 'UAT', done: 'Terminé').
- Labels priorité (déjà en français côté backend — mais lisibilité i18n EN).
- Strings de `AddTask` et `TaskDetail` (titres onglets, boutons, placeholders).
- Acceptance criteria placeholders (P12 — texte placeholder en P6).
- Réutiliser `backlog.filters.{type,nature}.*` (déjà i18n) pour les badges.

### D10. Tests
Pattern P5 + P5 review :
- **Unit** : `TaskCard` smoke (kanban variant, dashboard variant).
- **Integration (rendering)** :
  - `TaskCard` × 2 (kanban variant, dashboard variant)
  - `TaskStatusBadge`, `TaskPriorityBadge` (1 chacun)
  - `AddTaskModal` × 2 (champs, validation client)
  - `TaskDetailModal` × 3 (tab Détails, tab Comments lecture, tab Historique lecture)
  - `TaskRow` onOpen callback × 1
- Total : 9+ nouveaux tests intégration. Suite doit rester ≥ 30 (24 P5 + 9 P6).

### D11. Pas de E2E Playwright en P6
Comme en P5, E2E reporté à P13.

---

## 3. Architectural Context

_(à compléter avant build via `/graphify query "task"` — checkpoint)_

### Communautés touchées
- **`@libs/backlog-front`** (enrichissement)
- **Backend Scrum domain** : non touché (tout existe déjà)

### God nodes potentiellement modifiés
- ⚠️ `Modal: Nouvelle tâche` (13 edges) : **créé en P6** — vérifier le couplage avec backlog/USM/kanban.
- ❌ `makeSingleJsonApiTopDocument()` : non touché.

### Contrats transverses à risque
- **`current-project`** : AddTaskModal lit l'ID projet courant.
- **`TasksService`** : élargi avec 5 nouvelles méthodes — vérifier compatibilité côté `/backlog` et `/user-story-map` P5.

---

## 4. Découpage en tâches

### P6.0 — Audit & branchement (≈ 15 min)
- Vérifier que P5 est mergée dans `dev`.
- Créer `feat/p6-tasks-front` depuis `dev`.
- Confirmer que `TaskSchema` (P5) couvre tous les attributs nécessaires.

### P6.1 — Service tasks étendu (≈ 45 min)
- Ajouter `create`, `update`, `loadComments`, `loadHistory`, `loadAssignees` dans `tasks.ts`.
- Types : `NewTaskPayload`, `TaskComment`, `TaskHistoryEvent`, `TaskAssignee`.
- Pas de tests unit explicites (interface vérifiée par tests intégration).

### P6.2 — MSW mocks étendus (≈ 45 min)
- POST/PATCH `/tasks`, GET `/tasks/:id/{comments,history,assignees}` handlers.
- Ajouter 4 mock tasks supplémentaires (atteindre 18+).
- 3 mock comments + 2 mock history events + 2 mock assignees par task (au moins pour task-1 et task-2).

### P6.3 — Badges Status + Priority (≈ 30 min)
- `task-status-badge.gts` (TOC + i18n concat).
- `task-priority-badge.gts` (TOC + i18n).
- Tests intégration : 1 par composant.

### P6.4 — TaskCard variantes (≈ 1h30)
- `task-card.gts` avec `@variant="kanban" | "dashboard"`.
- Variante kanban : layout Figma `04-kanban.png`.
- Variante dashboard : layout compact.
- Tests intégration : 2 (1 par variante).

### P6.5 — AddTaskModal (≈ 1h30)
- `add-task-modal.gts` avec 10 champs.
- Multi-select assignés (fetch `/api/v1/users`, pattern AddProjectModal P4).
- Validation client + POST + refresh.
- Wiring depuis `/backlog` (débloquer bouton) + `/user-story-map` (idem).
- Tests intégration : 2 (rendu champs, validation).

### P6.6 — TaskDetailModal — squelette + onglet Détails (≈ 1h30)
- `task-detail-modal.gts` avec `@tracked activeTab`.
- Header (badges + titre + meta).
- Tab Détails : 2 colonnes (Description + Acceptance criteria placeholder + Attachments placeholder | Meta panel).
- Footer 3 boutons (Éditer/Log time disabled, Fermer).
- Wiring depuis `TaskRow.onOpen` (modifier `task-row.gts` pour fournir le callback).
- Tests intégration : 1 (rendu tab Détails).

### P6.7 — TaskDetailModal — onglets Commentaires + Historique (≈ 1h)
- Tab Commentaires : liste rendue depuis `loadComments` au mount du tab.
- Tab Historique : liste rendue depuis `loadHistory`.
- Switch d'onglet via boutons header.
- Tests intégration : 2 (tab Comments, tab Historique).

### P6.8 — i18n + visual polish (≈ 45 min)
- Yaml `@apps/front/translations/tasks/{fr-fr,en-us}.yaml`.
- Wiring `{{t "tasks.*"}}` partout.
- Vérification visuelle `pnpm dev` : screenshots des 2 modales + variantes TaskCard.

### P6.9 — Lint + tests + commit final (≈ 30 min)
- `pnpm lint` vert sur `@libs/backlog-front` ET `@apps/front`.
- `pnpm test` vert ≥ 33 (24 P5 + ≥ 9 P6).
- Sanity check : forcer un fail.
- Plan déplacé `specs/todo/ → specs/done/`.

### P6.10 — PR + handoff (≈ 15 min)
- Push `feat/p6-tasks-front`.
- `gh pr create --base dev` avec checklist.
- Handoff `specs/handoffs/007-*.md`.

---

## 5. Stratégie de test

### Tests unitaires
2 tests smoke sur `TaskCard` (vérifier que les 2 variantes rendent sans crash).

### Tests intégration (rendering) — **bloquants, pas substituables**
Total cible : **≥ 9 nouveaux** (P5 review a établi le pattern).
- `task-status-badge-test` : 1 test (label traduit).
- `task-priority-badge-test` : 1 test.
- `task-card-test` : 2 tests (kanban variant rendu + dashboard variant rendu).
- `add-task-modal-test` : 2 tests (rendu champs, validation titre obligatoire).
- `task-detail-modal-test` : 3 tests (tab Détails, switch vers Commentaires, switch vers Historique).

### Vérification visuelle manuelle
- `pnpm dev` + Playwright MCP screenshot.
- 4 captures dans `specs/review-screenshots/` :
  - `p6-task-card-kanban.png`
  - `p6-add-task-modal.png`
  - `p6-task-detail-tab-details.png`
  - `p6-task-detail-tab-comments.png`

### Sanity test
Bloquant : forcer un fail avant d'annoncer "tests verts".

---

## 6. Critères de succès (numérotés, vérifiables)

1. **`TasksService` étendu** : `create`, `update`, `loadComments`, `loadHistory`, `loadAssignees` exposés et typés.
2. **MSW mocks complets** : POST `/tasks`, PATCH `/tasks/:id`, GET sub-resources fonctionnent (`curl` retourne JSON:API valide). 18+ mock tasks.
3. **TaskCard kanban variant** : rendu fidèle à `04-kanban.png` (header #number+points, titre, description, badges, US link, avatars).
4. **TaskCard dashboard variant** : rendu compact différent de kanban (à valider visuellement).
5. **AddTaskModal** : 10 champs présents, validation client (titre obligatoire), POST `/api/v1/tasks/`, refresh tasks après création.
6. **AddTaskModal multi-points d'entrée** : ouvrable depuis `/backlog` (bouton "+Nouvelle tâche" — débloqué) ET `/user-story-map` (idem).
7. **TaskDetailModal squelette** : header avec badges (Nature, Type, Status, Priorité) + tabs Détails/Commentaires/Historique + footer 3 boutons.
8. **TaskDetailModal onglet Détails** : 2 colonnes — Description + Acceptance criteria (placeholder) + Attachments (placeholder) | Meta panel (Assigné/Projet/Sprint/US/Points/Temps).
9. **TaskDetailModal onglet Commentaires** : liste rendue depuis `loadComments`, lecture seule.
10. **TaskDetailModal onglet Historique** : liste rendue depuis `loadHistory`, lecture seule.
11. **TaskDetailModal ouvre depuis `TaskRow`** : `task-row.gts` reçoit un `@onOpen?` callback ; `/backlog` et `/user-story-map` l'utilisent.
12. **i18n wiring complet** : aucune string FR hardcodée dans les nouveaux composants. Yaml FR + EN à jour.
13. **`pnpm lint` vert** : `@libs/backlog-front` ET `@apps/front`.
14. **`pnpm test` vert** : ≥ 33 tests (24 P5 + ≥ 9 P6).
15. **Sanity check** : fail forcé détecté.
16. **Validation visuelle** : 4 screenshots dans `specs/review-screenshots/` comparés aux Figma.
17. **Plan déplacé** : `specs/todo/p6-tasks-front.md → specs/done/p6-tasks-front.md`.
18. **PR créée** : `gh pr create --base dev` référencement plan + Test plan.
19. **Handoff écrit** : `specs/handoffs/007-*.md` documente livraison + dettes (status edit P7, drag-drop P7+P8, acceptance criteria persistance P12, attachments upload P12).

---

## 7. Risques & mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Couplage TaskCard ↔ TaskDetail via callbacks (god node 13 edges) | Maintenance fragile | Pattern P5 : passer `@onOpen` en arg ; éviter `@service detail-modal` |
| Conflit avec PlaceholderPage shell-front pour `/tasks` | UI cassée | P6 n'ajoute pas de route `/tasks` (pas dans le scope) |
| Modale Add réutilisée depuis 4 points → state partagé | Bugs de re-ouverture | Chaque consommateur instancie sa propre modale via `{{#if this.isOpen}}` (pattern P5 modals) |
| Backend ne supporte pas tous les sub-resources mockés | Tests passent, prod échoue | P6.0 audit backend : vérifier que chaque sub-resource a une route MikroORM ; sinon flag MSW-only |
| Acceptance criteria : modèle backend ? | Affichage placeholder vide | P6.0 audit : si le backend ne stocke pas les critères, hardcoder mock placeholder + note "P12 persistence" |

---

## 8. Notes annexes

- **Mémoires à respecter** :
  - `[[feedback-tests-sanity]]` — sanity check obligatoire.
  - `[[feedback-tpkbutton]]` — TpkButton requiert `@label` + yield.
  - `[[feedback-warpd-create]]` — appeler `loadAllByProject` après POST task.
  - `[[feedback-lib-dist-pretest]]` — pas besoin de re-créer (le `pretest` existe sur `backlog-front` depuis P5).
  - `[[feedback-testapp-no-moduleregistry]]` — TestApp sans `moduleRegistry`, services en fakes.
- **Branchement Git** : `feat/p6-tasks-front` partant de `dev` une fois la PR #8 (P5) mergée.
- **Pré-requis CI** : PR #8 mergée AVANT push P6 pour éviter conflits sur `application.ts` et `pnpm-lock.yaml`.

---

## 9. Estimation totale

≈ **7-9 heures de dev focalisé**, hors review/itérations.

Phases parallélisables :
- P6.1 (service) + P6.2 (mocks) peuvent se faire en parallèle.
- P6.3 (badges) peut démarrer dès P6.0.
- P6.4 (TaskCard) dépend de P6.3.
- P6.5 (AddTask) dépend de P6.1 + P6.2.
- P6.6 + P6.7 (TaskDetail) dépendent de P6.1 + P6.2 + P6.3.

Path critique : P6.0 → P6.1 → P6.6 → P6.7 → P6.9 → P6.10.
