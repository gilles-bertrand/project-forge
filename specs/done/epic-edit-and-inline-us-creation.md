# Edit Epic + Inline US Creation + Estimated Points on User Story Map

> **URL ciblée** : `/dashboard/user-story-map`
> **Lib principale** : `@libs/backlog-front`
> **Statut** : todo

## Architectural Context

- **Communautés touchées** : community des routes JSON:API CRUD d'épiques (`DeleteEpicRoute`, `UpdateEpicRoute` côté backend), community frontend `@libs/backlog-front` (composants `EpicRow`, modals, service `EpicsService`).
- **God nodes en jeu** : `makeSingleJsonApiTopDocument()` (32 edges) — les nouvelles requêtes PATCH/DELETE passent par lui, donc tester la sérialisation côté front. `authFetch()` (28 edges) — non utilisé ici puisque tout passe par `store.request()` (WarpDrive).
- **Contrats cross-cutting à risque** :
  - Schéma JSONAPICache `epics` (`@apps/front/app/services/store.ts`) — à vérifier que `update` ne casse pas le cache après PATCH (voir `[[feedback-warpd-schemas-global]]`).
  - `cacheOptions.reload: true` doit être conservé après mutation pour rafraîchir le cache local (voir pattern `EpicsService.create`).

## Problem Statement

Sur la page **User Story Map** (`/dashboard/user-story-map`), deux limitations actuelles :

1. **Pas de bouton d'édition d'épique** dans la liste. Les routes backend (`PATCH /api/v1/epics/:id`, `DELETE /api/v1/epics/:id`) existent déjà et fonctionnent, mais le service `EpicsService` n'expose ni `update()` ni `delete()`, et le composant `EpicRow` n'affiche aucun bouton.
2. **L'ajout d'une US dans une épique est peu découvrable** : le bouton "+ Ajouter une US" est caché dans la zone expanded de l'épique, sans icône ni infobulle. Par ailleurs, les statistiques affichées (`X US • Y tâches`) n'incluent pas la somme des **points estimés**, métrique-clé pour planifier une épique.

## Objectives

- Permettre l'édition (titre, description, statut) et la suppression d'une épique depuis la liste.
- Améliorer la découvrabilité de l'ajout d'une US dans une épique via une **icône d'action avec infobulle**, toujours visible sur la ligne d'épique (pas seulement quand l'épique est expanded).
- Afficher la **somme des story points** des US rattachées à l'épique, à côté des compteurs existants.

## Non-objectives

- Pas de modification du backend (les routes existent).
- Pas de drag-and-drop d'épiques (hors scope).
- Pas de modification du composant `UserStoryRow` (sauf si nécessaire pour les types).
- Pas de gestion de la priorité d'épique (le schéma actuel n'en a pas).

---

## Technical Approach

### Vue d'ensemble du flux

```
EpicRow (header) ─┬─ bouton expand (toggle)
                  ├─ badge "Épique"
                  ├─ titre + description
                  ├─ NOUVEAU: stats { US, tâches, points totaux }
                  └─ NOUVEAU: groupe d'actions (icônes)
                       ├─ [+US] ajouter une US (tooltip)
                       ├─ [✎]  éditer (tooltip)
                       └─ [🗑]  supprimer (tooltip + confirm)

Modals existants : AddEpicModal, AddUserStoryModal
NOUVEAU modal   : EditEpicModal (basé sur AddEpicModal)
```

### Points d'attention

- **Propagation d'évènement** : les boutons d'action dans `EpicRow` sont **dans** un `<button>` parent qui gère le toggle expand. Il faut soit (a) sortir les actions du bouton parent en restructurant le DOM, soit (b) appeler `e.stopPropagation()` sur chaque action. **Choix recommandé : (a) restructurer** — réf. [[feedback-self-imports]] qui n'a rien à voir, mais surtout l'incident récent sur `ProjectCard` (mémoire session : nested buttons cassent les clics → role accessibilité). Restructurer en `<div>` parent + `<button>` enfant pour le toggle, et boutons d'actions séparés.
- **Suppression d'épique** : afficher une `confirm()` minimale (ou un dialog `<dialog>` simple) avec le nombre d'US qui deviendraient orphelines (`epicId = null`). Le backend nettoie via foreign key — à vérifier.
- **WarpDrive cache** : après `update`/`delete`, recharger via `loadByProject(projectId)` (pattern existant dans `create`).

---

## Implementation Steps

### Phase 1 — Étendre `EpicsService` (update/delete)

Fichier : `@libs/backlog-front/src/services/epics.ts`

Ajouter deux méthodes calquées sur le pattern WarpDrive (cf. [[feedback-warpd-create]]) :

```ts
export type UpdateEpicPayload = {
  title?: string;
  description?: string;
  status?: Epic['status'];
};

async update(id: string, projectId: string, attrs: UpdateEpicPayload): Promise<Epic> {
  const { content } = await this.store.request<{ data: Epic }>({
    url: `/api/v1/epics/${id}`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/vnd.api+json' },
    body: JSON.stringify({
      data: { id, type: 'epics', attributes: attrs },
    }),
  });
  await this.loadByProject(projectId);
  return content.data;
}

async delete(id: string, projectId: string): Promise<void> {
  await this.store.request({
    url: `/api/v1/epics/${id}`,
    method: 'DELETE',
  });
  await this.loadByProject(projectId);
}
```

**À vérifier** : la lib backend retourne bien `200 + body` pour PATCH (oui d'après `update.route.ts`) et `204 sans body` pour DELETE (à confirmer en lisant `delete.route.ts`).

### Phase 2 — Créer `EditEpicModal`

Fichier : `@libs/backlog-front/src/components/edit-epic-modal.gts`

Quasi-copie de `add-epic-modal.gts`, avec :
- Args : `{ epic: Epic; onClose: () => void }`.
- Initialiser `@tracked title`, `description`, `status` depuis `args.epic`.
- Soumettre via `epics.update(epic.id, epic.projectId, { title, description, status })`.
- Reuse i18n keys + ajouter `backlog.modal.editEpic.*` (titre, submit, errorFallback).

### Phase 3 — Restructurer `EpicRow` (DOM)

Fichier : `@libs/backlog-front/src/components/epic-row.gts`

Restructurer le header pour séparer toggle et actions :

```gts
<div class="rounded-lg bg-base-200" data-test-epic-row>
  <div class="flex items-center gap-3 px-4 py-3 hover:bg-base-300 rounded-lg">
    <button
      type="button"
      class="flex flex-1 items-center gap-3 text-left min-w-0"
      {{on "click" this.toggleExpand}}
      aria-expanded={{this.expanded}}
      data-test-epic-toggle
    >
      <!-- chevron + badge + titre + description (inchangé) -->
    </button>

    <div class="flex-shrink-0 flex items-center gap-3">
      <!-- Stats (avec points en plus) -->
      <span class="text-xs text-base-content/60 hidden sm:inline">
        {{this.usCount}} {{t "user-story-map.usCount"}}
        • {{this.taskCount}} {{t "user-story-map.taskCount"}}
        • {{this.totalPoints}} {{t "user-story-map.pointsAbbr"}}
      </span>

      <!-- Action buttons (DaisyUI tooltip) -->
      <div class="flex items-center gap-1">
        {{#if @onAddUserStory}}
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-circle tooltip tooltip-left"
            data-tip={{t "user-story-map.addUserStoryTooltip"}}
            data-test-add-us-to-epic
            {{on "click" (fn @onAddUserStory @epic)}}
          >
            <!-- icône SVG plus dans cercle -->
          </button>
        {{/if}}
        {{#if @onEditEpic}}
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-circle tooltip tooltip-left"
            data-tip={{t "user-story-map.editEpicTooltip"}}
            data-test-edit-epic
            {{on "click" (fn @onEditEpic @epic)}}
          >
            <!-- icône SVG crayon -->
          </button>
        {{/if}}
        {{#if @onDeleteEpic}}
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-circle text-error tooltip tooltip-left"
            data-tip={{t "user-story-map.deleteEpicTooltip"}}
            data-test-delete-epic
            {{on "click" (fn @onDeleteEpic @epic)}}
          >
            <!-- icône SVG poubelle -->
          </button>
        {{/if}}
      </div>
    </div>
  </div>

  {{#if this.expanded}}
    <!-- zone US (inchangée, on conserve aussi le bouton + Ajouter une US texte) -->
  {{/if}}
</div>
```

**Calcul des points** :

```ts
get totalPoints(): number {
  return this.epicUserStories.reduce((sum, us) => sum + (us.points ?? 0), 0);
}
```

Ajouter les Args :

```ts
interface EpicRowSignature {
  Args: {
    epic: Epic;
    userStories?: UserStory[];
    tasks?: Task[];
    onAddUserStory?: (epic: Epic) => void;
    onEditEpic?: (epic: Epic) => void;   // NEW
    onDeleteEpic?: (epic: Epic) => void; // NEW
    onOpenTask?: (task: Task) => void;
  };
  Element: HTMLDivElement;
}
```

### Phase 4 — Connecter dans `user-story-map.gts` template

Fichier : `@libs/backlog-front/src/templates/dashboard/user-story-map.gts`

Ajouter :

```ts
@tracked editEpicTarget: Epic | null = null;
@tracked deleteEpicTarget: Epic | null = null;

@action openEditEpic(epic: Epic) { this.editEpicTarget = epic; }
@action closeEditEpic() { this.editEpicTarget = null; }

@action openDeleteEpic(epic: Epic) { this.deleteEpicTarget = epic; }
@action closeDeleteEpic() { this.deleteEpicTarget = null; }

@action async confirmDeleteEpic() {
  const epic = this.deleteEpicTarget;
  const projectId = this.currentProject.currentProjectId;
  if (!epic || !projectId) return;
  await this.epics.delete(epic.id, projectId);
  this.deleteEpicTarget = null;
}
```

Brancher dans `EpicRow` :

```gts
<EpicRow
  @epic={{epic}}
  ...
  @onEditEpic={{this.openEditEpic}}
  @onDeleteEpic={{this.openDeleteEpic}}
/>
```

Et rendre les modals :

```gts
{{#if this.editEpicTarget}}
  <EditEpicModal @epic={{this.editEpicTarget}} @onClose={{this.closeEditEpic}} />
{{/if}}

{{#if this.deleteEpicTarget}}
  <DeleteEpicConfirmModal
    @epic={{this.deleteEpicTarget}}
    @onConfirm={{this.confirmDeleteEpic}}
    @onClose={{this.closeDeleteEpic}}
  />
{{/if}}
```

#### Composant `DeleteEpicConfirmModal`

Nouveau fichier : `@libs/backlog-front/src/components/delete-epic-confirm-modal.gts`

Utiliser le pattern `<dialog class="modal modal-open">` (identique aux autres modals du projet) avec :
- Le titre de l'épique + le nombre d'US orphelines qui en résultera (`@epic.title`, `@orphanCount`).
- Deux boutons : annuler (`@onClose`) et confirmer en rouge (`@onConfirm`, style `btn-error`).
- Arg `@orphanCount` calculé dans le template parent (`usCount` déjà disponible sur `EpicRow`).

```ts
interface DeleteEpicConfirmModalSignature {
  Args: {
    epic: Epic;
    orphanCount: number;
    onConfirm: () => void;
    onClose: () => void;
  };
}
```

i18n : clé `user-story-map.deleteEpicConfirmTitle`, `user-story-map.deleteEpicConfirmBody` (avec variables `title` et `count`).

### Phase 5 — i18n

Fichiers : `@apps/front/translations/user-story-map/fr-fr.yaml` et `en-us.yaml`.

Voir [[feedback-i18n-folder-namespace]] : namespace = `user-story-map.*`.
Voir [[feedback-i18n-translations-location]] : YAML dans `@apps/front/translations/`, **pas** dans la lib, et **redémarrer Vite** après ajout.

Ajouter (fr-fr) :

```yaml
pointsAbbr: 'pts'
addUserStoryTooltip: 'Ajouter une US à cette épique'
editEpicTooltip: "Modifier l'épique"
deleteEpicTooltip: "Supprimer l'épique"
deleteEpicConfirm: 'Supprimer l''épique "{title}" ? Les US rattachées seront détachées.'
```

Idem en-us avec traductions équivalentes.

Ajouter aussi `backlog.modal.editEpic.*` dans `@apps/front/translations/backlog/{fr-fr,en-us}.yaml` (title, submit, submitting, cancel, errorFallback, closeAria).

### Phase 6 — Mocks MSW

Fichier : `@libs/backlog-front/src/http-mocks/backlog.ts`

Vérifier que les handlers `PATCH /api/v1/epics/:id` et `DELETE /api/v1/epics/:id` existent. Sinon, les ajouter en suivant le pattern existant (cf. [[feedback-warpd-schemas-global]] et la session récente sur les blockers B2 MSW).

### Phase 7 — Tests intégration

Tests bloquants (cf. instruction `/TPK-plan` : tests d'intégration = critère de succès non substituable) :

1. `@libs/backlog-front/tests/integration/components/epic-row-test.gts` (créer si absent) :
   - Affiche le badge, le titre, les stats (US count, task count, **points total**).
   - Clic sur bouton "ajouter US" déclenche `@onAddUserStory` avec l'épique.
   - Clic sur bouton "éditer" déclenche `@onEditEpic`.
   - Clic sur bouton "supprimer" déclenche `@onDeleteEpic`.
   - Clic sur la zone titre/chevron toggle l'expand (et n'appelle PAS les autres handlers).
   - Naming : `*-test.gts` (dash, pas dot — cf. [[feedback-test-file-naming]]).
   - Normaliser whitespace dans les assertions textContent (cf. [[feedback-prettier-text-tests]]).
2. `@libs/backlog-front/tests/integration/components/edit-epic-modal-test.gts` :
   - Pré-remplit les champs depuis `@epic`.
   - Soumettre appelle `epics.update(id, projectId, attrs)` avec les bonnes valeurs.
   - Erreur API affichée dans `alert-error`.

### Phase 8 — Validation manuelle (Playwright MCP)

Cf. skill `verify` / `TPK-visual-verify` :

1. `pnpm dev` (rappel : back sur **port 8000**, front sur **4200**).
2. Login, sélectionner un projet avec ≥ 1 épique et ≥ 1 US.
3. Naviguer `/dashboard/user-story-map`.
4. Vérifier les 3 icônes visibles sur chaque ligne d'épique.
5. Hover → infobulle.
6. Clic "+ US" → modal pré-sélectionne l'épique.
7. Clic "éditer" → modal pré-rempli → modifier titre → la ligne se met à jour.
8. Clic "supprimer" → confirm → l'épique disparaît, les US passent en orphelines.
9. Vérifier l'affichage `X US • Y tâches • Z pts`.
10. Console DevTools sans erreur.

---

## Testing Strategy

- **Unit** : pas de logique pure non triviale, sauf `totalPoints` → couvert par les tests d'intégration de `EpicRow`.
- **Integration (bloquant)** : voir Phase 7 — deux fichiers de tests, naming `*-test.gts`.
- **Validation manuelle** : Phase 8 (Playwright MCP) sur les flux modifier + supprimer + ajouter US inline + affichage des points.
- **Lint avant push** : `pnpm turbo lint` à la racine, jamais partiel (cf. [[feedback-lint-before-push]]).

---

## Success Criteria

1. ✅ `EpicsService.update()` et `EpicsService.delete()` existent, sont typés, et passent par `store.request()` (pas de `fetch()` brut — règle projet CLAUDE.md).
2. ✅ Composant `EditEpicModal` créé, pré-remplit le formulaire depuis `@epic`, soumet via `epics.update()`, gère l'erreur API.
3. ✅ `EpicRow` affiche 3 boutons d'action **toujours visibles** dans le header de l'épique : ajouter US, éditer, supprimer — chacun avec `data-tip` (tooltip DaisyUI) et `data-test-*`.
4. ✅ Les boutons d'action ne déclenchent **pas** le toggle expand (vérifié par test intégration + Playwright).
5. ✅ `EpicRow` affiche `X US • Y tâches • Z pts` où `Z` = somme des `points` des US filtrées par `epicId`.
6. ✅ Template `user-story-map.gts` route correctement `@onEditEpic` (ouvre `EditEpicModal`) et `@onDeleteEpic` (ouvre `DeleteEpicConfirmModal` — pas de `confirm()` natif).
7. ✅ Suppression d'épique : après confirm, la ligne disparaît sans rechargement de page, les US apparaissent dans la zone "orphelines" (à vérifier si UI existe ; sinon scope futur — au minimum la suppression ne crashe pas).
8. ✅ i18n : toutes les nouvelles clés présentes en `fr-fr` ET `en-us`, sous le namespace `user-story-map.*` et `backlog.modal.editEpic.*`. Vite redémarré après ajout.
9. ✅ Mocks MSW : handlers PATCH et DELETE `/api/v1/epics/:id` opérationnels en mode dev sans backend.
10. ✅ Tests intégration des phases 7 passent (et un échec volontaire a été observé d'abord — cf. [[feedback-tests-sanity]]).
11. ✅ `pnpm turbo lint` vert à la racine.
12. ✅ Validation manuelle Playwright sur les 10 points de la Phase 8 — capture d'écran avant/après.
13. ✅ Aucune régression console (zéro erreur WarpDrive, zéro "Missing Resource Type").

---

## Open Questions

- Le backend retourne-t-il bien `204 No Content` ou `200 + body` pour DELETE ? À vérifier en lisant `@libs/scrum-backend/src/epic/routes/delete.route.ts` avant Phase 1.
- Faut-il aussi exposer un bouton "édit/delete" sur la ligne `UserStoryRow` ? **Hors scope explicite** de la demande utilisateur, à proposer en suite si besoin.
- Modale de confirm : **`<dialog>` custom** (décision utilisateur — pas `globalThis.confirm()`).
