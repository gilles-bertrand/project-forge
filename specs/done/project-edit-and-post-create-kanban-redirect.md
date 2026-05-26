# Édition d'un projet + Redirection Kanban après création

## Problème

Deux frictions UX dans le flow projets :

1. **Pas d'édition possible côté front** — une fois le projet créé, aucun bouton ni route ne permet de modifier son nom, sa description, son statut, son responsable ou son `githubUrl`. Pourtant l'endpoint `PATCH /api/v1/projects/:id` existe déjà côté backend (`@libs/scrum-backend/src/project/routes/update.route.ts`) ET son mock MSW est en place (`@libs/projects-front/src/http-mocks/projects.ts:169`). Le manque est uniquement frontal.
2. **Mauvais flow post-création** — après avoir validé la modale `AddProjectModal` (`@libs/projects-front/src/components/add-project-modal.gts:122`), l'utilisateur retombe sur la liste des projets. L'attente naturelle après création d'un projet est d'arriver sur le **kanban** de ce nouveau projet (avec `currentProject` positionné dessus), pour démarrer immédiatement la planification.

## Objectifs

- Permettre d'éditer les attributs d'un projet existant (`name`, `description`, `status`, `responsibleId`, `githubUrl` — `avatar` peut rester hors scope tant qu'on n'a pas d'upload).
- Après création, naviguer automatiquement vers `dashboard.kanban` en positionnant `currentProject` sur le projet fraîchement créé.

## Approche technique

### Architecture choisie

**Refactor de `AddProjectModal` en `ProjectFormModal` paramétré** plutôt que duplication en `EditProjectModal`. La modale accepte un `@project: Project | null` :
- `null` → mode création (comportement actuel)
- `Project` → mode édition (champs préremplis, soumission via `update()`)

Avantages :
- Évite la duplication formulaire / validations / sélecteur responsable / sélecteur membres.
- Conserve les data-test attributes (avec un suffixe `data-test-project-form-modal-mode="create|edit"` pour les E2E).
- Cohérent avec le style monorepo (composants paramétrés plutôt que fragmentés).

L'édition est accessible depuis **deux points d'entrée** :
- Bouton **"Modifier"** dans le footer du `ProjectDetailModal` (à gauche de "Voir le Kanban").
- Icône ✏️ sur la `ProjectCard` apparaissant au hover (overlay absolu, `stopPropagation` pour ne pas déclencher l'ouverture de la modale détail).

### Architectural Context

- **Communities touched** : `projects-front` (UI), `shell-front` (service `current-project`, route `kanban`), `scrum-backend` (endpoint déjà présent — aucun changement).
- **Contrats à risque** : aucun changement de schéma JSON:API ; on consomme uniquement les schémas existants (`SerializedProjectSchema`, `ProjectStatusSchema`).
- **God nodes** : `ProjectsService` (devient le seul point d'entrée pour create / update / loadAll — il faut éviter de le faire diverger via `fetch` brut).

### Règles obligatoires respectées

- Pas de `fetch()` brut côté `@libs/projects-front/src/services/` → tout passe par `store.request()` (déjà la convention dans `ProjectsService.create`). On garde le même pattern WarpDrive pour `update()`.
- `ProjectsService.update()` doit appeler `loadAll()` ensuite pour rafraîchir la liste affichée (cohérent avec `create`).
- Garder `(json.data ?? []).map(...)` robuste — non concerné ici, on ne reçoit qu'un seul objet.

## Implémentation

### Phase 1 — `ProjectsService.update()` + `addMember()` + `removeMember()`

Fichier : `@libs/projects-front/src/services/projects.ts`

Ajouter :

```typescript
export type UpdateProjectPayload = Partial<Pick<
  NewProjectPayload,
  "name" | "description" | "status" | "avatar" | "githubUrl" | "responsibleId"
>>;

public async update(id: string, data: UpdateProjectPayload): Promise<Project> {
  const body = {
    data: {
      type: "projects",
      id,
      attributes: data,
    },
  };
  await this.store.request<{ data: Project }>({
    url: `/api/v1/projects/${id}`,
    method: "PATCH",
    headers: { "Content-Type": "application/vnd.api+json" },
    body: JSON.stringify(body),
  });
  await this.loadAll();
  const updated = this.list.find((p) => p.id === id);
  if (!updated) {
    throw new Error(`Project ${id} disappeared after update`);
  }
  return updated;
}
```

Notes :
- On reste sur `store.request` (passe par `AuthHandler` → Bearer attaché).
- Le backend PATCH renvoie un document JSON:API `{ data: SerializedProject }` ; on ne s'en sert pas directement, on reload pour rester aligné avec `create`.

Ajouter également `addMember` et `removeMember` :

```typescript
public async addMember(projectId: string, userId: string): Promise<void> {
  await this.store.request({
    url: `/api/v1/projects/${projectId}/members`,
    method: "POST",
    headers: { "Content-Type": "application/vnd.api+json" },
    body: JSON.stringify({
      data: { attributes: { userId, role: "member" } },
    }),
  });
}

public async removeMember(projectId: string, userId: string): Promise<void> {
  await this.store.request({
    url: `/api/v1/projects/${projectId}/members/${userId}`,
    method: "DELETE",
  });
}
```

Notes membres :
- `addMember` assigne toujours le rôle `"member"` (le responsable est géré via `responsibleId` sur le projet lui-même).
- Le backend retourne 409 si l'utilisateur est déjà membre — ignorer silencieusement ce cas (idempotence).
- `removeMember` → 204 No Content ; le backend retourne 404 si le membre n'existe pas — ignorer également.

### Phase 2 — Refactor `AddProjectModal` → `ProjectFormModal`

Fichier : `@libs/projects-front/src/components/add-project-modal.gts`

Renommer le fichier en `project-form-modal.gts`. Signature mise à jour :

```typescript
interface ProjectFormModalSignature {
  Args: {
    project?: Project | null;       // null/undefined → création, Project → édition
    onClose: () => void;
    onCreated?: (project: Project) => void;  // callback dédié création
    onUpdated?: (project: Project) => void;  // callback dédié édition
  };
}
```

Changements internes :
- Dans le constructeur : si `args.project` est défini, initialiser `name`, `description`, `status`, `responsibleId` depuis l'objet ET charger les membres actuels via `projects.loadMembers(id)` → stocker dans `originalMemberIds: string[]` (readonly snapshot) et `selectedMemberIds` (éditable).
- Getter `mode: "create" | "edit"` dérivé de `args.project`.
- Titres / labels boutons via i18n conditionnels :
  - `projects.modal.add.title` / `projects.modal.edit.title`
  - `projects.modal.add.submit` (« Créer le projet ») / `projects.modal.edit.submit` (« Enregistrer »)
  - `projects.modal.add.submitting` / `projects.modal.edit.submitting`
- Dans `submit()` :
  - Si `mode === "create"` → `await projects.create(...)` → `onCreated?.(created)` → `onClose()`
  - Si `mode === "edit"` :
    1. `await projects.update(args.project.id, { name, description, status, responsibleId })`
    2. Calculer le diff membres :
       - `toAdd = selectedMemberIds.filter(id => !originalMemberIds.includes(id))`
       - `toRemove = originalMemberIds.filter(id => !selectedMemberIds.includes(id))`
    3. `await Promise.all([...toAdd.map(id => projects.addMember(projectId, id)), ...toRemove.map(id => projects.removeMember(projectId, id))])`
    4. `onUpdated?.(updated)` → `onClose()`

⚠️ Les erreurs 409 (membre déjà existant) et 404 (membre déjà retiré) doivent être ignorées silencieusement dans `addMember`/`removeMember` (`catch` sélectif sur le status).

Mettre à jour les `data-test-*` :
- `data-test-add-project-modal` → `data-test-project-form-modal`
- Ajouter `data-test-project-form-mode="create|edit"`

Mettre à jour le `import` dans `templates/dashboard/projects.gts` (renommer `AddProjectModal` → `ProjectFormModal`).

### Phase 3 — Deux points d'entrée pour l'édition

#### 3a — Bouton "Modifier" dans `ProjectDetailModal`

Fichier : `@libs/projects-front/src/components/project-detail-modal.gts`

Ajouter un argument `@onEdit: (project: Project) => void` et un bouton dans le footer (entre "Fermer" et "Voir le Kanban") :

```handlebars
<button
  type="button"
  class="btn btn-outline"
  {{on "click" this.handleEdit}}
  data-test-project-detail-edit
>
  {{t "projects.modal.detail.edit"}}
</button>
```

Action :

```typescript
@action handleEdit() {
  this.args.onEdit(this.args.project);
  this.args.onClose();
}
```

#### 3b — Icône ✏️ au hover sur `ProjectCard`

Fichier : `@libs/projects-front/src/components/project-card.gts`

Ajouter un argument `@onEdit?: (project: Project) => void` à la signature. Wrapper le `div` racine avec la classe Tailwind `group` et ajouter l'icône positionnée en absolu dans le coin supérieur droit, visible uniquement au hover :

```handlebars
<div
  role="button"
  tabindex="0"
  class="card bg-base-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group"
  {{on "click" (fn @onOpen @project)}}
  data-test-project-card
  ...attributes
>
  {{#if @onEdit}}
    <button
      type="button"
      class="absolute top-3 right-3 btn btn-xs btn-ghost opacity-0 group-hover:opacity-100 transition-opacity"
      aria-label={{t "projects.card.editAria"}}
      {{on "click" (fn this.handleEdit @project)}}
      data-test-project-card-edit
    >
      ✏️
    </button>
  {{/if}}
  ...
```

Action dans le composant (stoper la propagation pour ne pas ouvrir la modale détail) :

```typescript
@action handleEdit(project: Project, e: Event) {
  e.stopPropagation();
  this.args.onEdit?.(project);
}
```

### Phase 4 — Orchestration dans la route projects

Fichier : `@libs/projects-front/src/templates/dashboard/projects.gts`

Étendre le composant template :

```typescript
@tracked addModalOpen = false;
@tracked editProject: Project | null = null;
@tracked detailProject: Project | null = null;

@action openEdit(p: Project) {
  this.editProject = p;
}

@action closeEdit() {
  this.editProject = null;
}
```

Template — passer `@onEdit` au `ProjectDetailModal` et rendre la modale d'édition :

```handlebars
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {{#each this.projects.list as |p|}}
    <ProjectCard @project={{p}} @onOpen={{this.openDetail}} @onEdit={{this.openEdit}} />
  {{/each}}
</div>

{{#if this.detailProject}}
  <ProjectDetailModal
    @project={{this.detailProject}}
    @onClose={{this.closeDetail}}
    @onEdit={{this.openEdit}}
  />
{{/if}}
{{#if this.editProject}}
  <ProjectFormModal
    @project={{this.editProject}}
    @onClose={{this.closeEdit}}
  />
{{/if}}
{{#if this.addModalOpen}}
  <ProjectFormModal
    @onClose={{this.closeAdd}}
    @onCreated={{this.handleCreated}}
  />
{{/if}}
```

### Phase 5 — Redirection Kanban après création

Toujours dans `templates/dashboard/projects.gts` :

```typescript
@service declare router: RouterService;
@service declare currentProject: CurrentProjectService;

@action handleCreated(project: Project) {
  this.addModalOpen = false;
  if (project.id) {
    this.currentProject.setCurrent(project.id);
    void this.router.transitionTo("dashboard.kanban");
  }
}
```

Imports nouveaux :

```typescript
import { service } from "@ember/service";
import type RouterService from "@ember/routing/router-service";
import type CurrentProjectService from "@libs/shell-front/services/current-project";
```

Le `ProjectFormModal` n'a plus à connaître ce comportement — il signale juste la création via `@onCreated`. Cela respecte le principe « la modale ne sait pas où elle est utilisée ».

### Phase 6 — Traductions

Fichier : `@apps/front/translations/projects/fr-fr.yaml`

Ajouter la branche `modal.edit` (à côté de `modal.add`) :

```yaml
modal:
  add:
    # … existant
  edit:
    title: 'Modifier le projet'
    closeAria: 'Fermer'
    submit: 'Enregistrer'
    submitting: 'Enregistrement…'
    errorFallback: 'Erreur lors de la mise à jour'
  detail:
    # … existant
    edit: 'Modifier'
```

Idem dans `en-us.yaml` (équivalents anglais).

⚠️ **Rappel** : `i18n` dans ce projet utilise le folder name comme préfixe — toutes ces clés seront sous `projects.modal.edit.*`. Redémarrer Vite après ajout pour purger le cache.

## Stratégie de test

### Tests unitaires

- `@libs/projects-front/tests/integration/services/projects-test.ts`
  - Existant à vérifier — sinon créer : test `update()` qui mock le PATCH MSW et vérifie qu'après l'appel, `service.list` reflète la nouvelle valeur de `name`.
- `@libs/projects-front/tests/integration/components/project-form-modal-test.gts`
  - Test mode création : champs vides, soumission appelle `projects.create`.
  - Test mode édition : `@project` fourni → champs préremplis, soumission appelle `projects.update(id, …)`.
  - Test `@onCreated` appelé une fois la création réussie.

⚠️ Convention : fichiers tests `*-test.gts` (avec un dash, pas un point) — sinon Vitest ne les inclut pas.

### Tests d'intégration / E2E (bloquants)

⚠️ Ces deux tests sont des **critères de succès bloquants** — un smoke test manuel ne suffit pas, ils doivent passer dans la suite Playwright avant que le plan soit déplacé en `done/`.

- `@apps/e2e/tests/uat/projects-edit.spec.ts` — login Alice → ouvrir projet existant → cliquer "Modifier" → changer le nom → enregistrer → vérifier que le nom apparaît dans la liste.
- `@apps/e2e/tests/uat/projects-create-redirect.spec.ts` — login Alice → "Nouveau projet" → remplir formulaire → soumettre → vérifier URL `/dashboard/kanban` ET vérifier que le sélecteur de projet du shell affiche le projet créé.

Utiliser `data-test-*` exclusivement (pas `getByRole(text)` — casse avec i18n et strict mode).

## Critères de succès

Chaque critère sera vérifié explicitement par `/TPK-build` avant de déplacer ce plan vers `specs/done/`.

1. ✅ `ProjectsService.update(id, payload)` existe, passe par `store.request()` (pas de `fetch` brut), reload la liste après le PATCH.
2. ✅ `ProjectsService.addMember(projectId, userId)` et `removeMember(projectId, userId)` existent, ignorent silencieusement les 409/404.
3. ✅ `ProjectFormModal` accepte `@project` optionnel et bascule entre modes création / édition (titre, label bouton, payload submit).
4. ✅ En mode édition, les membres existants sont pré-cochés et le diff `toAdd`/`toRemove` est calculé et soumis à la fermeture.
5. ✅ Le `ProjectDetailModal` expose un bouton "Modifier" (`data-test-project-detail-edit`) qui ouvre la modale formulaire en mode édition.
6. ✅ La `ProjectCard` affiche une icône ✏️ au hover (`data-test-project-card-edit`) avec `stopPropagation` qui ouvre directement la modale édition sans déclencher la modale détail.
7. ✅ Après création réussie, navigation automatique vers `dashboard.kanban` ET `currentProject.currentProjectId` vaut l'ID du nouveau projet (persisté en localStorage).
8. ✅ Traductions `projects.modal.edit.*`, `projects.modal.detail.edit` et `projects.card.editAria` présentes dans `fr-fr.yaml` et `en-us.yaml`.
9. ✅ `pnpm turbo lint` passe sans nouvel warning (ESLint + template-lint frontend).
10. ✅ `pnpm build` (front) passe sans erreur TypeScript.
11. ✅ Test d'intégration `project-form-modal-test.gts` créé et vert (mode création + mode édition + diff membres).
12. ✅ Test E2E `projects-edit.spec.ts` vert — édition via modale détail + édition via icône carte.
13. ✅ Test E2E `projects-create-redirect.spec.ts` vert — redirection vers `/dashboard/kanban` après création.

## Risques & points d'attention

- **Schema WarpDrive** : vérifier que `ProjectSchema` est bien enregistré dans `@apps/front/app/services/store.ts` avant de tester le PATCH — sinon la réponse est silencieusement filtrée et `loadAll()` retourne `[]`. Ce schéma est déjà présent dans le code actuel, mais tout ajout de champ côté backend doit rester aligné.

- **Diff membres en mode édition — pas de rollback** : les appels `addMember`/`removeMember` sont exécutés en parallèle (`Promise.all`). Si l'un échoue à mi-parcours, les membres peuvent être partiellement mis à jour sans mécanisme de rollback. Acceptable en V1. Mitigation : les erreurs 409 (déjà membre) et 404 (déjà retiré) sont ignorées ; les vraies erreurs (5xx) remontent dans le bloc `catch` global du `submit`.

- **Icône edit sur `ProjectCard` — conflit de clic** : le `div` racine est `role="button"` avec un handler `on "click"` qui ouvre la modale détail. L'icône ✏️ est un `<button>` enfant — le `stopPropagation` est obligatoire pour éviter le double déclenchement. Sans lui, cliquer sur l'icône ouvre simultanément la modale détail ET la modale édition.

- **Responsable exclu du diff membres** : le `responsibleId` est un attribut du projet (PATCH), pas un `ProjectMember`. Ne pas ajouter le responsable dans `selectedMemberIds` pour éviter de le retrouver dans `toAdd` et créer un doublon membership.

- **Navigation kanban** : `router.transitionTo("dashboard.kanban")` est confirmé monté par `@libs/shell-front/forRouter()`. Risque zéro si la lib est bien importée dans `@apps/front/app/router.ts` (vérifié).

- **localStorage** : `currentProject.setCurrent` persiste le projet créé — au reload, l'utilisateur reste dessus. Comportement voulu et cohérent avec le reste du shell.
