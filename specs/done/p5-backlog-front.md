# P5 — Backlog + User Story Map (lib `@libs/backlog-front`)

> Objectif : implémenter le domaine **Backlog & USM** côté frontend : nouvelle lib `@libs/backlog-front`, route `/backlog` (liste des tâches non assignées à un sprint, avec filtres + badges Type/Nature + avatar assigné + points), route `/user-story-map` (vue hiérarchique repliable **Épique → User Story → Task**), modales `AddEpic` et `AddUserStory`. Référence visuelle : `docs/figma-screenshots/03-backlog.png`, `05-user-story-map.png`, `14-modal-add-user-story.png`, `15-modal-add-epic.png`.

---

## 1. Contexte & rappels

### Acquis (P0–P4)
- Backend P2 expose toutes les routes nécessaires via `@libs/scrum-backend` :
  - **Epics** : `GET/POST /api/v1/epics/`, `GET/PATCH/DELETE /api/v1/epics/{id}`, `GET /api/v1/projects/{id}/epics`, `GET /api/v1/epics/{id}/user-stories`, `GET /api/v1/epics/{id}/tasks`.
  - **User Stories** : `GET/POST /api/v1/user-stories/`, `GET/PATCH/DELETE /api/v1/user-stories/{id}`, `GET /api/v1/projects/{id}/user-stories`, `GET /api/v1/user-stories/{id}/tasks`.
  - **Tasks** : `GET/POST /api/v1/tasks/`, `GET/PATCH/DELETE /api/v1/tasks/{id}`, `GET /api/v1/projects/{id}/tasks`. Filtres query attendus : `sprintId=null` pour le backlog.
- Entités backend (cf. `@libs/scrum-backend/src/{epic,user-story,task}/*.entity.ts`) :
  - `Epic` = `{ id, title, description, projectId, status, createdAt, updatedAt }`
  - `UserStory` = `{ id, title, description, projectId, epicId?, status, points, priority, createdAt, updatedAt }`
  - `Task` = `{ id, number, title, description, status, type, nature, priority, points, estimatedHours?, projectId, userStoryId?, epicId?, sprintId?, createdById, dueDate?, createdAt, updatedAt }`
- Sérializers JSON:API : `type: "epics" | "user-stories" | "tasks"` (cf. `*.serializer.ts`).
- **Service `current-project`** (P3) : `tracked currentProjectId`, persistance localStorage, alimenté par `ProjectDetailModal.goToKanban` (P4) — sera utilisé en P5 pour filtrer les listes par projet courant.
- **Lib `@libs/projects-front`** (P4) : pattern de référence — Embroider v2, schemas WarpDrive, service domaine, MSW handlers, routes squelettes déjà déclarées par `shell-front` (`backlog`, `user-story-map` existent comme `PlaceholderPage`).
- Shell : sidebar (P3) référence déjà les routes `dashboard.backlog` et `dashboard.user-story-map`. P5 doit juste **fournir les templates + composants + route logic**.
- Translations: pattern P4 confirmé — yaml dans `@apps/front/translations/<namespace>/{fr-fr,en-us}.yaml` + tests utilisent `intl.addTranslations(...)` inline.

### Cible Figma
- **`/backlog`** (`03-backlog.png`) :
  - Header de page : titre "Backlog", sous-titre, bouton "+ Nouvelle tâche" (top-right) → P6 (AddTask).
  - Bandeau de filtres : `Tous` / `Bug` / `Feature` / `Frontend` / `Backend` / etc. (toggles type+nature).
  - Liste verticale de **TaskRow** (≠ TaskCard P6, plus dense ici) : `#TF-123` `Type` `Nature` `Titre` `→ US-Title` `avatar` `points`.
  - Footer : compteur "X tâches dans le backlog".
- **`/user-story-map`** (`05-user-story-map.png`) :
  - Header de page : titre "User Story Map", boutons "+ Nouvelle épique", "+ Nouvelle US", "+ Nouvelle tâche".
  - Vue hiérarchique en arborescence (sections repliables `<details>` ou équivalent) :
    - **Épique** (titre + badge status + count US/Tasks) → liste de **User Stories** (titre + points + count tasks) → liste de **Tasks** (numéro + titre + badge type + nature).
  - Boutons "Ajouter une US" inline dans chaque épique, "Ajouter une tâche" inline dans chaque US.
- **`AddEpicModal`** (`15-modal-add-epic.png`) :
  - Champs : Projet (auto-rempli depuis `current-project`, read-only), Titre*, Description (textarea), Statut initial (select : `planned` / `in-progress` / `completed`).
- **`AddUserStoryModal`** (`14-modal-add-user-story.png`) :
  - Champs : Projet (auto-rempli), Épique parente (select des épiques du projet, optionnel), Titre*, Description, Statut initial, Points (number), Priorité (select 1-3).

### Hors périmètre P5
- **AddTask** → P6 (Tasks). Le bouton "+ Nouvelle tâche" du backlog reste **disabled** avec tooltip `Disponible en P6`.
- **TaskDetail modal** → P6.
- **Drag-drop backlog → sprint** → **reporté en P8** (Sprints). Justification : nécessite l'UI Sprints comme cible drop, et le pattern drag-drop sera plus coûteux à implémenter sans cible visible. Une note "Glissez vers un sprint pour planifier (P8)" remplace la fonctionnalité.
- **Édition inline d'epic / US** → P12 (Settings & édition globale). P5 = création + lecture seulement.
- **Filtres avancés type/nature** → version simple en P5 (toggle unique) ; multi-select et combinaisons → P12.

---

## 2. Décisions techniques

### D1. Nouvelle lib `@libs/backlog-front`
Mêmes conventions que `@libs/projects-front` :
- Embroider v2, Rollup, Vitest browser (playwright)
- ESLint / Prettier / template-lint comme les autres libs front
- Dépend de `@libs/shared-front`, `@libs/users-front`, `@libs/shell-front`, **`@libs/projects-front`** (pour `current-project` indirect via Shell + pour le ProjectsService au cas où on a besoin de la liste des projets).
- Exporte `moduleRegistry()`, `initialize(owner)`. **Pas de `forRouter`** — les routes `dashboard.backlog` et `dashboard.user-story-map` sont déjà déclarées par `shell-front`.

**Scaffold via le skill `new-library`** : `pnpm /new-library backlog-front --type=ember-addon`.

### D2. Trois schemas WarpDrive
`@libs/backlog-front/src/schemas/`
```ts
// epics.ts
const EpicSchema = withDefaults({
  type: "epics",
  fields: [
    { name: "title", kind: "attribute" },
    { name: "description", kind: "attribute" },
    { name: "projectId", kind: "attribute" },
    { name: "status", kind: "attribute" },
    { name: "createdAt", kind: "attribute" },
    { name: "updatedAt", kind: "attribute" },
  ],
});
```
Idem pour `user-stories.ts` et `tasks.ts` (mêmes attributs que les entités backend, kind: "attribute" partout en P5 — les relations seront déclarées en P6 quand on les chargera).

### D3. Trois services domaine
`@libs/backlog-front/src/services/`
- **`epics.ts`** : `loadByProject(projectId)`, `findById(id)`, `create(payload)`. Pattern P4 — `tracked list: Epic[]`, `loadAll` retourne via `store.request({ url: '/api/v1/projects/${pid}/epics', method: 'GET', cacheOptions: { reload: true } })`.
- **`user-stories.ts`** : `loadByProject(projectId)`, `loadByEpic(epicId)`, `findById(id)`, `create(payload)`. **Note** : créer un UserStory avec `epicId: null` est légal (US orpheline).
- **`tasks.ts`** : `loadBacklog(projectId)` = `GET /api/v1/projects/${pid}/tasks?sprintId=null` (à confirmer en P5.1 audit backend ; sinon fallback côté client en filtrant `list.filter(t => !t.sprintId)`). `loadByUserStory(usId)`, `findById(id)`. **Pas de `create` en P5** — la création de tasks arrive en P6.

### D4. Composants front
| Composant | Responsabilité | Notes |
|---|---|---|
| `TaskRow` | Une ligne du backlog (`#TF-123`, badges, titre, US link, avatar, points) | Custom DaisyUI — ≠ TaskCard P6 (variante dense) |
| `TaskTypeBadge` | Badge coloré pour `type` (`Bug`, `Feature`, `Tech`, …) | TOC + `{{t (concat ...)}}`, palette dans `theme.css` |
| `TaskNatureBadge` | Badge coloré pour `nature` (`Frontend`, `Backend`, `DevOps`, …) | TOC, palette distincte |
| `BacklogFilters` | Toggles `Tous` / type / nature | Tracked filter state + computed filtered list |
| `EpicRow` | Nœud épique dans USM (expand button, titre, status, counts) | Class component avec `@tracked expanded` |
| `UserStoryRow` | Nœud US dans USM (idem, plus points) | Class component |
| `AddEpicModal` | DaisyUI `<dialog>` form 3 champs | Pattern AddProjectModal (P4) |
| `AddUserStoryModal` | DaisyUI `<dialog>` form 5 champs (avec select épique) | Pattern AddProjectModal (P4) |

### D5. Stratégie current-project
- Toutes les listes filtrent par `currentProject.currentProjectId`. Si null → afficher placeholder "Sélectionnez un projet dans le header" (via `ProjectSelector`).
- Routes `backlog.ts` et `user-story-map.ts` lisent `currentProject` dans `model()` et appellent `epics.loadByProject(pid)`, etc.
- **Cas critique** : si l'utilisateur change de projet via le `ProjectSelector` du shell, on doit refresh. Solution P5 :
  - Le `current-project` service expose déjà `tracked currentProjectId`.
  - Les templates utilisent des getters qui dépendent de `currentProject.currentProjectId` et de `services.list` — quand l'un change, le rendu se re-rendre.
  - **Pour le rechargement** : ajouter dans `current-project.setCurrent(id)` un mécanisme d'événement ou exposer un `tracked changeToken` que les services écoutent. **Décision retenue** : on garde simple — les services exposent une méthode `subscribeToProjectChange(callback)` que `backlog-front` peut appeler depuis ses routes pour refetch. **Alternative simple** : appeler `model()` à chaque entrée de route via `refresh()` quand `currentProjectId` change (utiliser un observer service ou un modifier).

### D6. MSW mocks
Nouveau fichier `@libs/backlog-front/src/http-mocks/backlog.ts` exportant `allBacklogHandlers` :
- 3 mock epics (e.g. `epic-1 "Authentication & Onboarding"`, `epic-2 "Project Management"`, `epic-3 "Reporting"`).
- 8-10 mock user-stories réparties sur les épiques + 1-2 US orphelines.
- 15-20 mock tasks réparties, avec `sprintId = null` pour la moitié (= backlog) et `sprintId: "sprint-1"` pour l'autre.
- Handlers : `GET /api/v1/projects/:id/epics`, `GET /api/v1/projects/:id/user-stories`, `GET /api/v1/projects/:id/tasks`, `GET /api/v1/epics/:id/user-stories`, `GET /api/v1/user-stories/:id/tasks`, `POST /api/v1/epics`, `POST /api/v1/user-stories`.
- Activer dans `@apps/front/app/routes/application.ts` : `setupWorker(...allUsersHandlers, ...allProjectsHandlers, ...allBacklogHandlers)`.

### D7. i18n keys
Nouveau namespace `backlog` (fichiers `@apps/front/translations/backlog/{fr-fr,en-us}.yaml`) :
```yaml
backlog:
  title: 'Backlog'
  subtitle: '...'
  emptyState: 'Aucune tâche dans le backlog.'
  newTask: '+ Nouvelle tâche'
  newTaskDisabled: 'Disponible en P6'
  filters:
    all: 'Tous'
    type: { bug: 'Bug', feature: 'Feature', tech: 'Tech', ... }
    nature: { frontend: 'Frontend', backend: 'Backend', ... }
  taskRow:
    points: '{count} pts'
    linkedToUS: '→ {title}'
userStoryMap:
  title: 'User Story Map'
  newEpic: '+ Nouvelle épique'
  newUserStory: '+ Nouvelle US'
  newTask: '+ Nouvelle tâche'
  expand: 'Déplier'
  collapse: 'Replier'
  epicCount: '{epics, plural, =0 {Aucune épique} one {1 épique} other {# épiques}}'
modal:
  addEpic:
    title: 'Nouvelle épique'
    name: 'Titre de l''épique'
    description: 'Description'
    status: 'Statut initial'
    submit: 'Créer l''épique'
    cancel: 'Annuler'
  addUserStory:
    title: 'Nouvelle User Story'
    parentEpic: 'Épique parente (optionnel)'
    parentEpicPlaceholder: 'Aucune (US orpheline)'
    points: 'Points'
    priority: 'Priorité'
    submit: 'Créer la US'
```

### D8. Tests
Suivre le pattern P4 :
- **Unit** : 1 smoke test par schema (epic, user-story, task) — vérifier `type` et présence des fields.
- **Integration (rendering)** : 1-2 tests par composant clé : `TaskRow`, `AddEpicModal`, `AddUserStoryModal`, `EpicRow` (expand/collapse).
- **TestApp** : copier le `tests/app.ts` de P4 et y ajouter les routes `backlog`, `user-story-map`. Translations inline pour le namespace `backlog`.

### D9. Pas de E2E Playwright en P5
Les tests E2E (`@apps/e2e`) sont gardés pour P13 (polish + smoke run complet). En P5, vérification visuelle manuelle via `pnpm dev` suffira.

---

## 3. Architectural Context

_(extrait du `graphify-out/GRAPH_REPORT.md` — frais au moment de la planification)_

### Communautés touchées
- **Backend Scrum domain** (epic/, user-story/, task/ — déjà livrées en P2)
- **Frontend shell** (routes squelettes existantes à enrichir)
- **Frontend projects-front** (P4 — consommé indirectement via `current-project`)

### God nodes potentiellement modifiés
- ❌ `makeSingleJsonApiTopDocument()` (32 edges) : **non modifié** — P5 frontend consomme seulement le format JSON:API existant.
- ⚠️ `Modal: Nouvelle User Story` (11 edges) : **créé en P5** — vérifier que la modale n'introduit pas de couplage caché avec les composants Sprints/Kanban (qui n'existent pas encore).
- ⚠️ `Modal: Nouvelle Épique` (9 edges) : **créé en P5** — idem.

### Contrats transverses à risque
- **`current-project` service** : P5 dépend fortement de son `currentProjectId`. Tester explicitement le cas `null` (placeholder) et le cas changement live (refresh des listes).
- **WarpDrive store** : ajout de 3 nouveaux schemas → mise à jour de `@apps/front/app/services/store.ts` ou `application.ts` pour les registrer.

---

## 4. Découpage en tâches

### P5.0 — Scaffolding lib (≈ 30 min)
- Invoquer `/new-library backlog-front --type=ember-addon`.
- Vérifier `package.json` : dépendances `@libs/{shared,users,shell,projects}-front`, `@warp-drive/core`, `ember-intl`, `msw`.
- Configurer `vite.config.mts` identique à `projects-front`.
- `src/index.ts` exporte `moduleRegistry()` + `initialize()` (no-op).
- Smoke commit `chore(backlog-front): scaffold lib (empty)`.

### P5.1 — Audit backend (≈ 20 min, lecture seule)
- Vérifier que `GET /api/v1/projects/:id/tasks?sprintId=null` filtre bien (lire `task/routes/list.route.ts` + tests).
- Vérifier les attributs sérialisés (cf. `*.serializer.ts`) pour confirmer le mapping WarpDrive.
- Si filtre `?sprintId=null` non supporté, faire un commit `feat(scrum-backend): supporter sprintId=null filter` AVANT d'attaquer P5.3. Sinon, fallback côté client.

### P5.2 — Schemas WarpDrive (≈ 20 min)
- `src/schemas/epics.ts`, `user-stories.ts`, `tasks.ts`.
- Smoke tests `tests/unit/{epic,user-story,task}-schema-test.gts` (3×3 = 9 tests).
- Lint vert.

### P5.3 — Services (≈ 45 min)
- `src/services/epics.ts`, `user-stories.ts`, `tasks.ts`.
- Tests unit : ne pas tester via le store, juste vérifier les méthodes existent + types compilent.
- Brancher dans `@apps/front` via auto-discovery Embroider (rien à faire normalement).

### P5.4 — MSW mocks (≈ 45 min)
- `src/http-mocks/backlog.ts` avec 3 epics + 10 US + 18 tasks + handlers complets.
- Export `allBacklogHandlers` consommé par `@apps/front/app/routes/application.ts`.
- Test manuel `curl localhost:4200/api/v1/projects/proj-1/epics` une fois `pnpm dev:front` lancé.

### P5.5 — Composants badges + TaskRow (≈ 1h)
- `src/components/task-type-badge.gts`, `task-nature-badge.gts` (TOC + i18n).
- `src/components/task-row.gts` : ligne dense avec `#number`, badges, titre, lien US, avatar, points.
- Tests rendering : 1 par composant.

### P5.6 — Route `/backlog` + template (≈ 1h)
- `src/routes/dashboard/backlog.ts` : `model()` lit `current-project`, appelle `tasks.loadBacklog(pid)` + `userStories.loadByProject(pid)`.
- `src/templates/dashboard/backlog.gts` : header, `BacklogFilters`, liste de `TaskRow`, empty state.
- Wiring `current-project` change → refresh model.
- Test intégration : rendu liste avec mock data, filtre actif.

### P5.7 — Route `/user-story-map` + template (≈ 1h30)
- `src/routes/dashboard/user-story-map.ts` : `model()` charge epics + US + tasks du projet courant.
- `src/templates/dashboard/user-story-map.gts` : hiérarchie `EpicRow → UserStoryRow → TaskRow` avec expand/collapse (tracked Set d'IDs).
- Tests : rendu de la hiérarchie complète, expand/collapse.

### P5.8 — Modales AddEpic + AddUserStory (≈ 1h30)
- `src/components/add-epic-modal.gts` (DaisyUI dialog, 3 champs, validation client).
- `src/components/add-user-story-modal.gts` (5 champs avec select epic, validation client).
- Wiring depuis `/user-story-map` (boutons inline + top-right).
- Tests : rendu modales + submit happy path.

### P5.9 — i18n + visual polish (≈ 45 min)
- Yaml `@apps/front/translations/backlog/{fr-fr,en-us}.yaml` complet.
- Wiring `{{t "backlog.*"}}` partout.
- Vérification visuelle `pnpm dev` : screenshots des 2 routes + 2 modales.

### P5.10 — Lint + tests + commit final (≈ 30 min)
- `pnpm lint` vert sur `@libs/backlog-front` et `@apps/front`.
- `pnpm test` vert (≈ 15-20 tests prévus).
- Sanity check : forcer un échec.
- Commits par phase (P5.0, P5.1, … ou regroupés par lot cohérent).
- Plan déplacé `specs/todo/ → specs/done/`.

### P5.11 — PR + handoff (≈ 15 min)
- Push branche `feat/p5-backlog-front` (depuis `dev`).
- `gh pr create --base dev` avec checklist Test plan.
- Handoff `specs/handoffs/006-*.md` documentant ce qui a été livré et les dettes éventuelles.

---

## 5. Stratégie de test

### Tests unitaires (smoke schemas)
Bloquants. 3 fichiers × 3 tests minimum = 9 tests. Cas couverts :
1. Le `type` correspond au backend.
2. Les fields déclarés correspondent aux entités backend.
3. Tous les fields sont en `kind: "attribute"` (relations à P6+).

### Tests intégration (rendering) — **bloquants, pas substituables**
Critère P4.12 reproduit en P5. Total estimé : **12-15 tests**.
- `TaskRow` : 2 tests (rendu basic FR + variant avec/sans US liée).
- `BacklogFilters` : 1 test (toggle filtre → liste filtrée).
- `EpicRow` : 2 tests (collapsed par défaut, expand révèle US).
- `UserStoryRow` : 1 test (rendu basic).
- `AddEpicModal` : 2 tests (rendu champs + soumission OK).
- `AddUserStoryModal` : 2 tests (rendu + select epic optionnel).
- Template `/backlog` : 1 test (liste + empty state).
- Template `/user-story-map` : 1 test (hiérarchie + expand).

### Vérification visuelle manuelle
- `pnpm dev` + Playwright MCP screenshot.
- 4 captures dans `specs/review-screenshots/` :
  - `p5-backlog-grid.png`
  - `p5-usm-hierarchy.png`
  - `p5-modal-add-epic.png`
  - `p5-modal-add-user-story.png`
- Comparer aux screenshots Figma référence.

### Sanity test
Avant d'annoncer "tests verts", forcer un `expect(...).toContain('IMPOSSIBLE_STRING')` dans un test et vérifier que la suite échoue. Cf. `[[feedback-tests-sanity]]`.

---

## 6. Critères de succès (numérotés, vérifiables)

1. **`@libs/backlog-front` existe** : scaffold via `/new-library` + dépendances correctes.
2. **3 schemas WarpDrive** : `epics`, `user-stories`, `tasks` avec tous les attributs des entités backend.
3. **3 services** : `epics`, `user-stories`, `tasks` exposent `loadByProject(pid)` (et `loadByEpic`, `loadByUserStory` quand pertinent), `findById`, `create` (epics+US uniquement).
4. **MSW mocks complets** : 3 epics + 10 US + 18 tasks + handlers GET/POST. `curl` retourne du JSON:API valide.
5. **Route `/backlog` fonctionnelle** : liste affichée, filtres opérationnels, empty state quand pas de projet courant. Bouton "+ Nouvelle tâche" présent mais `disabled` avec tooltip "Disponible en P6".
6. **Route `/user-story-map` fonctionnelle** : hiérarchie repliable Épique → US → Task, boutons "+ Nouvelle épique" / "+ Nouvelle US" inline qui ouvrent les modales correspondantes.
7. **Modale AddEpic** : ouverture/fermeture, validation client (titre obligatoire), POST `/api/v1/epics`, refresh liste après création.
8. **Modale AddUserStory** : idem + select épique parente (optionnel) alimenté par `epics.list` du projet courant.
9. **i18n wiring complet** : aucune string FR hardcodée dans les composants — tout passe par `{{t "backlog.*"}}` ou `{{t "userStoryMap.*"}}` ou `{{t "modal.addEpic.*"}}` etc. Yaml FR + EN à jour.
10. **`pnpm lint` vert** : `@libs/backlog-front` ET `@apps/front` (vérifie qu'aucun usage des nouveaux composants ne casse côté app).
11. **`pnpm test` vert** : `@libs/backlog-front` doit avoir au minimum 12 tests intégration + 9 smoke = 21 tests. Suite verte.
12. **Sanity check passé** : preuve écrite (capture ou note) qu'un fail forcé est bien détecté par la suite.
13. **Validation visuelle** : 4 screenshots dans `specs/review-screenshots/` comparés aux références Figma + note de divergence si écart.
14. **Plan déplacé** : `specs/todo/p5-backlog-front.md → specs/done/p5-backlog-front.md` à la fin via `/TPK-build`.
15. **PR créée** : `gh pr create --base dev` avec body référençant ce plan + checklist Test plan cochée.
16. **Handoff écrit** : `specs/handoffs/006-*.md` documente livraison + dettes (drag-drop reporté P8, AddTask reporté P6).

---

## 7. Risques & mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| `?sprintId=null` non supporté côté backend | Le backlog renvoie toutes les tasks | P5.1 audit + fallback client-side `list.filter(t => !t.sprintId)` |
| `current-project` ne notifie pas les routes au changement | Listes périmées | Ajouter un observer dans les routes `backlog.ts`/`user-story-map.ts` (ou refresh manuel) |
| Modal `<dialog>` DaisyUI ne re-render pas correctement au changement de tracked | Modal "fantôme" reste affichée | Tester `{{#if this.modalOpen}}<Modal ...>{{/if}}` plutôt que toggle d'attribut |
| Palette type/nature non extraite du Figma | Badges colors inconsistants | Définir les couleurs dans `theme.css` (tokens `--color-task-type-bug`, etc.) lors du P5.5 — extraire via lecture rapide du Make file ou des screenshots |
| Le drag-drop déjà demandé par l'utilisateur en cours de P5 | Scope creep | Référence explicite à P8 dans la modale "Liste" → tooltip "Glissez vers un sprint (P8)" |

---

## 8. Notes annexes

- **Mémoires à respecter** :
  - `[[feedback-tests-sanity]]` — sanity check obligatoire avant "tests verts".
  - `[[feedback-tpkbutton]]` — TpkButton requiert `@label` + yield.
  - `[[feedback-self-imports]]` — pas d'imports `@libs/backlog-front/...` depuis l'intérieur (toujours relatif).
  - `[[feedback-warpd-create]]` — `store.request(createRecord())` renvoie JSON:API brut → toujours appeler `loadByProject(pid)` après le POST pour rafraîchir la liste.
  - `[[feedback-tpkdashboard-menu-block]]` — `TpkDashBoard` bloc `:menu` ignoré (déjà géré côté shell-front).
- **Branchement Git** : `feat/p5-backlog-front` partant de `dev` une fois la PR #7 (tech-debts P4) mergée.
- **Pré-requis CI** : la PR #7 doit être mergée AVANT de pusher P5, sinon conflits sur `@apps/front/app/routes/application.ts` et `pnpm-lock.yaml`.

---

## 9. Estimation totale

≈ **8-10 heures de dev focalisé**, hors review/itérations.

Phases parallélisables :
- P5.2 + P5.4 (schemas + mocks) peuvent se faire en parallèle.
- P5.5 (badges) peut se faire dès P5.0 terminé.
- P5.6 et P5.7 dépendent de P5.3 + P5.4.

Path critique : P5.0 → P5.1 → P5.3 → P5.6 → P5.10 → P5.11.
