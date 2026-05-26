# Fix `/projects` console errors + broken links + codex/review pass

**Created**: 2026-05-26
**Lib focus**: `@libs/projects-front` (et `@libs/users-front` collatéralement)
**Backend touché**: aucun
**Validation extérieure**: codex (plugin) + code-reviewer agent

---

## Problem statement

Sur la branche `dev` (post-merge PR #28), la page `/projects` présente deux symptômes :

1. **12 erreurs WarpDrive en console** au chargement (logs `❌ Unrecognized attribute`) :
   - GET `/api/v1/users/profile` → 2 erreurs : `color`, `avatar` non reconnus dans le schéma WarpDrive `users`.
   - GET `/api/v1/projects` → 10 erreurs (5 projets × 2 attributs) : `sprintDurationDays`, `defaultVelocityPoints` non reconnus dans le schéma WarpDrive `projects`.

2. **"Aucun lien ne fonctionne"** signalé par l'utilisateur. Investigation runtime (Playwright) :
   - `element.click()` JS → navigation OK (card body → `/kanban`, bouton `data-test-project-action-backlog` → `/backlog`, lien sidebar `Backlog` → `/backlog`).
   - `browser_click` simulant un click pointer → **reste sur `/projects`** sur les boutons `ProjectActionBar` et les liens sidebar.
   - Hypothèse à confirmer : un overlay invisible (`tpk-sidebar-drawer-overlay drawer-overlay lg:hidden`) ou un listener intermédiaire intercepte le pointer-event sans déclencher l'`<a>` ni le button. À reproduire avec un clic réel humain.

### Root cause (erreurs console)

Le commit `7f4fb09` (`fix(projects-front): add sprintDurationDays/defaultVelocityPoints to ProjectSchema`, créé pendant la session précédente sur `feat/sprints-numbering-config-and-cascade`) n'avait **pas été poussé** avant le squash-merge de la PR #28. Le `[ahead 1]` observé au début de la session courante était précisément ce commit. La PR #28 a donc été squashée sans ce fix, et la suppression de la branche feat l'a définitivement perdu (le diff reste accessible via `git show 7f4fb09` tant que git GC ne l'a pas nettoyé).

Pour le schéma `users` : `color` est seedé/persisté côté backend (`UserEntity.color`, ex. `#F48FB1`) et sérialisé dans `user.serializer.ts`, mais n'a jamais été ajouté au `UserSchema` WarpDrive. `avatar` idem (sérialisé nullable mais absent du schéma front).

### Root cause (liens) — à confirmer

Inconnue avant phase 2. Investigation requise.

---

## Architectural Context

Source : `graphify-out/GRAPH_REPORT.md` (graph fresh — last commit `dc77396`).

**Communities touchées** : domaine projects-front (Community où vivent `ProjectsService`, `ProjectCard`, `ProjectActionBar`, `ProjectFormModal`).

**God Nodes potentiellement modifiés** :
- `ProjectsService` (10 edges) — non modifié par ce plan, mais consommateur du schéma corrigé. Smoke test obligatoire.
- `makeSingleJsonApiTopDocument` (32 edges, backend) — non touché.
- `authFetch` (28 edges, front) — non touché.

**Cross-cutting contracts at risk** :
- Schéma WarpDrive `projects` registré dans `@apps/front/app/services/store.ts` — toute lib qui lit un Project via `store.peek/find/request` sera affectée. À vérifier après fix.
- Schéma `users` partagé entre `@libs/users-front` (login, current-user) et lecture par d'autres libs (avatars membres). À retester.

---

## Phase 1 — Restaurer les schémas WarpDrive (P0, ~10 min)

### 1.1 — `ProjectSchema`

Fichier : `@libs/projects-front/src/schemas/projects.ts`

Réappliquer le diff exact du commit perdu `7f4fb09` :

```typescript
const ProjectSchema = withDefaults({
  type: "projects",
  fields: [
    { name: "createdAt", kind: "attribute" },
    { name: "updatedAt", kind: "attribute" },
    { name: "name", kind: "attribute" },
    { name: "description", kind: "attribute" },
    { name: "status", kind: "attribute" },
    { name: "avatar", kind: "attribute" },
    { name: "githubUrl", kind: "attribute" },
    { name: "responsibleId", kind: "attribute" },
    { name: "createdById", kind: "attribute" },
+   { name: "sprintDurationDays", kind: "attribute" },
+   { name: "defaultVelocityPoints", kind: "attribute" },
  ],
});

export type Project = WithLegacy<{
  // ... champs existants
+ sprintDurationDays: number;
+ defaultVelocityPoints: number;
  [Type]: "projects";
}>;
```

### 1.2 — `UserSchema`

Fichier : `@libs/users-front/src/schemas/users.ts`

```typescript
const UserSchema = withDefaults({
  type: 'users',
  fields: [
    { name: 'createdAt', kind: 'attribute' },
    { name: 'updatedAt', kind: 'attribute' },
    { name: 'firstName', kind: 'attribute' },
    { name: 'lastName', kind: 'attribute' },
    { name: 'email', kind: 'attribute' },
    { name: 'password', kind: 'attribute' },
    { name: 'role', kind: 'attribute' },
    { name: 'projectIds', kind: 'attribute' },
+   { name: 'color', kind: 'attribute' },
+   { name: 'avatar', kind: 'attribute' },
  ],
});

export type User = WithLegacy<{
  // ... champs existants
+ color: string;
+ avatar: string | null;
  [Type]: 'users';
}>;
```

Note : vérifier si `UserData` (interface separate ligne 30-37) doit aussi être étendue. Probablement non — c'est l'interface form-side, pas le payload backend.

### 1.3 — Vérifications

- Lint `@libs/projects-front` + `@libs/users-front` : `pnpm -F @libs/projects-front lint && pnpm -F @libs/users-front lint`
- TS types : `pnpm -F @libs/projects-front lint:types && pnpm -F @libs/users-front lint:types`
- Runtime smoke : recharger `/projects` connecté → **0 erreur WarpDrive en console** (vérifier via Playwright `browser_console_messages level=info`).
- Vérifier qu'aucun consommateur ne casse en accédant à `project.sprintDurationDays` ou `user.color` (le diff ajoute des champs, ne retire rien — backward compatible).

---

## Phase 2 — Investiguer et fixer les liens cassés (P1, ~30 min)

### 2.1 — Clarifier le symptôme avec l'utilisateur

Question à poser : "Quand vous dites 'aucun lien ne fonctionne', s'agit-il :
- (a) des boutons icônes en bas de chaque carte projet (backlog/kanban/user-story-map/sprints) ?
- (b) des liens de la sidebar gauche (Backlog, Kanban, Sprints, etc.) ?
- (c) du clic sur le corps de la carte (qui devrait ouvrir le kanban du projet) ?
- (d) des boutons "modifier" / "supprimer" ?"

### 2.2 — Investigation runtime

Hypothèses à tester dans l'ordre :

1. **Drawer overlay capture** : `<label class="tpk-sidebar-drawer-overlay drawer-overlay lg:hidden">` reste dans le DOM même en mode desktop. Vérifier que `pointer-events: none` ou `display: none` est bien appliqué via `@media (min-width: 1024px)`.

2. **Pointer-events sur SVG/icon enfant** : les `<svg>` enfants de `<button>` capturent le click. Vérifier qu'aucune classe Tailwind ne casse le bubbling.

3. **Vite HMR stale state** : possibilité que la session de dev server soit en état dégradé. Tester avec un hard reload (`Cmd+Shift+R`) après les fixes de la phase 1.

4. **Bouton dans `role="button"` parent** : `ProjectActionBar` a une note `TODO(a11y)` indiquant que le card parent a `role="button"` et que c'est imbriqué. Possible que ça crée un conflit d'accessibilité que Playwright/Chrome interprète mal.

### 2.3 — Fix selon root cause

Si **overlay** : ajouter `pointer-events-none lg:hidden` (DaisyUI compose mal `lg:hidden`).

Si **bouton imbriqué dans role=button** : appliquer le TODO existant — changer `role="button"` sur `[data-test-project-card]` en `role="article"` + ajouter un bouton "Ouvrir" explicite. Migrer `handleActivate`/`handleKeydown` vers ce bouton.

Si **HMR stale uniquement** : pas de fix code, juste documenter.

### 2.4 — Vérifications

- Playwright : `browser_click` (pas `evaluate(el.click())`) sur chaque lien sidebar (`Backlog`, `Kanban`, `User Story Map`, `Sprints`, `Suivi du temps`) → URL change correctement.
- Playwright : `browser_click` sur les 4 boutons `data-test-project-action-*` → URL change vers la bonne route ET `currentProject.currentProjectId` est setté au bon projet.
- Manuel : tester un vrai click humain sur les liens — l'utilisateur valide.

---

## Phase 3 — Validation Codex (P2, ~15 min)

### 3.1 — Setup

Vérifier que le plugin codex est prêt : `/codex:setup` ou regarder `~/.claude/plugins/codex/`.

### 3.2 — Délégation

Invoquer `codex:rescue` (Bash : `codex-companion` ou via Skill `codex:rescue`) avec un brief précis :

> Contexte : on a restauré 2 fixes de schéma WarpDrive (sprintDurationDays/defaultVelocityPoints sur ProjectSchema, color/avatar sur UserSchema) perdus lors d'un squash merge. Vérifier que :
> 1. Les ajouts au schéma ne créent pas de side-effects sur les consommateurs (`ProjectsService.loadAll`, `CurrentUserService`, autres libs lisant `Project`/`User`).
> 2. Le typage TypeScript est cohérent : tous les usages de `Project.sprintDurationDays` et `Project.defaultVelocityPoints` (ainsi que `User.color`, `User.avatar`) sont déjà câblés ou bien optionnels.
> 3. Aucun mock MSW (`http-mocks/projects.ts`, `http-mocks/users.ts`, `http-mocks/login.ts`) n'a besoin d'être mis à jour pour rester aligné avec le payload réel du backend.

### 3.3 — Acceptation

Si Codex propose un fix supplémentaire, l'évaluer avant de l'appliquer (pas de blind apply). Sinon : valider ✅.

---

## Phase 4 — Code review de `@libs/projects-front` (P2, ~20 min)

### 4.1 — Spawn agent

Utiliser `Agent(subagent_type=code-reviewer)` avec scope précis :

> Review intégrale de la lib `@libs/projects-front` (15 fichiers source dans `src/`).
> Critères :
> - Conventions Ember 6 / Glimmer / Octane (services, components, routes, templates).
> - Conventions WarpDrive 2 (schemas, store usage).
> - Patterns du repo : utiliser `authFetch` ou `store.request` selon le shape JSON:API (cf. `CLAUDE.md` racine), pas de `fetch()` brut.
> - i18n : ember-intl, toutes les chaînes utilisateur doivent passer par `t`.
> - Accessibilité : labels, role, aria-* (le TODO sur `project-action-bar.gts` est connu).
> - Tests : couverture suffisante pour les composants critiques (`ProjectCard`, `ProjectFormModal`, `ProjectsService`).
> - Bonnes pratiques performance Ember (`@tracked`, `@cached`, pas de re-render inutile).
> Sortir un report classé par sévérité (blocker / major / minor / nit).

### 4.2 — Triage

Lire le report. Pour chaque finding :
- **blocker** : créer un nouveau plan dans `specs/todo/` ou un fix immédiat si trivial.
- **major** : créer une issue/TODO inline avec contexte.
- **minor / nit** : ignorer ou batcher pour plus tard.

Ne **pas** appliquer les fixes review dans ce plan — le scope ici est diagnostic + fixes ciblés des bugs runtime, pas refactor.

---

## Testing Strategy

| Niveau | Méthode | Bloquant pour `done/` ? |
|---|---|---|
| Lint | `pnpm -F @libs/projects-front lint` + `pnpm -F @libs/users-front lint` | ✅ |
| Types | `pnpm -F @libs/projects-front lint:types` + idem users-front | ✅ |
| Runtime smoke | Playwright navigation `/projects` + console messages level=info → 0 erreur WarpDrive | ✅ |
| Liens UI | Playwright `browser_click` sur 4 ProjectActionBar + 7 liens sidebar → URLs correctes | ✅ |
| Validation Codex | Output Codex sans red flag bloquant | ⚠️ informative |
| Code review | Report agent disponible dans `specs/review/` | ⚠️ informative |

**Aucun test d'intégration backend nécessaire** — pas de modif backend. Pas de test Ember acceptance ajouté car le scope est diagnostic + restauration, pas de nouvelle feature.

---

## Success Criteria (numérotés)

1. `@libs/projects-front/src/schemas/projects.ts` contient `sprintDurationDays` et `defaultVelocityPoints` dans le `fields` array du `ProjectSchema` ET dans le type `Project`.
2. `@libs/users-front/src/schemas/users.ts` contient `color` et `avatar` dans le `fields` array du `UserSchema` ET dans le type `User`.
3. Naviguer vers `/projects` connecté en tant que `gilles@triptyk.eu` → **0 erreur** dans `browser_console_messages level=info` mentionnant `Unrecognized attribute` pour `projects` ou `users`.
4. Cliquer (vrai click, pas `evaluate`) sur les 4 boutons `data-test-project-action-{backlog,kanban,user-story-map,sprints}` du premier projet → navigation vers la route correspondante.
5. Cliquer (vrai click) sur les 7 liens sidebar (Tableau de bord, Projets, Backlog, Kanban, User Story Map, Sprints, Suivi du temps) → navigation vers la route correspondante.
6. Click sur le corps d'une card projet → navigation vers `/kanban` avec `currentProject.currentProjectId` setté.
7. Lint `@libs/projects-front` et `@libs/users-front` passent sans warning supplémentaire.
8. TS types `ember-tsc --noEmit` passent dans les deux libs.
9. Validation Codex effectuée et output sauvegardé (au moins log conversation).
10. Code review agent exécuté et report sauvegardé dans `specs/review/projects-front-review-2026-05-26.md`.

---

## Files to modify

- `@libs/projects-front/src/schemas/projects.ts` (P1)
- `@libs/users-front/src/schemas/users.ts` (P1)
- Selon root cause phase 2 : `@libs/projects-front/src/components/project-card.gts` ou `@libs/shell-front/src/components/shell/layout.gts` ou nouveau CSS Tailwind.

## Files NOT to modify (defensive)

- `@libs/projects-front/src/services/projects.ts` — God Node, déjà testé extensivement.
- `@apps/front/app/services/store.ts` — registry WarpDrive, ne doit pas changer (les schemas y sont déjà importés correctement).
- Backend (`@libs/users-backend`, `@libs/scrum-backend`) — la source de vérité est correcte, c'est le front qui est désynchronisé.

---

## Risks / Notes

- **Risque squash perdu à nouveau** : si on travaille sur une nouvelle feature branche, vérifier `git status` montre 0 ahead avant tout merge.
- **HMR Vite** : après ajout d'un nouveau champ schéma, un hard reload est obligatoire (`feedback-cache-vite` non listé en mémoire mais c'est un pattern connu).
- **Si codex/code-reviewer ne sont pas disponibles** : terminer les phases 1+2 et logguer les phases 3-4 dans un TODO follow-up (ne pas bloquer le plan).
- Les memoires `feedback-warpd-create.md` et `feedback-warpd-schemas-global.md` sont pertinentes — relire avant phase 1.

---

## Next

Run `/TPK-build specs/todo/fix-projects-route-errors-and-links.md` pour exécuter ce plan.
