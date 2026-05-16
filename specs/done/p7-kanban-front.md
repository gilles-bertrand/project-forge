# P7 — Kanban (drag-drop + status inline, dans `@libs/backlog-front`)

> Objectif : implémenter la vue **Kanban** Scrum côté frontend : 5 colonnes (`todo` / `in-progress` / `testing` / `uat` / `done`), drag-drop natif HTML5 entre colonnes avec édition status via PATCH (optimistic + rollback), header sprint actif simplifié, filtres `Mes tâches / Toutes les tâches`. Référence visuelle : `docs/figma-screenshots/04-kanban.png` et `25-kanban-light-mode.png`.

---

## 1. Contexte & rappels

### Acquis (P0–P6)
- Backend P2 expose les routes `Tasks CRUD` (cf. `@libs/scrum-backend/src/types.ts`) :
  - `GET /api/v1/projects/{id}/tasks`, `GET /api/v1/sprints/{id}/tasks`, `PATCH /api/v1/tasks/{id}` (utilisé pour le drag-drop).
- Types backend confirmés en P5 :
  - `TaskStatus = "todo" | "in-progress" | "testing" | "uat" | "done"` (5 valeurs — toutes utilisées par Kanban).
- P6 a livré (dans `@libs/backlog-front`) :
  - `TaskCard @variant="kanban"` (composant prêt — header `#number` + ⚡ points, titre, description, badges Nature+Type, US link, avatar).
  - `TasksService.create`/`update`/`loadByUserStory`/`loadAllByProject`.
  - `TaskDetailModal` ouvrable via `@onOpen` callback → utilisable depuis Kanban.
  - `AddTaskModal` (10 champs) — réutilisable depuis Kanban en sélectionnant la colonne comme statut initial.
- Pas encore de service `sprints` côté front. Le concept "sprint actif" sera mocké via `currentProject` + heuristique (premier sprint mocké du projet) pour P7. P8 livrera `@libs/sprints-front` avec service `sprints` complet.
- `@libs/shell-front/src/templates/dashboard/kanban.gts` contient actuellement un `PlaceholderPage` (`Disponible en P7`) qui devra être retiré (pattern P5).

### Cible Figma
- **Header sprint** (`04-kanban.png`) : ligne au-dessus du board avec :
  - Nom du sprint courant (`Sprint 12 - Auth & Onboarding`)
  - Dates `25 Jan - 8 Fév 2025`
  - Objectif (1 ligne, italique)
  - Compteur `42 pts • 35% complete`
  - Boutons navigation `←` `→` (P8 — disabled en P7 sauf un seul sprint mock).
- **Filtres** : toggle `Mes tâches` / `Toutes les tâches` (radio button group).
- **Board** : 5 colonnes verticales (header avec titre + compteur de cartes) :
  - `À faire` (todo)
  - `En cours` (in-progress)
  - `À tester` (testing)
  - `UAT` (uat)
  - `Terminé` (done)
- **Cartes** : utilisent `TaskCard @variant="kanban"` (déjà livré P6). Cliquables → ouvre `TaskDetailModal`.

### Hors périmètre P7
- **Drag-drop entre Backlog et Sprints** → P8.
- **Navigation sprints `<` `>`** → P8 (P7 affiche le seul sprint mock existant).
- **Édition inline du titre/description sur la card** → P12.
- **Bouton `+ Add task` par colonne** → optionnel P7 (réutilise `AddTaskModal` avec `preselectedStatus`, simple wrapper).
- **WebSocket / live updates** → non planifié au MVP.
- **Filtres avancés** (par assignee, label, priority) → P12.

---

## 2. Décisions techniques

### D1. Enrichir `@libs/backlog-front` (pas de nouvelle lib)
Le macro-plan stipule "peut être fusionné dans backlog-front si scope reste petit" ([cf. ADR](specs/done/00-adr-sprintforge.md) §1.5). On reste dans `backlog-front` pour 3 raisons :
- `TaskCard @variant="kanban"` y est déjà.
- `TasksService.update(id, partial)` y est déjà (livré P6) — réutilisé pour le drag-drop.
- Cohésion forte avec le backlog (mêmes tasks, transitions de statut).

Pas de nouveau schema WarpDrive — `TaskSchema` (P5) suffit. Le store global (`@apps/front/app/services/store.ts`) contient déjà les schemas requis (fix P6 `c7ab1a7`).

### D2. Drag-drop natif HTML5 (pas de dep)
Choix tranché : pas de `ember-sortable`, pas de `ember-draggable-modifiers`. On utilise les events natifs `dragstart` / `dragover` / `drop` du DOM. Avantages : zéro dep, contrôle total, simple à tester. Inconvénient : pas de mobile touch out-of-the-box → reporté en P12.

API attendue :
- `TaskCard` : nouveau prop `@draggable: boolean` (défaut `false`). Quand true, ajoute `draggable="true"` + `{{on "dragstart" ...}}` qui store `task.id` dans `dataTransfer`.
- `KanbanColumn` : `{{on "dragover" ...}}` (preventDefault pour autoriser drop) + `{{on "drop" ...}}` qui lit l'id puis appelle `@onMoveTask(taskId, newStatus)`.

### D3. Optimistic update + rollback
Pattern :
1. Au `drop`, lookup task dans `tasks.all`.
2. Snapshot du `status` actuel (pour rollback).
3. Mutation locale immédiate : `task.status = newStatus` (re-rendu de la colonne instantané).
4. Background : `await tasksService.update(taskId, { status: newStatus })`.
5. Si PATCH échoue : restore `task.status = snapshot.status`, afficher une alerte temporaire.

⚠️ La méthode `update()` P6 fait `loadAllByProject` après PATCH. Pour Kanban on veut **éviter** ce reload (sinon perte de l'optimistic), donc on ajoute une variante `updateOptimistic` qui ne reload pas, ou un flag `update(id, partial, { refresh: false })`.

### D4. Sprint header simplifié (mock pour P7)
Pas de `SprintsService` en P7. Approche :
- Ajouter un mock simple : 1 sprint actif (`sprint-1`) avec name `Sprint 1 — Authentication & Onboarding`, dates `2025-01-15` → `2025-01-29`, goal `Finaliser le flow login complet`, pointsCompleted/pointsTotal.
- Ajouter `mockSprints` dans `http-mocks/backlog.ts` (futur dépendance P8 — la lib `sprints-front` reprendra le mock et l'étendra).
- Handler `GET /api/v1/projects/:id/sprints?filter[status]=active` → renvoie `sprint-1` pour proj-1.
- Handler `GET /api/v1/sprints/:id` → renvoie le détail.
- Service `KanbanService` (ou méthode dans `TasksService`) `loadActiveSprint(projectId)` qui retourne `{ sprint, tasks }`.
- Navigation `<` `>` boutons disabled avec tooltip "Disponible en P8".

Le `pointsCompleted` est calculé côté front depuis les tasks `done` du sprint, pas depuis le backend (mocké simplement comme `tasks.filter(s='done').reduce(+points)`).

### D5. Filtres `Mes tâches` / `Toutes les tâches`
- Toggle state `@tracked filter: 'mine' | 'all' = 'all'`.
- `Mes tâches` filtre par `task.createdById === currentUser.id` (proxy temporaire — vrais assignees nécessitent `loadAssignees` async, lourd ici).
- Persistance localStorage `sprintforge:kanban-filter` (réutilise pattern `current-project`).

### D6. Route `/kanban` 
- Créer `@libs/backlog-front/src/routes/dashboard/kanban.ts` (model `loadActiveSprint(projectId)` + `loadAllByProject` pour le filtre Mes).
- Créer `@libs/backlog-front/src/templates/dashboard/kanban.gts` (page entière).
- Retirer le placeholder dans `@libs/shell-front/src/templates/dashboard/kanban.gts` (pattern P5).
- Mettre à jour `package.json` de `backlog-front` (`app-js` entries).

### D7. Composants à créer
1. `KanbanColumn` (`kanban-column.gts`) — props : `@status: TaskStatus`, `@tasks: Task[]`, `@onMoveTask: (id, status) => void`, `@onOpenTask: (task) => void`. Affiche header + liste de TaskCard kanban.
2. `KanbanBoard` (`kanban-board.gts`) — props : `@tasks: Task[]`, `@onMoveTask`, `@onOpenTask`. Affiche 5 colonnes côte à côte (grid-cols-5).
3. `SprintHeader` (`sprint-header.gts`) — props : `@sprint: Sprint`, `@tasksCount: number`, `@pointsCompleted: number`. Affiche meta sprint + nav buttons disabled.
4. `KanbanFilters` (`kanban-filters.gts`) — props : `@value: 'mine' | 'all'`, `@onChange`. Toggle radio.

### D8. Schema Sprint (typage seulement, pas de schema WarpDrive)
Pas besoin d'enregistrer le schema dans le store global P7 car on bypass cache via `fetch` direct (pattern [[feedback-warpd-schemas-global]] confirmé en P6). On définit juste un type TS `Sprint` :

```typescript
export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string;
  startDate: string; // ISO
  endDate: string;
  status: 'planned' | 'active' | 'completed';
}
```

P8 sortira un schema WarpDrive complet + enregistrement dans le store.

### D9. MSW mocks à enrichir
- Ajouter `mockSprints` : 1 sprint actif pour `proj-1` (+ 1 sprint planned pour démontrer le filtre status, bonus).
- Handlers : `GET /api/v1/projects/:id/sprints`, `GET /api/v1/sprints/:id`, `GET /api/v1/sprints/:id/tasks`.
- 5 tasks dans `mockTasks` doivent avoir `sprintId: 'sprint-1'` pour peupler le board. Vérifier les mocks P5 (task-10..14 sont sur sprint-1 ✓ — pas de modif requise).

### D10. i18n
Étendre `@apps/front/translations/backlog/{fr-fr,en-us}.yaml` avec :
- `backlog.kanban.columns.{todo,in-progress,testing,uat,done}` — labels colonnes.
- `backlog.kanban.filters.{all,mine}` — toggle.
- `backlog.kanban.sprintHeader.{points,completion,navPrev,navNext,navDisabled,goalLabel}`.
- `backlog.kanban.dragHint` — tooltip drop zone.
- `backlog.kanban.cardCount` — `"{count} cartes"`.

Pas de namespace dédié `kanban/` — on reste sous `backlog/` puisque pas de lib séparée.

### D11. Tests
Pattern P5+P6 :
- **Unit** : `kanban-board-test` smoke (rendu 5 colonnes vides).
- **Integration** :
  - `kanban-column-test` × 1 : rendu 2 tasks, header avec compteur.
  - `kanban-board-test` × 1 : 5 colonnes répartissent les tasks selon status.
  - `sprint-header-test` × 1 : rendu sprint avec dates, points, goal.
  - `kanban-filters-test` × 1 : toggle déclenche `@onChange`.
  - `tasks-service-update-test` × 1 : `update(id, partial, { refresh: false })` ne fait pas le reload (signature nouvelle).
  - `kanban-template-test` × 1 : route model branche le service correctement.
- Total : ≥ 6 nouveaux tests. Suite cible : 39+ (33 P5+P6 + 6 P7).

⚠️ Drag-drop natif HTML5 est **difficile à tester** sans Playwright (vitest browser ne simule pas les DataTransfer correctement). On laisse l'implémentation testée manuellement + en P13 via E2E Playwright.

### D12. Pas de E2E Playwright en P7
Comme P5/P6. P13 reprend tous les E2E.

---

## 3. Architectural Context

### Communautés touchées (graphify)
- **`@libs/backlog-front`** (enrichissement P7)
- **`@libs/shell-front`** (retrait placeholder kanban)
- **Backend Scrum domain** : non touché (tout existe déjà — `Tasks PATCH /status`, `Sprints GET`)

### God nodes potentiellement modifiés
- ⚠️ `Modal: Nouvelle tâche` (13 edges) : utilisé par bouton optionnel `+ Add task` Kanban — pas modifié, juste consommé.
- ⚠️ `TasksService` : ajout d'un overload `update(id, partial, opts)` — vérifier que les callers P6 (AddTaskModal POST→refresh) restent corrects.
- ❌ `makeSingleJsonApiTopDocument` : non touché.

### Contrats transverses à risque
- **`current-project`** : Kanban lit `currentProjectId` (idem P4/P5/P6 — pas de changement).
- **`current-user`** : Kanban lit `currentUser.id` pour filtre `Mes tâches` — vérifier que `@libs/users-front/services/current-user` expose bien `.id`.

---

## 4. Découpage en tâches

### P7.0 — Audit & branchement (≈ 15 min)
- Vérifier que P6 est mergée dans `dev` (PR #9).
- Créer `feat/p7-kanban-front` depuis `dev`.
- Confirmer que `current-user.id` est exposé côté front.

### P7.1 — TasksService.update overload + Sprint type (≈ 30 min)
- Modifier `services/tasks.ts` : `update(id, partial, opts: { refresh?: boolean } = { refresh: true })`. Default `true` (rétro-compat P6).
- Créer `schemas/sprints.ts` avec type `Sprint` exporté.

### P7.2 — MSW mocks sprints (≈ 30 min)
- Ajouter `MockSprint` type + `mockSprints` (1 active + 1 planned).
- 3 handlers : `GET /projects/:id/sprints`, `GET /sprints/:id`, `GET /sprints/:id/tasks`.

### P7.3 — Composants Kanban — colonnes & board (≈ 1h30)
- `kanban-column.gts` (header avec titre i18n + compteur + dropzone + liste TaskCard).
- `kanban-board.gts` (grid 5 colonnes, pass-through callbacks).
- TaskCard `@variant="kanban"` étendue : ajouter `@draggable={{true}}` + `{{on "dragstart" ...}}` qui set `dataTransfer`.
- Tests intégration : kanban-column + kanban-board (rendu uniquement, sans drag-drop).

### P7.4 — Drag-drop wiring (≈ 1h)
- KanbanColumn écoute `dragover` (preventDefault) + `drop` (lit `dataTransfer.getData('text/plain')`).
- KanbanBoard `@action onMoveTask(taskId, newStatus)` : optimistic mutation + `tasksService.update(id, { status }, { refresh: false })`. Catch erreur → rollback + alert.
- Test manuel (Playwright MCP screenshot avant/après drop). Pas de test integration (DataTransfer non simulable).

### P7.5 — Sprint header (≈ 45 min)
- `sprint-header.gts` : layout figma (name + dates + goal + points completion bar + nav buttons disabled).
- `pointsCompleted` calculé : `tasks.filter(t => t.sprintId === sprint.id && t.status === 'done').reduce((s, t) => s + t.points, 0)`.
- `pointsTotal` : `tasks.filter(t => t.sprintId === sprint.id).reduce(...)`.
- Test intégration : 1.

### P7.6 — KanbanFilters (≈ 30 min)
- `kanban-filters.gts` : toggle radio `Mes tâches` / `Toutes les tâches`.
- `@onChange(filter)` callback.
- Template Kanban applique le filtre côté client.
- localStorage persistance via util simple.
- Test intégration : 1.

### P7.7 — Route /kanban + template (≈ 1h)
- `routes/dashboard/kanban.ts` : model() = `{ project, sprint, tasks }` (toutes les tasks du sprint actif, fallback toutes les tasks du projet si pas de sprint).
- `templates/dashboard/kanban.gts` : SprintHeader + KanbanFilters + KanbanBoard. Wire `@onOpenTask` → `TaskDetailModal`.
- Retirer placeholder dans `@libs/shell-front/src/templates/dashboard/kanban.gts` + `routes/dashboard/kanban.ts`.
- Mettre à jour `@apps/front/app/routes/application.ts` (les handlers MSW backlog sont déjà initialisés).

### P7.8 — i18n (≈ 30 min)
- Yaml `@apps/front/translations/backlog/{fr-fr,en-us}.yaml` étendu avec sous-section `kanban.*`.
- Translations dans `tests/app.ts` (objet `BACKLOG_FR.backlog.kanban`).
- Wiring `{{t "backlog.kanban.*"}}` partout.

### P7.9 — Lint + tests + visual + commit (≈ 45 min)
- `pnpm lint` vert : `@libs/backlog-front`, `@libs/shell-front`, `@apps/front`.
- `pnpm test` vert : ≥ 39 tests (33 + 6 P7).
- Sanity check : forcer un fail (cf. `[[feedback-tests-sanity]]`).
- Validation visuelle Playwright MCP : `/kanban` route avec 5 colonnes + drag-drop manuel (screenshot avant/après).
- Plan déplacé `specs/todo/ → specs/done/`.

### P7.10 — PR + handoff (≈ 15 min)
- Push `feat/p7-kanban-front`.
- `gh pr create --base dev` avec checklist.
- Handoff `specs/handoffs/009-*.md`.

---

## 5. Stratégie de test

### Tests unitaires
1 test smoke sur `KanbanBoard` (rendu 5 colonnes vides).

### Tests intégration (rendering) — **bloquants, pas substituables**
Total cible : **≥ 6 nouveaux**.
- `kanban-column-test` : 1 test (rendu tasks + compteur).
- `kanban-board-test` : 1 test (répartition par status).
- `sprint-header-test` : 1 test (rendu meta + barre progress).
- `kanban-filters-test` : 1 test (toggle change).
- `tasks-service-test` : 1 test (update avec `refresh: false`).
- `kanban-template-test` : 1 test (route model branchement).

### Vérification visuelle manuelle (Playwright MCP)
- `/kanban` 5 colonnes avec tasks réparties → `p7-kanban-board.png`.
- Drag-drop "Page de connexion" task-10 de `Done` vers `In progress` → screenshot avant + après. Vérifier optimistic update visible.
- Toggle `Mes tâches` → cartes filtrées (≤ originel).

### Sanity check
Bloquant : forcer un fail avant d'annoncer "tests verts" (cf. `[[feedback-tests-sanity]]`).

### Drag-drop : risque test
Le DataTransfer natif est mal simulé par jsdom et vitest-browser. On accepte que P7 n'a pas de test integration drag-drop ; la vérification visuelle Playwright MCP (drop manuel ou via `page.dragTo`) est la garantie. Cette dette est explicite : E2E drag-drop sera couvert en P13.

---

## 6. Critères de succès (numérotés, vérifiables)

1. **TasksService.update overload** : signature `update(id, partial, opts?: { refresh?: boolean })` ajoutée, P6 callers (AddTaskModal) restent inchangés (default `refresh: true`).
2. **Type Sprint exporté** depuis `@libs/backlog-front/src/schemas/sprints.ts`.
3. **MSW sprints handlers** : `GET /projects/:id/sprints`, `GET /sprints/:id`, `GET /sprints/:id/tasks` répondent JSON:API valid. 1+ sprint mocké pour `proj-1` (active).
4. **KanbanColumn** : header avec titre i18n + compteur cartes, liste de TaskCard kanban variant.
5. **KanbanBoard** : 5 colonnes côte à côte (`todo`, `in-progress`, `testing`, `uat`, `done`), tasks réparties par `task.status`.
6. **TaskCard draggable** : `@draggable={{true}}` ajoute `draggable=true` + `dragstart` qui store `task.id` dans `dataTransfer`.
7. **Drag-drop fonctionnel** : drag d'une card depuis une colonne et drop dans une autre déclenche `tasksService.update(id, { status }, { refresh: false })`. Optimistic update visible immédiatement.
8. **Rollback** : si l'update API échoue (mock simulé via PATCH avec un id non-existant), le status revient à l'état précédent + alerte temporaire.
9. **SprintHeader** : affiche nom, dates, goal, `X/Y pts • Z% complete`, boutons nav disabled avec tooltip P8.
10. **KanbanFilters** : toggle `Mes tâches`/`Toutes les tâches`, persistance localStorage, filtre côté client appliqué sur les tasks.
11. **Route `/kanban`** : route déclarée dans `@libs/backlog-front` (pas plus dans shell-front), affiche SprintHeader + Filters + Board + TaskDetailModal au clic.
12. **Placeholder retiré** : `@libs/shell-front/src/templates/dashboard/kanban.gts` + `routes/dashboard/kanban.ts` supprimés.
13. **i18n wiring complet** : aucune string FR hardcodée. Yaml FR+EN à jour.
14. **`pnpm lint` vert** : `@libs/backlog-front`, `@libs/shell-front`, `@apps/front`.
15. **`pnpm test` vert** : ≥ 39 tests (33 + 6 P7).
16. **Sanity check** : fail forcé détecté.
17. **Validation visuelle** : 2 screenshots minimum dans `specs/review-screenshots/` :
    - `p7-kanban-board.png` (5 colonnes peuplées)
    - `p7-kanban-drag-drop.png` (après un drag-drop, status visible changé)
18. **Plan déplacé** : `specs/todo/p7-kanban-front.md → specs/done/p7-kanban-front.md`.
19. **PR créée** : `gh pr create --base dev` avec checklist + référence plan.
20. **Handoff écrit** : `specs/handoffs/009-*.md` documente livraison + dettes (drag-drop backlog↔sprints P8, navigation sprints P8, édition inline P12, mobile touch P12, test E2E drag-drop P13).

---

## 7. Risques & mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Drag-drop natif HTML5 inutilisable sur mobile (pas de touch events) | Mobile cassé | Documenter limitation, ajouter en P12 (lib `@dnd-kit` ou similaire). E2E P13 desktop only. |
| Optimistic update + rollback mal géré → état UI désynchronisé | Bug visible | Tests manuels rigoureux ; en P13 E2E intentionnellement provoquer un fail PATCH. |
| `TasksService.update` cassé pour callers P6 | Régression | `refresh: true` reste le défaut. Tests P6 doivent rester verts (24+9=33). |
| Mock sprint stub : interface diverge de P8 réelle | Refacto en P8 | Définir le type `Sprint` proche du backend `@libs/scrum-backend/src/sprint.entity.ts` ; P8 reprend ce contrat. |
| `dataTransfer.setData` / `.getData` polyfills incomplets en jsdom | Test impossible | Accepter — pas de test intégration drag-drop. Validation manuelle Playwright. |
| Filtre `Mes tâches` via `createdById` ≠ vrais assignees | UX confuse | Ajouter tooltip "Tâches créées par vous (assignees P12)". |

---

## 8. Notes annexes

- **Mémoires à respecter** :
  - `[[feedback-tests-sanity]]` — sanity check obligatoire.
  - `[[feedback-warpd-create]]` — appeler `loadAllByProject` (déjà géré par `update(refresh:true)`).
  - `[[feedback-warpd-schemas-global]]` — sub-resources (sprints) **NON ajoutées** au store global tant qu'on bypass cache via fetch direct. Si P8 fait un vrai service Sprints avec store, registrer le SprintSchema dans `@apps/front/app/services/store.ts`.
  - `[[feedback-i18n-folder-namespace]]` — clés `backlog.kanban.*` car folder `backlog/` (pas de namespace dédié `kanban/`).
  - `[[feedback-lib-dist-pretest]]` — `pretest: rollup -c` déjà dans `backlog-front`.
  - `[[feedback-testapp-no-moduleregistry]]` — fake services pour tests intégration.
  - `[[feedback-success-criteria]]` — checker explicitement chaque critère §6 avant `done/`.
- **Parallélisation** (cf. P6 expérience réussie) :
  - **Vague A** parallèle (P7.1 + P7.2) — fichiers disjoints (`services/tasks.ts` vs `http-mocks/backlog.ts`).
  - **Vague B** parallèle (P7.3 + P7.5 + P7.6) — composants indépendants (`kanban-column`, `sprint-header`, `kanban-filters`).
  - **Vague C** séquentielle (P7.4 puis P7.7) — drag-drop + route dépendent des composants.
  - **Path critique** : P7.0 → P7.1 → P7.3 → P7.4 → P7.7 → P7.9 → P7.10.
- **Branchement Git** : `feat/p7-kanban-front` depuis `dev` après merge PR #9.

---

## 9. Estimation totale

≈ **6-8 heures de dev focalisé**, hors review/itérations. Gain de parallélisation attendu : ~2h sur la vague B.

Phases parallélisables :
- P7.1 + P7.2 (vague A).
- P7.3 + P7.5 + P7.6 (vague B).
- P7.4 (drag-drop) doit suivre P7.3.
- P7.7 (route) doit suivre P7.3 + P7.5 + P7.6.
