# P3.5 — Visual polish : thèmes DaisyUI SprintForge

> Objectif : aligner le rendu visuel sur les screenshots Figma (`docs/figma-screenshots/01-dashboard.png`, `10-login.png`, `24-dashboard-light-mode.png`) en configurant des **thèmes DaisyUI 5 custom** qui consomment les tokens SprintForge déjà définis dans `@libs/shared-front/src/styles/theme.css`. Ce plan répare la dette identifiée pendant le `/TPK-review` de P3.

---

## 1. Contexte & cause racine

### Ce qui ne marche pas aujourd'hui (post P3)

| Critère P3 (section 4) | Marqué | Réel |
|---|---|---|
| Validation visuelle dashboard vs `01-dashboard.png` | ✅ | ❌ — fond gris au lieu de navy `#0a1929` |
| Validation visuelle login vs `10-login.png` | ✅ | ❌ — manque la teinte SprintForge sur la carte |
| Toggle thème dark ↔ light SprintForge | ✅ (data-theme posé) | ❌ — bascule entre 2 themes DaisyUI tiers |

### Cause racine (audit)

`@apps/front/app/styles/app.css` configure DaisyUI 5 ainsi :
```css
@plugin "daisyui" {
  themes:
    nord --default,
    dracula,
    cupcake,
    corporate,
    lemonade;
}
```

→ Les thèmes installés sont **nord, dracula, cupcake, corporate, lemonade**. Aucun n'utilise les tokens SprintForge.

Or `TpkThemeSelector` (P3.7) appelle `document.documentElement.setAttribute('data-theme', themeName)` avec les valeurs `"dark"` et `"light"` (passées via `@themes={{this.themeOptions}}`).

**Conséquence** :
- `data-theme="dark"` ne matche **aucun** theme DaisyUI installé → DaisyUI fallback sur `nord --default`.
- Les composants Triptyk (`TpkDashBoard`, `TpkSidebar`, `TpkNavbar`, `TpkButton`, etc.) utilisent les classes DaisyUI (`bg-base-100`, `text-base-content`, `bg-primary`, etc.) qui prennent les couleurs de `nord` au lieu de SprintForge.
- Nos tokens (`--background`, `--card`, `--primary`, etc.) **sont bien définis** dans `:root` et `[data-theme='light']` mais **personne ne les consomme** côté composant.

### Décision

Créer deux thèmes DaisyUI custom (`sprintforge-dark`, `sprintforge-light`) qui **mappent les tokens DaisyUI sur nos variables SprintForge**. Ce qui fera consommer nos couleurs Figma par tous les composants Triptyk natifs.

---

## 2. Stack & syntaxe DaisyUI 5

DaisyUI 5 supporte la directive `@plugin "daisyui/theme"` pour déclarer des themes inline en CSS. Syntaxe :

```css
@plugin "daisyui/theme" {
  name: "sprintforge-dark";
  default: true;          /* premier theme appliqué */
  prefersdark: true;      /* utilisé par prefers-color-scheme: dark */
  color-scheme: dark;     /* attribut color-scheme sur <html> */
  --color-base-100: #0a1929;
  --color-base-200: #132f4c;
  --color-base-300: #1e3a5f;
  --color-base-content: #e3f2fd;
  --color-primary: #7fdbca;
  --color-primary-content: #0a1929;
  /* ... */
}
```

Un thème DaisyUI 5 expose ces tokens (à ma connaissance — à confirmer dans P3.5.1) :
- `--color-base-100`, `--color-base-200`, `--color-base-300` (background levels)
- `--color-base-content` (text on base)
- `--color-primary`, `--color-primary-content`
- `--color-secondary`, `--color-secondary-content`
- `--color-accent`, `--color-accent-content`
- `--color-neutral`, `--color-neutral-content`
- `--color-info`, `--color-info-content`
- `--color-success`, `--color-success-content`
- `--color-warning`, `--color-warning-content`
- `--color-error`, `--color-error-content`
- `--radius-selector`, `--radius-field`, `--radius-box`
- `--border` / `--depth` / `--noise` (effets visuels)

---

## 3. Plan d'implémentation

### P3.5.1 — Audit DaisyUI 5 (15 min, bloquant)

Lire `node_modules/daisyui/dist/themes.js` (ou équivalent) pour :
1. Confirmer la liste complète des variables CSS DaisyUI 5
2. Identifier comment les composants Triptyk utilisent ces tokens (grep dans `node_modules/@triptyk/ember-ui/dist/components`)
3. Repérer les classes utilisées : `bg-base-100`, `bg-base-200`, `text-base-content`, `bg-primary`, etc.

Commandes :
```bash
find /Users/gilles/www/projects/project-forge -path "*/daisyui/themes*" 2>/dev/null | head -5
grep -rE "bg-base-|text-base-|bg-primary|bg-neutral" /Users/gilles/www/projects/project-forge/node_modules/.pnpm/@triptyk*/node_modules/@triptyk/ember-ui/dist/ 2>/dev/null | head -20
```

**Critère de succès** : produire un tableau de mapping `DaisyUI token → SprintForge token` documenté ci-dessous.

---

### P3.5.2 — Mapping tokens : SprintForge → DaisyUI

Mapping proposé (à valider en P3.5.1) :

#### Dark mode (`sprintforge-dark`)

| DaisyUI token | Valeur SprintForge | Source `theme.css` |
|---|---|---|
| `--color-base-100` | `#0a1929` | `--background` |
| `--color-base-200` | `#132f4c` | `--card` |
| `--color-base-300` | `#1e3a5f` | `--secondary` |
| `--color-base-content` | `#e3f2fd` | `--foreground` |
| `--color-primary` | `#7fdbca` | `--primary` (teal) |
| `--color-primary-content` | `#0a1929` | `--primary-foreground` |
| `--color-secondary` | `#1e3a5f` | `--secondary` |
| `--color-secondary-content` | `#b0bec5` | `--secondary-foreground` |
| `--color-accent` | `#7fdbca` | `--accent` |
| `--color-accent-content` | `#0a1929` | `--accent-foreground` |
| `--color-neutral` | `#0b1e2e` | `--sidebar` |
| `--color-neutral-content` | `#e3f2fd` | `--sidebar-foreground` |
| `--color-info` | `#7fdbca` | `--primary` (réutilisé) |
| `--color-success` | `#7fdbca` | idem |
| `--color-warning` | `#f48fb1` | `--destructive` (rose) |
| `--color-error` | `#f48fb1` | `--destructive` |
| `--radius-selector` | `0.5rem` | `--radius` |
| `--radius-field` | `0.5rem` | `--radius` |
| `--radius-box` | `0.5rem` | `--radius` |
| `color-scheme` | `dark` | — |

#### Light mode (`sprintforge-light`)

| DaisyUI token | Valeur SprintForge | Source `theme.css` |
|---|---|---|
| `--color-base-100` | `#f8fafb` | `--background` |
| `--color-base-200` | `#ffffff` | `--card` |
| `--color-base-300` | `#e3f2fd` | `--secondary` |
| `--color-base-content` | `#0a1929` | `--foreground` |
| `--color-primary` | `#339f8f` | `--primary` (teal foncé) |
| `--color-primary-content` | `#ffffff` | `--primary-foreground` |
| `--color-secondary` | `#e3f2fd` | `--secondary` |
| `--color-secondary-content` | `#0a1929` | `--secondary-foreground` |
| `--color-accent` | `#339f8f` | `--accent` |
| `--color-accent-content` | `#ffffff` | `--accent-foreground` |
| `--color-neutral` | `#ffffff` | `--sidebar` |
| `--color-neutral-content` | `#0a1929` | `--sidebar-foreground` |
| `--color-info` | `#339f8f` | — |
| `--color-success` | `#339f8f` | — |
| `--color-warning` | `#ef5350` | `--destructive` |
| `--color-error` | `#ef5350` | `--destructive` |
| `--radius-*` | `0.5rem` | `--radius` |
| `color-scheme` | `light` | — |

---

### P3.5.3 — Modifier `@apps/front/app/styles/app.css`

Remplacer la directive `@plugin "daisyui"` actuelle par :

```css
@plugin "daisyui" {
  themes: false;  /* on n'inclut aucun theme par défaut */
}

@plugin "daisyui/theme" {
  name: "sprintforge-dark";
  default: true;
  prefersdark: true;
  color-scheme: dark;
  --color-base-100: #0a1929;
  --color-base-200: #132f4c;
  --color-base-300: #1e3a5f;
  --color-base-content: #e3f2fd;
  --color-primary: #7fdbca;
  --color-primary-content: #0a1929;
  --color-secondary: #1e3a5f;
  --color-secondary-content: #b0bec5;
  --color-accent: #7fdbca;
  --color-accent-content: #0a1929;
  --color-neutral: #0b1e2e;
  --color-neutral-content: #e3f2fd;
  --color-info: #7fdbca;
  --color-info-content: #0a1929;
  --color-success: #7fdbca;
  --color-success-content: #0a1929;
  --color-warning: #f48fb1;
  --color-warning-content: #0a1929;
  --color-error: #f48fb1;
  --color-error-content: #0a1929;
  --radius-selector: 0.5rem;
  --radius-field: 0.5rem;
  --radius-box: 0.5rem;
}

@plugin "daisyui/theme" {
  name: "sprintforge-light";
  default: false;
  prefersdark: false;
  color-scheme: light;
  --color-base-100: #f8fafb;
  --color-base-200: #ffffff;
  --color-base-300: #e3f2fd;
  --color-base-content: #0a1929;
  --color-primary: #339f8f;
  --color-primary-content: #ffffff;
  --color-secondary: #e3f2fd;
  --color-secondary-content: #0a1929;
  --color-accent: #339f8f;
  --color-accent-content: #ffffff;
  --color-neutral: #ffffff;
  --color-neutral-content: #0a1929;
  --color-info: #339f8f;
  --color-info-content: #ffffff;
  --color-success: #339f8f;
  --color-success-content: #ffffff;
  --color-warning: #ef5350;
  --color-warning-content: #ffffff;
  --color-error: #ef5350;
  --color-error-content: #ffffff;
  --radius-selector: 0.5rem;
  --radius-field: 0.5rem;
  --radius-box: 0.5rem;
}
```

---

### P3.5.4 — Aligner `TpkThemeSelector` et le service `theme`

Modifier `@libs/shell-front/src/components/shell/layout.gts` :
```ts
get themeOptions() {
  return ['sprintforge-dark', 'sprintforge-light'];
}
```

Modifier `@libs/shared-front/src/services/theme.ts` :
- `ThemeMode = 'sprintforge-dark' | 'sprintforge-light'`
- `DEFAULT_MODE = 'sprintforge-dark'`
- `apply(mode)` continue de set `data-theme=mode`
- Garder la clé localStorage `sprintforge:theme`

Modifier `@libs/shared-front/src/styles/theme.css` :
- Renommer `[data-theme='dark']` → `[data-theme='sprintforge-dark']`
- Renommer `[data-theme='light']` → `[data-theme='sprintforge-light']`
- Garder `:root` comme fallback dark

---

### P3.5.5 — Migration localStorage (compat)

Si l'utilisateur a déjà `sprintforge:theme=dark` dans localStorage (depuis P3), il faut migrer vers `sprintforge-dark` au boot.

Modifier `theme.ts setup()` :
```ts
setup(): void {
  const saved = this.readSavedMode();
  // Migration P3 → P3.5
  if (saved === 'dark') this.apply('sprintforge-dark');
  else if (saved === 'light') this.apply('sprintforge-light');
  else this.apply(saved ?? DEFAULT_MODE);
}
```

Ajuster `readSavedMode()` pour accepter aussi les anciennes valeurs `dark`/`light` (renvoyer la nouvelle valeur correspondante).

---

### P3.5.6 — Vérifier que les tokens SprintForge restent disponibles

Le fichier `theme.css` expose toujours `--background`, `--card`, etc. via `:root` + `[data-theme='sprintforge-*']`. Les classes Tailwind custom (`bg-background`, `bg-card`, etc.) déclarées dans `@theme inline` continuent de fonctionner pour les composants custom (login, placeholder, header SprintForge).

**Important** : nos classes (`bg-background`, `bg-card`) et celles de DaisyUI (`bg-base-100`, `bg-base-200`) coexistent et peuvent même partager les mêmes couleurs si le mapping est cohérent. C'est OK.

---

### P3.5.7 — Configuration ProjectSelector & TpkSelect

Avant de tester, vérifier que le rendu du label "Projet" + placeholder n'est pas collé. Si nécessaire :
- Lire la source de `TpkSelect` (`@triptyk/ember-input/dist/components/tpk-select.js`)
- Ajuster le wrapper `ProjectSelector` (CSS) ou les props passées

Ce point peut être validé visuellement après P3.5.3.

---

### P3.5.8 — Validation visuelle

Pour chaque écran ci-dessous, prendre un screenshot après login et comparer à la référence Figma :

| Écran | Référence Figma | Screenshot à produire |
|---|---|---|
| `/` dark | `docs/figma-screenshots/01-dashboard.png` | `specs/review-screenshots/p3-5-dashboard-dark.png` |
| `/` light | `docs/figma-screenshots/24-dashboard-light-mode.png` | `specs/review-screenshots/p3-5-dashboard-light.png` |
| `/login` | `docs/figma-screenshots/10-login.png` | `specs/review-screenshots/p3-5-login.png` |

Comparer côte à côte ; le résultat doit montrer :
- Fond `#0a1929` (dark) ou `#f8fafb` (light)
- Cartes avec couleurs SprintForge
- Boutons primaires en teal `#7fdbca` (dark) / `#339f8f` (light)
- Sidebar avec le bon contraste
- Texte teal "SprintForge" du logo cohérent

Optionnellement utiliser `/TPK-screenshot-compare` pour une comparaison automatique.

---

## 4. Critères de succès

- [ ] DaisyUI ne charge plus les themes tiers (`nord`, `dracula`, etc.).
- [ ] `data-theme="sprintforge-dark"` applique les couleurs Figma dark mode.
- [ ] `data-theme="sprintforge-light"` applique les couleurs Figma light mode.
- [ ] Au boot avec localStorage vide → mode dark SprintForge.
- [ ] Au boot avec localStorage `sprintforge:theme=dark` (legacy P3) → migration silencieuse vers `sprintforge-dark`.
- [ ] Toggle theme via `TpkThemeSelector` fonctionne (instantané, persistant).
- [ ] Dashboard `/` en dark : fond navy `#0a1929`, cards `#132f4c`, boutons teal — **cohérent avec `01-dashboard.png`**.
- [ ] Dashboard `/` en light : fond `#f8fafb`, cards blanches, primary `#339f8f` — **cohérent avec `24-dashboard-light-mode.png`**.
- [ ] Login en dark : fond navy `#0a1929`, carte centrée fond `#132f4c`, titre teal — **cohérent avec `10-login.png`**.
- [ ] `pnpm lint` clean global.
- [ ] `pnpm test --filter=@libs/shell-front` toujours vert (sanity check préalable).
- [ ] Build production OK.
- [ ] 3 screenshots de validation produits et stockés sous `specs/review-screenshots/`.

---

## 5. Risques & pièges

| Risque | Mitigation |
|---|---|
| Le mapping DaisyUI tokens proposé est partiel — il manque peut-être `--depth`, `--noise`, `--border` | P3.5.1 vérifier la liste exhaustive ; ajouter ce qui manque |
| Les composants Triptyk utilisent une classe DaisyUI non-mappée (ex. `bg-info-content`) | P3.5.1 grep pour repérer toutes les classes utilisées ; ajouter au mapping |
| `@plugin "daisyui/theme"` syntaxe légèrement différente en DaisyUI 5 stable | Vérifier la version installée (`pnpm why daisyui`) et consulter la doc correspondante ; fallback : CSS custom `[data-theme='sprintforge-dark'] { --color-base-100: ...; }` directement |
| Le `prefers-color-scheme` du navigateur déclenche automatiquement `sprintforge-dark` (via `prefersdark: true`) avant que `theme.setup()` ne tourne → flash de mauvais mode | OK pour P3.5 (dark est le default Figma) ; light only après préférence explicite |
| Migration legacy localStorage casse pour des users avec `data-theme="dark"` posé en dur | P3.5.5 gère le cas dans `setup()` |
| `theme.css` `:root` (dark fallback) crée un conflit avec `[data-theme='sprintforge-light']` | Ordre des sélecteurs CSS : `:root` puis `[data-theme='sprintforge-light']` ; spec CSS garantit que l'attribut gagne |
| Les classes custom Tailwind (`bg-card`, `bg-sidebar`) ne sont plus utilisées par les composants Triptyk → tokens orphelins | OK — ils restent utilisés par nos composants custom (login, placeholder, ShellHeader) ; pas de suppression |

---

## 6. Découpage commits

| Commit | Scope |
|---|---|
| `chore(front): replace third-party DaisyUI themes with sprintforge custom themes` | P3.5.3 (app.css) |
| `feat(shared-front): rename theme modes to sprintforge-* + localStorage migration` | P3.5.4, P3.5.5 (theme.ts, theme.css) |
| `feat(shell-front): align ThemeSelector with sprintforge-* themes` | P3.5.4 (layout.gts) |
| `chore: visual validation screenshots` | P3.5.8 |

---

## 7. Hors périmètre P3.5

- Ajustements pixel-perfect (espacements, animations, hover states custom) → bug-fix au fil du temps en P4+.
- Logo SprintForge en SVG (au lieu de texte) → cosmétique, hors scope.
- Le rendu `ProjectSelector` "Projet" + placeholder collé : abordé en P3.5.7 si nécessaire, sinon en P4 quand on aura la vraie liste de projets.
- Theme system ouvert (plus de 2 thèmes) → P12 (settings).

---

## 8. Estimation

- P3.5.1 (audit) : 15 min
- P3.5.2 (mapping doc) : déjà fait dans ce plan
- P3.5.3 (app.css) : 10 min
- P3.5.4 (renommage) : 20 min
- P3.5.5 (migration localStorage) : 10 min
- P3.5.6 (vérif tokens) : 5 min
- P3.5.7 (ProjectSelector si besoin) : 15 min max
- P3.5.8 (screenshots + validation) : 20 min

**Total ~ 1h30 - 2h** (cohérent avec l'estimation initiale "Option A").
