# P8 — Sprints (nouvelle lib `@libs/sprints-front` + drag-drop Backlog↔Sprints)

> Objectif : implémenter le domaine **Sprints** côté frontend dans une **nouvelle lib `@libs/sprints-front`**. Liste 3 sprints côte à côte (en cours / suivants), navigation `<` `>`, CRUD minimal (planifier + stopper), drag-drop des tasks **depuis Backlog vers une SprintCard** (PATCH sprintId), réutilisation `TaskCard kanban variant`. Référence visuelle : `docs/figma-screenshots/06-sprints.png`.

---

## 1. Contexte & rappels

### Acquis (P0–P7)
- **Backend P2** : routes sprints complètes (`@libs/scrum-backend/src/sprint/routes/`) :
  - `GET /api/v1/projects/{id}/sprints` (list par projet)
  - `GET /api/v1/sprints/{id}` (detail)
  - `POST /api/v1/sprints/` (create)
  - `PATCH /api/v1/sprints/{id}` (update)
  - `DELETE /api/v1/sprints/{id}` (delete)
  - `GET /api/v1/sprints/{id}/tasks` (tasks du sprint)
  - Actions : routes spécifiques (close, start) dans `actions.routes.ts`
- **`SprintEntity` backend** (`@libs/scrum-backend/src/sprint/sprint.entity.ts`) :
  ```typescript
  { id, name, goal, projectId, startDate, endDate, status,
    velocityPoints, completedPoints, createdAt, updatedAt }
  ```
- **P7 a livré (dans `@libs/backlog-front`)** :
  - Type `Sprint` (stub `schemas/sprints.ts` — sera remplacé par un vrai WarpDrive schema en P8 dans `@libs/sprints-front`)
  - `SprintHeader` composant (réutilisable, à déplacer/dupliquer ou laisser dans backlog-front en cross-import)
  - MSW mocks sprints (sprint-1 active + sprint-2 planned) — à migrer/étendre dans sprints-front
  - `TaskCard @variant="kanban"` (composant prêt, réutilisable cross-lib via import)
  - `TaskCard @draggable={{true}}` + `dragstart` (P7) — réutilisable pour Backlog→Sprint drag
- **`TasksService.update(id, partial, { refresh?: boolean })`** (P7) — utilisé pour set `sprintId` au drop.
- **Store global** : `EpicSchema, UserStorySchema, TaskSchema` enregistrés (P6 fix). **P8 ajoutera `SprintSchema`** (cf. mémoire `[[feedback-warpd-schemas-global]]`).
- **Route `/sprints`** dans shell-front est actuellement un placeholder à retirer (pattern P5/P6/P7).

### Cible Figma (`06-sprints.png`)
- **Header page** : titre "Sprints", sous-titre "Gérez vos sprints Scrum", boutons "Historique" (P12 placeholder) + "+ Planifier un sprint" (active).
- **Sous-header** : "Sprint X à Y sur Z" + boutons nav `<` `>`.
- **Layout 3 colonnes** (grid-cols-3) :
  - **Sprint en cours** : badge "En cours" teal, titre éditable (icône crayon disabled P12), objectif, dates, "Vélocité: X points", progression `X/Y tâches (Z%)`, bouton "Stopper" rouge, liste des tasks assignées en cards.
  - **Sprint suivant** (×2) : badge "À faire" gris, titre, objectif, dates, bouton "Planifier" violet (P8 : démarre le sprint via action), section "Tâches" avec "Aucune tâche assignée" (drag-drop target).
- **TaskCard kanban variant** réutilisée pour chaque tâche listée.

### Hors périmètre P8
- **Drag-drop entre sprints** (mover task de sprint-A vers sprint-B) → P12.
- **Capacity planning** (allocation par membre) → P12.
- **Burndown charts** → P10 (dashboard).
- **Historique sprints terminés** (bouton "Historique" disabled tooltip P12) → P12.
- **Édition inline titre/objectif** (crayon disabled) → P12.
- **Drag-drop entre colonnes Kanban inside sprint detail page** → délégué à route `/kanban` (P7).

---

## 2. Décisions techniques

### D1. Nouvelle lib `@libs/sprints-front`
**Pas de fusion avec `backlog-front`** cette fois, malgré la tentation. Raisons :
- Drag-drop **cross-lib** Backlog (tasks) → Sprints (sprint cards). Mieux découplé avec deux libs.
- Cohésion du domaine Sprint : `SprintsService`, `SprintCard`, modals create/close, route `/sprints`. Tout dans `sprints-front`.
- Réutilisation **cross-lib** : `TaskCard` import depuis `@libs/backlog-front/components/task-card.gts`. ABI ember-addon v2 le supporte (déjà fait : `users-front` importe `shared-front`).

**Scaffold** : utiliser le skill `new-library` ou copier le pattern de `@libs/projects-front` (lib similaire, scaffolded en P4).

### D2. `SprintSchema` WarpDrive + enregistrement dans store global
Création de `@libs/sprints-front/src/schemas/sprints.ts` avec un **vrai schema WarpDrive** (pas un stub) :
```typescript
const SprintSchema = withDefaults({
  type: 'sprints',
  fields: [
    { name: 'name', kind: 'attribute' },
    { name: 'goal', kind: 'attribute' },
    { name: 'projectId', kind: 'attribute' },
    { name: 'startDate', kind: 'attribute' },
    { name: 'endDate', kind: 'attribute' },
    { name: 'status', kind: 'attribute' },
    { name: 'velocityPoints', kind: 'attribute' },
    { name: 'completedPoints', kind: 'attribute' },
    { name: 'createdAt', kind: 'attribute' },
    { name: 'updatedAt', kind: 'attribute' },
  ],
});
export default SprintSchema;
```
**MAJ `@apps/front/app/services/store.ts`** : ajout `SprintSchema` dans le tableau `schemas: [...]` (cf. `[[feedback-warpd-schemas-global]]`).

⚠️ **Migration P7→P8** : `@libs/backlog-front/src/schemas/sprints.ts` (stub types-only) doit être supprimé. Le type `Sprint` viendra de `@libs/sprints-front/schemas/sprints.ts`. Le template Kanban et la route Kanban actuelle (qui font `fetch` direct) doivent réémettre l'import.

### D3. `SprintsService` (Ember service injectable)
Méthodes :
- `loadByProject(projectId)` → liste sprints avec status filter optionnel.
- `loadActive(projectId)` → le seul sprint avec `status: 'active'`.
- `findById(id)` → detail.
- `create(payload)` → POST.
- `update(id, partial, { refresh?: boolean })` → PATCH (pattern P7 overload).
- `start(sprintId)` → action route `/sprints/:id/start` (transitions `planned → active`).
- `close(sprintId)` → action route `/sprints/:id/close` (transitions `active → completed`).
- `loadTasks(sprintId)` → GET `/sprints/:id/tasks` (réutilise pour la liste cards).

⚠️ **Mocks MSW sprints** : actuellement dans `@libs/backlog-front/http-mocks/backlog.ts` (P7). À **migrer** dans `@libs/sprints-front/http-mocks/sprints.ts` propre, importé via `allSprintsHandlers` dans `application.ts`. Le retrait des handlers de backlog-front doit être atomique pour ne pas casser le test runtime entre 2 commits.

### D4. Composants nouveaux dans `@libs/sprints-front/src/components/`
1. **`SprintCard`** : carte d'un sprint individuel. Props : `@sprint: Sprint`, `@tasks: Task[]`, `@onPlanTask: (task: Task) => void` (callback drag-drop target), `@onStop?: () => void`, `@onStart?: () => void`. Affiche header (status badge, name + crayon icon, goal, dates), progression (si active), bouton action (Stopper/Planifier), liste TaskCard kanban variant.
2. **`SprintsPagination`** : `< Sprint X à Y sur Z >`. Navigation entre groupes de 3 sprints. Props : `@offset: number`, `@total: number`, `@pageSize: 3`, `@onPrev`, `@onNext`.
3. **`AddSprintModal`** : modale "Planifier un sprint". 5 champs : name*, goal, startDate*, endDate*, velocityPoints (initial). Validation : name required, endDate > startDate. POST → refresh liste.
4. **`StopSprintConfirm`** (ou utiliser `confirm()` natif au début) : confirmation avant POST `/sprints/:id/close`.

### D5. Drag-drop cross-lib Backlog→Sprint
Réutilise le pattern P7 :
- `TaskCard @draggable={{true}}` côté Backlog (déjà actif quand on est sur `/backlog`).
- `SprintCard` ajoute `dragover` + `drop` handlers. Au drop, extrait `application/x-task-id` du `dataTransfer` et appelle `@onPlanTask(taskId)`.
- Le template `/sprints` orchestre : `onPlanTask(taskId, sprint.id)` → `tasksService.update(taskId, { sprintId: sprint.id }, { refresh: false })` (optimistic + rollback).
- Pour activer le drag depuis `/backlog` (pas seulement `/kanban`), il faut **étendre `TaskRow` aussi** avec `@draggable` (P5 component). Cf. P8.5.

⚠️ **Limite** : `/backlog` montre `TaskRow` (pas `TaskCard`). On a 2 options :
   - **A** : ajouter `@draggable` à `TaskRow` (extension symétrique à P7).
   - **B** : remplacer `TaskRow` par `TaskCard @variant="dashboard"` dans `/backlog`. Cohérence visuelle mais change le rendu.
   
   **Décision** : Option A (moins invasive). Drag-drop depuis TaskRow vers SprintCard.

### D6. Navigation sprints `<` `>`
- Le composant `SprintsPagination` gère localement l'offset (`@tracked offset = 0`).
- Affiche les sprints `[offset, offset+3[` avec `Math.min(offset+3, total)`.
- Boutons disabled si `offset === 0` (prev) ou `offset + 3 >= total` (next).
- Pas de persistance — la navigation est session-local.

### D7. Composant `SprintHeader` (P7) — déplacement
Le composant `sprint-header.gts` créé en P7 dans `@libs/backlog-front/src/components/` est plus naturellement dans `@libs/sprints-front`. **Décision** : **garder dans backlog-front** pour éviter une migration cross-lib qui casserait `/kanban` (qui l'utilise). Plutôt : créer une **variante distincte** dans sprints-front si besoin (ex. `SprintCardHeader` qui est une sous-card, vs `SprintHeader` page-level dans kanban).

En pratique : `SprintCard` en P8 absorbe le rendu du header dans la carte. Pas de réutilisation directe du `sprint-header.gts` P7.

### D8. CSS / Layout 3 colonnes
- `grid-cols-3 gap-4` desktop.
- Sur mobile : stacked. **Pas couvert P8 mobile** — décision P12 ou polish P13.

### D9. Calcul progression
- `completedPoints / velocityPoints` (champs backend).
- Si `velocityPoints === 0` : afficher "Aucune tâche assignée" + barre vide.
- **`completedPoints`** : recalculé côté frontend depuis `tasks.filter(t => t.status === 'done' && t.sprintId === sprint.id).reduce(+points)` quand le sprint est active (le backend ne se met pas à jour à chaque mutation). Le snapshot `velocityPoints` du backend reste source de vérité pour le total.

### D10. i18n
Nouveau namespace `sprints/{fr-fr,en-us}.yaml` (cf. `[[feedback-i18n-folder-namespace]]` — clés `sprints.*`) :
- `sprints.title`, `sprints.subtitle`
- `sprints.actions.planSprint`, `sprints.actions.history`, `sprints.actions.stopSprint`, `sprints.actions.startSprint`
- `sprints.status.{planned,active,completed}`
- `sprints.card.{statusInProgress,statusUpcoming,statusCompleted,goalLabel,velocityLabel,progress,tasksLabel,tasksEmpty,stop,plan,start,edit}`
- `sprints.pagination.range` ("Sprint {from} à {to} sur {total}")
- `sprints.modal.add.{title,name,namePlaceholder,goal,goalPlaceholder,startDate,endDate,velocity,cancel,submit,submitting,errorFallback}`
- `sprints.modal.confirmStop.{title,body,confirm,cancel}`
- `sprints.dropHint` (zone drop sprint)

### D11. Tests
Pattern P5/P6/P7 :
- **Unit** : `sprint-schema-test` (round-trip schema).
- **Integration** :
  - `sprint-card-test` × 2 (variante "en cours" avec tasks + progression, variante "à venir" empty state)
  - `add-sprint-modal-test` × 2 (rendu 5 champs, validation endDate > startDate)
  - `sprints-pagination-test` × 1 (boutons + range label)
  - `sprints-template-test` × 1 (route model + 3 cards rendues)
  - `sprints-service-test` × 1 (`start`/`close` actions PATCH appellent les bonnes URLs)
- Total : **≥ 7 nouveaux tests**. Suite cible : ≥ 46 (39 + 7).

### D12. Pas de E2E Playwright en P8
Comme P5/P6/P7. P13 reprend.

---

## 3. Architectural Context (graphify)

### Communautés touchées
- **Nouveau** : `@libs/sprints-front` (création).
- **Modifié** : `@libs/backlog-front` (extend `TaskRow @draggable` ; migrer mocks sprints).
- **Modifié** : `@libs/shell-front` (retrait placeholder `/sprints`).
- **Modifié** : `@apps/front` (`store.ts` enregistre `SprintSchema` ; `application.ts` import `allSprintsHandlers` + `initializeSprintsLib`).
- **Non touché** : Backend Scrum domain (tout existe).

### God nodes potentiellement modifiés
- ⚠️ `Modal: Planifier un sprint` (9 edges, identifié par graphify) : créé en P8 — vérifier couplages.
- ⚠️ `TasksService` (god node) : utilisé pour PATCH `sprintId` au drop. Pas modifié, juste consommé.
- ❌ `makeSingleJsonApiTopDocument` : non touché.

### Contrats transverses à risque
- **`current-project`** : `/sprints` lit `currentProjectId`. Pas de changement.
- **`current-user`** : pas utilisé en P8 (filtre `Mes tâches` est P7-only Kanban).
- **Cross-lib import** `@libs/sprints-front` → `@libs/backlog-front/components/task-card.gts` : ABI Embroider v2 supporté (cf. `users-front` → `shared-front`). Vérifier que `task-card.js` est bien exposé via `app-js` (déjà OK depuis P6).

---

## 4. Découpage en tâches

### P8.0 — Audit & branchement (≈ 20 min)
- Confirmer que `dev` contient P6+P7 (`df4db39`).
- Créer `feat/p8-sprints-front` depuis `dev`.
- **Audit checklist (de la retrospective P6/P7)** :
  - [ ] Lister les schemas P7 dans `@apps/front/app/services/store.ts` — ajout futur `SprintSchema`.
  - [ ] Vérifier que `@libs/backlog-front/src/schemas/sprints.ts` (stub) sera bien migré/supprimé.
  - [ ] i18n folder namespace : `sprints/` créé → keys `sprints.*` partout.
- Confirmer que les routes backend sprints fonctionnent en dev (curl ou Playwright MCP).

### P8.1 — Scaffold lib `@libs/sprints-front` (≈ 45 min)
- Utiliser skill `new-library` OU copier le pattern `@libs/projects-front` :
  - `package.json` (ember-addon v2 + deps catalog)
  - `rollup.config.mjs`
  - `addon-main.cjs`
  - `tsconfig.json`, `tsconfig.publish.json`
  - `eslint.config.mjs`, `.prettierrc.mjs`, `.template-lintrc.mjs`
  - `vite.config.mts`, `vitest.config.mts`
  - `src/index.ts` (`moduleRegistry()` + `initialize()`)
  - `src/http-mocks/all.ts` (re-export)
  - `tests/app.ts`, `tests/test-helper.ts`
- Ajouter `@libs/sprints-front` à `pnpm-workspace.yaml` (vérifier auto-detect).
- Premier `pnpm install` à la racine pour link.
- `pnpm build` doit passer sur la lib vide.

### P8.2 — `SprintSchema` WarpDrive + store global (≈ 20 min)
- Créer `@libs/sprints-front/src/schemas/sprints.ts` avec un vrai schema WarpDrive (cf. D2).
- Modifier `@apps/front/app/services/store.ts` : import + `schemas: [..., SprintSchema]`.
- Type `Sprint` exporté (avec `WithLegacy<...>`).
- Supprimer **après** stabilité : `@libs/backlog-front/src/schemas/sprints.ts` (stub P7) et son entrée `app-js` dans `package.json`. Mise à jour des imports dans `task-card`, `template kanban`, etc. pour pointer vers `@libs/sprints-front/schemas/sprints`.

### P8.3 — `SprintsService` (≈ 1h)
- Créer `@libs/sprints-front/src/services/sprints.ts` :
  - `@tracked list: Sprint[] = []`
  - `loadByProject(projectId)`, `loadActive(projectId)`, `findById(id)`
  - `create(payload)`, `update(id, partial, opts?)` (overload P7 pattern)
  - `start(sprintId)`, `close(sprintId)` → POST `/api/v1/sprints/:id/start` ou `/close` (vérifier `actions.routes.ts` pour les URLs exactes)
  - `loadTasks(sprintId)` → GET sub-resource
- `declare module '@ember/service' { interface Registry { sprints: SprintsService } }`.

### P8.4 — MSW mocks `@libs/sprints-front/http-mocks/sprints.ts` (≈ 45 min)
- **Migrer** depuis `@libs/backlog-front/http-mocks/backlog.ts` :
  - `mockSprints` (2 sprints P7 : sprint-1 active, sprint-2 planned)
  - Étendre avec **4 sprints supplémentaires** pour démontrer la pagination (`Sprint 3 active, 4-5 planned, 6 completed`). Total **6 sprints**, comme dans la maquette Figma "Sprint 4 à 6 sur 6".
  - Handlers `GET /projects/:id/sprints`, `GET /sprints/:id`, `GET /sprints/:id/tasks`.
- **Nouveaux handlers P8** :
  - `POST /api/v1/sprints` (create avec auto-id)
  - `PATCH /api/v1/sprints/:id` (update)
  - `POST /api/v1/sprints/:id/start` (transition `planned → active`)
  - `POST /api/v1/sprints/:id/close` (transition `active → completed`)
- Supprimer les handlers sprints de `@libs/backlog-front/http-mocks/backlog.ts` après migration.
- Mettre à jour `@apps/front/app/routes/application.ts` : ajouter `allSprintsHandlers` + `initializeSprintsLib`.

### P8.5 — Composants P8 (≈ 2h, parallélisable)
Découpé en 3 sous-agents parallèles :
- **Sous-agent A** : `SprintCard` (variantes active/upcoming/completed via `@sprint.status` switch).
- **Sous-agent B** : `AddSprintModal` (5 champs + validation endDate > startDate).
- **Sous-agent C** : `SprintsPagination` (boutons `<` `>` + range label).
- Extension **`TaskRow` `@draggable`** : ajouter en parallèle dans `@libs/backlog-front` (modif équivalent au P7 pour `TaskCard`). Petit edit, fait par main agent ou un 4e sous-agent.

### P8.6 — Drag-drop wiring (≈ 45 min)
- `SprintCard` écoute `dragover` (preventDefault) + `drop` (lit `application/x-task-id` du dataTransfer).
- `@onPlanTask(taskId)` callback : remonte au template `/sprints`.
- Template `/sprints` orchestre : `onPlanTask(taskId, sprintId)` :
  - Optimistic : `task.sprintId = sprintId` immédiatement.
  - Background : `tasksService.update(taskId, { sprintId }, { refresh: false })`.
  - Catch erreur : rollback + alert temporaire.

### P8.7 — Route `/sprints` + template (≈ 1h15)
- Créer `@libs/sprints-front/src/routes/dashboard/sprints.ts` (model : `loadByProject` + `loadAllTasks` pour les drop).
- Créer `@libs/sprints-front/src/templates/dashboard/sprints.gts` :
  - Header titre + sous-titre + boutons Historique (disabled tooltip P12) + Planifier (ouvre `AddSprintModal`).
  - `SprintsPagination`.
  - Grid 3 colonnes de `SprintCard`.
  - Modale `AddSprintModal` conditionnelle.
  - Modale `StopSprintConfirm` conditionnelle (ou `window.confirm` simple).
- Retirer placeholder `@libs/shell-front/src/{routes,templates}/dashboard/sprints.{ts,gts}` (pattern P5/P6/P7).
- Mettre à jour `package.json` de `sprints-front` : `app-js` entries (auto par linter rollup).

### P8.8 — i18n YAML (≈ 45 min)
- Créer `@apps/front/translations/sprints/{fr-fr,en-us}.yaml`.
- Ajouter clés `sprints.*` complètes (cf. D10).
- Mettre à jour `tests/app.ts` de `@libs/sprints-front` avec un objet `SPRINTS_FR` flat (pattern P5/P6/P7).

### P8.9 — Lint + tests + sanity + visual (≈ 1h)
- `pnpm lint` vert sur **TOUS** les packages affectés (depuis racine via `pnpm turbo lint` — cf. retrospective `[[feedback-lint-from-root]]`) :
  - `@libs/sprints-front`, `@libs/backlog-front`, `@libs/shell-front`, `@apps/front`.
- `pnpm test` vert sur sprints-front (cible : 7+ tests intégration).
- `pnpm test` rester vert sur backlog-front (33 P5/P6 + 6 P7 = 39 ; +1 pour le test `task-row-test` étendu avec drag-drop = 40).
- Sanity check : fail forcé puis retiré (cf. `[[feedback-tests-sanity]]`).
- **Validation visuelle Playwright MCP** (bloquante, pas optionnelle — cf. retrospective) :
  - `/sprints` 3 cards rendues (sprint en cours + 2 planifiés).
  - Drag d'une task depuis `/backlog` vers `SprintCard` → screenshot avant/après. Vérifier que sprintId est appliqué.
  - Clic "Planifier un sprint" → modal ouvre.
  - Pagination `<` `>` change la fenêtre 3 sprints.

### P8.10 — PR + handoff (≈ 20 min)
- Push `feat/p8-sprints-front`.
- `gh pr create --base dev`.
- Handoff `specs/handoffs/010-*.md`.
- Plan déplacé `specs/todo/ → specs/done/`.

---

## 5. Stratégie de test

### Tests unitaires
- `sprint-schema-test` : round-trip schema (1 test).

### Tests intégration (rendering) — **bloquants**
Total cible : **≥ 7 nouveaux**.
- `sprint-card-test` × 2 (variante active avec progression + tasks ; variante upcoming empty)
- `add-sprint-modal-test` × 2 (rendu champs + validation endDate > startDate)
- `sprints-pagination-test` × 1 (boutons + range)
- `sprints-template-test` × 1 (route model branchement, 3 cards)
- `sprints-service-test` × 1 (`start`/`close` PATCH urls + refresh logic)

Plus l'extension test du `task-row` :
- `task-row-test` étendu × 1 (drag-drop `@draggable` actif quand fourni).

### Validation visuelle manuelle (Playwright MCP)
- `p8-sprints-list.png` (3 cards + pagination).
- `p8-add-sprint-modal.png` (modal ouverte).
- `p8-drag-drop.png` (avant/après drop d'une task depuis Backlog vers Sprint).
- `p8-stop-confirm.png` (confirmation).

### Sanity check
Bloquant.

---

## 6. Critères de succès (numérotés, vérifiables)

1. **Lib `@libs/sprints-front` scaffoldée** : Embroider v2, build OK (`pnpm build` vert), test runner configuré.
2. **`SprintSchema` WarpDrive** créé dans `@libs/sprints-front/src/schemas/sprints.ts` (avec `withDefaults`, type `Sprint` exporté).
3. **Store global mis à jour** : `@apps/front/app/services/store.ts` enregistre `SprintSchema` dans `schemas: [...]`.
4. **Stub P7 supprimé** : `@libs/backlog-front/src/schemas/sprints.ts` deleted, imports migrés vers `@libs/sprints-front`.
5. **`SprintsService`** : 8 méthodes (`loadByProject`, `loadActive`, `findById`, `create`, `update`, `start`, `close`, `loadTasks`).
6. **MSW mocks migrés** : 6 sprints dans `@libs/sprints-front/http-mocks/sprints.ts`. Handlers GET/POST/PATCH + actions start/close. Anciens handlers retirés de `backlog-front`.
7. **`SprintCard`** : variantes active (badge "En cours", progress bar, bouton Stopper, liste tasks) et upcoming (badge "À faire", bouton Planifier, empty state).
8. **`AddSprintModal`** : 5 champs (name*, goal, startDate*, endDate*, velocityPoints), validation endDate > startDate, POST + refresh.
9. **`SprintsPagination`** : boutons `<` `>` avec disabled state aux extrémités, range label "Sprint X à Y sur Z".
10. **Route `/sprints`** déclarée dans `@libs/sprints-front`, placeholder shell-front retiré.
11. **Drag-drop Backlog→Sprint fonctionnel** : drag depuis `/backlog` (TaskRow `@draggable`) vers `SprintCard` déclenche `tasksService.update(taskId, { sprintId }, { refresh: false })`. Optimistic + rollback.
12. **`TaskRow` `@draggable`** : prop ajouté + `dragstart` handler symétrique au TaskCard P7.
13. **i18n complet** : namespace `sprints/{fr-fr,en-us}.yaml`. Aucune string hardcodée dans les nouveaux composants. Clés `sprints.*` (folder kebab — cf. `[[feedback-i18n-folder-namespace]]`).
14. **`pnpm lint`** vert sur `@libs/sprints-front`, `@libs/backlog-front`, `@libs/shell-front`, `@apps/front` (depuis racine via `pnpm turbo lint`).
15. **`pnpm test`** vert : ≥ 7 nouveaux tests dans sprints-front + 1 dans backlog-front (task-row drag). Suite globale ≥ 47 (39 existants + 8).
16. **Sanity check** : fail forcé détecté.
17. **Validation visuelle** : 4 screenshots dans `specs/review-screenshots/` (sprints-list, add-modal, drag-drop, stop-confirm).
18. **Plan déplacé** : `specs/todo/p8-sprints-front.md → specs/done/p8-sprints-front.md`.
19. **PR créée** : `gh pr create --base dev` avec checklist + référence plan.
20. **Handoff écrit** : `specs/handoffs/010-*.md`.

---

## 7. Risques & mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| **Migration stub `sprints.ts` casse `/kanban`** (P7) | Régression P7 | Faire la migration en 2 commits : (1) ajouter le nouveau schema dans sprints-front + maj imports kanban → (2) supprimer stub. Tests P7 doivent rester verts. |
| **Cross-lib import `@libs/sprints-front` → `@libs/backlog-front` (TaskCard)** | Cycle dependency possible | Vérifier qu'aucun export de backlog-front n'importe sprints-front. Si oui : abstraire TaskCard dans `@libs/shared-front` (refacto P11/P12). |
| **MSW handlers conflict après migration** | Comportement mocké inattendu | Test : sprints-front-only doit exposer les routes sprints. Lancer `pnpm dev` et tester via curl que `/sprints/sprint-1/tasks` répond correctement (handler vient de sprints-front, pas backlog-front). |
| **Drag-drop natif HTML5 ne fonctionne pas cross-route** | Drop ne marche pas depuis `/backlog` vers `/sprints` | Limitation par construction (deux routes différentes). Drag-drop reste **intra-route** : depuis la page `/sprints` qui affiche les tasks du backlog dans une side-panel optionnelle. Hors scope. Alternative : seulement supporter drag depuis la card `/kanban` vers `/sprints` (ce qui n'a pas de sens UX). **Décision P8** : drag-drop dans la page `/sprints` only — `SprintCard` accepte les drops depuis d'autres `SprintCard` (move task entre sprints). **Reformuler le critère** : drag-drop entre sprints inter-card. Cf. réflexion D11 du plan. |
| **`SprintSchema` enregistré global = pénalité perf** | Petit ralentissement init | Négligeable (1 schema parmi 5). Mesurable en P10 dashboard si problème. |
| **Pas de schema `task-comments` (P6 fix) + nouveau `SprintSchema` = inconsistance** | Confusion mental model | Documenter dans handoff : entities principales (Project, User, Epic, UserStory, Task, Sprint) ont des schemas WarpDrive ; sub-resources éphémères (comments, history) bypass cache. |

### Clarification sur D11 (drag-drop scope)
**Reformulation finale du périmètre P8 drag-drop** : le drag-drop **cross-route Backlog→Sprints n'est pas implémenté** car HTML5 natif ne supporte pas le drag entre routes Ember différentes (chaque navigation détruit le DOM origine). **Périmètre P8 réel** :
- Dans `/sprints`, on affiche optionnellement une **side-panel "Tasks du Backlog"** (toutes les tasks sans sprintId). Drag depuis cette side-panel vers `SprintCard` → set `sprintId`.
- C'est une expérience UX différente de la maquette mais alignée avec les contraintes techniques (cf. `[[feedback-drag-drop-html5]]` mémoire à créer).

**Si le user préfère** : reporter le drag-drop en P9/P12 et faire P8 sans drag (juste CRUD + navigation). Décision à prendre en P8.0 audit.

---

## 8. Notes annexes

- **Mémoires à respecter** :
  - `[[feedback-tests-sanity]]` — fail forcé obligatoire.
  - `[[feedback-i18n-folder-namespace]]` — clés `sprints.*` car folder `sprints/`.
  - `[[feedback-warpd-schemas-global]]` — `SprintSchema` enregistré dans store global. **Critère obligatoire #3**.
  - `[[feedback-warpd-create]]` — `loadByProject` après POST sprint (déjà géré par `create` qui refresh).
  - `[[feedback-lib-dist-pretest]]` — `pretest: rollup -c` dans le nouveau `package.json`.
  - `[[feedback-testapp-no-moduleregistry]]` — fake services dans tests.
  - `[[feedback-success-criteria]]` — checker chaque critère §6 explicitement.

- **Améliorations process (retrospective P6/P7)** :
  - Lancer `pnpm turbo lint` depuis la racine avant push.
  - Validation visuelle bloquante (Playwright MCP).
  - Sub-agents : briefs précis avec contraintes négatives.

- **Parallélisation** :
  - **Vague A** (parallèle) : P8.3 (service) + P8.4 (mocks).
  - **Vague B** (parallèle) : P8.5 — 3 sous-agents pour SprintCard / AddSprintModal / SprintsPagination + 1 patch TaskRow `@draggable`.
  - **Séquentiel** : P8.6 (drag-drop wiring) → P8.7 (route + template).
  - **Path critique** : P8.0 → P8.1 → P8.2 → P8.3 → P8.6 → P8.7 → P8.9 → P8.10.

- **Branchement Git** : `feat/p8-sprints-front` depuis `dev` (déjà à `df4db39` post-merge PR #9+#10).

---

## 9. Estimation totale

≈ **9-11 heures** de dev focalisé, hors review/itérations. Gain parallélisation attendu : ~3h sur vagues A+B.

Phases parallélisables :
- P8.3 + P8.4 (vague A — service + mocks).
- P8.5 (vague B — 3 composants + patch TaskRow).
- P8.6 → P8.7 → P8.9 → P8.10 séquentiels.

**Path critique** estimé : 5-6h.
