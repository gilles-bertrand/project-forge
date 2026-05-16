# P11 — Users (grille UserCard, avatar, rôle, projets assignés)

> Objectif : remplacer le placeholder `/users` actuel par une **grille de UserCard** alignée avec `docs/figma-screenshots/08-users.png`. Chaque card affiche avatar (initiales colorées), nom, rôle, email, count de projets, badges des projets assignés. Lib cible : **extension de `@libs/users-front`** (existante). Mocks étendus avec rôle + projects. Action "Inviter" hors périmètre (V2/P14).

---

## 1. Contexte & rappels

### Acquis (P0–P10)
- **Lib `@libs/users-front`** existe déjà (P0) :
  - `src/components/user-table.gts` — table générique (CRUD) ; **gardé tel quel** pour P11 (mais pas utilisé sur la nouvelle page list).
  - `src/services/user.ts` + `services/current-user.ts`.
  - `src/schemas/users.ts` + `http-mocks/users.ts` (3 mock users actuels : `firstName/lastName/email` seulement, **pas de rôle ni projets**).
  - Route `dashboard.users` déclarée dans `src/index.ts` (avec `create`, `edit`) mais **pas de template list** → 404 actuel sur `/users`.
- **Backend P2** : route `/api/v1/projects/:id/members` existe (vue dans `projects-front/http-mocks/projects.ts:197`). Pour P11 on étend `users-front/http-mocks/users.ts` directement (liste plate avec `role` + `projectIds`).
- **Sidebar** : "Utilisateurs" → route `dashboard.users` (déjà câblé, P3).

### Cible Figma (`08-users.png`)
- **Header** : `<h1>Utilisateurs</h1>` + sous-titre `"{N} membres de l'équipe"` (sans bouton "Inviter" pour P11).
- **Grid 3 colonnes** de **UserCard** :
  - **Avatar circulaire** : cercle coloré 48px avec initiales (`AM` pour Alice Martin). Couleur déterministe par hash du nom (3-4 couleurs au choix : teal, orange, purple, slate).
  - **Nom** + **Rôle** (sous le nom, opacity 60).
  - **Ligne email** : icône `MailIcon` + `{email}`.
  - **Ligne projets count** : icône `FolderIcon` + `"{N} projet(s)"`.
  - **Section "Projets assignés:"** + grid de badges (style teal subtle) avec nom du projet.
- **Rôles** : `'Product Owner' | 'Scrum Master' | 'Developer' | 'Designer UX' | 'QA Tester'`.

### Hors périmètre P11
- **Action "Inviter"** → V2/P14.
- **Edit/Delete inline** sur la card → P12 (`UsersTable` reste pour la modale CRUD existante via routes `dashboard.users.create` / `dashboard.users.edit` mais on ne les modifie pas).
- **Photo avatar réelle** (upload) → P12 (initiales colorées suffisent pour MVP).
- **Filtre par rôle ou projet** → P12 si demandé.
- **Pagination** → 7 users suffisent en mocks, scroll naturel.
- **Tri par nom** → optionnel, déjà ordre alphabétique dans les mocks.

---

## 2. Architectural Context

- **God Nodes touchés** : aucun. `TasksService`, `App Shell` non modifiés. Risque low.
- **Communities touchées** : Users domain (uniquement).
- **Cross-cutting contracts** : aucun (extension lib existante, pas de nouveau schema JSON:API).
- **Cross-lib imports** : `@libs/projects-front` n'est PAS importé directement — les noms de projets sont résolus côté front via une **map locale** dans `users-front/http-mocks/users.ts` (cohérence avec les IDs proj-1/proj-2/proj-3 d'autres mocks). Pas de dépendance lib-à-lib.

---

## 3. Décisions techniques

### D1. Extension de la lib `@libs/users-front` (pas de nouvelle lib)
Le macro-plan dit explicitement "Étendre `@libs/users-front`". Pattern cohérent : pas de fragmentation supplémentaire pour un domaine déjà existant.

### D2. Extension du schema `User` (côté front uniquement)
Modifier `@libs/users-front/src/schemas/users.ts` pour ajouter les attributs **`role`** et **`projectIds`** (string[]). 

```typescript
const UserSchema = withDefaults({
  type: 'users',
  fields: [
    { name: 'firstName', kind: 'attribute' },
    { name: 'lastName', kind: 'attribute' },
    { name: 'email', kind: 'attribute' },
    { name: 'role', kind: 'attribute' },         // NEW
    { name: 'projectIds', kind: 'attribute' },   // NEW (array)
  ],
});

export type UserRole = 'Product Owner' | 'Scrum Master' | 'Developer' | 'Designer UX' | 'QA Tester';

export type User = WithLegacy<{
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  projectIds: string[];
  [Type]: 'users';
}>;
```

**Risque** : `UserSchema` est enregistré dans `store.ts` (P3). L'ajout de fields ne casse pas la rétrocompat (champs optionnels côté response). ✓ Pas de breaking change.

### D3. Extension des mocks `users.ts`
`@libs/users-front/src/http-mocks/users.ts` : passer de 3 users plats à **7 users** matchant le Figma (Alice Martin, Bob Durant, Claire Dubois, David Leroy, Emma Bernard, François Petit, Gaëlle Moreau), chacun avec :
- `firstName`, `lastName`, `email` (format `prenom.nom@sprintforge.com`)
- `role` (mix des 5 rôles)
- `projectIds` (0 à 3 projets parmi `proj-1`, `proj-2`, `proj-3`)

**Map de projets locale** (constante exportée dans `users-front/components/user-card.gts` ou un nouveau fichier `users-front/src/data/project-names.ts`) :
```typescript
export const PROJECT_NAMES: Record<string, string> = {
  'proj-1': 'E-Commerce Platform',
  'proj-2': 'Mobile Banking App',
  'proj-3': 'CRM System',
};
```

**Garder** :
- Le handler `GET /api/v1/users/profile` (utilisé par current-user).
- Le handler `GET /api/v1/users/{id}` (utilisé par user-form).
- **Ajouter** un handler `GET /api/v1/users` (list) qui retourne tous les users.

### D4. Composants nouveaux dans `@libs/users-front/src/components/`
1. **`UserAvatar`** : avatar circulaire avec initiales. Props `@firstName: string`, `@lastName: string`, `@size?: 'sm' | 'md' | 'lg'` (default `md` = 48px). Couleur déterministe (hash sur firstName+lastName modulo 4 couleurs). Template-only TOC.
2. **`UserCard`** : card complète. Props `@user: User`. Compose `UserAvatar` + infos + badges. Couleurs du badge cohérentes avec daisyui `badge badge-soft badge-success` ou équivalent. Class component (pour le getter `projectBadges`).
3. **`UsersGrid`** : grid 3 cols de UserCard. Props `@users: User[]`. Template-only TOC. Empty state si `users.length === 0`.

### D5. Route + template list
- **Nouvelle route** : `@libs/users-front/src/routes/dashboard/users/index.ts` (utilise UserService.loadAll ou store.request).
- **Nouveau template** : `@libs/users-front/src/templates/dashboard/users/index.gts`.

⚠️ **Conflit potentiel** : la route `dashboard.users` est déjà déclarée avec sous-routes `create`/`edit`. La route "index" implicite (`/users` direct) n'a pas de template. P11 ajoute :
- `routes/dashboard/users/index.ts` + `templates/dashboard/users/index.gts` (la liste UserCard)

L'existant `dashboard.users.create` et `dashboard.users.edit` reste intact (route admin CRUD via `UsersTable` qui peut être appelée séparément).

**Model** :
```typescript
async model() {
  const res = await fetch('/api/v1/users');
  const json = await res.json() as { data: Array<{ id: string; attributes: ... }> };
  return json.data.map(u => ({ id: u.id, ...u.attributes }));
}
```

(Fetch natif comme pour Sprints/TimeEntries — bypass JSONAPICache, plus simple et évite les pièges WarpDrive pour les ressources lookup-only.)

### D6. i18n
- **Étendre** `@apps/front/translations/users/{en-us,fr-fr}.yaml` (le folder `users/` existe déjà avec les form i18n). Ajouter :
  - `pages.list.title` (ou réutiliser si existant)
  - `pages.list.subtitle` : `"{count} membres de l'équipe"` / `"{count} team members"`
  - `pages.list.emptyState` : `"Aucun utilisateur"` / `"No users"`
  - `card.projects.label` : `"Projets assignés:"` / `"Assigned projects:"`
  - `card.projectCount` : `"{count, plural, =0 {0 projet} one {1 projet} other {# projets}}"`

### D7. Tailwind `@source`
Vérifier que `@source "../../node_modules/@libs/users-front"` existe déjà dans `@apps/front/app/styles/app.css` — sinon ajouter (cohérent avec P10 fix).

### D8. Tests (vitest + Ember test infra)
`@libs/users-front/tests/integration/` (créer si pas existant) :
1. `user-avatar-test.gts` — render avec firstName/lastName → vérifie initiales (`AM` pour Alice Martin).
2. `user-card-test.gts` — render avec user complet → vérifie nom, rôle, email, projects badges.
3. `users-grid-test.gts` — render avec 3 users → vérifie 3 cards. Render avec [] → empty state.

**Pretest** : déjà configuré (`pretest: rollup -c` dans `users-front/package.json`).

Vérifier si tests/app.ts existe déjà. Sinon créer suivant pattern sprints-front.

---

## 4. Plan d'exécution (sous-agents parallélisables)

**Vague 1 — Schema + mocks + i18n (sériel)** (~15 min)
1. Étendre `UserSchema` (`src/schemas/users.ts`) avec `role` + `projectIds`.
2. Récrire `src/http-mocks/users.ts` avec 7 users complets + handler `GET /api/v1/users`.
3. Étendre `@apps/front/translations/users/{en-us,fr-fr}.yaml` (clés `pages.list.*`, `card.*`).
4. Ajouter `@source "../../node_modules/@libs/users-front"` dans `app.css` si manquant.

**Vague 2 — Composants en parallèle (2 sous-agents)** (~20 min)
- Agent A : `UserAvatar` (initiales + couleur déterministe) + `UsersGrid` (template-only TOC + empty state) + `data/project-names.ts` (map locale).
- Agent B : `UserCard` (class component, compose Avatar + badges) — utilise `PROJECT_NAMES` import.

**Vague 3 — Route + template (sériel)** (~10 min)
1. `routes/dashboard/users/index.ts` (model fetch natif).
2. `templates/dashboard/users/index.gts` (UsersGrid + header).
3. Vérifier que `addon-main.cjs` (via package.json `app-js`) exporte bien `routes/dashboard/users/index` et `templates/dashboard/users/index`.

**Vague 4 — Tests + lint + visual (sériel)** (~20 min)
1. 3 tests intégration (vitest).
2. `pnpm turbo lint` depuis racine.
3. Validation visuelle Playwright `/users` vs `docs/figma-screenshots/08-users.png`.

**Vague 5 — PR + handoff** (~10 min)
1. Commit `feat(users-front): P11 — UserCard grid with avatars, roles, project assignments`.
2. Push + PR vers `dev`.
3. **Pas de nouvelle lib** → **pas de risque lockfile** (mais le rebuild peut tout de même modifier `pnpm-lock.yaml` si workspace versions bougent — vérifier `git status pnpm-lock.yaml` post-build, alerter user si besoin).
4. Move plan to `specs/done/`.
5. `/TPK-handoff`.

**Total estimé** : 75 min.

---

## 5. Critères de succès (vérification bloquante avant `done/`)

1. [ ] Route `/users` rend sans erreur (plus de 404 / placeholder).
2. [ ] Header `<h1>Utilisateurs</h1>` + sous-titre `"7 membres de l'équipe"` visibles.
3. [ ] 7 UserCard rendus en grid 3 colonnes.
4. [ ] Chaque card affiche : avatar avec **initiales** (AM, BD, CD, DL, EB, FP, GM), nom, rôle, email, count projets, badges projets (avec noms `E-Commerce Platform`, `Mobile Banking App`, `CRM System`).
5. [ ] Avatar a une couleur déterministe différente par user (au moins 3 couleurs distinctes visibles dans les 7 cards).
6. [ ] Card "Alice Martin" (Product Owner) montre "0 projet" et **PAS** de section "Projets assignés" (corner case empty array).
7. [ ] Card "Claire Dubois" (Developer) montre "3 projets" et 3 badges projets visibles.
8. [ ] Backend route `/api/v1/users` (mock) retourne les 7 users avec `role` + `projectIds` populés.
9. [ ] 3/3 tests intégration verts.
10. [ ] `pnpm turbo lint` vert depuis racine **avant push** (`feedback-lint-before-push`).
11. [ ] Si `pnpm-lock.yaml` modifié post-build → demander à l'utilisateur de le commiter (`feedback-pnpm-lock-commit`).
12. [ ] Validation visuelle Playwright : screenshot `specs/review-screenshots/p11-users.png` capturé, comparable à `docs/figma-screenshots/08-users.png`.
13. [ ] Zéro erreur console runtime (hors favicon 404 noise).
14. [ ] Sidebar "Utilisateurs" navigue correctement vers la page (ne pas régresser).

---

## 6. Key Files (anticipation)

### Nouveaux
- `@libs/users-front/src/components/user-avatar.gts` — initiales colorées
- `@libs/users-front/src/components/user-card.gts` — card complète
- `@libs/users-front/src/components/users-grid.gts` — grid 3 cols + empty state
- `@libs/users-front/src/data/project-names.ts` — map `projectId → name`
- `@libs/users-front/src/routes/dashboard/users/index.ts` — model fetch
- `@libs/users-front/src/templates/dashboard/users/index.gts` — orchestration page
- `@libs/users-front/tests/app.ts` (si pas déjà présent)
- `@libs/users-front/tests/integration/user-avatar-test.gts`
- `@libs/users-front/tests/integration/user-card-test.gts`
- `@libs/users-front/tests/integration/users-grid-test.gts`

### Modifiés
- `@libs/users-front/src/schemas/users.ts` — ajout `role` + `projectIds` fields
- `@libs/users-front/src/http-mocks/users.ts` — 7 users avec role/projectIds + handler GET list
- `@libs/users-front/package.json` — ajout `app-js` entries pour les nouveaux routes/components
- `@apps/front/translations/users/{en-us,fr-fr}.yaml` — clés `pages.list.*` et `card.*`
- `@apps/front/app/styles/app.css` — vérifier `@source "../../node_modules/@libs/users-front"` présent

### NON modifiés (P11)
- `src/components/user-table.gts` — gardé pour les routes admin existantes.
- `src/routes/dashboard/users/create.gts`, `edit.gts` — inchangés.

---

## 7. Risques connus & mitigations

| Risque | Mitigation |
|---|---|
| Le store.ts a déjà UserSchema enregistré, ajout de fields casse rétrocompat ? | Non — ajout de fields est **additif**. Les anciens mocks/responses sans `role`/`projectIds` resteront fonctionnels (undefined). Mais le mock list DOIT retourner les nouveaux fields pour le rendu. |
| Conflict avec UsersTable existant (`dashboard.users` index) | La route `dashboard.users` n'a pas de template actuellement → ajout direct sans conflit. UsersTable reste utilisable depuis `dashboard.users.create/edit` via les sous-routes. |
| Pas de Figma pour le badge style exact | Utiliser daisyui `badge badge-soft` (teal subtle) — cohérent avec autres badges du projet. |
| Tailwind classes pas générées (cf. incident P10 grid-cols-3) | Vérifier `@source "../../node_modules/@libs/users-front"` dans `app.css` — il devrait déjà y être (P3) mais à confirmer au build. |
| Initiales pour "Bob Durant" → `BD`, mais pour "John Doe" (current user) → `JD` (collision si rôle même) — OK pas un bug | Pas de problème, déterministique par nom complet, pas par initiales. |
| Tests intégration absents dans users-front actuellement | Créer `tests/app.ts` + `tests/test-helper.ts` à la P11 (pattern sprints-front). |

---

## 8. Mémoires à mettre à jour (post-P11)

- Aucune nouvelle mémoire prévue : P11 = extension d'une lib existante avec patterns déjà connus.
- Si découverte d'un problème WarpDrive sur l'ajout de fields à un schema enregistré → potentielle nouvelle mémoire.
