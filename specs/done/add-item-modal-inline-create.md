---
title: AddItemModal — ouvrir les modales de création au lieu de rediriger
status: todo
created: 2026-05-17
phases: 4
---

# AddItemModal — création inline (pas de redirection vers la route)

## Problem statement

Aujourd'hui, le bouton **+ Add** du `ShellHeader` ouvre `AddItemModal` (`@libs/shell-front/src/components/shell/add-item-modal.gts`). Quand l'utilisateur choisit un type d'élément (Project / Epic / User Story / Task / Sprint / Time-Entry), la modale se ferme et `ShellHeader.onAddItemSelect` redirige vers la route correspondante (`dashboard.projects`, `dashboard.backlog`, etc.).

Conséquence : l'utilisateur perd son contexte de navigation et doit chercher le bouton "Add" de la page cible. Le Figma montre clairement que la modale doit **créer directement** l'élément, sans changer de route.

Toutes les modales de création existent déjà :
- `@libs/projects-front/src/components/add-project-modal.gts`
- `@libs/backlog-front/src/components/add-epic-modal.gts`
- `@libs/backlog-front/src/components/add-user-story-modal.gts` (accepte `preselectedEpicId`)
- `@libs/backlog-front/src/components/add-task-modal.gts` (accepte `preselectedUserStoryId`)
- `@libs/sprints-front/src/components/add-sprint-modal.gts`
- `@libs/time-tracking-front/src/components/log-time-modal.gts`

Toutes ont la même Args minimale : `{ onClose: () => void }`.

## Objectives

1. Cliquer **+ Add** → choisir un type → la modale de création correspondante s'ouvre **sans changer de route**.
2. La création se fait via les services existants (`TasksService`, `ProjectsService`, etc.). Aucun nouveau code de création.
3. Pas de cycle de dépendance entre libs (rappel : `shell-front` ne peut pas importer `projects-front` / `backlog-front` / etc.).
4. Le pattern reste extensible : ajouter un futur type d'élément doit demander uniquement une nouvelle entrée dans 2 fichiers.

## Architectural context

> Source : `graphify-out/GRAPH_REPORT.md` + lecture directe des fichiers.

- **Communities touchées** : Community 72 (AddItemModal, isolé — donc l'impact runtime est local), Community Backlog/Projects/Sprints/Time-tracking (consommées indirectement via le host de modales).
- **God nodes au voisinage** :
  - `Modal: Nouvelle tâche` (13 edges) — le pattern modal existant que l'on va simplement déclencher.
  - `Modal: Nouvelle User Story` (11 edges) — idem.
- **Contrats à protéger** :
  - Pas d'import direct depuis `@libs/shell-front` vers `@libs/projects-front` / `@libs/backlog-front` / etc. (règle `@libs/CLAUDE.md`). Le pont passera par `@apps/front` (qui peut tout importer) ou par un service dans `@libs/shared-front`.

> ⚠️ Advisory : avant d'éditer, `Read` chaque modale `add-*` pour confirmer la signature `Args` actuelle — elle est ouverte au refactor.

## Technical approach

**Pattern retenu : service partagé `add-item-router` (shared-front) + host de modales (apps/front).**

Rejeté :
- *Import direct dans shell-front* — viole la règle anti-cycle.
- *Déplacer `AddItemModal` dans `@apps/front`* — casse la cohésion `shell-front` (le bouton + le menu de choix doivent rester ensemble).
- *Event bus custom* — Ember a déjà l'idiome service injectable, pas besoin d'inventer.

### Vue d'ensemble

```
ShellHeader (@libs/shell-front)
   ↓ click "+ Add"
AddItemModal (@libs/shell-front)
   ↓ select "task"
addItemRouter.open('task')               ← service injecté (shared-front)
   ↓ @tracked openType = 'task'
Application template (@apps/front)        ← host
   {{#if (eq router.openType 'task')}}
     <AddTaskModal @onClose={{router.close}} />
   {{/if}}
```

## Implementation steps

### Phase 1 — Service `add-item-router` (shared-front)

**Fichier** : `@libs/shared-front/src/services/add-item-router.ts` (nouveau)

```ts
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

export type AddItemType =
  | 'project'
  | 'epic'
  | 'user-story'
  | 'task'
  | 'sprint'
  | 'time-entry';

export interface AddItemContext {
  preselectedEpicId?: string | null;
  preselectedUserStoryId?: string | null;
}

export default class AddItemRouterService extends Service {
  @tracked openType: AddItemType | null = null;
  @tracked context: AddItemContext = {};

  open = (type: AddItemType, context: AddItemContext = {}) => {
    this.context = context;
    this.openType = type;
  };

  close = () => {
    this.openType = null;
    this.context = {};
  };
}
```

**Tâches** :
1. Créer le fichier ci-dessus.
2. Re-exporter depuis `@libs/shared-front/src/index.ts`.
3. Mettre à jour `module.d.ts` si besoin (le service est auto-injecté via DI Ember).

### Phase 2 — Câblage `shell-front`

**Fichier** : `@libs/shell-front/src/components/shell/header.gts`

- Injecter `@service declare addItemRouter: AddItemRouterService` (import depuis `@libs/shared-front/services/add-item-router`).
- Supprimer `onAddItemSelect` (plus de redirection).
- `AddItemModal` reçoit toujours `@onSelect={{this.openAddItem}}` mais celui-ci appelle désormais `this.addItemRouter.open(type)` au lieu de transitionner.
- Fermer la `AddItemModal` (menu de choix) juste après.

```gts
@action onAddItemSelect(type: AddItemType) {
  this.closeAddItem();
  this.addItemRouter.open(type);
}
```

**Fichier** : `@libs/shell-front/src/components/shell/add-item-modal.gts` — **inchangé**. Il continue d'exposer `onSelect(type)`.

> ⚠️ Vérifier : la `AddItemType` exportée par shell-front doit rester identique à celle du service (sinon importer celle de shared-front pour ne pas dupliquer).

### Phase 3 — Host de modales dans `@apps/front`

**Fichier** : `@apps/front/app/templates/application.gts`

Ajouter avant `{{outlet}}` un bloc conditionnel qui monte la modale en fonction du `addItemRouter.openType` :

```gts
import { service } from '@ember/service';
import AddItemRouterService from '@libs/shared-front/services/add-item-router';
import AddProjectModal from '@libs/projects-front/components/add-project-modal';
import AddEpicModal from '@libs/backlog-front/components/add-epic-modal';
import AddUserStoryModal from '@libs/backlog-front/components/add-user-story-modal';
import AddTaskModal from '@libs/backlog-front/components/add-task-modal';
import AddSprintModal from '@libs/sprints-front/components/add-sprint-modal';
import LogTimeModal from '@libs/time-tracking-front/components/log-time-modal';

class ApplicationTemplate extends Component<ApplicationSignature> {
  @service declare flashMessages: FlashMessageService;
  @service declare addItemRouter: AddItemRouterService;

  <template>
    {{pageTitle "Application"}}
    <div id="tpk-modal"></div>
    <div class="alerts">
      {{#each this.flashMessages.arrangedQueue as |flash|}}
        <FlashMessage @flash={{flash}} />
      {{/each}}
    </div>

    {{#if (eq this.addItemRouter.openType "project")}}
      <AddProjectModal @onClose={{this.addItemRouter.close}} />
    {{else if (eq this.addItemRouter.openType "epic")}}
      <AddEpicModal @onClose={{this.addItemRouter.close}} />
    {{else if (eq this.addItemRouter.openType "user-story")}}
      <AddUserStoryModal
        @onClose={{this.addItemRouter.close}}
        @preselectedEpicId={{this.addItemRouter.context.preselectedEpicId}}
      />
    {{else if (eq this.addItemRouter.openType "task")}}
      <AddTaskModal
        @onClose={{this.addItemRouter.close}}
        @preselectedUserStoryId={{this.addItemRouter.context.preselectedUserStoryId}}
      />
    {{else if (eq this.addItemRouter.openType "sprint")}}
      <AddSprintModal @onClose={{this.addItemRouter.close}} />
    {{else if (eq this.addItemRouter.openType "time-entry")}}
      <LogTimeModal @onClose={{this.addItemRouter.close}} />
    {{/if}}

    {{outlet}}
  </template>
}
```

**Tâches** :
1. Importer `eq` depuis `ember-truth-helpers` ou utiliser `(eq …)` via un helper local si pas dispo (vérifier `@apps/front/package.json`).
2. Vérifier que toutes les modales sont accessibles via leur path public Embroider (`@libs/<lib>/components/<name>`).
3. Tester chaque type une fois.

### Phase 4 — Tests & i18n

1. **Tests d'intégration shell-front** :
   - Mettre à jour (ou créer) `@libs/shell-front/tests/integration/add-item-modal-test.gts` :
     - Cas : clic sur "Tâche" → `addItemRouter.open` est appelé avec `'task'`.
     - Cas : `AddItemModal` ferme la modale de choix après sélection.
   - Mock du service via `owner.register('service:addItemRouter', class { open=vi.fn(); close=vi.fn(); })`.
2. **Tests E2E** (Playwright, optionnel mais recommandé) :
   - Étendre `@apps/e2e/tests/msw/add-item.spec.ts` :
     - Clic + Add → "Tâche" → la `AddTaskModal` apparaît → champ titre visible → on remplit → submit → modale fermée → aucun changement de route.
3. **i18n** : aucune nouvelle clé requise — les libellés "Project / Epic / …" sont déjà dans `shell.addItem.*`.

## Edge cases & pitfalls

- **Préselection** : on conserve les `preselectedEpicId` / `preselectedUserStoryId` via `addItemRouter.context`. Les composants existants les acceptent déjà — pas de refactor.
- **Pas de projet courant** : certaines modales (`AddTaskModal`, `AddUserStoryModal`) exigent `currentProject`. Vérifier qu'elles affichent un message d'erreur clair OU désactiver l'option correspondante dans `AddItemModal` (out-of-scope si déjà géré).
- **Modales superposées** : si l'utilisateur clique "+ Add" alors qu'une `Add*Modal` est déjà ouverte (peu probable depuis l'UI), `addItemRouter.open` écrasera `openType` — c'est OK, comportement attendu.
- **Lib `projects-front` / `backlog-front` / etc. non encore enregistrées dans `@apps/front`** : vérifier que chacune est listée dans `package.json` de l'app (toutes le sont déjà en P13).
- **Cycle de dépendance** : `@apps/front` peut importer toutes les libs (c'est le terminal), donc le host de modales y est légitime. `shared-front` reste sans dépendance vers les autres libs.

## Testing strategy

> Les tests d'intégration listés ci-dessous sont **bloquants** — pas substitutables par smoke test manuel.

- [ ] `@libs/shell-front/tests/integration/add-item-modal-test.gts` — couvre l'appel à `addItemRouter.open` et la fermeture du menu de choix.
- [ ] Smoke manuel des 6 types via dev server (avec MSW) — chaque type ouvre la bonne modale sans changer de route.
- [ ] `pnpm turbo lint` vert sur le monorepo.
- [ ] Tests E2E `msw/add-item-modal.spec.ts` (si existant) à mettre à jour pour vérifier l'absence de redirection.

## Success criteria

1. ✅ Clic sur **+ Add** → choix d'un type → la modale de création correspondante apparaît, **la route ne change pas**.
2. ✅ La modale de choix (`AddItemModal`) se ferme après le clic sur un type.
3. ✅ Chacune des 6 modales (`project`, `epic`, `user-story`, `task`, `sprint`, `time-entry`) crée bien l'élément via son service et se ferme proprement après création.
4. ✅ `@libs/shell-front` n'importe **aucun** des libs `projects-front` / `backlog-front` / `sprints-front` / `time-tracking-front` (vérifiable par `grep -r "@libs/projects-front\|@libs/backlog-front\|@libs/sprints-front\|@libs/time-tracking-front" @libs/shell-front/src` — doit renvoyer vide).
5. ✅ `pnpm turbo lint` vert sur le monorepo.
6. ✅ Test d'intégration `add-item-modal-test.gts` vert.
7. ✅ Capture visuelle du flux (PR description) montrant que la modale s'ouvre par-dessus le contenu sans changement de route.

## Out of scope

- Refonte UI des modales `Add*Modal` (taille, design — couvert par le futur P13.5).
- Raccourci clavier `Cmd+N` pour ouvrir `AddItemModal`.
- Préselection automatique de la User Story courante quand on crée une Task depuis la vue Kanban (existe déjà via `preselectedUserStoryId`, mais le câblage Kanban ↔ `addItemRouter` n'est pas dans ce plan).

## Next

Run `/TPK-build specs/todo/add-item-modal-inline-create.md` to implement.
