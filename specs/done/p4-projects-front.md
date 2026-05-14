# P4 — Projects front (lib `@libs/projects-front`)

> Objectif : implémenter le domaine **Projets** côté frontend : nouvelle lib `@libs/projects-front`, route `/projects` (grille de cartes), modale `AddProject` (depuis bouton "+ Ajouter" du header), modale `ProjectDetail` (clic carte), branchement du `ProjectSelector` du shell sur la liste live. Référence visuelle : `docs/figma-screenshots/02-projects.png`, `16-modal-add-project.png`, `19-modal-project-detail.png`.

---

## 1. Contexte & rappels

### Acquis (P0–P3.5)
- Backend P2 expose les routes projects via `@libs/scrum-backend` :
  - `GET /api/v1/projects/` (list)
  - `POST /api/v1/projects/`
  - `GET /api/v1/projects/{id}`
  - `PATCH /api/v1/projects/{id}`
  - `DELETE /api/v1/projects/{id}`
  - `GET /api/v1/projects/{id}/members`, `POST`, `DELETE /{userId}`
  - `GET /api/v1/projects/{id}/tasks` (P6+)
  - `GET /api/v1/projects/{id}/sprints` (P8)
  - `GET /api/v1/projects/{id}/epics`, `/user-stories` (P5)
- Entité backend : `Project` = `{ name, description, status, …, members[] via project_members }`.
- Sérializer JSON:API : `type: "projects"`.
- Service `current-project` (P3) : tracked `currentProjectId`, persistance localStorage. **Pas de fetch** — il faut le brancher en P4.
- Shell layout (P3) : `<ProjectSelector @projects={{...}} />` reçoit la liste live. Composant déjà en place, prêt à être nourri.
- Bouton "+ Ajouter" du header (P3) : actuellement `disabled` avec tooltip "Disponible en P4". À activer + brancher sur la modale `AddProject`.
- Pattern de lib front : voir `@libs/users-front` (CRUD users, WarpDrive store, MSW mocks, routes `dashboard.users.*`).

### Cible Figma
- **`/projects`** : grille 3 colonnes de **ProjectCard** (avatar coloré, nom, badge status, description, barres de progression "User Stories x/y" + "Sprint en cours x/y", footer date + icônes kanban/chart, stack avatars membres, responsable).
- **Bouton "+ Nouveau projet"** top-right de la page → ouvre **AddProjectModal**.
- **Modale AddProject** (`16-modal-add-project.png`) : champs Nom*, Statut initial (select), Description, Responsable* (select user), Membres de l'équipe (grid de checkbox avatar + nom + role).
- **Modale ProjectDetail** (`19-modal-project-detail.png`) : header avec avatar + nom + status + responsable, Description, Progression globale (barre), Statistiques (Épiques/US/Tâches/Sprints/Points), Sprint en cours, Équipe (membres), bouton "Voir le Kanban".
- **ProjectSelector du shell** : maintenant alimenté avec la liste live (`E-Commerce Platform`, `Mobile Banking App`, `CRM System`, …).

### Hors périmètre P4 (assumé)
- Onglets Tâches / Historique du detail → P6 (Tasks) et P12.
- "Voir le Kanban" navigue mais Kanban réel = P7.
- `+ Nouveau projet` est l'unique entrée de création en P4 ; modale "Ajouter" globale du header → P6 (où on aura plusieurs types d'items).
- Drag-drop, archive, batch actions → P12 (settings).

---

## 2. Décisions techniques

### D1. Lib `@libs/projects-front` (nouveau pattern P3)
Mêmes conventions que `@libs/shell-front` :
- Embroider v2, Rollup, Vitest browser
- Eslint/Prettier/template-lint comme les autres libs front
- Dépend de `@libs/shared-front`, `@libs/users-front`, `@libs/shell-front`
- Exporte `moduleRegistry()`, `initialize(owner)`, `forRouter(this)`
- **Pas de `forRouter`** côté projects-front — la route `/projects` est déjà déclarée par `shell-front`. P4 fournit juste le **template + composants + route logic**.

### D2. Stratégie composants : Triptyk first, DaisyUI fallback
Conformément à la mémoire `[[feedback-success-criteria]]` et au pattern P3 :
- **Triptyk** :
  - `<TpkModal>` pour AddProject + ProjectDetail
  - `<TpkInput>` pour nom + description
  - `<TpkSelect>` pour statut + responsable
  - `<TpkCheckbox>` pour members
  - `<TpkButton>` partout (avec `@label` + yield)
  - `<TpkTableGeneric>` / `<TpkStackList>` PAS utilisés ici (grille custom car layout spécifique cards)
- **DaisyUI** : `card`, `progress`, `badge`, `avatar` (pour les composants visuels de la card)
- **Custom** : `<ProjectCard>` (grille fidèle Figma — pas d'équivalent Triptyk), `<MemberAvatarStack>`, `<StatusBadge>`.

### D3. WarpDrive schemas
Nouveau fichier `@libs/projects-front/src/schemas/projects.ts` :
```ts
import { withDefaults, type WithLegacy } from '@warp-drive/legacy/model/migration-support';
import type { Type } from '@warp-drive/core/types/symbols';

const ProjectSchema = withDefaults({
  type: 'projects',
  fields: [
    { name: 'createdAt', kind: 'attribute' },
    { name: 'updatedAt', kind: 'attribute' },
    { name: 'name', kind: 'attribute' },
    { name: 'description', kind: 'attribute' },
    { name: 'status', kind: 'attribute' },
    // Relations (P4 ne les charge pas toutes, mais déclare le schéma)
    { name: 'members', kind: 'hasMany', type: 'users', options: { async: true } },
    { name: 'responsable', kind: 'belongsTo', type: 'users', options: { async: true } },
  ],
});
export default ProjectSchema;

export type Project = WithLegacy<{
  createdAt: string;
  updatedAt: string;
  name: string;
  description: string;
  status: 'Planifié' | 'Actif' | 'Terminé' | 'Archivé';
  [Type]: 'projects';
}>;
```

**À confirmer en P4.1 audit** : les noms exacts des relations (`members` vs `users`, `responsable` vs `owner`) et les attributs additionnels que le backend expose (cf. `project.serializer.ts`).

### D4. Service `projects` (data layer)
Nouveau service `@libs/projects-front/src/services/projects.ts` :
- API: `loadAll()`, `findById(id)`, `create(payload)`, `update(id, payload)`, `delete(id)`
- Implémenté via WarpDrive store `store.request(query(...))` ou équivalent (voir pattern `@libs/users-front/src/services/user.ts`).
- Cache + retour de promise.

### D5. Branchement `ProjectSelector` du shell sur la liste live
- Le `ShellLayout` reçoit déjà `@projects` (P3). Aujourd'hui, `@apps/front/app/templates/dashboard.gts` passe une liste vide (`<ShellLayout>{{outlet}}</ShellLayout>`).
- **Option A (retenue)** : créer un composant wrapper `<ShellWithProjects>` dans `@libs/projects-front` qui :
  1. inject `projects` service
  2. déclenche `loadAll()` au mount
  3. passe `@projects={{this.projects.list}}` à `<ShellLayout>`
- **Option B** : modifier `ShellLayout` (shell-front) pour qu'il injecte directement le `projects` service. **Refusé** — créerait une dépendance circulaire shell-front → projects-front.
- En `dashboard.gts` (front) : remplacer `<ShellLayout>` par `<ShellWithProjects>`.

### D6. Bouton "+ Ajouter" et "+ Nouveau projet"
Deux entrées :
- **Page `/projects`** : bouton "+ Nouveau projet" en haut à droite (top-right de la grille). Ouvre `AddProjectModal`.
- **Header global "+ Ajouter"** (P3, actuellement disabled) : reste disabled en P4. Sera fait en P6 (dropdown multi-type).
- **Justification** : éviter de scope-creep ; le bouton "+ Nouveau projet" suffit pour P4.

### D7. MSW handlers pour le dev
- Créer `@libs/projects-front/src/http-mocks/projects.ts` avec : GET list (3 projets Figma), GET detail, POST, PATCH, DELETE, GET members.
- Exporter `allProjectsHandlers` consommé par `@apps/front/app/routes/application.ts` (concat avec `allUsersHandlers`).
- Activé en dev quand `VITE_MOCK_API !== 'false'`.

### D8. i18n
Nouvelles clés :
- `projects.title`, `projects.subtitle`, `projects.newProject`
- `projects.card.userStories`, `projects.card.currentSprint`, `projects.card.createdOn`
- `projects.status.planned`, `.active`, `.completed`, `.archived`
- `projects.modal.add.title`, `projects.modal.add.name`, `projects.modal.add.description`, `projects.modal.add.status`, `projects.modal.add.lead`, `projects.modal.add.members`, `projects.modal.add.cancel`, `projects.modal.add.submit`
- `projects.modal.detail.description`, `.progress`, `.stats.epics`, `.stats.userStories`, `.stats.tasks`, `.stats.sprints`, `.stats.points`, `.stats.time`, `.currentSprint`, `.team`, `.viewKanban`

Fichiers : `@apps/front/translations/projects/fr-fr.yaml` et `en-us.yaml`.

---

## 3. Plan d'implémentation

### P4.1 — Audit backend + scaffolding (30 min, bloquant)

1. Lire `@libs/scrum-backend/src/project/project.entity.ts`, `project.serializer.ts`, `project.routes.ts` pour :
   - Confirmer tous les champs exposés (name, description, status, **+ peut-être `createdAt`, `responsableId`, `color`, etc.**)
   - Confirmer les valeurs de l'enum `status` (Planifié | Actif | Terminé | Archivé ?)
   - Confirmer la structure des relations (members via `project_members`, responsable via `responsableId` ?)
2. Scaffolder `@libs/projects-front` à l'identique de `@libs/shell-front` (boilerplate Embroider v2). Copier les configs.
3. Ajouter `@libs/projects-front` aux `devDependencies` de `@apps/front`.
4. `pnpm install` + `pnpm build --filter=@libs/projects-front` doit passer (lib vide).

**Critère de succès** : tableau des champs Project documenté + lib scaffold + build OK.

---

### P4.2 — Schema WarpDrive + service `projects`

1. `@libs/projects-front/src/schemas/projects.ts` (cf. D3).
2. `@libs/projects-front/src/services/projects.ts` :
```ts
import Service, { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import type { Store } from '@warp-drive/core';
import type { Project } from '#src/schemas/projects.ts';

export default class ProjectsService extends Service {
  @service declare store: Store;
  @tracked list: Project[] = [];
  @tracked loading = false;

  async loadAll(): Promise<Project[]> {
    this.loading = true;
    try {
      // signature exacte à valider en P4.1 — voir @libs/users-front/src/services/user.ts
      const result = await this.store.request<Project[]>({
        url: '/api/v1/projects',
        method: 'GET',
      });
      this.list = result.content.data ?? [];
      return this.list;
    } finally {
      this.loading = false;
    }
  }

  async create(payload: Partial<Project>): Promise<Project> { /* ... */ }
  async findById(id: string): Promise<Project> { /* ... */ }
}

declare module '@ember/service' {
  interface Registry {
    projects: ProjectsService;
  }
}
```
3. Mettre à jour `@apps/front/app/services/store.ts` pour inclure `ProjectSchema` dans `schemas: [UserSchema, ProjectSchema]`.

---

### P4.3 — MSW handlers (projets fictifs)

`@libs/projects-front/src/http-mocks/projects.ts` :
- 3 projets seedés : E-Commerce Platform (Actif), Mobile Banking App (Actif), CRM System (Planifié) — fidèles au Figma.
- Chacun avec : id, name, description, status, createdAt, members (3-5 users de `users-front`).
- Handlers : GET list, GET {id}, POST, PATCH, DELETE, GET {id}/members.
- Format JSON:API conforme aux types `@apps/backend/src/api-types.ts`.

Exporter `allProjectsHandlers`. Wirer dans `@apps/front/app/routes/application.ts` (`...allUsersHandlers, ...allProjectsHandlers`).

---

### P4.4 — Composant `<ProjectCard>` (custom, fidèle Figma)

`@libs/projects-front/src/components/project-card.gts` :

API : `<ProjectCard @project={{p}} @onOpen={{this.openDetail}} />`

Structure DOM :
```gts
<div class="card bg-base-200 shadow-md hover:shadow-lg cursor-pointer" {{on "click" (fn @onOpen @project)}}>
  <div class="card-body p-5">
    {{!-- Avatar coloré (initiales) --}}
    <div class="avatar avatar-placeholder">
      <div class="bg-primary text-primary-content rounded-lg w-12">
        <span class="text-lg font-bold">{{this.initials}}</span>
      </div>
    </div>
    {{!-- Nom + status --}}
    <h3 class="card-title mt-4">{{@project.name}}</h3>
    <StatusBadge @status={{@project.status}} />
    {{!-- Description --}}
    <p class="text-sm opacity-70 mt-2">{{@project.description}}</p>
    {{!-- Progression --}}
    <div class="mt-4">
      <div class="flex justify-between text-xs"><span>User Stories</span><span>{{this.userStoryProgress}}</span></div>
      <progress class="progress progress-primary w-full" value={{this.userStoryProgressValue}} max={{this.userStoryProgressMax}} />
    </div>
    <div class="mt-2">
      <div class="flex justify-between text-xs"><span>Sprint en cours</span><span>{{this.sprintProgress}}</span></div>
      <progress class="progress progress-primary w-full" value={{this.sprintProgressValue}} max={{this.sprintProgressMax}} />
    </div>
    {{!-- Footer : date + icônes + members + responsable --}}
    <div class="flex items-center justify-between mt-4 text-xs opacity-70">
      <span>Créé le {{this.formattedDate}}</span>
      <div class="flex items-center gap-2"><KanbanIcon /><ChartIcon /></div>
    </div>
    <div class="flex items-center justify-between mt-2">
      <MemberAvatarStack @members={{@project.members}} />
      <span class="text-xs"><UserIcon class="size-3 inline" /> {{this.responsableShortName}}</span>
    </div>
  </div>
</div>
```

Helpers (getters dans la classe Glimmer) :
- `initials` : 2 premières lettres du nom
- `userStoryProgress` : "0/5"
- `sprintProgress` : "1/8"
- `formattedDate` : "01 Jan 2025"
- `responsableShortName` : "B.Durant"

**En P4, sans données réelles US/Sprint, on hardcode 0/N** ou on charge depuis les endpoints `/projects/{id}/sprints` etc. **Choix retenu** : afficher `0/0` par défaut + un TODO `data: P5/P8`. La progression est cosmétique en P4 ; les vraies valeurs viennent quand backlog/sprints front existent.

---

### P4.5 — Composant `<StatusBadge>` + `<MemberAvatarStack>`

`status-badge.gts` :
```gts
const STATUS_CLASSES = {
  'Actif': 'badge-success',
  'Planifié': 'badge-info',
  'Terminé': 'badge-neutral',
  'Archivé': 'badge-ghost',
};
<template>
  <span class="badge badge-soft {{statusClass @status}}">{{@status}}</span>
</template>
```

`member-avatar-stack.gts` :
```gts
<template>
  <div class="avatar-group -space-x-2">
    {{#each (limit @members 3) as |m|}}
      <div class="avatar avatar-placeholder w-6">
        <div class="bg-secondary text-secondary-content rounded-full">
          <span class="text-xs">{{initials m}}</span>
        </div>
      </div>
    {{/each}}
    {{#if (gt @members.length 3)}}
      <div class="avatar avatar-placeholder w-6">
        <div class="bg-neutral rounded-full"><span class="text-xs">+{{sub @members.length 3}}</span></div>
      </div>
    {{/if}}
  </div>
</template>
```

---

### P4.6 — Template `/projects` (grille)

`@libs/projects-front/src/templates/dashboard/projects.gts` (override le placeholder de shell-front) :

```gts
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import TpkButton from '@triptyk/ember-input/components/tpk-button';
import { t } from 'ember-intl';
import ProjectCard from '@libs/projects-front/components/project-card';
import AddProjectModal from '@libs/projects-front/components/add-project-modal';
import ProjectDetailModal from '@libs/projects-front/components/project-detail-modal';
import type ProjectsService from '@libs/projects-front/services/projects';

export default class ProjectsRouteTemplate extends Component {
  @service declare projects: ProjectsService;
  @tracked addModalOpen = false;
  @tracked detailProject = null;

  @action openAdd() { this.addModalOpen = true; }
  @action closeAdd() { this.addModalOpen = false; }
  @action openDetail(p) { this.detailProject = p; }
  @action closeDetail() { this.detailProject = null; }

  <template>
    <div class="p-6">
      <div class="flex items-start justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold">{{t "projects.title"}}</h1>
          <p class="opacity-70">{{t "projects.subtitle"}}</p>
        </div>
        <TpkButton @label={{t "projects.newProject"}} @onClick={{this.openAdd}} class="btn-primary">
          + {{t "projects.newProject"}}
        </TpkButton>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {{#each this.projects.list as |p|}}
          <ProjectCard @project={{p}} @onOpen={{this.openDetail}} />
        {{/each}}
      </div>

      {{#if this.addModalOpen}}
        <AddProjectModal @onClose={{this.closeAdd}} />
      {{/if}}
      {{#if this.detailProject}}
        <ProjectDetailModal @project={{this.detailProject}} @onClose={{this.closeDetail}} />
      {{/if}}
    </div>
  </template>
}
```

**Route** : `@libs/projects-front/src/routes/dashboard/projects.ts` doit appeler `projects.loadAll()` dans `model()` (charge la liste).

---

### P4.7 — `<AddProjectModal>` (fidèle Figma `16-modal-add-project.png`)

`@libs/projects-front/src/components/add-project-modal.gts`

Champs :
- Nom du projet * (TpkInput)
- Statut initial (TpkSelect : Planifié/Actif)
- Description (TpkTextarea)
- Responsable du projet * (TpkSelect peuplé via service user)
- Membres de l'équipe (grid 2 colonnes de TpkCheckbox avec avatar + nom + role)

Validation : Zod schema dans `@libs/projects-front/src/schemas/project-validation.ts`.

Submit → `this.projects.create(payload)` → fermer modale + reload list.

Pattern modal : `<TpkModal @open={{true}} @onClose={{@onClose}}>` (cf. doc Triptyk + audit en P4.1 si nécessaire).

---

### P4.8 — `<ProjectDetailModal>` (fidèle Figma `19-modal-project-detail.png`)

`@libs/projects-front/src/components/project-detail-modal.gts`

Sections :
1. Header : avatar (gros) + nom + status badge + responsable
2. Description (texte)
3. Progression du projet : barre + label "0/5 User Stories" (placeholder en P4)
4. Statistiques : 4 cards mini (Épiques 0/2, US 0/5, Tâches 5/12, Sprints 3/6) — **placeholder values P4**
5. Points d'efforts, Temps (h), Sprint en cours — **placeholder values P4**
6. Équipe (5 membres) : grille d'avatars + noms
7. Footer : "Fermer" + "Voir le Kanban" (navigate to `dashboard.kanban` + setCurrentProject)

**Important** : les statistiques réelles dépendent de P5-P9. En P4, on affiche des valeurs placeholder (0/N ou skeleton) avec un commentaire `// TODO P10: aggregation endpoint`.

---

### P4.9 — Brancher `ProjectSelector` du shell sur la liste live

Créer `@libs/projects-front/src/components/shell-with-projects.gts` (wrapper) :

```gts
import { service } from '@ember/service';
import Component from '@glimmer/component';
import ShellLayout from '@libs/shell-front/components/shell/layout';
import type ProjectsService from '@libs/projects-front/services/projects';

export default class ShellWithProjects extends Component {
  @service declare projects: ProjectsService;

  get projectOptions() {
    return this.projects.list.map(p => ({ id: p.id, name: p.name }));
  }

  <template>
    <ShellLayout @projects={{this.projectOptions}}>
      {{yield}}
    </ShellLayout>
  </template>
}
```

Modifier `@apps/front/app/templates/dashboard.gts` :
```gts
import ShellWithProjects from '@libs/projects-front/components/shell-with-projects';
<template>
  <ShellWithProjects>
    {{outlet}}
  </ShellWithProjects>
</template>
```

**Important** : `projects.loadAll()` doit être appelé au boot (dans `initialize` ou dans une route parente comme `dashboard.ts`) pour que `projects.list` soit peuplé avant que `ShellWithProjects` ne lise.

→ Modifier `@apps/front/app/routes/dashboard.ts` (déjà existant) pour ajouter :
```ts
async model() {
  return this.projects.loadAll();
}
```
(injecter le service `projects` au préalable).

---

### P4.10 — `index.ts` + initialize

`@libs/projects-front/src/index.ts` :
```ts
import type Owner from '@ember/owner';
import type { DSL } from '@ember/routing/lib/dsl';
import { buildRegistry } from 'ember-strict-application-resolver/build-registry';

export function moduleRegistry() {
  return buildRegistry({
    ...import.meta.glob('./routes/**/*.{js,ts,gts}', { eager: true }),
    ...import.meta.glob('./templates/**/*.{js,ts,gts}', { eager: true }),
    ...import.meta.glob('./components/**/*.{js,ts,gts}', { eager: true }),
    ...import.meta.glob('./services/**/*.{js,ts}', { eager: true }),
  })();
}

// Pas de forRouter — la route /projects est déclarée par shell-front
// projects-front fournit seulement le template + composants + service

// eslint-disable-next-line @typescript-eslint/require-await
export async function initialize(_owner: Owner) {
  // Lazy : la liste sera chargée par dashboard.ts model() ou explicitement
}
```

Appel de `initializeProjectsLib` ajouté dans `@apps/front/app/routes/application.ts`.

---

### P4.11 — i18n

Créer `@apps/front/translations/projects/fr-fr.yaml` et `en-us.yaml` avec les clés détaillées en D8.

---

### P4.12 — Tests intégration + unitaires

Sous `@libs/projects-front/tests/` :
- `unit/projects-service-test.gts` : loadAll, create, findById (avec MSW mocks)
- `integration/project-card-test.gts` : rend une card, vérifie nom + initials + status badge + members stack
- `integration/add-project-modal-test.gts` : submit valide → service.create appelé, submit invalide → erreur affichée
- `integration/project-detail-modal-test.gts` : rend toutes les sections, click "Voir le Kanban" → navigate

**Sanity check obligatoire** (cf. [[feedback-tests-sanity]]) : forcer un échec volontaire avant d'annoncer les tests verts.

---

### P4.13 — Tests E2E Playwright

Mettre à jour ou créer `@apps/e2e/projects.spec.ts` :
- Login → navigate `/projects` → 3 cards rendues
- Click `+ Nouveau projet` → modale ouverte → fill + submit → 4 cards
- Click sur une card → modale detail → bouton "Fermer" → modale fermée
- Click "Voir le Kanban" → URL `/kanban`

---

### P4.14 — Validation visuelle Figma

Comparer screenshots :
- `/projects` mode dark vs `docs/figma-screenshots/02-projects.png`
- Modale Add Project vs `docs/figma-screenshots/16-modal-add-project.png`
- Modale Detail vs `docs/figma-screenshots/19-modal-project-detail.png`

Sauvegarder dans `specs/review-screenshots/p4-*.png`.

---

## 4. Critères de succès (bloquants)

- [ ] Lib `@libs/projects-front` scaffold + build OK.
- [ ] `pnpm dev` démarre back + front sans erreur.
- [ ] `/projects` charge la liste depuis le backend (ou MSW en dev) et affiche 3 cards Figma (Actif/Planifié, progression, members).
- [ ] Bouton `+ Nouveau projet` ouvre `AddProjectModal` ; submit crée un projet → 4e card visible (sans rechargement page).
- [ ] Click sur une card ouvre `ProjectDetailModal` avec toutes les sections.
- [ ] `ProjectSelector` du header affiche la liste live (≥ 3 items après load).
- [ ] Sélection d'un projet dans le header → service `current-project` set + persist (déjà couvert par P3, on vérifie juste).
- [ ] Bouton "Voir le Kanban" navigue vers `/kanban` (placeholder pour l'instant).
- [ ] Tests unitaires + intégration verts (avec sanity check).
- [ ] E2E `projects.spec.ts` passe.
- [ ] `pnpm lint` global clean (11/11).
- [ ] Build production OK.
- [ ] Screenshots validation visuelle vs Figma capturés.

---

## 5. Risques & pièges

| Risque | Mitigation |
|---|---|
| Backend project entity diffère du Figma (manque champs `responsableId`, `color`) | P4.1 audit obligatoire. Si manquant, ajouter via PATCH backend ou afficher placeholder (`B.Durant` hardcodé via members[0]) |
| WarpDrive `store.request` signature change selon les versions | Copier le pattern exact de `@libs/users-front/src/services/user.ts` |
| `TpkModal` API ou comportement (close on outside click, focus trap, esc) inattendu | Audit en P4.7 + fallback DaisyUI `<dialog>` natif si TpkModal trop limitatif |
| Statistiques modale Detail nécessitent des aggregations cross-domain non dispos en P4 | Afficher `0/0` ou skeleton + commentaire `TODO P10` ; ne pas implémenter le fetch |
| `ShellWithProjects` cause un re-render boucle infinie | `loadAll()` une seule fois (au mount/route model), pas dans le getter `projectOptions` |
| MSW handlers conflictuels entre users-front et projects-front | Tester ordre des handlers dans `application.ts` ; valider que GET /users continue de fonctionner |
| Le bouton "+ Nouveau projet" double avec "+ Ajouter" du header (P3) | OK en P4 — "+ Ajouter" reste disabled, "+ Nouveau projet" est l'unique entrée |
| TpkSelect pour Responsable nécessite un fetch users — risque de N+1 si fait à l'ouverture modale | Charger la liste users une fois en parallèle de projects (dashboard.ts model) |
| Validation Zod du formulaire AddProject incohérente avec les contraintes backend | Lire `@libs/scrum-backend/src/project/routes/*.ts` pour récupérer les Zod schemas backend et les répliquer côté front |

---

## 6. Découpage commits

| Commit | Scope |
|---|---|
| `feat(projects-front): scaffold lib + schema + service` | P4.1, P4.2, P4.10 |
| `feat(projects-front): MSW handlers + 3 projets fictifs` | P4.3 |
| `feat(projects-front): ProjectCard + StatusBadge + MemberAvatarStack` | P4.4, P4.5 |
| `feat(projects-front): route /projects + grille + boutons` | P4.6 |
| `feat(projects-front): AddProjectModal` | P4.7 |
| `feat(projects-front): ProjectDetailModal` | P4.8 |
| `feat(front): ShellWithProjects → live project selector` | P4.9 |
| `feat(front): i18n projects fr/en` | P4.11 |
| `test(projects-front): unit + integration tests` | P4.12 |
| `test(e2e): projects flow` | P4.13 |
| `chore: visual validation vs figma` | P4.14 |

---

## 7. Estimation

- P4.1 (audit + scaffold) : 30 min
- P4.2 (schema + service) : 45 min
- P4.3 (MSW handlers) : 30 min
- P4.4-P4.5 (ProjectCard + sous-composants) : 1h
- P4.6 (route + grille) : 30 min
- P4.7 (AddProjectModal) : 1h
- P4.8 (ProjectDetailModal) : 1h
- P4.9 (ShellWithProjects) : 20 min
- P4.10-P4.11 (index + i18n) : 30 min
- P4.12 (tests intégration) : 1h30
- P4.13 (E2E) : 30 min
- P4.14 (validation visuelle) : 20 min

**Total ~ 8h** (réparti sur 1-2 jours selon focus).

---

## 8. Décisions à valider avant build (Q1-Q3)

**Q1** — Le bouton "Voir le Kanban" du detail doit-il appeler `currentProject.setCurrent(id)` avant le navigate, pour que la page Kanban (placeholder P7) sache déjà quel projet afficher ? *Recommandation : oui.*

**Q2** — Statistiques de la modale Detail (Épiques, US, Tâches, Sprints, Points) : afficher `0/0` placeholder OU fetch les vrais endpoints `/projects/{id}/{epics,tasks,sprints,...}` même si les libs front associées (P5-P9) ne sont pas prêtes ? *Recommandation : placeholder en P4 — c'est cosmétique sans visualisation des items.*

**Q3** — `ProjectsService.loadAll()` : appelé dans `dashboard.ts model()` (chargement au boot dashboard) OU dans `projects.ts model()` (chargement lazy au visit `/projects`) ? *Recommandation : `dashboard.ts model()` pour que le `ProjectSelector` du header soit alimenté dès le login.*
