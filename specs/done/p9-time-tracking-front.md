# P9 — Time Tracking (nouvelle lib `@libs/time-tracking-front` + `LogTimeModal` global)

> Objectif : implémenter le domaine **Time Tracking** côté frontend dans une **nouvelle lib `@libs/time-tracking-front`**. Route `/time-tracking` (liste filtrable + résumé), modal `LogTimeModal` réutilisable (déclenché depuis `TaskDetailModal` et depuis le bouton "Log time" du sub-header global, aujourd'hui disabled), service `TimeEntriesService` (CRUD + summary). Add-on séparé du bounded context Scrum (cf. `@libs/time-tracking-backend/CLAUDE.md`).

---

## 1. Contexte & rappels

### Acquis (P0–P8)
- **Backend P2** : routes complètes (`@libs/time-tracking-backend/src/routes/`) montées sous `/api/v1/time-entries` :
  - `GET /api/v1/time-entries/?filter[userId]&filter[projectId]&filter[taskId]&sort=-date&page[offset]&page[limit]` (list + meta `{total, pages, totalHours}`)
  - `GET /api/v1/time-entries/:id`
  - `POST /api/v1/time-entries/`
  - `PATCH /api/v1/time-entries/:id`
  - `DELETE /api/v1/time-entries/:id`
- **`TimeEntryEntity` backend** (`@libs/time-tracking-backend/src/entities/time-entry.entity.ts`) :
  ```typescript
  { id, taskId, userId, projectId, hours, date, description?, createdAt }
  ```
  FK cross-lib **string uniquement** (taskId → tasks, userId → users, projectId → projects).
- **Placeholder shell-front** `/time-tracking` à retirer (pattern P5/P6/P7/P8) :
  - `@libs/shell-front/src/routes/dashboard/time-tracking.ts`
  - `@libs/shell-front/src/templates/dashboard/time-tracking.gts`
  - **Sidebar** "Suivi du temps" → `dashboard.time-tracking` reste actif (déjà câblé `@libs/shell-front/src/components/shell/layout.gts:121`).
- **Boutons "Log time" disabled à activer** :
  - `@libs/backlog-front/src/components/task-detail-modal.gts:306` — i18n `backlog.modal.taskDetail.logTime` + tooltip `logTimeDisabled` (P9 supprime tooltip + active onClick).
  - **Sub-header global** (`@apps/front/.../sub-header.*` ou équivalent shell-front) : bouton "Log time [disabled]" visible sur Dashboard, Sprints, etc. — vérifier `@libs/shell-front/src/components/shell/sub-header.gts` (à confirmer au scaffold).
- **Store global** : `EpicSchema, UserStorySchema, TaskSchema, SprintSchema` enregistrés. **P9 ajoutera `TimeEntrySchema`** (cf. mémoire `[[feedback-warpd-schemas-global]]`).

### Cible UX (pas de Figma dédié — design tokens existants)
- **Header page** : titre "Suivi du temps", sous-titre "Heures enregistrées par projet et utilisateur", bouton "+ Log time" (active P9).
- **Summary row (3 cards)** : "Total heures cette semaine", "Total heures ce mois", "Tâches loggées (count distinct taskId)". Réutiliser le style des 3 cards Dashboard (`Tâches terminées`, `Heures travaillées`, `Points d'efforts`).
- **Filtres** (row sous summary) : sélecteur Projet (combobox), période (cette semaine / ce mois / tous), utilisateur (combobox — admin only en P9 : tous les utilisateurs visibles).
- **Table** : colonnes `Date`, `Tâche (#id + title)`, `Projet`, `Utilisateur`, `Heures`, `Description`, `Actions (edit/delete)`. Tri natif sur date desc. Pagination `< Page X / Y >` réutilisée du pattern `SprintsPagination` (généraliser si pertinent ou copier).
- **`LogTimeModal`** : 4 champs (Task select, Hours, Date, Description). Préfill quand ouvert depuis `TaskDetailModal` (taskId + projectId locked). POST + close + refresh.

### Hors périmètre P9
- **Approbations** (workflow validation manager) → P13.
- **Export CSV/Excel** → P12.
- **Timer / chronomètre live** (start/stop) → P11.
- **Graphique burndown heures vs estimation** → P10 (dashboard).
- **Permissions fines** (un user ne peut éditer que ses propres entries) → P13, en P9 tout le monde voit tout (mocks MSW).
- **Édition inline de `description`** → P12 (P9 = modal edit).
- **Aggregation per-sprint / per-epic** → P10 dashboard.

---

## 2. Décisions techniques

### D1. Nouvelle lib `@libs/time-tracking-front`
Add-on séparé (cohérent avec le bounded context backend). **Pas de fusion** avec `backlog-front` ni `sprints-front`. Réutilisations cross-lib :
- `TaskCard` n'est pas utilisé ici — pas de drag-drop.
- Type `Task` minimal importé depuis `@libs/backlog-front/schemas/tasks` (read-only, pour task picker dans `LogTimeModal`).
- `TpkModal`, `TpkButton`, `TpkInput`, `TpkSelect` depuis `@libs/shared-front` (déjà utilisés P5–P8).

**Scaffold** : utiliser le skill `/new-library` (pattern guarded P8 — vérifier `.prettierignore`, `pretest: rollup -c`, etc., cf. mémoire `[[feedback-lib-dist-pretest]]` + `[[feedback-self-imports]]`).

### D2. `TimeEntrySchema` WarpDrive + enregistrement dans store global
`@libs/time-tracking-front/src/schemas/time-entries.ts` :
```typescript
const TimeEntrySchema = withDefaults({
  type: 'time-entries',
  fields: [
    { name: 'taskId', kind: 'attribute' },
    { name: 'userId', kind: 'attribute' },
    { name: 'projectId', kind: 'attribute' },
    { name: 'hours', kind: 'attribute' },
    { name: 'date', kind: 'attribute' },
    { name: 'description', kind: 'attribute' },
    { name: 'createdAt', kind: 'attribute' },
  ],
});
```
**MAJ `@apps/front/app/services/store.ts`** : ajout `TimeEntrySchema` (cf. `[[feedback-warpd-schemas-global]]`).

Decision : tentative WarpDrive native d'abord (load via `store.request(query())`). Si filtrage JSON:API custom (`filter[userId]&filter[projectId]`) ne passe pas le cache → **fallback fetch natif** comme `SprintsService` (P8). À trancher pendant le build, mémoire à jour si fallback.

### D3. `TimeEntriesService` (Ember service injectable)
Méthodes :
- `loadByUser(userId, opts?: { from?: Date, to?: Date, limit?: number })`
- `loadByProject(projectId, opts?)`
- `loadByTask(taskId)` (utilisé dans `TaskDetailModal` tab "History" pour montrer le total déjà loggé sur la tâche — optionnel P9)
- `loadSummary(scope: 'week' | 'month', projectId?, userId?)` → `{ totalHours, taskCount }` (réutilise `meta.totalHours` du backend list + `Set` côté front pour distinct taskId)
- `create(payload)` → POST.
- `update(id, partial, { refresh?: boolean })` → PATCH (pattern P7 overload).
- `delete(id)` → DELETE.

### D4. MSW mocks
`@libs/time-tracking-front/src/http-mocks/time-entries.ts` :
- ~15 time entries seedées : 2 utilisateurs (`u1`, `u2`), 3 projets (proj-1/2/3), 6 tâches loggées au moins, dates spread sur 14 derniers jours.
- Handlers : GET list (avec filtres `filter[userId]`, `filter[projectId]`, `filter[taskId]`, `page[offset]`, `page[limit]`), GET detail, POST, PATCH, DELETE.
- `allTimeEntriesHandlers` exporté + wiring dans `@apps/front/app/routes/application.ts`.
- Calcul `meta.totalHours` + `meta.total` + `meta.pages` côté handler.

### D5. Composants nouveaux dans `@libs/time-tracking-front/src/components/`
1. **`LogTimeModal`** : props `@taskId?`, `@projectId?`, `@onClose`, `@onSaved`. 4 champs (task select disabled si `@taskId` fourni, hours number, date input, description textarea). Validation : `hours > 0`, `date <= today`. POST `time-entries` puis `loadAll()` refresh.
2. **`TimeEntryRow`** : ligne du tableau. Props `@entry: TimeEntry`, `@onEdit`, `@onDelete`. Affiche date formatée, lien tâche (`#id + title` — résolu via `TasksService.findById` ou map locale), projet, user avatar `U{id}`, hours, description tronquée.
3. **`TimeEntriesTable`** : table responsive. Props `@entries`, `@onEditEntry`, `@onDeleteEntry`. Tri date desc. Empty state "Aucune entrée enregistrée".
4. **`TimeSummaryCards`** : 3 cards résumé (semaine, mois, count tâches). Props `@scope`, `@filters`. Auto-load via service.
5. **`TimeFilters`** : combo Projet + select Période + combo Utilisateur. Props `@filters`, `@onChange`.

### D6. Activation des boutons "Log time" existants
- **`task-detail-modal.gts`** : retirer `disabled` + tooltip ; câbler `@onLogTime={{this.openLogTimeModal}}` qui ouvre `LogTimeModal` (rendu en root via `<TpkPortal>` ou state local). Préfill `@taskId={{@task.id}}` + `@projectId={{@task.projectId}}`.
- **Sub-header global** : localiser dans `@libs/shell-front` (probablement `shell/sub-header.gts` ou `shell/layout.gts`). Si présent : retirer `disabled` + câbler ouverture `LogTimeModal` (sans `@taskId` préfilled — l'user choisit la tâche dans le picker).
  - Si le composant n'expose pas de slot pour mount un modal au niveau shell : pour P9 on **active uniquement** le bouton de `TaskDetailModal` et on retire le bouton sub-header (ou on le câble en navigation vers `/time-tracking`). À trancher au scaffold après lecture du shell.

### D7. Route `/time-tracking`
- **Retrait placeholder shell-front** : supprimer `@libs/shell-front/src/routes/dashboard/time-tracking.ts` + `@libs/shell-front/src/templates/dashboard/time-tracking.gts`. **Ne pas retirer** la ligne `this.route("time-tracking")` du router shell-front (la lib time-tracking-front la consomme).
- **Nouvelle route** : `@libs/time-tracking-front/src/routes/dashboard/time-tracking.ts` + `templates/dashboard/time-tracking.gts`.
- **Model** : `loadByProject(activeProject.id)` ou `loadByUser(currentUser.id)` selon scope. Filtres réactifs via `@tracked`.
- **Initialize** : `@libs/time-tracking-front/src/index.ts` exporte `initializeTimeTrackingLib()` qui mount route + templates (pattern P4-P8). Pas de `moduleRegistry()` (cf. `[[feedback-testapp-no-moduleregistry]]`).

### D8. i18n
- `@libs/time-tracking-front/translations/{fr-fr,en-us}.yaml`
- Namespace **`time-tracking.*`** (kebab — cf. `[[feedback-i18n-folder-namespace]]`) :
  - `time-tracking.title`, `time-tracking.subtitle`
  - `time-tracking.summary.weekHours`, `time-tracking.summary.monthHours`, `time-tracking.summary.taskCount`
  - `time-tracking.filters.project`, `time-tracking.filters.period`, `time-tracking.filters.user`
  - `time-tracking.filters.periodWeek`, `time-tracking.filters.periodMonth`, `time-tracking.filters.periodAll`
  - `time-tracking.table.date`, `.task`, `.project`, `.user`, `.hours`, `.description`, `.actions`
  - `time-tracking.table.empty`
  - `time-tracking.modal.logTime.title`, `.taskLabel`, `.hoursLabel`, `.dateLabel`, `.descriptionLabel`, `.submit`, `.cancel`
  - `time-tracking.modal.logTime.errors.hoursPositive`, `.errors.dateInFuture`, `.errors.taskRequired`

### D9. Tests (vitest + Ember test infra)
`@libs/time-tracking-front/tests/integration/` :
- `schema-registration.test.ts` — vérifier que `TimeEntrySchema` est bien enregistré et que `store.peekAll('time-entries')` retourne `[]` non-`undefined`.
- `time-entries-service.test.ts` — `loadByProject` retourne entries filtrées ; `create` POST + refresh.
- `log-time-modal.test.ts` — validation `hours > 0`, soumission appelle `TimeEntriesService.create` + `onSaved`.
- `time-entries-table.test.ts` — rendu lignes + empty state.
- `time-tracking-route.test.ts` — page rend summary + table + filtres.

Pretest : `pnpm rollup -c` (cf. `[[feedback-lib-dist-pretest]]`).

---

## 3. Plan d'exécution (sous-agents parallélisables)

**Vague 1 — Scaffold + schema/service (sériel)** (~30 min)
1. Skill `/new-library` `time-tracking-front` (vérifier `.prettierignore` + `pretest: rollup -c` cf. handoff #010).
2. `TimeEntrySchema` + enregistrement `store.ts` + i18n yaml stubs.
3. `TimeEntriesService` (8 méthodes, fallback fetch natif si nécessaire).

**Vague 2 — Composants en parallèle (5 sous-agents)** (~25 min)
- Agent A : `LogTimeModal` (form + validation + POST)
- Agent B : `TimeEntryRow` + `TimeEntriesTable`
- Agent C : `TimeSummaryCards` (3 cards)
- Agent D : `TimeFilters` (combo project/period/user)
- Agent E : MSW mocks 15 entries + handlers + `allTimeEntriesHandlers`

**Vague 3 — Page + route + intégrations (sériel)** (~20 min)
1. Retrait placeholder shell-front (`time-tracking.ts` + `time-tracking.gts`).
2. Route `/time-tracking` + template orchestrant `TimeSummaryCards`, `TimeFilters`, `TimeEntriesTable`, ouverture `LogTimeModal`.
3. Wiring `initializeTimeTrackingLib()` + handlers dans `application.ts`.
4. Activation bouton "Log time" dans `task-detail-modal.gts` (retire disabled + onClick).
5. (Conditionnel D6) activation bouton sub-header global ou retrait.

**Vague 4 — Tests + lint + visual (sériel)** (~15 min)
1. 5 tests intégration (vitest).
2. `pnpm turbo lint` depuis la racine (**règle critique** `[[feedback-lint-before-push]]`).
3. Validation visuelle Playwright (`cd @apps/front && pnpm start`, naviguer `/time-tracking`, ouvrir modal depuis tâche, screenshot — cf. `TPK-build` step 5b).

**Vague 5 — PR + handoff** (~10 min)
1. Commit conventionnel `feat(time-tracking-front): P9 ...`.
2. Push + ouverture PR vers `dev`.
3. CI green check.
4. Update `specs/todo/` → `specs/done/p9-time-tracking-front.md`.
5. `/TPK-handoff` pour clore P9.

**Total estimé** : 100 min (1h40) avec parallélisation Vague 2.

---

## 4. Spec d'acceptation

- [ ] Route `/time-tracking` rend sans erreur (lib time-tracking-front, plus de placeholder shell-front).
- [ ] 3 summary cards affichent `totalHours` semaine / mois / count tâches loggées.
- [ ] Table liste 15 mock entries triées par date desc.
- [ ] Filtres (Projet, Période, Utilisateur) réduisent la liste correctement.
- [ ] Bouton "+ Log time" sub-header ou page ouvre `LogTimeModal`.
- [ ] `LogTimeModal` valide `hours > 0` + `date <= today` ; POST réussit + table refresh.
- [ ] Bouton "Log time" dans `TaskDetailModal` ouvre `LogTimeModal` préfilled avec `@taskId` + `@projectId` (champ task select disabled).
- [ ] Edit/delete d'une row appelle service + table refresh.
- [ ] Sidebar "Suivi du temps" navigue correctement (déjà OK shell, ne pas régresser).
- [ ] 5/5 tests verts.
- [ ] `pnpm turbo lint` vert depuis la racine **avant push**.
- [ ] Validation visuelle Playwright : screenshot `specs/review-screenshots/p9-time-tracking.png` capturé et propre.
- [ ] Zéro erreur console runtime.

---

## 5. Key Files (anticipation)

### Nouveaux
- `@libs/time-tracking-front/` (scaffold complet)
- `@libs/time-tracking-front/src/schemas/time-entries.ts`
- `@libs/time-tracking-front/src/services/time-entries.ts`
- `@libs/time-tracking-front/src/http-mocks/time-entries.ts`
- `@libs/time-tracking-front/src/components/log-time-modal.gts`
- `@libs/time-tracking-front/src/components/time-entry-row.gts`
- `@libs/time-tracking-front/src/components/time-entries-table.gts`
- `@libs/time-tracking-front/src/components/time-summary-cards.gts`
- `@libs/time-tracking-front/src/components/time-filters.gts`
- `@libs/time-tracking-front/src/routes/dashboard/time-tracking.ts`
- `@libs/time-tracking-front/src/templates/dashboard/time-tracking.gts`
- `@libs/time-tracking-front/translations/{fr-fr,en-us}.yaml`

### Modifiés
- `@apps/front/app/services/store.ts` — ajout `TimeEntrySchema`
- `@apps/front/app/routes/application.ts` — wiring `allTimeEntriesHandlers` + `initializeTimeTrackingLib`
- `@apps/front/package.json` — dep `@libs/time-tracking-front`
- `@libs/backlog-front/src/components/task-detail-modal.gts` — activer bouton "Log time"
- (Conditionnel) `@libs/shell-front/src/components/shell/sub-header.gts` — activer ou retirer bouton "Log time" global

### Supprimés
- `@libs/shell-front/src/routes/dashboard/time-tracking.ts`
- `@libs/shell-front/src/templates/dashboard/time-tracking.gts`

---

## 6. Risques connus & mitigations

| Risque | Mitigation |
|---|---|
| WarpDrive `store.request(query())` filtre silencieusement entries sans `userId` matching | Fallback fetch natif comme `SprintsService` P8 (`[[feedback-warpd-schemas-global]]`) |
| `Task` import depuis `backlog-front` crée un cycle si time-tracking est importé par backlog | Vérifier le sens des imports : `time-tracking-front` → `backlog-front` (lecture types) **uniquement**. Si cycle détecté, dupliquer le type minimal `{ id, title, projectId }` localement (pattern Sprint anti-cycle P8) |
| `.prettierignore` oublié au scaffold (incident PR #12) | Vérifier explicitement dans la checklist `/new-library` |
| Bouton "Log time" sub-header non câblé proprement (composant shared) | Décider Vague 3 step 5 : câble propre ou retrait. Documenter dans handoff. |
| Format date BE (`p.datetime()`) vs FE (`<input type="date">`) | Sérialiser via `.toISOString()` côté POST, parse `new Date(entry.date)` côté display |

---

## 7. Mémoires à mettre à jour (post-P9)

- Si fallback fetch natif utilisé pour `TimeEntriesService` → ajouter référence dans `[[feedback-warpd-schemas-global]]` (3e exemple après Sprint).
- Si nouveau pattern de modal "global" depuis sub-header → noter dans nouvelle mémoire `feedback-global-modal-mount` (mécanisme TpkPortal ou yield).
