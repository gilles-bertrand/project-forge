# Projects view — fixes, grid/list toggle, delete, locked owner, action bar

## Contexte

Cinq correctifs/améliorations sur l'écran **Projects** (`/dashboard/projects`) et la home dashboard, suite à utilisation réelle :

1. La home dashboard (`/`) ne montre plus le tableau de bord attendu (KPI/sprint actif).
2. Pas de bascule grille/liste sur la vue Projects → écran encombré pour > 6 projets.
3. Aucun moyen de supprimer un projet (UI manquante, backend OK).
4. Le responsable du projet est dé-sélectionnable dans la liste des membres du formulaire ; il devrait être imposé comme membre.
5. Pas de raccourci direct depuis la card projet vers ses vues filtrées (backlog, kanban du sprint actif, sprints).

---

## Architectural Context (advisory, lecture du graphe)

- **Communautés touchées** : `projects-front` (services, components, templates), `shell-front` (current-project service, routes), `dashboard-front` (route index + template), `backlog-front`/`sprints-front`/`kanban` (templates filtrés cible des liens).
- **God nodes** : `ProjectsService` (`@libs/projects-front/src/services/projects.ts`), `CurrentProjectService` (`@libs/shell-front/src/services/current-project.ts`) — toute extension doit conserver la signature publique existante.
- **Contrats cross-lib à risque** :
  - `setCurrent(id)` / `currentProjectId` consommés par backlog, kanban, sprints, time-tracking et dashboard. Ne pas casser.
  - Mocks MSW (`@libs/projects-front/src/http-mocks/projects.ts`) — la suppression mock existe déjà (l.188).
  - Schemas JSON:API enregistrés dans `@apps/front/app/services/store.ts` (rappel CLAUDE.md).

---

## État du code (vérifié)

| Élément | État | Référence |
|---|---|---|
| Backend `DELETE /api/v1/projects/:id` | ✅ existe, renvoie 204 / 404 / 409 | `@libs/scrum-backend/src/project/routes/delete.route.ts:23-68` |
| Mock MSW DELETE | ✅ existe | `@libs/projects-front/src/http-mocks/projects.ts:188-196` |
| `ProjectsService.delete()` | ❌ absent | `@libs/projects-front/src/services/projects.ts` |
| Toggle grille/liste | ❌ aucun composant dans `shared-front` | — |
| Owner verrouillé comme membre | ❌ `toggleMember(responsibleId)` autorisé | `@libs/projects-front/src/components/project-form-modal.gts:148-154` |
| Liens action sur card | ❌ seul "View Kanban" existe (dans la modale détail) | `@libs/projects-front/src/components/project-detail-modal.gts:73-78` |
| Home dashboard | ✅ rendue par `dashboard-front` → KPIs si `activeSprint`, sinon alert "no active sprint" | `@libs/dashboard-front/src/routes/dashboard/index.ts:22-33` + `@libs/dashboard-front/src/templates/dashboard/index.gts:30-52` |

**Pour le point 1** : analyse `git log` ⇒ **commit `489ea0d` (P10, 16/05/2026)** a créé `@libs/dashboard-front` et supprimé l'ancien placeholder `@libs/shell-front/src/templates/dashboard/index.gts` (33 lignes, contenait 3 cards stats statiques + PlaceholderPage).

Conséquence : le nouveau template `dashboard-front` rend :
- Si `currentProject.currentProjectId && activeSprint` → KPI Row + grille de tâches ✅
- **Sinon → uniquement un `<div class="alert alert-info">No active sprint</div>`** ⚠️

Comme l'utilisateur n'a probablement pas de sprint démarré sur son projet courant (ou aucun projet sélectionné), il voit l'alert info au lieu d'un dashboard. **Ce n'est pas une régression d'exécution, c'est un design incomplet** : l'état "no active sprint" n'apporte pas de valeur.

Pas besoin d'investiguer plus avant — la cause est connue, il faut enrichir l'état "no active sprint" (Phase 1).

---

## Phase 1 — Enrichir le dashboard home sans sprint actif (fix #1)

### Cause identifiée (via `git log` et `git show 489ea0d`)
Commit **`489ea0d`** (P10, 16/05/2026) — `feat(dashboard-front): KPIs réels + Sprint tasks grid` :
- a supprimé le placeholder `@libs/shell-front/src/templates/dashboard/index.gts` (33 lignes, 3 cards stats statiques)
- a créé `@libs/dashboard-front/src/templates/dashboard/index.gts` qui n'affiche **rien d'utile sans sprint actif** (juste une alert info).

L'écran "dashboard" perçu par l'utilisateur n'est donc pas un autre écran : **c'est l'état dégradé "no active sprint"** du nouveau dashboard. Cohérent avec les memories (TPK retrospective P10).

### Objectif
Rendre la home **utile dans tous les cas** :
- pas de projet courant → liste compacte des projets + CTA "Créer un projet"
- projet courant sans sprint actif → résumé projet (nom + compteurs Epics/US/Tasks) + CTA "Démarrer un sprint", "Voir le backlog"
- projet courant avec sprint actif → comportement actuel inchangé (KPI Row + tasks grid)

### Étapes
1. **Étendre le model** dans `@libs/dashboard-front/src/routes/dashboard/index.ts` pour récupérer :
   - `projects: Project[]` (depuis `ProjectsService.list`, déjà chargé par la route parent)
   - `currentProject: Project | null` (lookup dans la liste à partir de `currentProject.currentProjectId`)
   - compteurs : `epicsCount`, `userStoriesCount`, `tasksByStatus` — soit via tasks déjà chargées (filtrage local sur `tasksByProject`), soit via endpoint dédié si tasks vides.

   ```typescript
   async model(): Promise<DashboardIndexModel> {
     const projectId = this.currentProject.currentProjectId;
     await this.projects.loadAll(); // idempotent : la route parent l'a déjà fait
     const currentProject = projectId ? this.projects.list.find(p => p.id === projectId) ?? null : null;
     if (!projectId || !currentProject) {
       return { mode: 'no-project', projects: this.projects.list };
     }
     const [activeSprint, tasks, summary] = await Promise.all([
       this.sprints.loadActive(projectId),
       this.tasks.loadAllByProject(projectId),
       this.timeEntries.loadSummary('week', projectId),
     ]);
     return activeSprint
       ? { mode: 'with-sprint', currentProject, activeSprint, tasks, totalHours: summary.totalHours }
       : { mode: 'no-sprint', currentProject, tasks };
   }
   ```
   ⚠️ Discriminated union avec champ `mode` pour clarté template.

2. **Mettre à jour le template** `@libs/dashboard-front/src/templates/dashboard/index.gts` :
   - 3 branches `{{#if (eq @model.mode 'with-sprint')}} ... {{else if (eq @model.mode 'no-sprint')}} ... {{else}} ...`
   - Branche `no-sprint` : header projet + compteurs (4 cards : Epics / User Stories / Tasks en cours / Tasks done) + 2 CTA (`dashboard.sprints` + `dashboard.backlog`).
   - Branche `no-project` : message + liste compacte des projets disponibles (cliquables → `setCurrent` + reload route) + CTA "Créer un projet" qui transitionne vers `dashboard.projects` et ouvre la modale.

3. **i18n** : ajouter dans `@apps/front/translations/dashboard/{fr-fr,en-us}.yaml` :
   - `dashboard.noProject.title` / `.subtitle` / `.cta.create` / `.cta.select`
   - `dashboard.noSprint.title` / `.subtitle` / `.cta.startSprint` / `.cta.viewBacklog`
   - `dashboard.counts.epics` / `.userStories` / `.tasksInProgress` / `.tasksDone`

4. **Tests d'intégration** `@libs/dashboard-front/tests/integration/templates/dashboard-index-test.gts` (nouveau) :
   - 3 cas : `with-sprint`, `no-sprint`, `no-project`.
   - Mock du model dans chaque cas, assertion sur la présence des CTAs et compteurs.

5. **Régression** : vérifier que le test E2E existant (s'il y en a un sur la home) reste vert.

### Fichiers touchés
- `@libs/dashboard-front/src/routes/dashboard/index.ts`
- `@libs/dashboard-front/src/templates/dashboard/index.gts`
- `@libs/dashboard-front/src/components/dashboard-project-counts.gts` (nouveau, optionnel, pour factoriser les 4 cards)
- `@apps/front/translations/dashboard/{fr-fr,en-us}.yaml`
- `@libs/dashboard-front/tests/integration/templates/dashboard-index-test.gts` (nouveau)
- `@libs/dashboard-front/tests/app.ts` (clés i18n)

### Critères d'acceptation
- Sans projet sélectionné : affichage liste projets + CTA "Créer".
- Projet sans sprint actif : nom du projet + 4 compteurs + 2 CTA visibles.
- Projet avec sprint actif : KPI row + tasks grid (inchangé).
- 3 tests d'intégration verts (`with-sprint`, `no-sprint`, `no-project`).

---

## Phase 2 — Toggle grille/liste sur Projects via TpkTable (fix #2)

### Décision : utiliser TpkTable (`TableGenericPrefab`)

Au lieu d'un composant `ProjectRow` maison, **réutiliser `@triptyk/ember-ui` `TableGenericPrefab`** (alias TpkTable) déjà utilisé dans `@libs/users-front/src/components/user-table.gts:4-6`.

**Pourquoi** :
- Pagination, tri (server-side via JSON:API `page[number]/page[size]/sort`), recherche et état empty **gratuits**.
- Le backend `/api/v1/projects` (`@libs/scrum-backend/src/project/routes/list.route.ts:33-62`) supporte déjà `parseListQuery` (page, sort, `filter[search]`) et renvoie `meta: { total, pages }`.
- Schema WarpDrive `projects` enregistré (`@apps/front/app/services/store.ts:30`) → `entity: 'projects'` fonctionnera direct.
- Sort fields autorisés côté backend : `name`, `status`, `createdAt`, `updatedAt`.
- Cohérence visuelle avec `UserTable`.

**Inconvénient assumé** : `TpkTable` charge ses données **lui-même via le store** (`entity: 'projects'`), donc la même liste sera fetchée 2× (une fois par `ProjectsService.loadAll()` pour la grille, une fois par TpkTable pour le mode liste). Acceptable : la requête est cachée par WarpDrive, et l'utilisateur ne switche pas constamment.

### Layout retenu (option "raccourcis nav + menu admin")

| Nom | Statut | Resp. | Membres | Créé | Raccourcis | ⋮ |
|---|---|---|---|---|---|---|
| Atlas | active | AD | 5 | 12 mai | 📋 ▦ 🎯 | edit / delete |

- **6 colonnes triables/affichées** : `name` (sortable), `status` (sortable), responsable, nb membres, `createdAt` (sortable), raccourcis (colonne custom).
- **Colonne "Raccourcis"** : 3 boutons icon Backlog / Kanban / Sprints — implémentés via `columnsComponent` + `component: 'project-action-bar-cell'` (composant cellule custom rendu par TpkTable). Réutilise le même `ProjectActionBar` créé en Phase 5.
- **`actionMenu`** : 2 entrées Modifier / Supprimer (icons crayon / poubelle).
- **`rowClick`** : ouvre `ProjectDetailModal` (équivalent du `@onOpen` actuel de la card).
- **`defaultSortColumn: 'name'`**, `pageSizes: [10, 25, 50]`.

### Étapes

1. **Toggle UI** dans `DashboardProjectsTemplate` :
   - `@tracked viewMode: 'grid' | 'list'` initialisé via `localStorage.getItem('sprintforge:projects-view-mode') ?? 'grid'`.
   - 2 boutons icon (grille / liste) à droite du `TpkButton` newProject. Aria-labels traduits. État actif via classe `btn-active`.
   - `@action setViewMode(mode)` : tracked + `localStorage.setItem(...)`.

2. **Composant `ProjectsTable`** (nouveau, `@libs/projects-front/src/components/projects-table.gts`) :
   - Calque sur `user-table.gts` : `TableParams` getter avec `entity: 'projects'`, columns, actionMenu, rowClick.
   - Reçoit en args : `@onOpen`, `@onEdit`, `@onDelete` (callbacks du template parent — pour réutiliser la même orchestration modale que la grille).
   - Pour la colonne raccourcis : passer un `columnsComponent: { 'raccourcis': ProjectActionBarCell }` via l'arg `@columnsComponent` du prefab.
   - Pour les colonnes "responsable" et "nb membres" qui demandent un lookup, soit utiliser `renderElement` (callback retournant une string), soit créer 2 mini-components cellules custom (`ProjectResponsibleCell`, `ProjectMembersCountCell`). **Décision : `renderElement`** pour la simplicité (les avatars ne sont pas nécessaires en mode dense).

3. **Mini-composant `ProjectActionBarCell`** (`@libs/projects-front/src/components/project-action-bar-cell.gts`) :
   - Wrapper minimal autour de `<ProjectActionBar @project={{@element}} />` (Phase 5), avec stop-propagation pour ne pas déclencher le `rowClick`.

4. **Brancher dans `dashboard/projects.gts`** :
   ```gts
   {{#if (eq this.viewMode 'grid')}}
     <div class="grid ..."> ...cards... </div>
   {{else}}
     <ProjectsTable
       @onOpen={{this.openDetail}}
       @onEdit={{this.openEdit}}
       @onDelete={{this.requestDelete}}
     />
   {{/if}}
   ```

5. **i18n** :
   - `projects.view.grid` / `.gridAria` / `.list` / `.listAria`
   - `projects.table.headers.name` / `.status` / `.responsible` / `.members` / `.createdAt` / `.actions`
   - `projects.table.actions.edit` / `.delete` / `.backlog` / `.kanban` / `.sprints`

6. **Tests d'intégration** (`projects-table-test.gts`) :
   - Render dans un contexte avec mock du store ; vérifier que les colonnes apparaissent, que `rowClick` appelle `onOpen`, que `actionMenu` expose 2 entrées.
   - Note : tester directement TpkTable est complexe (fetch via store) — un test d'intégration "smoke" peut suffire ; les tests profonds restent dans le repo de `@triptyk/ember-ui`.
   - Test du toggle (`projects-template-test.gts`) : monter le template, cliquer toggle, vérifier `localStorage` + bascule visible.

7. **E2E Playwright** (`@apps/e2e/tests/uat/projects-view-toggle.spec.ts`) :
   - Aller sur `/dashboard/projects`, voir la grille, cliquer toggle liste, vérifier présence du tableau (`role=table`), trier par nom, recharger la page, vérifier que le mode liste persiste.

### Fichiers touchés
- `@libs/projects-front/src/templates/dashboard/projects.gts` (toggle + branche conditionnelle)
- `@libs/projects-front/src/components/projects-table.gts` (nouveau)
- `@libs/projects-front/src/components/project-action-bar-cell.gts` (nouveau, wrapper)
- `@libs/projects-front/tests/integration/projects-table-test.gts` (nouveau)
- `@libs/projects-front/tests/integration/projects-template-test.gts` (étendu pour couvrir le toggle)
- `@apps/front/translations/projects/{fr-fr,en-us}.yaml`
- `@libs/projects-front/tests/app.ts`
- `@apps/e2e/tests/uat/projects-view-toggle.spec.ts` (nouveau)

### Critères d'acceptation
- Toggle visible avec icônes grille/liste, état actif distinct, aria-labels FR/EN.
- Choix persisté en `localStorage['sprintforge:projects-view-mode']`.
- Mode liste : tableau TpkTable avec 6 colonnes, tri sur `name`/`status`/`createdAt`, pagination fonctionnelle.
- Clic ligne ⇒ ouvre `ProjectDetailModal` (orchestration template inchangée).
- Colonne raccourcis : 3 boutons (backlog/kanban/sprints) cliquables sans déclencher `rowClick`.
- actionMenu : Modifier ouvre `ProjectFormModal` en mode edit, Supprimer ouvre `ConfirmDeleteModal`.
- E2E `projects-view-toggle` vert (toggle + tri + persistance localStorage).

### Risques spécifiques à TpkTable
- **API non typée strictement** : `actionMenu[].action` reçoit `unknown` (cf. `user-table.gts:70,82`). Cast vers `Project` au runtime, type guard si paranoïaque.
- **`renderElement`** retourne `void` selon le `.d.ts` (l.19), mais l'usage réel rend une string (cf. comportement attendu). Vérifier au premier test ; si pb, passer en `component` + `columnsComponent`.
- **Recherche server-side** : la search bar du prefab envoie `filter[search]` — déjà supporté backend (l.41-45 de `list.route.ts`). Bonus gratuit.
- **MSW** : le mock GET `/api/v1/projects` retourne actuellement la liste complète ; vérifier qu'il interprète `page[size]`/`sort` ou au minimum qu'il renvoie `meta: { total, pages }` pour ne pas casser la pagination du widget.

---

## Phase 3 — Suppression de projet (fix #3)

### Objectif
Permettre de supprimer un projet depuis la card, la ligne liste, et la modale détail. Gérer le 409 (dépendances) avec un message clair.

### Étapes

#### 3.1 — Service
Ajouter dans `@libs/projects-front/src/services/projects.ts` :
```typescript
public async delete(id: string): Promise<void> {
  try {
    await this.store.request({
      url: `/api/v1/projects/${id}`,
      method: 'DELETE',
    });
  } catch (error: unknown) {
    const status = (error as { status?: number })?.status;
    if (status === 404) return; // déjà supprimé, idempotent
    throw error; // 409 et autres → remontent à l'UI
  }
  // Retirer du cache local sans refetch coûteux
  this.list = this.list.filter((p) => p.id !== id);
  // Si c'était le projet courant, déclencher reset (côté UI / shell)
}
```
NB : ne pas toucher `currentProject` ici (séparation des responsabilités) — c'est l'orchestrateur (template) qui décide.

#### 3.2 — UI : bouton delete

**Card** : ajouter un second bouton à côté du crayon, icône poubelle 🗑, classes identiques (`absolute top-2 right-12 btn-xs btn-ghost opacity-0 group-hover:opacity-100`). `data-test-project-card-delete`. `e.stopPropagation()` impératif.

**Mode liste (TpkTable)** : entrée `Supprimer` dans `actionMenu` (cf. Phase 2). Pas de bouton delete séparé en colonne — déjà couvert par le dropdown.

**Modal détail** : bouton "Supprimer" dans le footer, **style ghost rouge** (`btn-ghost text-error`), à gauche des autres boutons.

#### 3.3 — Confirmation
**Réutiliser `TpkConfirmModalPrefab`** de `@triptyk/ember-ui` (déjà importé dans `user-table.gts:8`). Pas besoin de composant maison `ConfirmDeleteModal` — exactement le même use case que la suppression d'utilisateur.

#### 3.4 — Orchestration dans le template
Dans `DashboardProjectsTemplate` :
```typescript
@tracked deleteTarget: Project | null = null;
@tracked deleteError = '';

@action requestDelete(p: Project) { this.deleteTarget = p; }
@action cancelDelete() { this.deleteTarget = null; this.deleteError = ''; }
@action async confirmDelete() {
  if (!this.deleteTarget?.id) return;
  try {
    await this.projects.delete(this.deleteTarget.id);
    // Si projet courant supprimé : reset + ensureDefault
    if (this.currentProject.currentProjectId === this.deleteTarget.id) {
      this.currentProject.clear();
      const ids = this.projects.list.map(p => p.id!).filter(Boolean);
      this.currentProject.ensureDefault(ids);
    }
    this.deleteTarget = null;
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    this.deleteError = status === 409
      ? this.intl.t('projects.delete.error.hasDependencies')
      : this.intl.t('projects.delete.error.generic');
  }
}
```

#### 3.5 — i18n
- `projects.delete.confirm.title` : "Supprimer ce projet ?"
- `projects.delete.confirm.body` : "Cette action est irréversible. Tous les éléments rattachés (epics, user stories, tâches, sprints) doivent être supprimés au préalable."
- `projects.delete.confirm.cancel` / `.confirm`
- `projects.delete.error.hasDependencies` / `.error.generic`
- `projects.card.deleteAria`

#### 3.6 — Tests
- Intégration : ouvrir confirm, annuler ⇒ pas d'appel ; confirmer ⇒ projet retiré de la liste ; cas 409 ⇒ message d'erreur affiché.
- E2E (Playwright) : `@apps/e2e/tests/uat/projects-delete.spec.ts` : créer un projet sans dépendances, le supprimer, vérifier disparition + toast/alert.

### Fichiers touchés
- `@libs/projects-front/src/services/projects.ts`
- `@libs/projects-front/src/components/project-card.gts`
- `@libs/projects-front/src/components/projects-table.gts` (entrée `Supprimer` dans `actionMenu`)
- `@libs/projects-front/src/components/project-detail-modal.gts`
- `@libs/projects-front/src/templates/dashboard/projects.gts` (orchestration `TpkConfirmModalPrefab`)
- `@libs/projects-front/tests/integration/...`
- `@apps/front/translations/projects/{fr-fr,en-us}.yaml`
- `@libs/projects-front/tests/app.ts`
- `@apps/e2e/tests/uat/projects-delete.spec.ts` (nouveau)

### Critères d'acceptation
- Bouton delete visible au hover sur card (icone à droite, distinct du crayon).
- Bouton delete dans la modale détail (rouge, à gauche).
- Confirm dialog s'affiche avec titre clair + message d'avertissement.
- Suppression effective retire la card de la grille/liste sans rechargement.
- 409 → message explicite, projet pas supprimé.
- Si projet supprimé était le `currentProject` → fallback automatique sur le premier projet restant.

---

## Phase 4 — Responsable verrouillé comme membre (fix #4)

### Objectif
Quand un responsable est sélectionné dans le `<select>`, il doit :
- être **automatiquement coché** dans la liste des membres
- avoir sa checkbox **disabled** (impossible à décocher)
- s'il change → l'ancien responsable redevient un membre normal (cochable/décochable), le nouveau est coché et lock

### Étapes
1. **`ProjectFormModal.gts`** :
   - Modifier `onResponsibleChange` :
     ```typescript
     @action onResponsibleChange(e: Event) {
       const newId = (e.target as HTMLSelectElement).value;
       this.responsibleId = newId;
       if (newId && !this.selectedMemberIds.includes(newId)) {
         this.selectedMemberIds = [...this.selectedMemberIds, newId];
       }
     }
     ```
   - Modifier `toggleMember` :
     ```typescript
     @action toggleMember(id: string) {
       if (id === this.responsibleId) return; // verrou
       // … logique existante
     }
     ```
   - Ajouter helper `isResponsible = (id: string) => id === this.responsibleId;`.
   - Dans le template, pour chaque checkbox :
     ```gts
     <input
       type="checkbox"
       class="checkbox checkbox-primary checkbox-sm"
       checked={{this.isMemberSelected u.id}}
       disabled={{this.isResponsible u.id}}
       {{on "change" (this.toggleMemberHandler u.id)}}
     />
     ```
   - Optionnel : ajouter un badge "Responsable" à côté du nom dans la checkbox quand `isResponsible u.id`.

2. **Mode édition initial** :
   Dans `loadMembersAndUsers`, après récupération des membres existants, garantir que `responsibleId` est inclus dans `selectedMemberIds` (en pratique il l'est déjà — défense en profondeur).

3. **Soumission** :
   La logique de diff actuelle (`toAdd`/`toRemove`) gère naturellement le responsable (s'il devient membre, il sera ajouté côté backend la première fois).

### Tests
- Intégration `project-form-modal-test.gts` :
  - Sélectionner responsable A → checkbox A cochée + disabled.
  - Changer responsable → A se débloque, B se coche et se verrouille.
  - En mode édition, charger un projet → la case du responsable est disabled dès l'ouverture.

### Fichiers touchés
- `@libs/projects-front/src/components/project-form-modal.gts`
- `@libs/projects-front/tests/integration/project-form-modal-test.gts`

### Critères d'acceptation
- Checkbox du responsable toujours cochée et grisée tant qu'il est responsable.
- Changer de responsable libère l'ancien et verrouille le nouveau.
- Création ET édition couvertes.

---

## Phase 5 — Barre d'actions sur card / ligne (fix #5)

### Objectif
Depuis la card (ou la ligne en mode liste), accès direct à :
- **Backlog du projet** → `dashboard.backlog` après `currentProject.setCurrent(id)`
- **Kanban du sprint actif** → `dashboard.kanban` après `currentProject.setCurrent(id)` (déjà existant dans la modale détail, à factoriser)
- **Sprints du projet** → `dashboard.sprints` après `currentProject.setCurrent(id)`

### Approche

Factoriser dans un composant `<ProjectActionBar @project={{p}} />` (`@libs/projects-front/src/components/project-action-bar.gts`) :
- 3 boutons icon-only (icônes existantes : `ListIcon`, `KanbanIcon`, `TargetIcon` — réutilisables depuis `shell-front/components/shell/layout.gts` ou inline locale).
- Tooltips i18n.
- Chaque bouton fait `e.stopPropagation()` (sinon ouvre la modale détail).
- Injection `RouterService` + `CurrentProjectService`.
- Émettre simplement des `transitionTo`, pas de callback parent (les services sont déjà partagés).

```typescript
@action goTo(route: 'dashboard.backlog' | 'dashboard.kanban' | 'dashboard.sprints', e: Event) {
  e.stopPropagation();
  if (this.args.project.id) this.currentProject.setCurrent(this.args.project.id);
  void this.router.transitionTo(route);
}
```

### Intégration

**Card** : insérer `<ProjectActionBar @project={{@project}} />` dans le card-body, avant les avatars membres. Visible **en permanence** (pas group-hover) sur la card pour faciliter la découverte. Style : trio de `btn btn-xs btn-ghost` alignés à gauche.

**Mode liste (TpkTable)** : `ProjectActionBar` est rendu dans la colonne "Raccourcis" via le wrapper `ProjectActionBarCell` (Phase 2 §3) ; il reçoit `@element` (le projet) du prefab et appelle `e.stopPropagation()` pour ne pas déclencher `rowClick`.

**Modal détail** : remplacer le bouton unique "View Kanban" par `<ProjectActionBar />` + conserver le CTA principal "View Kanban" en bouton plein.

### i18n
- `projects.action.backlog` / `.backlogAria`
- `projects.action.kanban` / `.kanbanAria`
- `projects.action.sprints` / `.sprintsAria`

### Tests
- Intégration : clic sur chaque bouton ⇒ `transitionTo` appelé avec la bonne route + `setCurrent` appelé avec l'id.
- Vérifier `e.stopPropagation` (clic action bar n'ouvre pas la modale détail).
- E2E : `@apps/e2e/tests/uat/projects-action-bar.spec.ts` : depuis Projects, cliquer "Kanban" sur la card ⇒ URL = `/dashboard/kanban` + bonne valeur `localStorage`.

### Fichiers touchés
- `@libs/projects-front/src/components/project-action-bar.gts` (nouveau)
- `@libs/projects-front/src/components/project-card.gts`
- `@libs/projects-front/src/components/projects-table.gts` (consomme via `ProjectActionBarCell`)
- `@libs/projects-front/src/components/project-detail-modal.gts`
- `@libs/projects-front/tests/integration/project-action-bar-test.gts` (nouveau)
- `@apps/front/translations/projects/{fr-fr,en-us}.yaml`
- `@libs/projects-front/tests/app.ts`
- `@apps/e2e/tests/uat/projects-action-bar.spec.ts` (nouveau)

### Critères d'acceptation
- Trois boutons visibles sur chaque card (et ligne liste).
- Clic propage `setCurrent` + `transitionTo` sans ouvrir la modale détail.
- Tooltips traduits FR/EN.

---

## Stratégie de tests d'intégration (bloquant `done/`)

**Tests à écrire / mettre à jour avant validation finale** :

| Fichier | Couverture |
|---|---|
| `@libs/dashboard-front/tests/integration/templates/dashboard-index-test.gts` | Phase 1 — empty state enrichi (cas sans sprint actif) |
| `@libs/projects-front/tests/integration/projects-template-test.gts` | Phase 2 — toggle grille/liste, persistance localStorage |
| `@libs/projects-front/tests/integration/projects-table-test.gts` | Phase 2 — TpkTable colonnes/rowClick/actionMenu (smoke) |
| `@libs/projects-front/tests/integration/projects-service-test.ts` | Phase 3 — `delete()`, gestion 404 idempotente, propagation 409 |
| `@libs/projects-front/tests/integration/project-form-modal-test.gts` | Phase 4 — responsable verrouillé |
| `@libs/projects-front/tests/integration/project-action-bar-test.gts` | Phase 5 — 3 raccourcis |

**Tests E2E Playwright** (`@apps/e2e/tests/uat/`) :
- `projects-delete.spec.ts`
- `projects-action-bar.spec.ts`
- `projects-view-toggle.spec.ts`

---

## Critères de succès (vérifiables un par un)

1. ✅ Dashboard home affiche du contenu utile **même sans sprint actif** (compteurs projet, CTA backlog/sprints).
2. ✅ Bouton toggle grille/liste visible dans la barre header de Projects, traduit FR/EN.
3. ✅ Mode "liste" rend `TpkTable` (`entity: 'projects'`) avec colonnes name/status/responsable/membres/createdAt/raccourcis, tri server-side, recherche, pagination, `rowClick` ouvrant la modale détail.
4. ✅ Choix grille/liste persisté en `localStorage` (clé `sprintforge:projects-view-mode`).
5. ✅ `ProjectsService.delete(id)` existe, gère 404 silencieux, propage 409.
6. ✅ Suppression accessible depuis card (hover), modal détail, et `actionMenu` TpkTable.
7. ✅ Confirmation obligatoire avant suppression via `TpkConfirmModalPrefab` (réutilisé de `@triptyk/ember-ui`).
8. ✅ Suppression du projet courant déclenche `ensureDefault` sur le projet suivant.
9. ✅ Erreur 409 ⇒ message explicite "supprimez d'abord les éléments rattachés".
10. ✅ Dans le formulaire, le responsable est automatiquement coché et verrouillé dans la liste des membres.
11. ✅ Changer de responsable libère l'ancien et verrouille le nouveau.
12. ✅ `ProjectActionBar` ajoute 3 boutons (backlog/kanban/sprints) avec tooltips, sur card + ligne + modale détail.
13. ✅ Clic action bar ⇒ `setCurrent` + `transitionTo` sans ouverture modale.
14. ✅ Tous les tests d'intégration passent (`pnpm test` dans chaque lib touchée).
15. ✅ Lint clean (`pnpm turbo lint` à la racine — pré-requis avant push selon `feedback-lint-before-push`).
16. ✅ E2E `projects-delete`, `projects-action-bar`, `projects-view-toggle` verts.
17. ✅ Aucune régression visible sur le flux create → kanban redirect existant.

---

## Risques & edge cases

| Risque | Mitigation |
|---|---|
| Suppression du projet courant sans projet de remplacement | `currentProject.clear()` + UI fallback : si liste vide → vue empty state existante. |
| Race condition : 2 onglets ouverts, suppression dans l'un | Le second onglet voit le 404 au prochain refresh ; pas de gestion temps réel (hors scope). |
| Owner change rapidement pendant chargement users (mode édition) | `loadMembersAndUsers` est append-only sur `originalMemberIds` ; le verrou se basant sur `responsibleId` tracked reste cohérent. |
| Toggle grille/liste pendant fetch initial | `viewMode` initialisé synchroniquement depuis localStorage — pas d'effet de flash car projects.list peut être vide pendant `loadAll`, mais le toggle reste utilisable. |
| Icons depuis layout.gts non exportés | Soit copier les SVG TOC localement dans `project-action-bar.gts` (low cost, KISS), soit extraire dans `@libs/shared-front/src/components/icons/` si on veut éviter la duplication — **décision : copier localement** (simplicité, pas de prematureoptimization). |
| Backend DELETE attend statut 204 mais MSW renvoie 204 avec body `{ data: null }` | Cohérent avec le schema backend (`makeSingleJsonApiTopDocument(literal(null))`), pas d'action. |
| `currentProject.setCurrent` non écouté par les routes filtrées | Vérifié : backlog, kanban, sprints lisent `currentProject.currentProjectId` ; suffisant. |
| Test `*.test.gts` (point) silencieusement skip par vitest | Toujours nommer `*-test.gts` (dash). Mémoire `feedback-test-file-naming`. |
| Schemas WarpDrive | `delete` n'introduit pas de nouveau `type:` ; aucun changement requis dans `@apps/front/app/services/store.ts`. |

---

## Plan de livraison

- **PR unique** sur `feat/project-edit-kanban-redirect` (déjà en cours) **OU** nouvelle branche `feat/projects-view-actions`.
- **Recommandation : nouvelle branche** `feat/projects-view-actions` à partir de `main` (la branche actuelle est volumineuse, mieux vaut séparer).
- Phases dans l'ordre : 4 → 3 → 5 → 2 → 1 (du moins risqué au plus exploratoire).

---

## Prochaines actions

1. Confirmer la branche cible (recommandation : `feat/projects-view-actions` depuis main).
2. Lancer Phase 1 — diagnostic dashboard live (Playwright screenshot + observation localStorage).
3. Exécuter `/TPK-build specs/todo/projects-view-fixes-and-actions.md`.
