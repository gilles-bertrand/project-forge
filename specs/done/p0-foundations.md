# Plan P0 — Fondations & décisions structurantes

> Phase préparatoire de la migration **boilerplate → SprintForge** (cf. `sprintforge-migration-macro-plan.md`).
>
> But : poser les bases (suppression de l'ancien domaine `todos`, design tokens, services partagés stub, documentation) avant d'attaquer la modélisation backend (P1).

---

## 1. Problème & objectifs

### 1.1 État actuel (constaté)
- `@libs/todos-backend` et `@libs/todos-front` sont fortement câblés :
  - **Backend** : `@apps/backend/src/app/app.ts:23,152`, `app.router.ts:4,9,14,30`, `database.connection.ts:4`, `api-types.ts` (généré).
  - **Frontend** : `@apps/front/app/router.ts:4,14`, `routes/application.ts:6,10,37`, `services/store.ts:11,23`, `templates/dashboard.gts:86`, `styles/app.css:23`.
- `@libs/shared-front` ne contient aujourd'hui que 2 services (`error-reporter`, `handle-save`). Pas de `styles/`, pas de composants partagés.
- Le front utilise **Tailwind v4** (`@import 'tailwindcss'` dans `app.css`) avec daisyUI (`@plugin "daisyui"`) — pas de design tokens SprintForge.
- Pas d'ADR existant dans le repo.

### 1.2 Objectifs P0
1. **Décisions** : figer dans un ADR court les choix structurants du plan macro.
2. **Nettoyage** : supprimer toutes les références à `todos-backend` / `todos-front` et désinscrire les libs du workspace.
3. **Design tokens** : exposer dans `@libs/shared-front` les variables CSS issues du prototype (dark + light, palette teal, sidebar tokens).
4. **Service `theme`** : créer le squelette du service de bascule dark/light (impl. complète en P3, ici on pose la coquille consommée par tout le monde).
5. **Documentation** : mettre à jour `CLAUDE.md` racine + `@libs/CLAUDE.md` + `@apps/backend/CLAUDE.md` pour refléter le nouveau périmètre.
6. **CI verte** : `pnpm dev`, `pnpm lint`, `pnpm test`, `pnpm -F @apps/backend test` doivent passer après suppression.

### 1.3 Non-objectifs (ce que P0 ne fait pas)
- Pas de nouvelle entité backend (réservé à P1).
- Pas de nouvelle route front (réservé à P3+).
- Pas de migration DB autre que la suppression de la table `todo`.
- Pas de drag-drop, pas de modale fonctionnelle.

---

## 2. Approche technique

### 2.1 Ordre logique
```
1. ADR posé en spec
2. Branche dédiée : feat/p0-foundations (à confirmer avec l'utilisateur)
3. Désintégration backend de todos-backend
4. Désintégration front de todos-front
5. Suppression physique des dossiers @libs/todos-*
6. Création du dossier styles/ dans shared-front + import des tokens
7. Ajout du service theme dans shared-front (stub)
8. Câblage du CSS shared-front dans @apps/front/app/styles/app.css
9. Mise à jour des CLAUDE.md
10. Validation : pnpm install && pnpm lint && pnpm test && pnpm dev (smoke test)
11. Commits atomiques + récap
```

### 2.2 Stratégie de découpage en commits
| # | Type   | Sujet                                                                       |
|---|--------|------------------------------------------------------------------------------|
| 1 | docs   | docs(specs): ajouter l'ADR SprintForge (00-adr-sprintforge.md)              |
| 2 | refactor | refactor(backend): désinscrire todosModule de App, app.router, database.connection |
| 3 | refactor | refactor(front): désinscrire todos-front (router, application route, store, sidebar, app.css) |
| 4 | chore  | chore(libs): supprimer @libs/todos-backend et @libs/todos-front             |
| 5 | feat   | feat(shared-front): exposer les design tokens SprintForge (dark/light)      |
| 6 | feat   | feat(shared-front): scaffolder le service theme (stub)                      |
| 7 | docs   | docs(claude): mettre à jour CLAUDE.md (racine, libs, backend) pour SprintForge |

> Si une étape doit être splittée (compilation cassée entre 2 commits), conserver l'ordre mais regrouper jusqu'à un état vert.

### 2.3 Risques & parades
| Risque                                                                                 | Parade                                                                                                  |
|----------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| Suppression de `TodoEntity` casse la migration DB existante                            | Faire un `pnpm schema:fresh` après suppression. Pas de migration historique à préserver (boilerplate).  |
| `api-types.ts` régénéré contient toujours `/todos`                                     | Lancer `pnpm api:types` après cleanup pour regénérer.                                                   |
| MSW handlers de `todos-front` référencés ailleurs                                      | `grep -rn` exhaustif avant suppression (cf. §3.3).                                                      |
| daisyUI override les variables CSS du Figma                                            | Ne pas toucher daisyUI ici. Les tokens sont exposés en plus, scopés via `@theme inline` Tailwind v4.    |
| Le service `theme` du Figma utilise `:root.light` ; le front actuel a déjà un `set-theme.ts` | En P0, garder `set-theme.ts` (gère le mode daisyUI legacy). Le service `theme` shared-front sera l'API future ; P3 fera la bascule complète. |

---

## 3. Implémentation pas à pas

### 3.1 ADR (commit 1)

Créer **`specs/done/00-adr-sprintforge.md`** avec le contenu suivant (déplacement dans `done/` à la fin de P0) :

```markdown
# ADR 00 — Migration boilerplate → SprintForge

Date : <à remplir>
Statut : Accepté
Contexte : cf. `specs/todo/sprintforge-migration-macro-plan.md`

## Décisions

1. **Suppression du domaine `todos`** (back + front). Aucune compatibilité ascendante requise (boilerplate jamais déployé).
2. **Granularité libs Scrum** : un lib par agrégat racine.
   - Backend : `projects-backend`, `backlog-backend` (Epic+UserStory+Task), `sprints-backend`, `time-tracking-backend`.
   - Frontend : `projects-front`, `backlog-front`, `kanban-front` (peut fusionner), `sprints-front`, `time-tracking-front`, `dashboard-front`. Settings dans `users-front` (extension).
3. **Comments / Attachments / HistoryEntry** : tables internes à `backlog-backend` (pas de lib dédiée).
4. **Design tokens** : variables CSS hébergées dans `@libs/shared-front/src/styles/theme.css`, exposées à Tailwind v4 via `@theme inline`.
5. **Thème** : service `theme` dans `@libs/shared-front`, persistance `localStorage`, attribut `data-theme` ou classe `.light` sur `<html>`.
6. **i18n** : 100 % FR au MVP. La mécanique `ember-intl` est conservée mais on ne traduit pas en EN avant V2.
7. **Auth** : on conserve le mécanisme JWT + refresh existant (`@libs/users-backend`).

## Conséquences
- Pas de Task#1234 historique à porter : seeds totalement réécrits en P1.
- Tout consommateur Tailwind doit utiliser les classes générées depuis les tokens (`bg-card`, `text-foreground`, etc.) plutôt que les couleurs daisyUI pour les composants SprintForge.
```

> L'ADR sera déplacé dans `specs/done/` à la fin de P0 (il est statique, plus jamais touché).

---

### 3.2 Désinscrire `todos-backend` (commit 2)

#### 3.2.1 `@apps/backend/src/app/app.router.ts`
**Avant** (extrait) :
```ts
import { type AuthModule, type UserModule } from "@libs/users-backend";
import type { FastifyInstanceType } from "./app.js";
import { statusRoute } from "./status.route.js";
import { Module as TodoModule } from "@libs/todos-backend";

interface AppRouterOptions {
  authModule: AuthModule;
  userModule: UserModule;
  todosModule: TodoModule;
}

export async function appRouter(
  fastify: FastifyInstanceType,
  { authModule, userModule, todosModule }: AppRouterOptions,
) {
  // ...
  await userModule.setupRoutes(fastify);
  await todosModule.setupRoutes(fastify);
}
```

**Après** :
```ts
import { type AuthModule, type UserModule } from "@libs/users-backend";
import type { FastifyInstanceType } from "./app.js";
import { statusRoute } from "./status.route.js";

interface AppRouterOptions {
  authModule: AuthModule;
  userModule: UserModule;
}

export async function appRouter(
  fastify: FastifyInstanceType,
  { authModule, userModule }: AppRouterOptions,
) {
  // ...
  await userModule.setupRoutes(fastify);
}
```

#### 3.2.2 `@apps/backend/src/app/app.ts`
- Supprimer l'import `import { Module as TodoModule } from "@libs/todos-backend";` (ligne ~23).
- Supprimer la construction `todosModule: TodoModule.init({ ... })` (ligne ~152) et l'argument correspondant passé à `appRouter`.

#### 3.2.3 `@apps/backend/src/app/database.connection.ts`
- Supprimer `import { TodoEntity } from "@libs/todos-backend";` (ligne 4).
- Retirer `TodoEntity` du tableau `entities: [...]` (s'il y est listé).

#### 3.2.4 `@apps/backend/package.json`
- Retirer la ligne `"@libs/todos-backend": "workspace:*",` des `dependencies`.

#### 3.2.5 `@apps/backend/src/api-types.ts`
- **Ne pas éditer manuellement** — il est généré.
- Après les modifs ci-dessus, exécuter `cd @apps/backend && pnpm build:deps && pnpm api:types` pour le régénérer (toutes les entrées `/api/v1/todos/*` doivent disparaître).

#### 3.2.6 Vérification
```bash
cd @apps/backend
pnpm install
pnpm build:deps
pnpm api:types
pnpm test
pnpm dev   # smoke : http://localhost:3000/api/v1/users doit répondre, /todos en 404
```

---

### 3.3 Désinscrire `todos-front` (commit 3)

#### 3.3.1 Inventaire à supprimer (vérification préalable)
```bash
grep -rn "todos-front\|todosLibRouter\|initializeTodoLib\|TodoSchema\|allTodosHandlers" @apps/front
```

Résultats attendus (cf. §1.1) :
- `@apps/front/app/router.ts`
- `@apps/front/app/routes/application.ts`
- `@apps/front/app/services/store.ts`
- `@apps/front/app/templates/dashboard.gts`
- `@apps/front/app/styles/app.css`

#### 3.3.2 `@apps/front/app/router.ts`
**Avant** :
```ts
import { forRouter as userLibRouter, authRoutes } from '@libs/users-front';
import { forRouter as todosLibRouter } from '@libs/todos-front';

Router.map(function () {
  this.route('dashboard', { path: '/' }, function () {
    userLibRouter.call(this);
    todosLibRouter.call(this);
  });
  authRoutes.call(this);
});
```
**Après** :
```ts
import { forRouter as userLibRouter, authRoutes } from '@libs/users-front';

Router.map(function () {
  this.route('dashboard', { path: '/' }, function () {
    userLibRouter.call(this);
  });
  authRoutes.call(this);
});
```

#### 3.3.3 `@apps/front/app/routes/application.ts`
- Retirer `import { initialize as initializeTodoLib } from '@libs/todos-front';`.
- Retirer `import allTodosHandlers from '@libs/todos-front/http-mocks/all';`.
- Adapter le `setupWorker(...allUsersHandlers, ...allTodosHandlers)` → `setupWorker(...allUsersHandlers)`.
- Supprimer la ligne `initializeTodoLib(getOwner(this)!);`.

#### 3.3.4 `@apps/front/app/services/store.ts`
- Retirer `import TodoSchema from '@libs/todos-front/schemas/todos';`.
- Retirer `TodoSchema` du tableau `schemas: [UserSchema, TodoSchema]` → `schemas: [UserSchema]`.

#### 3.3.5 `@apps/front/app/templates/dashboard.gts`
- Supprimer l'entrée `dashboard.sidebar.todos` de `menuItems` (objet complet avec `type`, `label`, `route`, `icon`).
- (Optionnel) Supprimer la clé i18n `dashboard.sidebar.todos` de `@apps/front/translations/fr-fr.yaml` et `en-us.yaml` si elles existent.

#### 3.3.6 `@apps/front/app/styles/app.css`
- Supprimer la ligne `@source "../../node_modules/@libs/todos-front";`.

#### 3.3.7 `@apps/front/package.json`
- Retirer la ligne `"@libs/todos-front": "workspace:*"` (dans `dependencies` ou `devDependencies`).

#### 3.3.8 Vérification
```bash
pnpm install
cd @apps/front
pnpm lint:types
pnpm lint
pnpm test
pnpm start  # smoke : la sidebar n'affiche plus l'item Todos, pas d'erreur console
```

---

### 3.4 Supprimer les dossiers libs (commit 4)

```bash
rm -rf @libs/todos-backend @libs/todos-front
pnpm install   # met à jour pnpm-lock.yaml et purge node_modules orphelins
```

Vérifier que `pnpm-workspace.yaml` ne référence pas explicitement `todos-*` (le glob `@libs/*` suffit, mais à confirmer).

```bash
cat pnpm-workspace.yaml
```

Si tout est OK :
```bash
pnpm lint   # toute la chaîne turbo doit passer
pnpm -F @apps/backend test
```

---

### 3.5 Design tokens dans `shared-front` (commit 5)

#### 3.5.1 Créer le dossier
```bash
mkdir -p @libs/shared-front/src/styles
```

#### 3.5.2 `@libs/shared-front/src/styles/theme.css`

Créer ce fichier avec les tokens SprintForge. Les valeurs proviennent de l'analyse du prototype (cf. §1.1 du plan macro) — adaptation à Tailwind v4 (`@theme inline`) du repo :

```css
/*
 * Design tokens SprintForge — issus du prototype Figma Make VISlgCFh1GHyahMpAfDoOT.
 * Variables CSS scopées sur :root (dark par défaut) et :root.light (mode clair).
 * Exposés à Tailwind v4 via @theme inline → utilisables comme `bg-card`, `text-foreground`, etc.
 */

:root {
  /* Layout */
  --radius: 0.5rem;

  /* Dark mode — défaut */
  --background: #0A1929;
  --foreground: #E3F2FD;
  --card: #132F4C;
  --card-foreground: #E3F2FD;
  --popover: #132F4C;
  --popover-foreground: #E3F2FD;
  --primary: #7FDBCA;
  --primary-foreground: #0A1929;
  --secondary: #1E3A5F;
  --secondary-foreground: #B0BEC5;
  --muted: #1E3A5F;
  --muted-foreground: #90A4AE;
  --accent: #7FDBCA;
  --accent-foreground: #0A1929;
  --destructive: #F48FB1;
  --destructive-foreground: #0A1929;
  --border: #1E3A5F;
  --input: #132F4C;
  --input-background: #132F4C;
  --ring: #7FDBCA;
  --chart-1: #7FDBCA;
  --chart-2: #66C7B8;
  --chart-3: #4DB3A3;
  --chart-4: #339F8F;
  --chart-5: #F48FB1;

  /* Sidebar tokens */
  --sidebar: #0B1E2E;
  --sidebar-foreground: #E3F2FD;
  --sidebar-primary: #7FDBCA;
  --sidebar-primary-foreground: #0A1929;
  --sidebar-accent: #1E3A5F;
  --sidebar-accent-foreground: #B0BEC5;
  --sidebar-border: #1E3A5F;
  --sidebar-ring: #7FDBCA;
  --logo-color: #7FDBCA;
}

:root.light {
  --background: #F8FAFB;
  --foreground: #0A1929;
  --card: #FFFFFF;
  --card-foreground: #0A1929;
  --popover: #FFFFFF;
  --popover-foreground: #0A1929;
  --primary: #339F8F;
  --primary-foreground: #FFFFFF;
  --secondary: #E3F2FD;
  --secondary-foreground: #0A1929;
  --muted: #E3F2FD;
  --muted-foreground: #546E7A;
  --accent: #339F8F;
  --accent-foreground: #FFFFFF;
  --destructive: #EF5350;
  --destructive-foreground: #FFFFFF;
  --border: #CFD8DC;
  --input: #FFFFFF;
  --input-background: #FFFFFF;
  --ring: #339F8F;
  --chart-1: #339F8F;
  --chart-2: #4DB3A3;
  --chart-3: #66C7B8;
  --chart-4: #7FDBCA;
  --chart-5: #EF5350;

  --sidebar: #FFFFFF;
  --sidebar-foreground: #0A1929;
  --sidebar-primary: #339F8F;
  --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: #E3F2FD;
  --sidebar-accent-foreground: #0A1929;
  --sidebar-border: #CFD8DC;
  --sidebar-ring: #339F8F;
  --logo-color: #0A1929;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-input-background: var(--input-background);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);

  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
```

#### 3.5.3 Exposer le fichier via `rollup`

Vérifier `@libs/shared-front/rollup.config.mjs` : si le pattern `src/**/*` est déjà copié vers `dist/`, le fichier sera publié à `@libs/shared-front/styles/theme.css`. Si non, ajouter la copie explicite.

Vérifier le `package.json` de `shared-front` — il a déjà `"./*.css": "./dist/*.css"`. Donc `@libs/shared-front/styles/theme.css` devra être accessible. À tester : `cd @libs/shared-front && pnpm build && ls dist/styles/`.

Si le rollup ne produit pas `dist/styles/theme.css`, ajouter dans `rollup.config.mjs` un plugin `addon.publicEntrypoints` ou un `addon.copy` (selon convention Embroider v2). Référencer `@triptyk/ember-input/dist/app.css` qui suit le même pattern pour s'inspirer.

#### 3.5.4 Importer dans `@apps/front`

Modifier `@apps/front/app/styles/app.css` :
```css
@import 'tailwindcss';
@import '@libs/shared-front/styles/theme.css';   /* nouveau */
@import '@triptyk/ember-input/dist/app.css';
@import '@triptyk/ember-ui/dist/app.css';
@import '@triptyk/ember-input-validation/dist/app.css';
@import './auth.css';
@import './flash.css';

@plugin "daisyui" {
  themes:
    nord --default,
    dracula,
    cupcake,
    corporate,
    lemonade;
}

@source "../../node_modules/@triptyk/ember-ui";
@source "../../node_modules/@triptyk/ember-input";
@source "../../node_modules/@libs/shared-front";  /* nouveau (déjà nécessaire pour le service theme) */
```

#### 3.5.5 Smoke test
```bash
cd @apps/front && pnpm start
```
Aller sur `/login` ou la home. Ouvrir devtools → inspecter `<html>` → `getComputedStyle(document.documentElement).getPropertyValue('--background')` doit retourner `#0A1929`. Tester en ajoutant manuellement la classe `.light` sur `<html>` → la valeur doit basculer à `#F8FAFB`.

---

### 3.6 Service `theme` stub dans `shared-front` (commit 6)

#### 3.6.1 Créer `@libs/shared-front/src/services/theme.ts`
```ts
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'sprintforge:theme';
const DEFAULT_MODE: ThemeMode = 'dark';

export default class ThemeService extends Service {
  @tracked mode: ThemeMode = DEFAULT_MODE;

  /**
   * Appelée au boot de l'application (depuis routes/application.ts).
   * Lit la préférence sauvegardée et applique la classe sur <html>.
   */
  setup(): void {
    const saved = this.readSavedMode();
    this.apply(saved ?? DEFAULT_MODE);
  }

  toggle(): void {
    this.apply(this.mode === 'dark' ? 'light' : 'dark');
  }

  apply(mode: ThemeMode): void {
    this.mode = mode;
    const root = document.documentElement;
    if (mode === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* localStorage indisponible (SSR, mode privé) — silent */
    }
  }

  private readSavedMode(): ThemeMode | null {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === 'dark' || v === 'light' ? v : null;
    } catch {
      return null;
    }
  }
}

declare module '@ember/service' {
  interface Registry {
    theme: ThemeService;
  }
}
```

#### 3.6.2 Re-exporter depuis `@libs/shared-front/src/index.ts`

Ajouter (si convention du repo) une réexport explicite ou s'appuyer sur le glob `services/**` déjà présent dans `moduleRegistry()`. Le glob suffit pour que le service soit injectable depuis l'app.

#### 3.6.3 Brancher `theme.setup()` dans `@apps/front/app/routes/application.ts`
```ts
import type ThemeService from '@libs/shared-front/services/theme';

export default class ApplicationRoute extends Route {
  @service declare intl: IntlService;
  @service declare session: SessionService;
  @service declare theme: ThemeService;   // ← nouveau
  worker?: ReturnType<typeof setupWorker>;

  async beforeModel() {
    this.theme.setup();                    // ← nouveau (remplacera `setTheme()` legacy plus tard)
    setTheme();                            // legacy daisyUI — laisser en place pour P0
    // ... reste inchangé sauf retraits todos
  }
}
```

> **Note** : la fonction `setTheme()` legacy (`utils/set-theme.ts`) gère la palette daisyUI ; le nouveau service gère uniquement la classe `.light` pour les tokens SprintForge. Les deux cohabitent jusqu'à P3 où on supprimera le legacy.

#### 3.6.4 Test unitaire
Créer `@libs/shared-front/tests/unit/services/theme-test.ts` :
```ts
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import type ThemeService from '@libs/shared-front/services/theme';

module('Unit | Service | theme', function (hooks) {
  setupTest(hooks);

  test('apply("light") ajoute la classe sur <html>', function (assert) {
    const theme = this.owner.lookup('service:theme') as ThemeService;
    theme.apply('light');
    assert.true(document.documentElement.classList.contains('light'));
    theme.apply('dark');
    assert.false(document.documentElement.classList.contains('light'));
  });

  test('toggle bascule entre dark et light', function (assert) {
    const theme = this.owner.lookup('service:theme') as ThemeService;
    theme.apply('dark');
    theme.toggle();
    assert.strictEqual(theme.mode, 'light');
    theme.toggle();
    assert.strictEqual(theme.mode, 'dark');
  });
});
```

---

### 3.7 Documentation (commit 7)

#### 3.7.1 `CLAUDE.md` (racine)
- Mettre à jour la section "Layout" : retirer `todos-backend`, `todos-front` ; ajouter "(futures libs SprintForge : `projects-backend`, `backlog-backend`, `sprints-backend`, `time-tracking-backend`, `projects-front`, `backlog-front`, `kanban-front`, `sprints-front`, `time-tracking-front`, `dashboard-front`) — voir `specs/done/00-adr-sprintforge.md`".
- Adapter la ligne "Les routes backend sont préfixées `/api/v1` puis montées par module" : retirer `/todos/*`, ajouter mention que les modules SprintForge arrivent en P2.
- Ajouter un bloc :
  ```markdown
  ## Migration en cours

  Ce repo est en cours de transformation depuis un boilerplate Ember+Fastify vers **SprintForge** (gestion Scrum). Voir :
  - `specs/todo/sprintforge-migration-macro-plan.md` (plan macro 14 phases)
  - `specs/done/00-adr-sprintforge.md` (décisions structurantes)
  - `specs/todo/p*.md` (plans détaillés par phase)
  ```

#### 3.7.2 `@libs/CLAUDE.md`
- Adapter la liste : retirer `todos-backend`, `todos-front`.
- Conserver la règle "pas de cycle". Préciser que les futurs libs front Scrum suivent la même contrainte : ne dépendent que de `@libs/shared-front` (+ leur backend sibling pour les types via `@apps/backend/src/api-types.ts`).

#### 3.7.3 `@apps/backend/CLAUDE.md`
- Section "Les domaines (Users, Todos) sont dans `@libs/*-backend`..." → "Les domaines (Users en P0, puis Projects/Backlog/Sprints/TimeTracking en P1+)..."

#### 3.7.4 Renommer / déplacer l'ADR
À la fin de P0 :
```bash
# si pas encore fait
mv specs/todo/00-adr-sprintforge.md specs/done/00-adr-sprintforge.md
```
(L'ADR est créé directement dans `specs/done/` si on suit §3.1 strictement.)

---

## 4. Validation finale (avant clôture P0)

### 4.1 Suite de commandes
```bash
# 1. Cohérence workspace
pnpm install

# 2. Lint global
pnpm lint

# 3. Tests backend
pnpm -F @apps/backend test

# 4. Tests libs back
pnpm -F @libs/users-backend test
pnpm -F @libs/backend-shared test

# 5. Tests front
pnpm -F @apps/front test
pnpm -F @libs/shared-front test
pnpm -F @libs/users-front test

# 6. Build complet
pnpm turbo build

# 7. Smoke run
pnpm dev   # ouvrir http://localhost:4200 et http://localhost:3000/documentation
```

### 4.2 Checklist visuelle (smoke `pnpm dev`)
- [ ] Le backend démarre sans logger d'erreur.
- [ ] Swagger UI (`/documentation`) liste `/api/v1/auth/*` et `/api/v1/users/*` — **aucun** endpoint `/todos`.
- [ ] Le front se charge sur `/`.
- [ ] La sidebar legacy n'affiche plus l'item "Todos".
- [ ] Devtools → `getComputedStyle(document.documentElement).getPropertyValue('--background')` retourne `#0A1929`.
- [ ] `document.documentElement.classList.add('light')` puis recheck → la valeur passe à `#F8FAFB`.
- [ ] Aucune erreur 404 en console pour des assets `todos-front`.

### 4.3 Search final pour zéro reliquat
```bash
grep -rn "todos\|TodoEntity\|TodoModule\|TodoSchema" @apps @libs --include="*.ts" --include="*.gts" --include="*.css" --include="*.json"
# Doit retourner 0 résultat (sauf éventuellement api-types.ts généré → relancer pnpm api:types)
```

---

## 5. Critères de succès

| # | Critère                                                                            | Mesure                                            |
|---|------------------------------------------------------------------------------------|---------------------------------------------------|
| 1 | Suppression des libs `todos-backend` / `todos-front` complète                      | `ls @libs` ne les liste plus                      |
| 2 | Aucune référence résiduelle dans le code                                           | `grep` final §4.3 retourne 0 ligne                |
| 3 | Backend démarre et expose Swagger sans `/todos`                                    | smoke `/documentation`                            |
| 4 | Front démarre, sidebar legacy nettoyée, console sans erreur                        | smoke navigateur                                  |
| 5 | Tokens SprintForge accessibles via Tailwind v4 (`bg-card`, `text-foreground`)      | inspection devtools                               |
| 6 | Service `theme` injectable depuis l'app                                            | test unitaire vert + injection dans `ApplicationRoute` |
| 7 | ADR posé dans `specs/done/00-adr-sprintforge.md`                                   | fichier présent                                   |
| 8 | `CLAUDE.md` (3 fichiers) à jour                                                    | diff git                                          |
| 9 | `pnpm lint && pnpm turbo build` verts                                              | CI ou exécution locale                            |

---

## 6. Suite après P0

Lancer le plan détaillé suivant :
```
/TPK-plan P1 — Modèles & migrations backend SprintForge
```

Ce plan détaillera :
- Création de `@libs/projects-backend` (entité `Project` + jointure `ProjectMember`).
- Création de `@libs/backlog-backend` (entités `Epic`, `UserStory`, `Task` + tables internes Comment/Attachment/HistoryEntry).
- Création de `@libs/sprints-backend` (entité `Sprint`).
- Création de `@libs/time-tracking-backend` (entité `TimeEntry`).
- Extension de `@libs/users-backend` (`role`, `color`, `avatar`).
- Migration `pnpm schema:fresh` + nouveau `development.seeder.ts` reproduisant le scénario du Figma (Sprint 88 actif, 7 users, 3 projets).

---

## 7. Annexes

### 7.1 Récapitulatif fichiers touchés

**Suppressions**
- `@libs/todos-backend/` (dossier complet)
- `@libs/todos-front/` (dossier complet)

**Créations**
- `specs/done/00-adr-sprintforge.md`
- `@libs/shared-front/src/styles/theme.css`
- `@libs/shared-front/src/services/theme.ts`
- `@libs/shared-front/tests/unit/services/theme-test.ts`

**Modifications**
- `@apps/backend/src/app/app.ts`
- `@apps/backend/src/app/app.router.ts`
- `@apps/backend/src/app/database.connection.ts`
- `@apps/backend/src/api-types.ts` (régénéré)
- `@apps/backend/package.json`
- `@apps/front/app/router.ts`
- `@apps/front/app/routes/application.ts`
- `@apps/front/app/services/store.ts`
- `@apps/front/app/templates/dashboard.gts`
- `@apps/front/app/styles/app.css`
- `@apps/front/package.json`
- `@apps/front/translations/fr-fr.yaml` (optionnel)
- `@apps/front/translations/en-us.yaml` (optionnel)
- `@libs/shared-front/rollup.config.mjs` (si nécessaire pour copier `styles/`)
- `@libs/shared-front/package.json` (vérifier exports si ajout)
- `CLAUDE.md` (racine)
- `@libs/CLAUDE.md`
- `@apps/backend/CLAUDE.md`

### 7.2 Question à valider avec l'utilisateur avant `/TPK-build`
- **Branche** : créer `feat/p0-foundations` ou travailler directement sur `dev` (la branche courante) ? La branche `main` et `dev` sont protégées (cf. ruleset) — passer par une PR depuis une feat branch est probablement préférable.
- **i18n** : conserver le bloc `dashboard.sidebar.todos` dans les YAML ou les nettoyer maintenant ?
- **daisyUI legacy** : la laisser cohabiter avec les nouveaux tokens (P0 strict) ou commencer à découpler dès maintenant ? Recommandation : la laisser en place jusqu'à P3 (shell complet).
