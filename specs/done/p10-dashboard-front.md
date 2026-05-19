# P10 — Dashboard (KPIs réels, tâches assignées au user courant, burndown optionnel)

> Objectif : remplacer le placeholder `Tableau de bord` actuel par un **dashboard fonctionnel** qui agrège les données réelles des 3 domaines (Tasks, Sprints, TimeEntries) pour le sprint actif du projet sélectionné. Layout Figma : `docs/figma-screenshots/01-dashboard.png`. KPI cards en haut (Tâches terminées / Heures travaillées / Points d'efforts), grille "Mes tâches" en dessous (TaskCard variant kanban).

---

## 1. Contexte & rappels

### Acquis (P0–P9)
- **Services existants** (à composer, pas à créer) :
  - `TasksService.loadAllByProject(projectId)` (P6) → `Task[]` (avec status, points, assignees, sprintId).
  - `SprintsService.loadActive(projectId)` (P8) → `SprintData | null`.
  - `TimeEntriesService.loadSummary(scope, projectId, userId)` (P9) → `{ totalHours, taskCount }`.
  - `TimeEntriesService.loadByUser(userId, opts)` (P9) — pour filtrer par user.
- **Composants existants à réutiliser** :
  - `TaskCard @variant="kanban"` (P6/P7) — déjà draggable, badges, assignees.
- **Route active** : `dashboard.index` rendu par `@libs/shell-front/src/templates/dashboard/index.gts` (placeholder actuel, à remplacer).
- **CurrentProject service** : `@libs/shell-front/services/current-project` expose `currentProjectId` (sélecteur projet topbar).
- **CurrentUser service** : `@libs/users-front/services/current-user` expose l'utilisateur connecté (`u1` en mock P9, vrai user P13).

### Cible Figma (`01-dashboard.png`)
- **Header** : `<h1>Tableau de bord</h1>` + sous-titre `Sprint en cours - Vos tâches assignées`.
- **3 KPI cards** (grid 3 cols, full-width) :
  1. **Tâches terminées** : `{completed}/{total}` (icône `TrendingUpIcon`).
  2. **Heures travaillées** : `{totalHours}` (icône `ClockIcon`).
  3. **Points d'efforts** : `{completedPoints}` (icône `ZapIcon`).
- **Section "Mes tâches (N)"** : titre + grille 3 colonnes de `TaskCard @variant="kanban"`. Seulement les tâches du sprint actif assignées au current user (filtre `task.assignees.includes(currentUser.id) && task.sprintId === activeSprint.id`).
- **État vide** : si pas de sprint actif → message `"Aucun sprint actif sur ce projet. Démarrez-en un depuis /sprints."`. Si sprint actif mais 0 tâches assignées → `"Aucune tâche ne vous est assignée dans ce sprint."`.

### Hors périmètre P10
- **Burndown chart** (graphique points/temps remaining vs days) → P11 (besoin d'historique par jour, pas dans les mocks actuels).
- **Sélection projet inline depuis le dashboard** → déjà géré par le topbar global (sub-header) shell-front.
- **Cards interactives** (click sur card → drill-down) → P12.
- **Filtres date custom** → P12.
- **Multi-sprint vue** → hors-périmètre (le dashboard est focalisé sur le sprint actif).
- **Realtime updates** (WebSocket) → P14.

---

## 2. Architectural Context

- **God Nodes touchés** (toucher avec précaution) :
  - `TasksService` (10 edges) — réutilisé tel quel, pas modifié.
  - `SprintForge App Shell` (14 edges) — `dashboard.index` route est rendue dedans.
- **Communities touchées** : Backlog domain, Sprints domain, TimeTracking domain — uniquement en consommation, pas de modif.
- **Cross-cutting contracts** : aucun. P10 ne modifie aucun schéma JSON:API ni service existant — c'est de la **composition pure** dans un nouveau template.
- **Risque low** : le seul fichier modifié dans une lib existante est `@libs/shell-front/src/templates/dashboard/index.gts` (le placeholder). Tout le reste est création de nouveaux composants dans `@libs/dashboard-front` (cf. macro-plan).

---

## 3. Décisions techniques

### D1. Nouvelle lib `@libs/dashboard-front`
Pattern P9 (lib add-on séparée, scaffold identique à `time-tracking-front`). Cohérence avec le macro-plan SprintForge qui liste `dashboard-front` parmi les libs prévues.

**Pas de WarpDrive schema** : le dashboard n'a pas son propre type de ressource ; il consomme `TaskSchema`, `SprintSchema`, `TimeEntrySchema` (déjà enregistrés P5–P9).

**Pas de Service propre** : la logique d'agrégation est dans le template (computed properties) car elle est purement dérivée d'autres services. Pas de state à tracker côté lib dashboard.

### D2. Composants nouveaux dans `@libs/dashboard-front/src/components/`
1. **`DashboardKpiCard`** : props `@label: string`, `@value: string | number`, `@icon: TOC<...>`. Card avec gradient-tinted card (style Figma), icône en haut-gauche + label, grosse valeur en bas. Template-only (TOC).
2. **`DashboardKpiRow`** : props `@completedTasks: number`, `@totalTasks: number`, `@totalHours: number`, `@completedPoints: number`. Layout 3 cards horizontales. Importe `TrendingUpIcon`, `ClockIcon`, `ZapIcon` (icônes inline TOC depuis shell-front pour cohérence, ou redéfinies localement).
3. **`MyTasksGrid`** : props `@tasks: Task[]`. Grid 3 cols (responsive : 2 cols sur md, 1 col sur sm). Rend `<TaskCard @task={{task}} @variant="kanban" />` par item. Empty state si `@tasks.length === 0`.

### D3. Route + template `/` (dashboard index)

**Approche** : la lib `dashboard-front` reprend la responsabilité de la route `dashboard.index` (actuellement dans shell-front placeholder).

**Migration** :
- **Supprimer** : `@libs/shell-front/src/templates/dashboard/index.gts` (placeholder).
- **Conserver** : la route `this.route("dashboard", function() { ... })` dans shell-front router (déclaration de route restera dans shell-front, le template viendra de dashboard-front).
- **Créer** : `@libs/dashboard-front/src/routes/dashboard/index.ts` + `templates/dashboard/index.gts`.

**Route model()** :
```typescript
async model() {
  const projectId = this.currentProject.currentProjectId;
  if (!projectId) return { activeSprint: null, tasks: [], summary: null, myUserId: this.currentUser.id };
  const [activeSprint, tasks, summary] = await Promise.all([
    this.sprints.loadActive(projectId),
    this.tasks.loadAllByProject(projectId),
    this.timeEntries.loadSummary('week', projectId), // 'week' suffit pour le sprint actif (1-2 sem)
  ]);
  return { activeSprint, tasks, summary, myUserId: this.currentUser.id };
}
```

**Template computed properties** :
```typescript
get sprintTasks() {
  if (!this.model.activeSprint) return [];
  return this.model.tasks.filter(t => t.sprintId === this.model.activeSprint.id);
}
get myTasks() {
  return this.sprintTasks.filter(t => (t.assignees ?? []).includes(this.model.myUserId));
}
get completedCount() {
  return this.sprintTasks.filter(t => t.status === 'done' || t.status === 'completed').length;
}
get totalCount() { return this.sprintTasks.length; }
get completedPoints() {
  return this.sprintTasks.filter(t => t.status === 'done').reduce((sum, t) => sum + (t.points ?? 0), 0);
}
```

**Layout** :
```hbs
<div class="space-y-6">
  <header>
    <h1>{{t "dashboard.title"}}</h1>
    <p>{{t "dashboard.subtitle"}}</p>
  </header>
  {{#if @model.activeSprint}}
    <DashboardKpiRow
      @completedTasks={{this.completedCount}}
      @totalTasks={{this.totalCount}}
      @totalHours={{@model.summary.totalHours}}
      @completedPoints={{this.completedPoints}}
    />
    <section>
      <h2>{{t "dashboard.myTasks" count=this.myTasks.length}}</h2>
      <MyTasksGrid @tasks={{this.myTasks}} />
    </section>
  {{else}}
    <div class="alert alert-info">{{t "dashboard.noActiveSprint"}}</div>
  {{/if}}
</div>
```

### D4. i18n
- `@apps/front/translations/dashboard/{en-us,fr-fr}.yaml` (pattern `feedback-i18n-translations-location`).
- Clés :
  - `dashboard.title` : "Tableau de bord" / "Dashboard"
  - `dashboard.subtitle` : "Sprint en cours - Vos tâches assignées" / "Current sprint - Your assigned tasks"
  - `dashboard.kpi.completedTasks` : "Tâches terminées" / "Completed tasks"
  - `dashboard.kpi.hoursWorked` : "Heures travaillées" / "Hours worked"
  - `dashboard.kpi.storyPoints` : "Points d'efforts" / "Story points"
  - `dashboard.myTasks` : "Mes tâches ({count})" / "My tasks ({count})"
  - `dashboard.noActiveSprint` : "Aucun sprint actif sur ce projet. Démarrez-en un depuis /sprints."
  - `dashboard.noMyTasks` : "Aucune tâche ne vous est assignée dans ce sprint."

### D5. Tests (vitest + Ember test infra)
`@libs/dashboard-front/tests/integration/` :
- `dashboard-kpi-card-test.gts` — render card avec label + value + icône.
- `dashboard-kpi-row-test.gts` — render 3 cards avec les bonnes valeurs.
- `my-tasks-grid-test.gts` — render grid + empty state.
- `dashboard-template-test.gts` — render template complet avec mock model (avec et sans activeSprint).

Pretest : `pnpm rollup -c` (rule `[[feedback-lib-dist-pretest]]`).

---

## 4. Plan d'exécution (sous-agents parallélisables)

**Vague 1 — Scaffold + i18n + retrait placeholder (sériel)** (~20 min)
1. Scaffold `@libs/dashboard-front` (copier `time-tracking-front` comme modèle, vérifier `.prettierignore` + `pretest: rollup -c` cf. `[[feedback-lib-dist-pretest]]`).
2. `@apps/front/translations/dashboard/{en-us,fr-fr}.yaml`.
3. Retrait `@libs/shell-front/src/templates/dashboard/index.gts` (placeholder).
4. Wiring `initializeDashboardLib()` dans `@apps/front/app/routes/application.ts`.
5. Dépendance `@libs/dashboard-front` dans `@apps/front/package.json`.

**Vague 2 — Composants en parallèle (3 sous-agents)** (~15 min)
- Agent A : `DashboardKpiCard` (TOC, props icon/label/value)
- Agent B : `DashboardKpiRow` (3 cards) + icônes TOC (`TrendingUp`, `Clock`, `Zap`)
- Agent C : `MyTasksGrid` (grid + empty state, import TaskCard depuis `@libs/backlog-front/components/task-card`)

**Vague 3 — Route + template (sériel)** (~15 min)
1. `@libs/dashboard-front/src/routes/dashboard/index.ts` (model Promise.all)
2. `@libs/dashboard-front/src/templates/dashboard/index.gts` (template + computed properties)

**Vague 4 — Tests + lint + visual (sériel)** (~15 min)
1. 4 tests intégration (vitest).
2. `pnpm turbo lint` depuis racine (**règle critique** `[[feedback-lint-before-push]]`).
3. **Avant push** : exécuter `pnpm install` localement + vérifier `git status pnpm-lock.yaml` + **demander à l'utilisateur de commiter le lockfile** (cf. `[[feedback-pnpm-lock-commit]]`).
4. Validation visuelle Playwright (`/`, screenshot vs Figma `01-dashboard.png`).

**Vague 5 — PR + handoff** (~10 min)
1. Commit conventionnel `feat(dashboard-front): P10 ...`.
2. Push + PR vers `dev`.
3. **Demander à l'utilisateur de commiter `pnpm-lock.yaml`** AVANT que la CI tourne (cf. `[[feedback-pnpm-lock-commit]]`).
4. CI green check.
5. Move plan to `specs/done/`.
6. `/TPK-handoff`.

**Total estimé** : 75 min (avec parallélisation Vague 2).

---

## 5. Critères de succès (vérification bloquante avant `done/`)

1. [ ] Route `/` rend le dashboard sans erreur (plus de placeholder shell-front).
2. [ ] Header `<h1>Tableau de bord</h1>` + sous-titre visibles.
3. [ ] 3 KPI cards affichent des valeurs **dérivées des mocks** (pas hardcodées) :
   - Tâches terminées : count des tasks du sprint actif avec `status === 'done'` / total tasks sprint
   - Heures travaillées : `summary.totalHours` (semaine en cours)
   - Points d'efforts : sum des `points` des tasks done dans le sprint actif
4. [ ] Section "Mes tâches" : grille de TaskCard kanban, filtrée par `assignees.includes(currentUser.id) && sprintId === activeSprint.id`.
5. [ ] Si pas de sprint actif sur le projet : message `dashboard.noActiveSprint` rendu.
6. [ ] Si sprint actif mais 0 tâches assignées : message `dashboard.noMyTasks` rendu (dans la grid).
7. [ ] Changer le projet sélectionné (topbar) recharge le dashboard avec les nouvelles données.
8. [ ] 4/4 tests intégration verts.
9. [ ] `pnpm turbo lint` vert depuis la racine **avant push**.
10. [ ] `pnpm-lock.yaml` commité par l'utilisateur AVANT que la CI tourne (cf. `[[feedback-pnpm-lock-commit]]`).
11. [ ] Validation visuelle Playwright : screenshot `specs/review-screenshots/p10-dashboard.png` capturé. Comparer à `docs/figma-screenshots/01-dashboard.png`.
12. [ ] Zéro erreur console runtime.

---

## 6. Key Files (anticipation)

### Nouveaux
- `@libs/dashboard-front/` (scaffold complet, ~13 fichiers config + sources)
- `@libs/dashboard-front/src/components/dashboard-kpi-card.gts`
- `@libs/dashboard-front/src/components/dashboard-kpi-row.gts`
- `@libs/dashboard-front/src/components/my-tasks-grid.gts`
- `@libs/dashboard-front/src/routes/dashboard/index.ts`
- `@libs/dashboard-front/src/templates/dashboard/index.gts`
- `@libs/dashboard-front/src/index.ts` (initialize stub)
- `@libs/dashboard-front/tests/integration/*.gts` (4 tests)
- `@apps/front/translations/dashboard/{en-us,fr-fr}.yaml`

### Modifiés
- `@apps/front/app/routes/application.ts` — wiring `initializeDashboardLib`
- `@apps/front/package.json` — dep `@libs/dashboard-front`
- `pnpm-lock.yaml` — à commiter par utilisateur

### Supprimés
- `@libs/shell-front/src/templates/dashboard/index.gts` (placeholder)

---

## 7. Risques connus & mitigations

| Risque | Mitigation |
|---|---|
| Pas de sprint actif sur `proj-1` dans les mocks → dashboard vide | Vérifier mocks `sprints-front` : `sprint-1` doit avoir `status: 'active'` (déjà OK P8). Sinon ajuster mock. |
| Le sprint actif a 0 tâches assignées car les mocks tasks ont `sprintId` différent | Vérifier mocks `backlog-front` : au moins 1-2 tasks doivent avoir `sprintId: 'sprint-1'` + `assignees: ['u1']`. Si pas le cas, ajuster les mocks P10. |
| Hot reload Vite ne picke pas les nouveaux YAML | Redémarrer dev server après ajout (cf. `[[feedback-i18n-translations-location]]`). |
| CI fail sur `ERR_PNPM_OUTDATED_LOCKFILE` (récurrent P8/P9) | Bien faire commiter le lockfile par l'utilisateur (cf. `[[feedback-pnpm-lock-commit]]`). |
| `currentUser.id` retourne `undefined` au model() avant que session soit chargée | Le pattern Ember route `model()` est appelé après `beforeModel()` de `application` qui setup la session. À tester : si `id` undefined, le fallback peut être `'u1'` pour P10 (mocks). |
| TaskCard import cross-lib (`@libs/backlog-front`) | Pattern OK (sprints-front fait pareil, cf. ABI ember-addon v2). Pas un risque. |
| Burndown demandé par stakeholder en cours de build | Push-back ferme : P10 = KPIs + Mes tâches. Burndown = P11 (besoin historique journalier non mocké). |

---

## 8. Mémoires à mettre à jour (post-P10)

- Aucune nouvelle mémoire prévue : P10 est de la composition de services existants, sans pattern nouveau.
- Si découverte d'un cas où `currentUser` n'est pas dispo au model() → potentielle nouvelle mémoire `feedback-current-user-timing`.
