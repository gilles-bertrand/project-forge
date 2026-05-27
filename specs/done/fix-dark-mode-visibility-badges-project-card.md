# Fix dark mode visibility — badges & project card

**Date** : 2026-05-23
**Auteur** : /TPK-plan (Claude)
**Scope** : `@libs/backlog-front`, `@libs/projects-front`, `@libs/shared-front` (CSS thème)
**Origine** : Captures utilisateur montrant des badges illisibles dans la page Backlog et des éléments fantômes dans la project-card du dashboard.

---

## 1. Problem statement

Deux familles de défauts visuels coexistent en dark mode SprintForge sur les vues « Backlog » et « Projects dashboard » :

### A. Badges illisibles (page Backlog — image 1)
Les badges de type `Techdebt`, `Bug`, `Review`, `Infra`, `Refacto`, `Frontend`, `Backend`, `DevOps` apparaissent avec un fond translucide ~15 % et un texte de la **même couleur**, sur un fond `bg-base-200` (`#132f4c`). Résultat : `Techdebt` (rose pâle) ≈ illisible, `Refacto` (bleu sombre) presque invisible, `Infra` (rose) très faible.
- Cause technique : DaisyUI 5 `badge-soft` calcule la couleur de fond par `color-mix(in oklab, var(--badge-color) 8%, var(--color-base-100))` et garde le texte à `var(--badge-color)`. Sur la palette SprintForge sombre (`base-100=#0a1929`, palette ramenée à du teal/rose), le contraste tombe sous WCAG AA.
- Précédent : déjà corrigé localement sur `epic-row.gts` (observation #503) en supprimant `badge-soft`, mais le problème persiste sur **8 composants** : `task-nature-badge`, `task-type-badge`, `task-priority-badge`, `task-status-badge`, `task-card`, `user-story-row`, `status-badge` (projets), `user-card`.

### B. Éléments fantômes — project card (image 2)
- **Label « Épiques » invisible** : `text-secondary font-medium` avec `--color-secondary: #1e3a5f` (bleu très sombre) sur `bg-base-300/20` (lui aussi très sombre) → contraste ratio ~1.2:1 (WCAG min = 4.5:1).
- **Progress bars fantômes** : `<progress class="progress progress-primary">` à `value=0` rend un track quasi noir sur fond `bg-base-200`.
- **Badge « Actif »** (`badge-success badge-soft`) : même problème que famille A — texte teal sur teal 8 %.
- **Mini-counters mal délimités** : `bg-base-300/20` (`#1e3a5f` à 20 %) est quasi indiscernable du fond → la grille des 4 cellules n'a aucune séparation visuelle.
- **Icône utilisateur + tiret « — »** (responsibleShortName fallback) : `text-base-content/60` sur un tiret de 1 ligne, sans label → ressemble à un artefact graphique.
- **Date « Créé le 01 janv 2025 »** : `text-base-content/60` (#e3f2fd à 60 %) — borderline mais pas critique.

### C. Cause racine partagée
La palette SprintForge dark mode (`@libs/shared-front/src/styles/theme.css`) confond plusieurs rôles couleur :
- `--color-secondary` (#1e3a5f) **=** `--color-base-300` (#1e3a5f) **=** `--color-muted` **=** `--color-border` → 4 rôles, 1 seule valeur. Toute classe `text-secondary` sur un fond `base-300` est invisible **par construction**.
- `--color-warning` **=** `--color-error` (#f48fb1) → `badge-error` et `badge-warning` indistinguables visuellement, peu importe le soft ou pas.

---

## 2. Architectural context

### Composants touchés (8 badges + 2 vues)
- **Badges utilisant `badge-soft`** (god pattern réparti) :
  - `@libs/backlog-front/src/components/task-nature-badge.gts`
  - `@libs/backlog-front/src/components/task-type-badge.gts`
  - `@libs/backlog-front/src/components/task-priority-badge.gts`
  - `@libs/backlog-front/src/components/task-status-badge.gts`
  - `@libs/backlog-front/src/components/task-card.gts`
  - `@libs/backlog-front/src/components/user-story-row.gts`
  - `@libs/projects-front/src/components/status-badge.gts`
  - `@libs/users-front/src/components/user-card.gts`
- **Cards/rows visibles dans la capture** :
  - `@libs/backlog-front/src/components/task-row.gts` (rendu Image 1)
  - `@libs/projects-front/src/components/project-card.gts` (rendu Image 2)
- **CSS thème global** : `@libs/shared-front/src/styles/theme.css`

### Cross-cutting contracts à risque
- **Design tokens DaisyUI** : modifier `--color-secondary` impacte TOUT composant utilisant `bg-secondary`, `text-secondary`, `border-secondary`, `badge-secondary` dans le repo. Audit nécessaire avant remap.
- **Build dist/** : `@libs/shared-front` doit être rebuilt après tout changement de theme.css ; `@apps/front` importe via `@import '@libs/shared-front/styles/theme.css'` mais le dev server Vite a un cache (cf. CLAUDE.md root).

### God nodes (forte connectivité)
- `theme.css` : touché par ~tous les composants front via Tailwind classes.
- `badge-soft` (DaisyUI utility, non patchable directement) : utilisé dans 8 fichiers.

---

## 3. Approach

Plutôt que de patcher chaque composant un par un, on **corrige à la source** :

### Stratégie hybride
1. **Niveau token (theme.css)** — désambiguïser la palette dark :
   - Donner à `--color-secondary` une valeur **distincte** de `--color-base-300`. Proposition : monter `--color-secondary` à `#5e7a9f` (bleu acier moyen) et garder `--color-secondary-content: #e3f2fd` (au lieu de `#b0bec5`) pour boost contraste.
   - Différencier `--color-warning` de `--color-error` : warning → `#f4c28f` (orange pâle), error → conserve `#f48fb1` (rose).
2. **Niveau utility CSS (app.css)** — override `badge-soft` pour redonner du contraste :
   - Style unlayered (priorité sur `@layer daisyui`) qui force `color: var(--badge-fg, var(--color-base-content))` avec opacité fond ≥ 25 %, ou plus simple : faire passer la couleur du **texte** à `--color-X-content` quand le badge a `.badge-soft`.
   - Alternative plus radicale : **abandonner `badge-soft`** dans les 8 composants et utiliser le pattern solide (déjà éprouvé sur `epic-row` — observation #503).
3. **Niveau composant (project-card)** — défauts spécifiques :
   - Remplacer `text-secondary` (label « Épiques ») par `text-base-content/70` (lisible, neutre) ou `text-secondary` après le remap si on choisit option 1.
   - Renforcer le track des `<progress>` via une règle CSS (`progress { background-color: var(--color-base-300); }`).
   - Renforcer la lisibilité des mini-counters : `bg-base-300/20` → `bg-base-100` + `border border-base-300/60`.
   - Supprimer ou enrichir l'icône responsible quand la valeur est `'—'` : afficher uniquement si un membre est attribué, sinon masquer le bloc.

### Décision de design
**On combine** :
- Option 1 (remap tokens) : élimine 80 % des cas marginaux d'un coup, sans modifier les composants.
- Option 3 (composant) : nettoie le project-card pour les défauts qui ne dépendent pas des tokens (progress bars, mini-counters border, responsible fallback).
- Option 2 abandonnée : suivre la voie de `epic-row` (suppression de `badge-soft` pour les cas critiques `Techdebt`, `Refacto`, `Bug`-soft) plutôt qu'override CSS global, car DaisyUI 5 calcule `badge-soft` via `color-mix` au build → un override CSS unlayered est fragile sur les futures versions DaisyUI.

Cette stratégie est cohérente avec le précédent ratifié dans observation #503 (epic badge readability fix).

---

## 4. Phases

### Phase 1 — Audit & remap tokens dark mode (`@libs/shared-front`)
**Fichier** : `@libs/shared-front/src/styles/theme.css`

1. Modifier `[data-theme='sprintforge-dark']` :
   - `--color-secondary: #5e7a9f` (au lieu de `#1e3a5f`)
   - `--color-secondary-content: #e3f2fd` (au lieu de `#b0bec5` pour boost ratio)
   - `--color-warning: #f4c28f` (au lieu de `#f48fb1` — déduplique vs error)
   - `--color-warning-content: #0a1929` (inchangé)
   - **Important** : ne PAS toucher `--color-base-300` ni `--secondary` (token Sprintforge custom) — uniquement les tokens DaisyUI `--color-*`. Le token `--secondary` reste utilisé par les cards/borders Tailwind v4 `@theme inline`.
2. Décider du mapping `light` :
   - En light mode, `--color-secondary: #e3f2fd` (bleu pâle) sur fond blanc → faible contraste si utilisé en texte. Ajouter `--color-secondary-content: #0a1929` (déjà OK).
3. Rebuild shared-front : `pnpm --filter @libs/shared-front build`.
4. Auditer `grep -rn "text-secondary\|bg-secondary\|border-secondary\|badge-secondary" @libs @apps/front` pour vérifier qu'aucun usage existant n'est cassé par le remap (cas où on s'attend visuellement à du bleu sombre).

**Risque** : si un composant attendait visuellement le bleu sombre `#1e3a5f`, le remap le rendra plus clair. Mitigation : utiliser `--secondary` (token SprintForge) ou `--color-base-300` directement dans ces cas-là.

### Phase 2 — Fix project-card (`@libs/projects-front`)
**Fichier** : `@libs/projects-front/src/components/project-card.gts`

1. **Mini-counters** (lignes 258–283) — fond + bordure visibles :
   ```diff
   - <div class="bg-base-300/20 rounded p-1.5 text-center">
   + <div class="bg-base-100 rounded p-1.5 text-center border border-base-300/60">
   ```
   Appliquer aux 4 cellules (Épiques, US, Tâches, Sprints).
2. **Label « Épiques »** (ligne 260) :
   - Si Phase 1 appliquée : `text-secondary` devient lisible → garder.
   - Sinon : remplacer par `text-base-content/70`.
3. **Progress bars** (lignes 238–254) — ajouter une règle CSS dans un fichier dédié `project-card.css` (ou utiliser Tailwind arbitrary) :
   ```html
   <progress class="progress progress-primary w-full h-2 bg-base-300/60" ...>
   ```
   Note Tailwind 4 : `bg-base-300/60` s'applique à l'élément `<progress>` directement ; DaisyUI 5 utilise `progress::-webkit-progress-bar` pour le track → si la classe Tailwind ne mord pas, ajouter une règle CSS scoped.
4. **Responsible fallback** (ligne 300–303) :
   ```diff
   - <span class="text-xs text-base-content/60 flex items-center gap-1">
   -   <UserIcon />
   -   {{this.responsibleShortName}}
   - </span>
   + {{#if (not-eq this.responsibleShortName "—")}}
   +   <span class="text-xs text-base-content/60 flex items-center gap-1">
   +     <UserIcon />
   +     {{this.responsibleShortName}}
   +   </span>
   + {{/if}}
   ```
   (Ou rendre conditionnel via un getter `hasResponsible`.)
5. Vérifier le badge `StatusBadge` (« Actif ») — sera traité en Phase 3.

### Phase 3 — Fix badges critiques (suppression `badge-soft`)
Suivre le précédent observation #503 : retirer `badge-soft` pour les badges où la lisibilité n'est pas acquise après le remap.

**Fichiers** :

1. `@libs/backlog-front/src/components/task-nature-badge.gts` :
   ```diff
   const CLASS_FOR: Record<TaskNature, string> = {
     Bug: 'badge-error',
   - Feature: 'badge-success badge-soft',
   - Maintenance: 'badge-neutral badge-soft',
   - Hotfix: 'badge-error badge-soft',
   - Refacto: 'badge-secondary badge-soft',
   - Techdebt: 'badge-warning badge-soft',
   - Spike: 'badge-info badge-soft',
   + Feature: 'badge-success',
   + Maintenance: 'badge-neutral',
   + Hotfix: 'badge-error badge-outline',
   + Refacto: 'badge-secondary',
   + Techdebt: 'badge-warning',
   + Spike: 'badge-info',
     Review: 'badge-success',
   - Deployment: 'badge-primary badge-soft',
   + Deployment: 'badge-primary',
     Infra: 'badge-warning',
   };
   ```
   Choix `badge-outline` pour `Hotfix` afin de distinguer de `Bug` (tous deux `badge-error`).

2. `@libs/backlog-front/src/components/task-type-badge.gts` : même opération, retirer `badge-soft` partout.

3. `@libs/backlog-front/src/components/task-priority-badge.gts` :
   - `Moyenne: 'badge-warning'` (sans soft)
   - `Haute: 'badge-error badge-outline'` (distinct de Critique)
   - `Critique: 'badge-error'`

4. `@libs/backlog-front/src/components/task-status-badge.gts` : retirer `badge-soft` partout.

5. `@libs/projects-front/src/components/status-badge.gts` :
   ```diff
   - planned: 'badge-info badge-soft',
   - active: 'badge-success badge-soft',
   - paused: 'badge-warning badge-soft',
   - completed: 'badge-neutral badge-soft',
   - cancelled: 'badge-error badge-soft',
   - archived: 'badge-ghost badge-soft',
   + planned: 'badge-info',
   + active: 'badge-success',
   + paused: 'badge-warning',
   + completed: 'badge-neutral',
   + cancelled: 'badge-error badge-outline',
   + archived: 'badge-ghost',
   ```

6. `@libs/backlog-front/src/components/task-card.gts` et `user-story-row.gts` : audit ligne par ligne — retirer `badge-soft` sauf si combiné à `badge-ghost` (qui reste lisible).

7. `@libs/users-front/src/components/user-card.gts` : idem.

### Phase 4 — Tests & vérification
1. **Lint** : `pnpm turbo lint --filter='./@libs/backlog-front' --filter='./@libs/projects-front' --filter='./@libs/shared-front' --filter='./@libs/users-front'`.
2. **Tests unitaires / intégration** :
   - `pnpm --filter @libs/backlog-front test`
   - `pnpm --filter @libs/projects-front test`
3. **Sanity test** :
   - Vérifier qu'au moins un test échoue si on revient en arrière sur task-nature-badge (snapshot ou className assertion). Si aucun test ne touche la classe : ajouter une assertion `assert.dom('.badge').doesNotHaveClass('badge-soft')` dans un test integration existant pour graver le contrat.
4. **Vérification visuelle obligatoire (TPK-visual-verify pattern)** :
   - Démarrer `pnpm dev` (backend + front)
   - Naviguer sur `/dashboard/projects` → vérifier project-card : label « Épiques » lisible, progress bars visibles, mini-counters délimités, pas d'icône user vide
   - Naviguer sur `/backlog` (ou route équivalente) → vérifier tous les badges du backlog : Techdebt, Bug, Frontend, Backend, Refacto, Infra, DevOps, Review sont **distinctement lisibles**
   - Vérifier light mode (`/` + bascule thème) : aucune régression de lisibilité
5. **Audit accessibilité** : utiliser `mcp__chrome-devtools__lighthouse_audit` ou manuel — chaque badge doit avoir un contraste ≥ 4.5:1 sur son fond.

---

## 5. Testing strategy

### Tests d'intégration (BLOQUANTS pour passer en done/)
- **`@libs/backlog-front/tests/integration/task-row-test.gts`** : ajouter assertions sur les classes appliquées par `TaskNatureBadge` et `TaskTypeBadge` (vérifier l'absence de `badge-soft` post-fix).
- **`@libs/projects-front/tests/integration/project-card-test.gts`** : ajouter assertions sur :
  - Présence du label « Épiques » avec une classe non `text-secondary` (si Phase 2 step 2 appliquée) ou avec `text-secondary` si Phase 1 est faite et désambiguïsée.
  - Présence des bordures sur les mini-counters.
  - Absence du bloc responsible quand `responsibleShortName === '—'`.
- **Sanity check obligatoire** : suivant la règle [[feedback-tests-sanity]], introduire volontairement un échec (commenter le fix d'un badge) et confirmer que le test échoue ; puis restaurer.

### Vérification visuelle (BLOQUANTE)
- Le plan ne peut PAS être marqué `done/` sans capture de validation des deux vues (backlog + dashboard) en dark mode **et** light mode.
- Critère : tous les badges et labels mentionnés dans la section « Problem statement » doivent être visibles à l'œil nu avec contraste perceptible.

### Tests E2E (non bloquants ici)
Les tests Playwright existants (`@apps/e2e/tests/uat/project-lifecycle.spec.ts`) couvrent les flux ; ils ne valident pas les couleurs. Pas de modification E2E requise.

---

## 6. Success criteria (vérifiables un à un)

1. **[Token] `--color-secondary` dark mode ≠ `--color-base-300`** : `grep "color-secondary:" @libs/shared-front/src/styles/theme.css` retourne `#5e7a9f` (ou équivalent ≠ `#1e3a5f`) pour le bloc dark.
2. **[Token] `--color-warning` dark mode ≠ `--color-error`** : valeurs distinctes vérifiables dans `theme.css`.
3. **[Audit] Aucun composant n'utilise `badge-soft`** dans les fichiers listés Phase 3 : `grep -l "badge-soft" @libs/backlog-front/src @libs/projects-front/src @libs/users-front/src` retourne 0 ligne.
4. **[Composant] Mini-counters project-card** ont une bordure visible : `grep "border border-base-300" @libs/projects-front/src/components/project-card.gts` retourne 4+ occurrences (1 par cellule).
5. **[Composant] Responsible conditionnel** : le bloc UserIcon + tiret n'apparaît plus quand `responsibleShortName === '—'`. Vérifier via test d'intégration.
6. **[Lint] Lint global passe** : `pnpm turbo lint` exit code 0.
7. **[Test] Tests d'intégration passent** : `pnpm --filter @libs/projects-front test` et `pnpm --filter @libs/backlog-front test` exit code 0, **et** au moins 1 assertion nouvelle a été ajoutée par lib (vérifier via diff).
8. **[Sanity] Échec volontaire confirmé** : suivant `feedback-tests-sanity`, un commit local de régression DOIT faire échouer un test ; preuve dans le journal de session.
9. **[Visuel — dark mode] Project card sur `/dashboard/projects`** : capture montrant labels « Épiques » / « US » / « Tâches » / « Sprints » lisibles, progress bars visibles même à value=0, mini-counters délimités.
10. **[Visuel — dark mode] Badges sur backlog** : capture montrant `Techdebt`, `Bug`, `Refacto`, `Infra`, `Frontend`, `Backend`, `Review`, `DevOps` chacun avec contraste perceptible (≥ 4.5:1 idéalement).
11. **[Visuel — light mode] Pas de régression** : capture mode clair des deux mêmes vues.
12. **[Mémoire]** : si un pattern nouveau émerge (ex: « ne plus jamais utiliser badge-soft en dark mode SprintForge »), une note de feedback est enregistrée dans `MEMORY.md`.

---

## 7. Risks & mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Remap `--color-secondary` casse visuellement des composants tiers qui s'attendaient au bleu sombre | Visuel | Audit grep avant push ; revue manuelle des 10 premiers usages |
| Vite cache après changement theme.css | Build/dev | Redémarrer dev server après modification (cf. CLAUDE.md root) |
| Pre-commit hook bloque `pnpm-lock.yaml` | Hook | Pas de nouvelle dep prévue ; sinon demander à l'utilisateur de commiter (cf. `feedback-pnpm-lock-commit`) |
| Régression CI sur warnings ESLint | CI | `pnpm turbo lint` global AVANT push (cf. `feedback-lint-before-push`) |
| Snapshot tests cassent | Tests | Régénérer snapshots après revue manuelle |
| Tests integration qui s'appuient sur la classe `badge-soft` (textContent ou className) | Tests | Audit `grep "badge-soft" @libs/*/tests` avant Phase 3 |

---

## 8. Out of scope

- Audit global de la palette light mode (peut nécessiter une passe séparée si défauts détectés visuellement).
- Refonte du composant `badge` (DaisyUI native) — on travaille au-dessus des tokens.
- Migration des progress bars vers un composant custom — la fix actuelle suffit visuellement.
- Améliorations UX du `ProjectActionBar` (cf. observation #474 sur le nested interactive content).

---

## Next step

Run `/TPK-build specs/todo/fix-dark-mode-visibility-badges-project-card.md` pour démarrer l'implémentation phase par phase.
