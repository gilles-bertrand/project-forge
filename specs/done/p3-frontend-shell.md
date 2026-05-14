# P3 — Shell frontend (Layout, thème, auth)

> Objectif : porter le shell SprintForge (sidebar + header + login + thème + garde auth + squelettes routes) dans l'app Ember 6, en s'appuyant sur le backend P2 et les design tokens importés en P0. Référence visuelle : `docs/figma-screenshots/01-dashboard.png` et `docs/figma-screenshots/10-login.png`.

---

## 1. Contexte & rappels

### Acquis (P0–P2)
- Tokens CSS Figma chargés dans `@libs/shared-front/src/styles/theme.css` (Tailwind v4 `@theme inline`, dark = `:root`, light = `:root.light`).
- Service `theme` (`@libs/shared-front/src/services/theme.ts`) prêt : `setup()`, `toggle()`, `apply(mode)`, persistance `localStorage:sprintforge:theme`.
- Backend P2 : 40 paths JSON:API exposés via `@apps/backend/src/api-types.ts`.
- Auth backend : `POST /api/v1/auth/login` (body **flat** `{email, password, deviceInfo?}`), `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/users/profile`.
- Seed : `alice.martin@sprintforge.com` / `123456789` (idem pour tous les seeded users).
- `@libs/users-front` fournit déjà : login form + handler JWT + session + currentUser service. **À conserver** et restyler.

### Cible Figma
- **Sidebar** (largeur fixe, fond `--sidebar`) :
  - Logo "SprintForge" (teal, gras, 18px) en haut, padding 24px.
  - **Groupe 1** (icônes line + label) : Tableau de bord, Projets, Backlog, Kanban, User Story Map, Sprints, Suivi du temps.
  - Espace flex.
  - **Groupe 2** (séparé visuellement, en bas) : Utilisateurs, Paramètres.
  - **User-card sticky bottom** : avatar circulaire (couleur seedée), nom + rôle, icône logout à droite.
- **Header** (hauteur ~64px, fond `--background`) :
  - Sélecteur projet (dropdown affichant nom projet actif + chevron).
  - Search bar centrée (placeholder "Rechercher...", icône loupe à gauche).
  - Bouton **"Enregistrer du temps"** (icône horloge, teal, ouvre modale en P9 — placeholder désactivé en P3).
  - Bouton **"Ajouter"** (icône +, teal, dropdown en P4/P6 — placeholder désactivé en P3).
  - Toggle thème (icône soleil/lune à droite).
- **Login** (`docs/figma-screenshots/10-login.png`) :
  - Fond `--background` plein écran.
  - Titre "SprintForge" teal + sous-titre "Outil de gestion de projets Scrum".
  - Carte centrée fond `--card`, padding 32px, titre "Connexion".
  - Champs Email + Mot de passe.
  - Bouton "Se connecter" pleine largeur teal.
  - Footer "SprintForge © 2026 - Gestion de projets Scrum".

### Routes à exposer (9 protégées + 1 login)
| Route | Path | Statut P3 | Implémenté en |
|---|---|---|---|
| `dashboard.index` | `/` | placeholder "En construction" + 3 KPI cards Figma stub | P10 |
| `dashboard.projects` | `/projects` | placeholder | P4 |
| `dashboard.backlog` | `/backlog` | placeholder | P5 |
| `dashboard.kanban` | `/kanban` | placeholder | P7 |
| `dashboard.user-story-map` | `/user-story-map` | placeholder | P5 |
| `dashboard.sprints` | `/sprints` | placeholder | P8 |
| `dashboard.time-tracking` | `/time-tracking` | placeholder | P9 |
| `dashboard.users.*` | `/users/*` | **déjà fonctionnel** via `@libs/users-front` | — |
| `dashboard.settings` | `/settings` | placeholder | P12 |
| `login` | `/login` | **fidèle Figma**, fonctionnel | P3 |

---

## 2. Décisions techniques

### D1. Where lives the shell
**Choix retenu (proposition à valider) : nouvelle lib `@libs/shell-front`.**
- Raison : `@libs/shared-front` contient des services cross-cutting (theme, error-reporter, handle-save) et des design tokens. Le shell est domain-specific SprintForge → mérite sa propre lib, alignée avec le pattern `@libs/users-front`.
- Alternative : étendre `@libs/shared-front`. Plus simple mais mélange responsabilités. **Voir Q1 en fin de doc.**

### D2. Stratégie UI : `@triptyk/ember-ui` + `@triptyk/ember-input` → DaisyUI en dernier recours (validé 2026-05-14)

Le repo Triptyk **[ember-common-ui](https://triptyk.github.io/ember-common-ui/)** publie deux packages déjà installés (catalog pnpm) qui couvrent **tout** ce qu'il faut pour le shell SprintForge :

**Pack 1 — `@triptyk/ember-ui@4.0.0-alpha.1`** (prefabs layout/auth) :
| Composant | API clé | Usage P3 |
|---|---|---|
| `<TpkDashBoard>` | `Args: { title, navbarItems, sidebarItems: SidebarItem[], currentUser:{fullName}, onLogout, collapsed, onCollapsedChange, languages, onLocaleChange }`<br>`Blocks: { header, footer, menu, content }` | Shell complet — déjà utilisé dans `dashboard.gts` |
| `<TpkSidebar>` | `Args: { sidebarItems, collapsed }`<br>`SidebarItem = SidebarLink \| SidebarGroup` (groupes natifs avec `items: SidebarItem[]`) | Si on veut bypasser le TpkDashBoard et reconstruire le layout |
| `<TpkNavbar>` | `Args: { title, navbarItems, languages, onLocaleChange, currentUser, onLogout }`<br>`Blocks: { menu, default }` | Top-bar avec `default` block pour notre header SprintForge |
| `<TpkLogin>` | `Args: { onSubmit, loginSchema: ZodObject<{email,password}>, submitButtonText }`<br>**Inclut déjà ImmerChangeset + zod validation** | Login fidèle Figma (remplace le LoginForm custom actuel) |
| `<TpkThemeSelector>` | `Args: { sidebarCollapsed, localStorageKey, themes }` | Toggle thème (à brancher avec key `sprintforge:theme`) |
| `<TpkForgotPassword>` / `<TpkResetPassword>` | similaire à TpkLogin | Conservation des routes existantes |
| `<TpkModal>` / `<TpkConfirmModal>` / `<TpkActionsMenu>` / `<TpkStackList>` / `<TpkTableGeneric>` | n/a | Réserve pour P4+ |

**Pack 2 — `@triptyk/ember-input@4.0.0-alpha.1`** (form inputs) :
| Composant | API clé | Usage P3 |
|---|---|---|
| `<TpkSelect>` | `Args: { options, selected, label, placeholder, onChange, allowClear, disabled, searchEnabled, searchPlaceholder }`<br>Basé sur `ember-power-select` | **`<ProjectSelector>` = wrapper minimal autour de TpkSelect** |
| `<TpkSearchPrefab>` | `Args: { placeholder, label, onSearch(e,value) }` | Search bar du header (disabled en P3) |
| `<TpkInput>` | `Args: { value, type, placeholder, disabled, onChange }`<br>Yields `{ Input, Label }` | Champs du login |
| `<TpkButton>` | `Args: { label, onClick, disabled, allowSpam, class }` | Boutons "Enregistrer du temps" + "Ajouter" |
| `<TpkCheckbox>` / `<TpkRadio>` / `<TpkTextarea>` / `<TpkFile>` / `<TpkDatepicker>` / `<TpkSelectCreate>` / `<TpkToggle>` | n/a | Réserve pour P4+ |

**Ordre de priorité strict** :
1. **Triptyk natif** (`@triptyk/ember-ui` puis `@triptyk/ember-input`) — utilisation directe, on configure via props.
2. **Composants déjà présents dans le repo** (ex. helpers de `@libs/shared-front`).
3. **DaisyUI 5** — **uniquement** quand aucun Triptyk n'existe : `card`, `hero`, `divider`. Pas de `dropdown` (TpkSelect couvre), pas de `navbar` (TpkNavbar/TpkDashBoard), pas de `btn` brut (TpkButton).
4. **Custom Tailwind** — interdit en P3 sauf style strictement local (padding, gap d'un composant atomique).

**Conséquences concrètes pour P3** :
- `<ShellLayout>` = **wrapper de `<TpkDashBoard>`** déjà installé. On configure `@sidebarItems` (avec `SidebarGroup` natif pour 2 groupes), `@currentUser`, `@onLogout`. Pas de sidebar/user-card custom.
- `<ShellHeader>` = **wrapper de `<TpkNavbar>`** dans son bloc `default` : place `<ProjectSelector>` (TpkSelect) + `<TpkSearchPrefab>` (disabled) + 2 × `<TpkButton>` (disabled) + `<TpkThemeSelector>`. **À confirmer pendant l'audit** : si `<TpkDashBoard>` rend déjà son propre navbar interne, on intègre `<ShellHeader>` via le bloc `:menu` (ou on consomme `<TpkSidebar>` autonome + `<TpkNavbar>` séparément). Voir P3.8.
- `<ProjectSelector>` = wrapper Glimmer **minimal** (~20 LOC) autour de `<TpkSelect>` : injecte le service `current-project`, transforme `currentProjectId` ↔ option sélectionnée, expose `@onChange` qui appelle `current-project.setCurrent(option.id)`.
- `<ThemeToggle>` = **`<TpkThemeSelector @localStorageKey="sprintforge:theme" />`** directement. Le service `theme` de `@libs/shared-front` est aligné sur la **même clé** localStorage → les deux APIs cohabitent (le service garde un toggle programmatique pour les tests/E2E, TpkThemeSelector pilote l'UI).
- **Login** : `<TpkLogin>` remplace le `<LoginForm>` custom de `@libs/users-front`. On lui passe `loginSchema` (Zod) + `onSubmit` qui appelle `session.authenticate('authenticator:jwt', data)`. Le `<AuthLayout>` actuel devient simple wrapper : titre "SprintForge" + sous-titre, puis `<TpkLogin>` à l'intérieur.
- `<PlaceholderPage>` = **seul composant custom autorisé**, basé sur DaisyUI `hero` (aucun équivalent Triptyk).

**Tableau récapitulatif des composants P3** :
| Besoin | Composant final | Custom ? |
|---|---|---|
| Layout complet | `<TpkDashBoard>` | non |
| Sidebar + groupes | `@sidebarItems: SidebarGroup[]` | non |
| User-card + logout | `@currentUser` + `@onLogout` (TpkDashBoard) | non |
| Logo SprintForge | Bloc `:header` de TpkDashBoard | non (juste texte) |
| Top-bar | `<TpkNavbar>` ou bloc `:menu` de TpkDashBoard | non |
| Project selector | `<TpkSelect>` wrappé | wrapper léger ~20 LOC |
| Search bar | `<TpkSearchPrefab disabled>` | non |
| Bouton "Enregistrer du temps" | `<TpkButton @disabled>` | non |
| Bouton "Ajouter" | `<TpkButton @disabled>` | non |
| Theme toggle | `<TpkThemeSelector>` | non |
| Login form | `<TpkLogin>` | non |
| Champs login | inclus dans TpkLogin | non |
| Placeholder pages | DaisyUI `hero` | léger custom |
| Service `current-project` | service Ember | oui (logique métier) |

### D3. Route `/login`
**Choix retenu (proposition à valider) : étendre la route `login` existante dans `@libs/users-front`.**
- La route est déjà câblée (`prohibitAuthentication`, formulaire avec `session.authenticate('authenticator:jwt')`, schéma Zod).
- On modifie uniquement le template (`src/routes/login-template.gts`) et le composant `<LoginForm>` pour matcher le Figma (SprintForge title + carte centrée fond `--card` + bouton teal).
- Alternative : créer une route `/login` dédiée dans `@libs/shell-front`. Doublonnerait la logique. **Voir Q3.**

### D4. Service `current-project`
- Nouveau service dans `@libs/shell-front/src/services/current-project.ts`.
- Tracked properties : `currentProjectId` (string | null), `currentProject` (Project | null — réservé à P4 quand `projects-front` chargera la liste).
- API : `setCurrent(id: string)`, `clear()`, getter `current`.
- Persistance : `localStorage:sprintforge:current-project`.
- En P3 : pas de fetch (P4 branchera l'addon `projects-front`). On expose juste l'ID persistant.

### D5. Service `current-user` (existant)
- `@libs/users-front/src/services/current-user.ts` charge déjà `GET /users/profile` au boot.
- **Aucune modification structurelle en P3.**
- Vérifier que la réponse JSON:API inclut `role`, `color`, `avatar` (ajoutés en P1 — confirmer dans les types générés).

### D6. Pattern d'addon Ember
Mimer `@libs/users-front/src/index.ts` :
```ts
// @libs/shell-front/src/index.ts
export function moduleRegistry() {
  return buildRegistry({
    ...import.meta.glob('./routes/**/*.{js,ts,gts}', { eager: true }),
    ...import.meta.glob('./templates/**/*.{js,ts,gts}', { eager: true }),
    ...import.meta.glob('./components/**/*.{js,ts,gts}', { eager: true }),
    ...import.meta.glob('./services/**/*.{js,ts}', { eager: true }),
  })();
}

export function forRouter(this: DSL) {
  this.route('projects');
  this.route('backlog');
  this.route('kanban');
  this.route('user-story-map');
  this.route('sprints');
  this.route('time-tracking');
  this.route('settings');
}

export async function initialize(owner: Owner) {
  // current-project setup si besoin
}
```

### D7. Routing global (`@apps/front/app/router.ts`)
```ts
import { forRouter as userLibRouter } from '@libs/users-front';
import { forRouter as shellLibRouter } from '@libs/shell-front';
import { authRoutes } from '@libs/users-front';

Router.map(function () {
  this.route('dashboard', { path: '/' }, function () {
    userLibRouter.call(this);  // /users + sous-routes
    shellLibRouter.call(this); // /projects, /backlog, /kanban, /user-story-map, /sprints, /time-tracking, /settings
  });
  authRoutes.call(this); // /login, /forgot-password, /logout
});
```

### D8. Garde d'auth
- Réutiliser `dashboard.ts` (`@apps/front/app/routes/dashboard.ts`) qui appelle `session.requireAuthentication(t, 'login')`.
- Aucun changement.

### D9. i18n
- Nouveaux namespaces : `shell.sidebar.*`, `shell.header.*`, `auth.login.*`, `shell.placeholder.*`.
- Fichiers : `@apps/front/translations/fr-fr.yaml`, `en-us.yaml` (vérifier si yaml ou json).

---

## 3. Plan d'implémentation détaillé

### P3.1 — Scaffolding `@libs/shell-front`
**Commande** : `pnpm new-library @libs/shell-front frontend` (skill `new-library` du repo).
- Le boilerplate produit : `src/`, `tests/`, `package.json`, `vite.config.mts`, `rollup.config.mjs`, `tsconfig.json`, `addon-main.cjs`, etc.
- **Validation** : `pnpm build --filter=@libs/shell-front` réussit (sortie `dist/`).
- Ajouter `@libs/shell-front` aux deps de `@apps/front/package.json` (`workspace:*`).

**Critère de succès** : la nouvelle lib build et s'importe depuis `@apps/front`.

---

### P3.2 — Service `current-project`
Fichier : `@libs/shell-front/src/services/current-project.ts`

```ts
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

const STORAGE_KEY = 'sprintforge:current-project';

export default class CurrentProjectService extends Service {
  @tracked currentProjectId: string | null = null;

  setup() {
    this.currentProjectId = localStorage.getItem(STORAGE_KEY);
  }

  setCurrent(id: string) {
    this.currentProjectId = id;
    localStorage.setItem(STORAGE_KEY, id);
  }

  clear() {
    this.currentProjectId = null;
    localStorage.removeItem(STORAGE_KEY);
  }
}

declare module '@ember/service' {
  interface Registry {
    'current-project': CurrentProjectService;
  }
}
```

Appel `setup()` à ajouter dans `@libs/shell-front/src/index.ts` (`initialize()`).

**Tests** : `@libs/shell-front/tests/unit/current-project-test.gts` — set, clear, persistance localStorage.

---

### P3.3 — Configuration `<TpkDashBoard>` : layout + sidebar items
Fichier : `@libs/shell-front/src/components/shell/layout.gts`

`<TpkDashBoard>` est déjà consommé par `@apps/front/app/templates/dashboard.gts`. API vérifiée (cf. `node_modules/.../tpk-dashboard.d.ts`) :
- `Args: { title?, navbarItems?, sidebarItems?, currentUser?:{fullName}, onLogout?, logoutLabel?, profileRoute?, profileLabel?, drawerId?, collapsed?, onCollapsedChange?, onSidebarToggle?, languages?, onLocaleChange? }`
- `Blocks: { header, footer, menu, content }`

On crée un wrapper `<ShellLayout>` qui configure :
- Import : `import TpkDashBoard, { type SidebarItem } from '@triptyk/ember-ui/components/prefabs/tpk-dashboard';`
- `@sidebarItems = this.menuItems` (cf. P3.4 — utilise `SidebarGroup` natif).
- `@currentUser = { fullName }` depuis le service `current-user`.
- `@onLogout = () => this.session.invalidate()`.
- `@collapsed` / `@onCollapsedChange` / `@onSidebarToggle` : état tracked local (déjà fait dans le code actuel).
- Bloc `:header` = logo "SprintForge" (`<span class="text-lg font-bold text-sidebar-primary">SprintForge</span>` + padding).
- Bloc `:content` = `<ShellHeader />` + `<main class="p-6 bg-background min-h-[calc(100vh-64px)]">{{yield}}</main>`.
- Bloc `:footer` = `<TpkThemeSelector @localStorageKey="sprintforge:theme" @sidebarCollapsed={{this.sidebarCollapsed}} />`.
- Pas de `@languages` / `@onLocaleChange` au niveau TpkDashBoard si on ne veut pas le sélecteur intégré (Figma n'en montre pas). À conserver si on veut un i18n fr/en accessible.

**⚠️ Audit obligatoire en début de build (P3.8)** : `<TpkDashBoard>` rend potentiellement son propre `<TpkNavbar>` interne au-dessus du bloc `:content`. Trois scénarios possibles :
- **Scénario A** : TpkDashBoard rend un navbar uniquement si `@navbarItems` est défini → on n'en passe pas, on rend notre `<ShellHeader>` dans `:content`. ✅ Voie recommandée.
- **Scénario B** : TpkDashBoard rend toujours un navbar → bloc `:menu` permet de l'overrider entièrement. On y met notre `<ShellHeader>`.
- **Scénario C** : aucun des deux n'est viable → fallback `<TpkSidebar>` autonome + `<ShellHeader>` au-dessus de l'outlet.

Lire `node_modules/.../@triptyk/ember-ui/dist/components/prefabs/tpk-dashboard.js` au début de P3.8 pour trancher.

---

### P3.4 — Configuration des 9 NavItems via `SidebarGroup`
`<TpkSidebar>` (consommé par TpkDashBoard) **supporte nativement** les groupes :
```ts
type SidebarLink = { type: 'link', label, icon?, route?, onClick?, tooltip? };
type SidebarGroup = { type: 'group', label, isOpen?, icon?, tooltip?, items: SidebarItem[] };
type SidebarItem = SidebarLink | SidebarGroup;
```

Deux approches :
- **Approche A — Deux groupes nommés** (titre visible "Navigation" + "Administration") :
  ```ts
  [
    { type: 'group', label: 'Navigation', isOpen: true, items: [
      { type: 'link', label: 'Tableau de bord', route: 'dashboard.index', icon: IconDashboard },
      { type: 'link', label: 'Projets', route: 'dashboard.projects', icon: IconFolder },
      { type: 'link', label: 'Backlog', route: 'dashboard.backlog', icon: IconList },
      { type: 'link', label: 'Kanban', route: 'dashboard.kanban', icon: IconKanban },
      { type: 'link', label: 'User Story Map', route: 'dashboard.user-story-map', icon: IconGitBranch },
      { type: 'link', label: 'Sprints', route: 'dashboard.sprints', icon: IconTarget },
      { type: 'link', label: 'Suivi du temps', route: 'dashboard.time-tracking', icon: IconClock },
    ]},
    { type: 'group', label: 'Administration', isOpen: true, items: [
      { type: 'link', label: 'Utilisateurs', route: 'dashboard.users', icon: IconUsers },
      { type: 'link', label: 'Paramètres', route: 'dashboard.settings', icon: IconSettings },
    ]},
  ]
  ```
- **Approche B — Liste plate** (pas de titre de groupe, Figma n'en montre pas) : tous les items en `type:'link'`, et on visualise le découpage en ajoutant un séparateur. **Le Figma ne montre pas de label "Navigation"/"Administration"** — il y a juste un espace flex entre les groupes. Vérifier si `<TpkSidebar>` accepte un `SidebarGroup` **sans label affiché** (en mettant `label: ''`) ou s'il faut customiser via le bloc `default`.

**Choix retenu** : Approche A si TpkSidebar autorise `label: ''` ou un styling pour le masquer ; sinon Approche B en utilisant les groupes pour la sémantique et CSS pour cacher les titres. **À confirmer pendant P3.8 (audit).**

**Icônes** : pattern déjà utilisé dans `@apps/front/app/templates/dashboard.gts` (SVG inline as `TOC<{ Element: SVGSVGElement }>`). On peut aussi importer celles fournies par `@triptyk/ember-ui/assets/icons/*` (visibles dans le node_modules : `chevron-down`, `burger`, `ellipsis`, `plus`, etc.) et compléter avec Lucide pour les icônes spécifiques (target, columns-3, git-branch, etc.).

---

### P3.5 — Composant `<ProjectSelector>` (wrapper de `<TpkSelect>`)
Fichier : `@libs/shell-front/src/components/shell/project-selector.gts`

`<TpkSelect>` de `@triptyk/ember-input` (basé sur ember-power-select) couvre tout : options typées, placeholder, `onChange`, `searchEnabled`, `allowClear`, `disabled`. Wrapper minimal qui injecte le service `current-project` :

```gts
import { service } from '@ember/service';
import Component from '@glimmer/component';
import TpkSelect from '@triptyk/ember-input/components/tpk-select';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import { action } from '@ember/object';

type ProjectOption = { id: string; name: string };

export interface ProjectSelectorSignature {
  Args: { projects?: ProjectOption[] };
  Element: HTMLDivElement;
}

export default class ProjectSelector extends Component<ProjectSelectorSignature> {
  @service declare currentProject: CurrentProjectService;

  get options(): ProjectOption[] { return this.args.projects ?? []; }

  get selected(): ProjectOption | undefined {
    return this.options.find(p => p.id === this.currentProject.currentProjectId);
  }

  @action onChange(option: ProjectOption | null) {
    if (option) this.currentProject.setCurrent(option.id);
    else this.currentProject.clear();
  }

  <template>
    <TpkSelect
      @label="Projet"
      @placeholder="Sélectionner un projet"
      @options={{this.options}}
      @selected={{this.selected}}
      @allowClear={{true}}
      @searchEnabled={{true}}
      @searchPlaceholder="Rechercher un projet…"
      @onChange={{this.onChange}}
      as |s|
    >
      <s.Option>{{s.Option.option.name}}</s.Option>
    </TpkSelect>
  </template>
}
```

- En P3 : `@projects` reçoit `[]`. La liste reste vide ; le bouton affiche "Sélectionner un projet".
- En P4 : `@libs/projects-front` passera la liste réelle (load via WarpDrive store).

---

### P3.6 — Composant `<ShellHeader>` (TpkNavbar + Tpk components)
Fichier : `@libs/shell-front/src/components/shell/header.gts`

Construit à partir de `<TpkNavbar>` (bloc `default` = espace libre pour notre contenu) :

```gts
import TpkNavbar from '@triptyk/ember-ui/components/prefabs/tpk-navbar';
import TpkSearchPrefab from '@triptyk/ember-input/components/prefabs/tpk-search';
import TpkButton from '@triptyk/ember-input/components/tpk-button';
import TpkThemeSelector from '@triptyk/ember-ui/components/prefabs/tpk-theme-selector';
import ProjectSelector from './project-selector';
import { t } from 'ember-intl';

const noopSearch = () => {};

<template>
  <TpkNavbar>
    <:default>
      <div class="flex items-center gap-3 w-full">
        <ProjectSelector @projects={{@projects}} />
        <div class="flex-1 max-w-md mx-auto">
          <TpkSearchPrefab
            @placeholder={{t "shell.header.searchPlaceholder"}}
            @onSearch={{noopSearch}}
            disabled
            title="Disponible en P13"
          />
        </div>
        <TpkButton
          @label={{t "shell.header.recordTime"}}
          @disabled={{true}}
          title="Disponible en P9"
          class="btn-primary btn-sm"
        />
        <TpkButton
          @label={{t "shell.header.add"}}
          @disabled={{true}}
          title="Disponible en P4"
          class="btn-primary btn-sm"
        />
        <TpkThemeSelector @localStorageKey="sprintforge:theme" />
      </div>
    </:default>
  </TpkNavbar>
</template>
```

**Notes** :
- Le `<TpkSearchPrefab>` exige un `onSearch` ; on lui passe un `noop` et `disabled` natif HTML pour que l'input soit inerte (à vérifier dans la source ; sinon on enveloppe dans un `<div pointer-events:none opacity:50>`).
- `<TpkButton>` accepte `@class="btn-primary btn-sm"` → injecte les classes DaisyUI sur le bouton.
- Si `<TpkNavbar>` rend un container fixe qui n'autorise pas la mise en page voulue (project selector à gauche / search au centre / boutons à droite), on bypassera TpkNavbar et utilisera un simple `<header class="flex ...">` qui orchestre les composants Triptyk. **À confirmer en audit P3.8.**

---

### P3.7 — Composant `<ThemeToggle>` = `<TpkThemeSelector>` directement
Aucun wrapper. Dans `<ShellHeader>` et dans le footer de `<TpkDashBoard>`, on utilise :

```gts
<TpkThemeSelector @localStorageKey="sprintforge:theme" />
```

**Alignement avec le service `theme` existant** :
- `@libs/shared-front/src/services/theme.ts` utilise déjà la clé `sprintforge:theme` (à vérifier dans le code). Si oui, **aucun changement** : les deux APIs partagent la même source de vérité.
- Si la clé diffère : aligner le service sur `sprintforge:theme` (changement trivial). Le service reste utile pour les tests (`theme.toggle()` programmatique) et l'init au boot dans `application.ts`.
- `<TpkThemeSelector>` accepte `@themes?: string[]` (default à 2 valeurs). Vérifier que les valeurs matchent celles attendues par notre CSS (`:root` = dark, `:root.light` = light). Si TpkThemeSelector écrit un attribut `data-theme="..."` sur `<html>` au lieu de toggler une classe `.light`, ajuster le CSS ou la stratégie service (P3.8 audit).

---

### P3.8 — Composant `<ShellLayout>` (synthèse) + **AUDIT BLOQUANT**

**🔴 Audit obligatoire AU PREMIER PAS DU BUILD** :
1. Lire `node_modules/.../@triptyk/ember-ui/dist/components/prefabs/tpk-dashboard.js` (template + JS) pour :
   - Confirmer l'**ordre de rendu** des blocs (`header`, `menu`, `content`, `footer`) dans le DOM.
   - Vérifier si un `<TpkNavbar>` interne est rendu (toujours, ou conditionnel à `@navbarItems`/`@currentUser`).
   - Identifier comment placer notre `<ShellHeader>` :
     - **Option A** : pas de navbar interne → mettre `<ShellHeader>` en tête du bloc `:content`.
     - **Option B** : navbar interne → mettre `<ShellHeader>` dans le bloc `:menu` (qui override le menu de la navbar).
     - **Option C** : aucune approche viable → bypasser TpkDashBoard, consommer `<TpkSidebar>` + `<TpkNavbar>` séparément avec un wrapper flex custom.
2. Lire `tpk-sidebar.js` pour :
   - Confirmer qu'un `SidebarGroup` avec `label: ''` n'affiche pas de titre (sinon ajuster CSS).
3. Lire `tpk-theme-selector.js` pour :
   - Identifier la **stratégie de toggle** : class `.light` sur `<html>` ? attribut `data-theme` ? Lecture/écriture localStorage ?
   - Aligner `@libs/shared-front/src/services/theme.ts` sur la même clé (`sprintforge:theme`) et le même mécanisme DOM.

**Synthèse du fichier `layout.gts` (variante Option A — recommandée)** :
```gts
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import Component from '@glimmer/component';
import TpkDashBoard, { type SidebarItem } from '@triptyk/ember-ui/components/prefabs/tpk-dashboard';
import TpkThemeSelector from '@triptyk/ember-ui/components/prefabs/tpk-theme-selector';
import type CurrentUserService from '@libs/users-front/services/current-user';
import type SessionService from 'ember-simple-auth/services/session';
import ShellHeader from './header';
// imports icônes...

export interface ShellLayoutSignature {
  Args: { projects?: { id: string; name: string }[] };
  Blocks: { default: [] };
  Element: HTMLDivElement;
}

export default class ShellLayout extends Component<ShellLayoutSignature> {
  @service declare currentUser: CurrentUserService;
  @service declare session: SessionService;
  @tracked sidebarCollapsed = false;

  get userForNav() {
    const u = this.currentUser.currentUser;
    return { fullName: `${u.firstName} ${u.lastName}` };
  }

  get menuItems(): SidebarItem[] { /* cf. P3.4 — SidebarGroup × 2 */ }

  @action logout() { return this.session.invalidate(); }
  @action toggleSidebar() { this.sidebarCollapsed = !this.sidebarCollapsed; }
  @action setCollapsed(v: boolean) { this.sidebarCollapsed = v; }

  <template>
    <TpkDashBoard
      @currentUser={{this.userForNav}}
      @onLogout={{this.logout}}
      @sidebarItems={{this.menuItems}}
      @collapsed={{this.sidebarCollapsed}}
      @onCollapsedChange={{this.setCollapsed}}
      @onSidebarToggle={{this.toggleSidebar}}
    >
      <:header>
        <div class="px-6 py-5">
          <span class="text-lg font-bold text-sidebar-primary">SprintForge</span>
        </div>
      </:header>
      <:content>
        <ShellHeader @projects={{@projects}} />
        <main class="p-6 bg-background min-h-[calc(100vh-64px)]">{{yield}}</main>
      </:content>
      <:footer>
        <TpkThemeSelector
          @localStorageKey="sprintforge:theme"
          @sidebarCollapsed={{this.sidebarCollapsed}}
        />
      </:footer>
    </TpkDashBoard>
  </template>
}
```

Si l'audit révèle l'Option B ou C, ajuster avant de poursuivre — **bloquant pour la suite**.

---

### P3.9 — Composant `<PlaceholderPage>` (DaisyUI hero)
Fichier : `@libs/shell-front/src/components/placeholder-page.gts`

Signature : `<PlaceholderPage @title="Projets" @description="Disponible en P4" />`
Rendu DaisyUI natif :
```gts
<div class="hero min-h-[60vh]">
  <div class="hero-content text-center">
    <div class="max-w-md">
      <h1 class="text-3xl font-bold">{{@title}}</h1>
      <p class="py-6 text-base-content/60">{{@description}}</p>
    </div>
  </div>
</div>
```
Réutilisé par 7 routes (projets, backlog, kanban, user-story-map, sprints, time-tracking, settings) + le `dashboard.index` provisoire.

---

### P3.10 — Routes & templates squelettes
Pour chaque route protégée (sauf `users` et `index` qui héritent du dashboard) :
- `@libs/shell-front/src/routes/{route}.ts` : route vide.
- `@libs/shell-front/src/templates/{route}.gts` : template appelant `<PlaceholderPage>`.

Exemple `@libs/shell-front/src/templates/projects.gts` :
```gts
import PlaceholderPage from '@libs/shell-front/components/placeholder-page';
<template>
  <PlaceholderPage @title="Projets" @description="Disponible en P4" />
</template>
```

**Dashboard index** : afficher 3 cards KPI stubs ("Tâches terminées 0/0", "Heures travaillées 0", "Points d'efforts 0") + texte "Données réelles disponibles en P10". Permet la fidélité visuelle Figma.

---

### P3.11 — Modification `@apps/front/app/templates/dashboard.gts`
Remplacer `<TpkDashBoard>` par `<ShellLayout>` :

```gts
import ShellLayout from '@libs/shell-front/components/shell/layout';
<template>
  <ShellLayout>
    {{outlet}}
  </ShellLayout>
</template>
```

Le code ancien (logos triptyk, sélecteur de langue, theme selector daisyUI) est **supprimé** — la nouvelle barre intègre tout.

**`@apps/front/app/utils/set-theme.ts`** : à supprimer ou ne plus appeler (le service `theme` de shared-front prend le relais). Vérifier `app/routes/application.ts` qui appelle peut-être `set-theme.ts` au boot — remplacer par `theme.setup()`.

---

### P3.12 — Route `/login` fidèle Figma via `<TpkLogin>`
`<TpkLogin>` de `@triptyk/ember-ui` fournit le formulaire login complet (email + password + bouton submit + ImmerChangeset + validation Zod). API :
```ts
TpkLoginArgs = {
  onSubmit: (data, changeset) => void,
  loginSchema: ZodObject<{ email, password }>,
  initialValues?: { email, password },
  submitButtonText?: string,
}
```

**Modifier `@libs/users-front`** :

1. **`src/components/auth-layout.gts`** (wrapper plein écran fidèle Figma) :
```gts
<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-background gap-8 p-6">
    <div class="text-center">
      <h1 class="text-3xl font-bold text-primary">SprintForge</h1>
      <p class="text-base-content/60 mt-2">Outil de gestion de projets Scrum</p>
    </div>
    <div class="card bg-card w-full max-w-md shadow-xl">
      <div class="card-body">{{yield}}</div>
    </div>
    <footer class="text-xs text-base-content/60">
      SprintForge © 2026 - Gestion de projets Scrum
    </footer>
  </div>
</template>
```

2. **`src/components/forms/login-form.gts`** : **réécrire** en consommant `<TpkLogin>` :
```gts
import { service } from '@ember/service';
import Component from '@glimmer/component';
import type SessionService from 'ember-simple-auth/services/session';
import TpkLogin from '@triptyk/ember-ui/components/prefabs/tpk-login';
import { z } from 'zod';
import { action } from '@ember/object';
import { t } from 'ember-intl';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export default class LoginForm extends Component {
  @service declare session: SessionService;

  @action async onSubmit(data: z.infer<typeof loginSchema>) {
    await this.session.authenticate('authenticator:jwt', data);
  }

  <template>
    <h2 class="card-title">{{t "auth.login.title"}}</h2>
    <TpkLogin
      @loginSchema={{loginSchema}}
      @onSubmit={{this.onSubmit}}
      @submitButtonText={{t "auth.login.submit"}}
    />
  </template>
}
```

3. **`src/routes/login-template.gts`** : inchangé (rend `<AuthLayout><LoginForm /></AuthLayout>`).

**Avantages** : on **supprime** la logique Zod + ImmerChangeset custom (déjà dans TpkLogin), on conserve uniquement le branchement `session.authenticate`. Réduction nette de code custom.

---

### P3.13 — i18n
**Clés à ajouter** dans `@apps/front/translations/{fr-fr,en-us}.yaml` (ou `.json`) :
- `shell.sidebar.dashboard`, `.projects`, `.backlog`, `.kanban`, `.user-story-map`, `.sprints`, `.time-tracking`, `.users`, `.settings`
- `shell.header.searchPlaceholder`, `.recordTime`, `.add`
- `shell.placeholder.title`, `.description.{route}`
- `auth.login.title`, `.subtitle`, `.email`, `.password`, `.submit`, `.footer`

---

### P3.14 — Tests intégration Ember
Sous `@libs/shell-front/tests/integration/` :
- `shell/sidebar-test.gts` : rend les 9 NavItems, l'item actif a la classe `bg-sidebar-accent`, click sur logout invalide la session (mock).
- `shell/header-test.gts` : project selector affiche fallback "Sélectionner un projet", boutons "Enregistrer du temps" + "Ajouter" disabled, theme toggle change le mode.
- `shell/layout-test.gts` : compose les 3 sections, yield content visible.
- `shell/user-card-test.gts` : affiche initiales, nom, rôle ; logout fonctionne.
- `placeholder-page-test.gts` : prop title + description rendus.

Sous `@libs/shell-front/tests/unit/` :
- `current-project-test.gts` : set/clear/persistance.

**Setup** : suivre le pattern `@libs/users-front/tests/test-helper.ts` (MSW handlers de `@libs/users-front/http-mocks/all`).

**Sanity check obligatoire** (rappel mémoire) : avant d'annoncer "tests verts", forcer un échec volontaire (assertion contraire) + activer logs verbeux pour vérifier que le test runner exécute bien le code.

---

### P3.15 — Tests E2E Playwright
Mettre à jour `@apps/e2e/login.spec.ts` :
- Login avec `alice.martin@sprintforge.com` / `123456789`.
- Vérifier arrivée sur `/` (dashboard).
- Vérifier présence de "SprintForge" dans la sidebar.
- Vérifier les 9 nav items.
- Cliquer sur theme toggle → vérifier `<html class="light">` (ou inverse).
- Cliquer sur logout (user-card) → vérifier redirect vers `/login`.

Nouveau test `@apps/e2e/shell.spec.ts` (optionnel mais recommandé) :
- Navigation sidebar : cliquer chaque NavItem → URL change.
- Persistance thème : reload page → mode conservé.
- Garde auth : accès direct à `/projects` sans login → redirect `/login`.

---

### P3.16 — Validation visuelle Figma
- `pnpm dev` (back + front).
- Login avec Alice.
- Comparer le rendu à `docs/figma-screenshots/01-dashboard.png` (mode sombre).
- Toggle vers light → comparer à `docs/figma-screenshots/24-dashboard-light-mode.png`.
- Login screen → comparer à `docs/figma-screenshots/10-login.png`.
- Optionnel : `/TPK-screenshot-compare` sur ces 3 paires.

---

## 4. Critères de succès (bloquants — checklist /TPK-build)

Selon mémoire `[[feedback-success-criteria]]` : chaque case doit être cochée avant `done/`. Pas de raccourci silencieux.

- [ ] `pnpm dev` démarre back + front sans erreur.
- [ ] Login fonctionnel avec `alice.martin@sprintforge.com` / `123456789` contre le **vrai backend** (pas seulement MSW).
- [ ] Au login, redirect vers `/` qui affiche le shell SprintForge complet (sidebar + header + content).
- [ ] La sidebar contient exactement 9 NavItems (7 + 2) avec libellés et icônes Figma.
- [ ] L'item actif change visuellement quand on navigue.
- [ ] La user-card affiche les initiales, nom, rôle de l'user authentifié, et logout fonctionne (redirect `/login`).
- [ ] Toggle thème : bascule **instantanée** dark ↔ light sur **toute** l'app (sidebar, header, content, login).
- [ ] Le mode thème est persisté après reload (`localStorage:sprintforge:theme`).
- [ ] Service `current-project` set + persist + clear, vérifiables via tests unitaires.
- [ ] Les 7 placeholders affichent `<PlaceholderPage>` avec titre i18n correct.
- [ ] Route `/users` (déjà fournie par users-front) reste accessible et fonctionnelle dans le nouveau shell.
- [ ] Garde auth : accès direct à `/projects` non authentifié → redirect `/login`.
- [ ] Route `/login` fidèle Figma : titre teal, sous-titre, carte centrée, bouton teal pleine largeur, footer.
- [ ] **Tests intégration** : tous verts (`pnpm test --filter=@libs/shell-front`) — composants shell + service current-project — avec sanity check préalable.
- [ ] **Tests E2E** : `login.spec.ts` mis à jour passe (`cd @apps/e2e && pnpm test`).
- [ ] `pnpm lint` clean.
- [ ] Build production OK : `pnpm build --filter=@apps/front`.
- [ ] Validation visuelle : screenshot `/` vs `01-dashboard.png` cohérent (couleurs, layout, items).
- [ ] Validation visuelle : screenshot `/login` vs `10-login.png` cohérent.

---

## 5. Risques & pièges

| Risque | Mitigation |
|---|---|
| `<TpkDashBoard>` rend un navbar interne qui empêche notre `<ShellHeader>` en `:content` | Audit P3.8 obligatoire — fallback Option B (bloc `:menu`) ou Option C (TpkSidebar + TpkNavbar séparés) |
| `<TpkSidebar>` n'autorise pas un `SidebarGroup` sans titre visible | Audit P3.4 — fallback CSS pour masquer le label, ou utilisation d'une liste plate sans groupes |
| `<TpkThemeSelector>` utilise un attribut `data-theme` au lieu d'une classe `.light` | Aligner le CSS de `theme.css` sur ce que TpkThemeSelector écrit + ajuster le service `theme` de shared-front |
| Service theme appelé avant boot complet → flash mode incorrect au reload | `theme.setup()` synchrone dans `application.ts beforeModel()` (déjà fait) — vérifier ordre vs TpkThemeSelector |
| `currentUser.color`/`role`/`avatar` absents du payload `/users/profile` | Vérifier `api-types.ts` + ajuster schéma WarpDrive `@libs/users-front/src/schemas/users.ts` si besoin |
| Boutons "Enregistrer du temps" + "Ajouter" disabled : non-fidélité Figma | Acceptable en P3 + tooltip explicatif. Tests E2E n'assertent pas sur le clic |
| `<TpkSearchPrefab>` requiert `onSearch` non-null | Passer `noop` + `disabled` natif — confirmer en audit que la prop ne déclenche pas le task ember-concurrency |
| `<TpkSelect>` (ember-power-select) rend un overlay portail → conflits z-index avec TpkNavbar | Tester ; au besoin `@renderInPlace={{true}}` |
| `<TpkLogin>` utilise déjà ImmerChangeset interne — devra-t-on synchroniser nos validations | Le schéma Zod est passé en prop — pas de duplication. Conserver la logique session.authenticate dans onSubmit |
| Tests Ember avec `@ember/test-helpers` + QUnit (pattern différent de vitest) | Reprendre exactement le setup de `@libs/users-front/tests/` |

---

## 6. Découpage commits (commit-as-you-go — rappel mémoire learnings P2)

| Commit | Scope |
|---|---|
| `feat(shell-front): scaffold lib + service current-project` | P3.1, P3.2 |
| `feat(shell-front): configure TpkDashBoard + sidebar groups SprintForge` | P3.3, P3.4 |
| `feat(shell-front): header (TpkNavbar) + ProjectSelector (TpkSelect) + ThemeToggle` | P3.5, P3.6, P3.7 |
| `feat(shell-front): ShellLayout (TpkDashBoard) + PlaceholderPage + routes` | P3.8, P3.9, P3.10 |
| `feat(front): wire shell-front into dashboard template` | P3.11 |
| `feat(users-front): restyle login via <TpkLogin>` | P3.12 |
| `feat(front): i18n shell keys fr/en` | P3.13 |
| `test(shell-front): integration + unit tests` | P3.14 |
| `test(e2e): shell + login flow` | P3.15 |
| `chore: visual validation vs figma` | P3.16 (note dans le commit body) |

---

## 7. Hors périmètre P3 (assumé)

- Liste réelle des projets dans `<ProjectSelector>` → P4.
- Modales "Enregistrer du temps" / "Ajouter" fonctionnelles → P4/P6/P9.
- Recherche globale fonctionnelle → P13.
- Drag-drop, charts, vraies KPI → P5+.
- Page settings réelle → P12.

---

## 8. Décisions verrouillées (réponses utilisateur 2026-05-14)

- **D1** : nouvelle `@libs/shell-front` (lib dédiée). ✅
- **D2** : stratégie UI **`@triptyk/ember-ui` + `@triptyk/ember-input` (ember-common-ui) → DaisyUI en dernier recours**. **Pas de composants custom**. ✅
  - TpkDashBoard / TpkSidebar / TpkNavbar / TpkSelect / TpkSearchPrefab / TpkButton / TpkThemeSelector / TpkLogin couvrent 100% du shell.
  - DaisyUI uniquement pour `hero` (placeholder) et `card` (login).
- **D3** : `/login` = `<TpkLogin>` dans `@libs/users-front` (suppression de la logique Zod+changeset custom). ✅
- **Search bar P3** : `<TpkSearchPrefab>` avec `disabled` + tooltip "Disponible en P13". ✅
