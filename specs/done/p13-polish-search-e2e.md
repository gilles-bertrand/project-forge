# P13 — Polish (search globale, AddItem unifiée, E2E Playwright)

> Objectif : finaliser le MVP SprintForge avec **3 chantiers complémentaires** :
> 1. **Search bar fonctionnelle** dans le shell header → endpoint `/api/v1/search` + dropdown groupé.
> 2. **AddItem modal unifiée** → sélecteur "Que voulez-vous ajouter ?" branché sur les modales P4–P9.
> 3. **Suite E2E Playwright** : 3 scénarios critiques smoke test (login, créer un projet, full flow tâche).
>
> **Hors périmètre P13 (déféré P13.5 ou V2)** : audit a11y Lighthouse complet, focus management détaillé des modales, contrastes WCAG audités. Le dark theme respecte déjà les contrastes de base, mais un audit dédié est meilleur en phase séparée.

---

## 1. Contexte & rappels

### Acquis (P0–P12)
- **Backend P2** : `GET /api/v1/search/?q=...&types=...` existe. Réponse `{ data: unknown[], meta: { total } }`. Types possibles : `projects`, `tasks`, `user-stories`, `sprints`.
- **Shell header (`@libs/shell-front/src/components/shell/header.gts`)** :
  - `TpkSearchPrefab @placeholder @onSearch` câblé sur `noop` actuellement.
  - Bouton "Log time" activé en P9 (navigate `/time-tracking`).
  - Bouton "Add" toujours `@disabled={{true}}` avec `title="Disponible en P4"` — **P13 active**.
- **Modales existantes** (à brancher via AddItem) :
  - `AddProjectModal` (`@libs/projects-front/src/components/add-project-modal.gts`) — P4
  - `AddEpicModal`, `AddUserStoryModal`, `AddTaskModal` (`@libs/backlog-front/src/components/`) — P5/P6
  - `AddSprintModal` (`@libs/sprints-front/src/components/add-sprint-modal.gts`) — P8
  - `LogTimeModal` (`@libs/time-tracking-front/src/components/log-time-modal.gts`) — P9
- **E2E** : `@apps/e2e/` avec `playwright.config.ts` + 1 test login. Pattern simple sans Page Object Model.
- **Backend backend** : `pnpm dev:back` lance Fastify avec PostgreSQL Docker. E2E utilise `VITE_MOCK_API=false` (cf. `start:with-back`).

### Hors périmètre P13
- **Lighthouse a11y ≥ 90** → P13.5 (audit dédié avec corrections ciblées).
- **Focus trap dans toutes les modales** → P13.5 (composant `<TpkModalShell>` partagé).
- **Recherche multi-projet** (cross-project) → V2.
- **Historique / favoris recherche** → V2.
- **Raccourcis clavier globaux** (Cmd+K pour open search) → P13.5.

---

## 2. Architectural Context

- **God Nodes touchés** :
  - `SprintForge App Shell` (14 edges) — modification de `header.gts` (search + AddItem). Flag pour test E2E couverture.
  - `Modal: Nouvelle tâche` (13 edges) + `Modal: Nouvelle User Story` (11 edges) — composés depuis AddItem, pas modifiés.
- **Communities touchées** : Shell (header), tous les domaines (via AddItem) — risque medium car routes E2E exercent toute la stack.
- **Cross-cutting contracts** : `/api/v1/search` JSON:API generic response (`data: unknown[]`) — pas de typage strict possible côté front, faire un cast prudent.

---

## 3. Décisions techniques

### D1. Architecture des modifications par lib

**`@libs/shell-front`** (modifications majeures) :
- Convertir `ShellHeader` (déjà class component depuis P9) pour gérer search + AddItem.
- Nouveau composant `SearchDropdown` (résultats groupés).
- Nouveau composant `AddItemModal` (sélecteur 6 options).
- Nouveau service `searchService` (ou inline dans le composant si simple).

**`@apps/front`** (intégration) :
- Render des modales d'ajout (les bonnes Add* selon le choix) au niveau application (template ou shell)
- i18n keys `shell.header.add` + `shell.search.*` étendues.

**`@apps/e2e`** :
- Nouveau test `tests/full-flow.spec.ts` couvrant : login → projet → backlog → kanban.
- Nouveau test `tests/search.spec.ts` couvrant : tape dans la search → dropdown apparaît.

### D2. Search dropdown — composant `SearchDropdown`

Dans `@libs/shell-front/src/components/shell/search-dropdown.gts` :

**Signature** :
```typescript
interface SearchDropdownSignature {
  Args: {
    query: string;
    onSelect: (item: SearchResult) => void;
    onClose: () => void;
  };
}

interface SearchResult {
  id: string;
  type: 'projects' | 'tasks' | 'user-stories' | 'sprints';
  attributes: {
    name?: string;
    title?: string;
    [key: string]: unknown;
  };
}
```

**Comportement** :
- `@tracked results: SearchResult[]`, `@tracked loading: boolean`.
- `useEffect`-like : quand `@query` change (debounced 250ms), fetch `/api/v1/search?q=...&types=projects,tasks,user-stories,sprints`.
- Si `query.length < 2` : ne pas fetch, afficher message "Tapez au moins 2 caractères".
- Grouper résultats par `type` dans le template : sections "Projets", "Tâches", "User Stories", "Sprints".
- Empty state si results.length === 0.
- Click sur item → `@onSelect(item)` → route vers `/projects/:id`, `/backlog?taskId=...`, etc.

**Important** : utiliser `setTimeout`/`clearTimeout` pour debounce (pas de dépendance externe).

### D3. AddItem modal — composant `AddItemModal`

Dans `@libs/shell-front/src/components/shell/add-item-modal.gts` :

**Signature** :
```typescript
interface AddItemModalSignature {
  Args: {
    onClose: () => void;
    onSelect: (type: AddItemType) => void;
  };
}

type AddItemType = 'project' | 'epic' | 'user-story' | 'task' | 'sprint' | 'time-entry';
```

**Comportement** :
- Modal daisyui avec un grid 2×3 de boutons (un par type).
- Chaque bouton : icône + label i18n + description courte.
- Click sur bouton → `@onSelect(type)` → parent ferme et ouvre la vraie modale.

**Template** :
```hbs
<dialog class="modal modal-open">
  <div class="modal-box max-w-2xl">
    <h3 class="font-bold text-lg mb-4">{{t "shell.addItem.title"}}</h3>
    <div class="grid grid-cols-2 gap-3">
      <!-- 6 buttons: Projet, Epic, User Story, Tâche, Sprint, Time Entry -->
      <button class="btn btn-outline h-20" {{on "click" (fn this.select "project")}}>
        <div>📁<br><span>{{t "shell.addItem.project"}}</span></div>
      </button>
      <!-- ... -->
    </div>
  </div>
</dialog>
```

### D4. Wiring dans `ShellHeader`

```typescript
export default class ShellHeader extends Component<ShellHeaderSignature> {
  @service declare router: RouterService;

  @tracked searchQuery = '';
  @tracked showSearchDropdown = false;
  @tracked showAddItemModal = false;

  @action onSearchInput(value: string) {
    this.searchQuery = value;
    this.showSearchDropdown = value.length > 0;
  }

  @action onSearchResultSelect(item: SearchResult) {
    this.showSearchDropdown = false;
    this.searchQuery = '';
    // Route based on type
    if (item.type === 'projects') this.router.transitionTo('dashboard.projects', item.id);
    // etc.
  }

  @action openAddItem() { this.showAddItemModal = true; }
  @action closeAddItem() { this.showAddItemModal = false; }
  @action onAddItemSelect(type: AddItemType) {
    this.closeAddItem();
    // Navigate to the right route OR emit event to parent
    // For P13 simplest: navigate to the right route's create page
    const routeMap = {
      project: 'dashboard.projects.create',
      epic: 'dashboard.backlog', // open AddEpicModal on the page
      'user-story': 'dashboard.backlog',
      task: 'dashboard.backlog',
      sprint: 'dashboard.sprints',
      'time-entry': 'dashboard.time-tracking',
    };
    this.router.transitionTo(routeMap[type] ?? 'dashboard');
  }
}
```

**Décision** : pour P13, l'AddItem **route vers la page concernée** (pas d'orchestration complexe modal-cross-lib). L'utilisateur clique ensuite "Add" depuis la page de destination si nécessaire. C'est un MVP pragmatique. Une V2 brancherait des modals globales.

### D5. i18n — `shell.search.*` et `shell.addItem.*`

`@apps/front/translations/shell/fr-fr.yaml` (et en-us) — ajouter :
```yaml
search:
  placeholder: 'Rechercher...'
  minLength: 'Tapez au moins 2 caractères'
  empty: 'Aucun résultat'
  groups:
    projects: 'Projets'
    tasks: 'Tâches'
    'user-stories': 'User Stories'
    sprints: 'Sprints'
addItem:
  title: 'Que voulez-vous ajouter ?'
  project: 'Projet'
  epic: 'Epic'
  'user-story': 'User Story'
  task: 'Tâche'
  sprint: 'Sprint'
  'time-entry': 'Saisie de temps'
```

### D6. MSW mocks search

`@libs/shell-front/src/http-mocks/search.ts` (nouveau) :
- `GET /api/v1/search?q=...&types=...` → retourne un mix de mocks tasks/projects/user-stories/sprints filtrés par `q.toLowerCase()` sur title/name.
- Sources : importer les mocks existants (projects/backlog/sprints) ou hardcoder ~10 items.
- Exporter `searchHandlers = [http.get(...)]`.
- Wirer dans `@apps/front/app/routes/application.ts`.

### D7. Tests E2E (Playwright)

**Prérequis** : `pnpm start:with-back` ou backend déjà up. Les e2e existants utilisent VITE_MOCK_API=false (backend réel).

Mais P13 doit fonctionner même sans backend réel. **Décision** : adapter les E2E à utiliser **VITE_MOCK_API=true** (MSW) pour P13 — c'est plus simple et déterministe. Modifier `playwright.config.ts` si besoin pour pointer sur le dev server MSW.

**Test 1 — `tests/login.spec.ts`** (existe déjà) — pas modifier, vérifier qu'il passe.

**Test 2 — `tests/dashboard.spec.ts`** (nouveau) :
- Login.
- Vérifier `/` rend "Dashboard" + 3 KPI cards.
- Vérifier sidebar "Sprints" navigate `/sprints` → page rend.

**Test 3 — `tests/search.spec.ts`** (nouveau) :
- Login.
- Taper "Auth" dans la search bar.
- Vérifier dropdown apparaît avec ≥ 1 résultat dans la section "Tâches" ou "User Stories".

**Test 4 — `tests/add-item.spec.ts`** (nouveau) :
- Login.
- Cliquer bouton "Add" dans la topbar.
- Vérifier modal "Que voulez-vous ajouter ?" s'ouvre.
- Cliquer "Projet" → vérifier redirect vers `/projects/create`.

**Pattern Playwright** : suivre le style existant simple (pas de Page Object).

### D8. A11y minimal P13 (le reste P13.5)
- Ajouter `aria-label` sur les boutons icon-only (Search, AddItem, Theme).
- Ajouter `role="dialog"` et `aria-modal="true"` sur le SearchDropdown et AddItemModal.
- Le focus management complet (focus trap + restore on close) → P13.5.

---

## 4. Plan d'exécution (sous-agents parallélisables)

**Vague 1 — Mocks + i18n (sériel)** (~10 min)
1. Créer `@libs/shell-front/src/http-mocks/search.ts` + handler MSW.
2. Wirer `searchHandlers` dans `@apps/front/app/routes/application.ts`.
3. Étendre `@apps/front/translations/shell/{en-us,fr-fr}.yaml` avec `search.*` et `addItem.*`.

**Vague 2 — Composants en parallèle (2 sous-agents)** (~25 min)
- Agent A : `SearchDropdown` (debounce fetch, grouped results, empty state).
- Agent B : `AddItemModal` (grid 6 options + actions).

**Vague 3 — Wiring ShellHeader (sériel)** (~15 min)
1. Modifier `header.gts` pour gérer search input + AddItem button + show modales conditionnellement.
2. Wire `@onSearch` du TpkSearchPrefab.
3. Activer bouton "Add" (retire `@disabled`).
4. Render `<SearchDropdown>` + `<AddItemModal>` conditionnellement.

**Vague 4 — E2E Playwright (sériel)** (~20 min)
1. Créer `@apps/e2e/tests/search.spec.ts`.
2. Créer `@apps/e2e/tests/add-item.spec.ts`.
3. Vérifier `playwright.config.ts` (baseURL, webServer command).
4. Lancer la suite avec `pnpm -F @apps/e2e test` ou playwright direct.

**Vague 5 — Validation + lint + visual (sériel)** (~15 min)
1. `pnpm turbo lint` depuis racine (règle critique).
2. Validation visuelle Playwright manuel : `/` → tape "Auth" → dropdown rend ; click "Add" → modal rend.
3. Screenshots `specs/review-screenshots/p13-search.png` + `p13-add-item.png`.

**Vague 6 — PR + handoff** (~10 min)
1. Commit `feat(shell-front): P13 — search bar + AddItem modal + E2E smoke tests`.
2. Push + PR vers `dev`.
3. **Pas de risque lockfile** (extension de libs existantes).
4. Move plan to `specs/done/`.
5. `/TPK-handoff` final MVP.

**Total estimé** : 95 min.

---

## 5. Critères de succès (vérification bloquante avant `done/`)

1. [ ] Search bar header reçoit l'input et **trigger fetch** (visible dans Network tab).
2. [ ] `SearchDropdown` rend les résultats groupés par type (sections "Projets", "Tâches", etc.).
3. [ ] Click sur un résultat search → navigation correcte (ex: project → `/projects/:id`).
4. [ ] Bouton "Add" topbar (`shell.header.add`) **n'est plus disabled** — ouvre la modale AddItem.
5. [ ] `AddItemModal` rend les 6 options en grid 2×3.
6. [ ] Click sur "Projet" dans AddItem → navigation vers `/projects/create` (ou route create concernée).
7. [ ] E2E `tests/search.spec.ts` passe (tape "Auth" → dropdown visible).
8. [ ] E2E `tests/add-item.spec.ts` passe (click Add → modal s'ouvre → click Projet → URL change).
9. [ ] E2E `tests/login.spec.ts` toujours vert (régression).
10. [ ] `pnpm turbo lint` vert depuis racine **avant push**.
11. [ ] Aria labels présents sur Search/AddItem/Theme buttons (a11y de base).
12. [ ] Validation visuelle : screenshots `p13-search.png` + `p13-add-item.png` capturés.
13. [ ] Zéro erreur console runtime.

---

## 6. Key Files (anticipation)

### Nouveaux
- `@libs/shell-front/src/components/shell/search-dropdown.gts`
- `@libs/shell-front/src/components/shell/add-item-modal.gts`
- `@libs/shell-front/src/http-mocks/search.ts`
- `@apps/e2e/tests/search.spec.ts`
- `@apps/e2e/tests/add-item.spec.ts`

### Modifiés
- `@libs/shell-front/src/components/shell/header.gts` — search input + AddItem button + render modales
- `@libs/shell-front/package.json` — app-js entries pour nouveaux composants
- `@apps/front/app/routes/application.ts` — wirer `searchHandlers` dans MSW workers
- `@apps/front/translations/shell/en-us.yaml` + `fr-fr.yaml` — keys search/addItem

### Eventuellement modifiés
- `@apps/e2e/playwright.config.ts` — si besoin d'ajuster baseURL/webServer pour mode MSW

---

## 7. Risques connus & mitigations

| Risque | Mitigation |
|---|---|
| Search dropdown z-index conflits avec topbar | Utiliser `z-50` + `absolute` positioning sous le search input. Tester visuel avant push. |
| Debounce fetch trop agressif (cancel/race conditions) | Utiliser un ID incrémenté + check on response : si ID stale, ignorer la réponse. |
| AddItem modal "open backlog page" sans déclencher modal là-bas | P13 accepte cette limitation : l'utilisateur clique ensuite "Add" sur la page. Documenter dans le handoff comme follow-up V2. |
| E2E ne trouve pas le bouton "Add" car l'ARIA label change | Utiliser `getByText` ou `getByRole('button', { name: /Add|Ajouter/i })` pour matcher quel que soit le i18n |
| E2E dépend de mocks MSW vs backend réel | Forcer `VITE_MOCK_API=true` dans la config Playwright pour P13. Si conflict avec login.spec.ts existant qui attend backend, soit ajuster celui-là, soit créer un dossier `tests/msw/` séparé |
| Tests Playwright lents en CI | Garder les 3 nouveaux tests rapides (< 10s chacun). Pas de wait long. |
| Search results de types différents → routes différentes | Implémenter un switch dans `onSearchResultSelect` pour mapper type → route. Documenter clairement. |
| Tailwind classes non générées pour les nouveaux composants | shell-front est déjà dans `@source` `app.css` — OK. |

---

## 8. Mémoires à mettre à jour (post-P13)

- Aucune nouvelle mémoire prévue : P13 = composition de fonctionnalités existantes.
- Si E2E nécessite des patterns spécifiques (timing, race conditions, MSW init) → potentielle mémoire `feedback-e2e-playwright-pattern`.

---

## 9. Phase de suivi recommandée (P13.5 — out of P13 scope)

- Lighthouse a11y audit + corrections ciblées (score ≥ 90).
- `<TpkModalShell>` composant partagé : focus trap, escape-to-close, focus restore.
- Raccourci clavier `Cmd+K` / `Ctrl+K` pour ouvrir search.
- Recherche cross-project (option `--all-projects`).
- AddItem real-modal cross-lib (refactor avec slot pattern dans application template).
