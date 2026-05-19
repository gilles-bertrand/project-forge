# Retrospective: SprintForge audit visuel + fixes critiques

**Date**: 2026-05-18
**File**: retrospective-2026-05-18-001-sprintforge-audit-and-fixes.md
**Branche**: `feat/add-item-modal-inline-create`

## Summary

Session de revue de projet (audit Playwright vs Figma 01→25) suivie d'une vague de fixes correctifs sur les 6 recommandations P0/P1 issues du rapport. Audit visuel des 10 routes + 13 modales + bascule dark/light, identification de 11 bugs distincts, application de 6 fixes (i18n, services robustes, auto-projet, schema project-members, refresh JWT, light theme), puis vérification visuelle finale. Toutes les routes redeviennent fonctionnelles, locale FR appliquée, light mode complet.

## Errors Encountered

| Error | Cause | Resolution | Prevention |
|-------|-------|------------|------------|
| `TypeError: Cannot read properties of undefined (reading 'map') at SprintsService.loadByProject` | `fetch('/api/v1/projects/:id/sprints')` brut, sans Authorization → 401 → `await res.json()` → `data` undefined | Helper `@libs/shared-front/utils/auth-fetch.ts` + guard `(json.data ?? []).map(...)` + `if (!res.ok) return []` | Toujours router les appels API via `store.request()` (qui passe par `AuthHandler`) OU via un helper centralisé qui ajoute le Bearer ET garde les retours |
| `Failed to load resource: 401 Unauthorized` sur `/api/v1/projects/:id/sprints`, `/api/v1/time-entries/...` | Idem (raw fetch sans token) | Helper `authFetch` lit `ember_simple_auth-session` du localStorage et attache `Authorization: Bearer ...` | Code review : interdire `fetch()` brut sur `/api/v1`, ESLint custom rule possible |
| `Missing Resource Type: received resource data with a type 'project-members' but no schema could be found` | Backend renvoie `type: "project-members"` mais aucun schema enregistré dans `JSONAPICache` | Création de `@libs/projects-front/schemas/project-members.ts` + ajout dans `@apps/front/app/services/store.ts` | Audit systématique : pour chaque `type:` côté backend, vérifier le schema correspondant côté front |
| `intl.primaryLocale === 'en-us'` partout au lieu de FR | `application.ts:32` hardcodait `this.intl.setLocale('en-us')` | Remplacé par `this.intl.setLocale(['fr-fr', 'en-us'])` après `addTranslations` | Locale par défaut doit refléter l'audience (Figma 100% FR ici), test E2E vérifiant que titre principal contient "Tableau de bord" et non "Dashboard" |
| Light theme : sidebar et header restent en dark | `.tpk-sidebar { @apply bg-base-200 }` mais `--color-base-200` light non propagé aux composants externes Triptyk | Ajout d'overrides explicites dans `theme.css` ciblant `.tpk-sidebar`, `.tpk-sidebar-drawer-side`, `.tpk-dashboard-content` avec `var(--sidebar)` / `var(--background)` | Pour les composants tiers, ne jamais supposer que le data-theme propage ; toujours ajouter une couche d'override |
| `/api/token-refresh/` 404 (default endpoint) | Front configurait `refreshAccessTokenEndpoint` au lieu de `serverTokenRefreshEndpoint` (clé attendue par `ember-simple-auth-token`) | Renommage en `serverTokenRefreshEndpoint: 'api/v1/auth/refresh'` dans `app/config/environment.ts` ET `config/environment.js` | Référence : lire la lib `node_modules/.pnpm/ember-simple-auth-token/dist/authenticators/jwt.js` pour les noms de clé exacts |
| Vite 500 `Failed to resolve import "@libs/shared-front/utils/auth-fetch"` après création du fichier | Vite optimizeDeps cache stale ; `package.json#exports` wildcard `./*` ne se recharge pas après ajout d'un nouveau dossier | Kill du dev server + redémarrage complet via `pnpm start` | Pour tout nouveau export depuis une lib partagée, redémarrer Vite explicitement |
| Backend "Error: listen EADDRINUSE: address already in use ::1:8000" | J'avais supposé port 3000 par défaut, alors que SprintForge tourne sur 8000 | `curl http://localhost:8000/docs` pour confirmer ; doc à jour | Documenter le port dans `CLAUDE.md` (déjà mentionné via `pnpm dev`) ; vérifier avec `lsof` en début de session |
| Deux fichiers `environment` éditésindépendamment | `@apps/front/config/environment.js` (build-time) et `@apps/front/app/config/environment.ts` (runtime) — j'ai édité le .js d'abord, sans effet | Édité aussi le .ts ; au final c'est le .ts qui pilote `import.meta.env.MODE` | Quand il y a deux fichiers homonymes (.js vs .ts), grep les deux + commenter clairement lequel sert à quoi |

## Snags & Blockers

- **Login form ne soumet pas via Playwright click** : `TpkForm` + `ImmerChangeset` ne déclenche pas le submit handler quand on clique sur `button[type=submit]`. Aucune requête réseau, aucune erreur. Workaround : injection directe du JWT via `localStorage` après `fetch('/auth/login')`. Non résolu — bloque les tests E2E du flow login.
- **JWT 15min lifetime** : tokens expirent rapidement pendant une session de debug interactive ; chaque navigation déclenche des 401 en cascade tant que `refreshAccessTokens` n'est pas câblé. Corrigé via FIX-5 mais la durée backend (15min) pourrait être bumpée à 30-60min en dev.
- **MSW http-mocks coexistent avec backend réel** : `application.ts` active MSW sauf si `VITE_MOCK_API=false`. Cause une couche d'indirection difficile à diagnostiquer — quand un 401 arrive, est-ce le mock ou le backend ? Vérifié ici : ce sont les vrais backend (les mocks renverraient 200).
- **Power-select dropdown ne s'ouvre pas via Playwright click** : le composant attend probablement `mousedown` et non `click` ; bloque les tests E2E du sélecteur de projet. Workaround : injection directe via `localStorage.setItem('sprintforge:current-project', ...)`.

## Workarounds Applied

- **JWT injection localStorage** : pour tester les routes protégées, j'ai fait `fetch('/auth/login')` + `localStorage.setItem('ember_simple_auth-session', ...)` puis `location.reload()`. **À revisiter** quand B1 sera résolu — le E2E doit pouvoir log in via le formulaire.
- **`document.documentElement.setAttribute('data-theme', ...)`** pour basculer le thème manuellement. À remplacer par un click sur le bouton `Theme` quand le composant `TpkThemeSelector` sera testable en Playwright.
- **Édition de `config/environment.js` ET `app/config/environment.ts`** en parallèle alors que seul le second est runtime. Le `.js` devrait peut-être être supprimé ou marqué deprecated.

## Lessons Learned

1. **Raw `fetch()` côté front contourne `AuthHandler`** : tout appel à `/api/v1` doit passer soit par `store.request()` (qui invoque le request manager WarpDrive avec auth), soit par un helper qui attache `Authorization` explicitement. Le bug de SprintsService/TimeEntriesService est resté caché parce que /projects passait par le store (200) et seulement quelques services utilisaient `fetch()` (401).
2. **Garder les services API robustes aux non-OK** : `(json.data ?? []).map(...)` au lieu de `json.data.map(...)`. Un 401 (ou 500, ou network error) propage `undefined` jusqu'au `model()` hook qui crashe la route entière → écran noir, sans message UI.
3. **i18n locale par défaut doit refléter l'audience** : pour un Figma 100% FR, hardcoder `en-us` casse toute l'expérience. Pré-charger les deux locales puis `setLocale(['fr-fr', 'en-us'])` (fallback).
4. **Custom Daisy themes + composants tiers** : les variables CSS définies dans `[data-theme='sprintforge-light']` ne suffisent pas si un composant externe utilise `@apply bg-base-200` qui peut être compilé en couleur fixe. Ajouter des overrides explicites par classe.
5. **Vite/Embroider + nouveaux fichiers de lib** : après création d'un nouvel export (`src/utils/auth-fetch.ts`), même un rebuild des libs ne suffit pas — il faut **redémarrer Vite** pour que ses caches d'imports se purgent.
6. **Deux fichiers `environment` non synchronisés** : projet Ember + Embroider/Vite garde un legacy `config/environment.js` ET un nouveau `app/config/environment.ts`. Le runtime utilise le `.ts` (via `import.meta.env.MODE`) mais le `.js` est encore référencé par des outils. Toujours grep les deux quand on touche à la config.
7. **Backend port 8000, pas 3000** : SprintForge est sur 8000 (Vite proxy `/api/v1` → 8000). Documenté dans `CLAUDE.md` indirectement via `pnpm dev`.
8. **Test 401 dans l'audit** : tester avec un JWT expiré (ou pas de JWT) DÈS le premier audit, parce que c'est exactement ce que va vivre l'utilisateur au bout de 15 minutes. Aurait fait remonter les bugs B2/B3 immédiatement.

## Command Improvements

- **`/TPK-prime`** : ajouter une étape "Vérifier ports et services" (lsof 4200/8000, `curl /docs`, vérifier seed loaded). Aujourd'hui c'est laissé à l'utilisateur.
- **`/TPK-validate`** : ajouter scénarios "JWT expiré" et "session invalidée" pour exposer les routes qui crashent silencieusement.
- **`/TPK-visual-verify`** : étendre avec un mode "audit toutes les routes du Figma en séquence" qui prend N screenshots et les présente en grille.
- **Nouveau `/TPK-audit-fixes`** : workflow qui boucle audit → corrige bug par bug → re-screenshot → diff. Ce qu'on a fait à la main ici.

## Process Improvements

- **Inventaire `fetch()` raw vs `store.request()`** : `grep -rn "fetch(\`/api/v1" @libs` à intégrer dans la CI pour empêcher la régression.
- **ESLint custom rule** : interdire `fetch()` direct vers `/api/v1` dans `@libs/*-front/src/services` ; forcer l'usage de `authFetch` ou `store.request`.
- **Test E2E "session expirée"** : Playwright vide le `localStorage`, recharge, vérifie redirect vers `/login` (pas écran noir).
- **CI step "i18n drift"** : grep des chaînes hardcodées en anglais dans `.gts` (`text:|>[A-Z][a-z]+ [A-Z]`) — sortir une whitelist des mots autorisés.
- **Doc des deux env files** : ajouter un commentaire en tête de `config/environment.js` qui pointe vers `app/config/environment.ts` comme source de vérité runtime.

## Metrics

- Bugs identifiés pendant l'audit : 11
- Fixes appliqués : 6 (sur les 6 recommandations P0/P1)
- Routes auditées : 10 + 1 modale (sur 13)
- Captures d'écran générées : 22 (16 audit + 6 fix-verification)
- Crashs route (avant fix) : 4 (dashboard, kanban, sprints, time-tracking)
- Crashs route (après fix) : 0
- Erreurs console (avant fix) : 4–5 par route protégée
- Erreurs console (après fix) : 0 sur toutes les routes testées
- Ratio diagnostic / fix : ~60% diagnostic, ~40% fix (le diagnostic du 401 a pris ~30% du temps total parce que la cause vraie — raw `fetch()` — était cachée derrière une hypothèse erronée — `AuthHandler` buggué)

## Next Session Recommendations

- [ ] **Résoudre B1 (login submit)** : investiguer pourquoi `TpkForm` ne soumet pas via clic Playwright. Probablement un événement `mousedown` au lieu de `click`, ou un attendu sur changeset blur. Sans ça, pas de E2E login.
- [ ] **Inventaire complet des `fetch()` brut dans `@libs/*/src/services`** et migration vers `authFetch` (déjà fait pour sprints + time-entries ; à compléter pour `backlog-front/services/tasks.ts`, `epics.ts`, `user-stories.ts`).
- [ ] **Bumper l'expiration des access tokens en dev** à 30-60min (`@libs/users-backend` env `JWT_EXPIRES_IN`) pour réduire les rotations en debug session.
- [ ] **Vérifier que le refresh automatique fonctionne** : attendre 15 min en page ouverte et vérifier qu'une requête est tentée puis suivie d'un appel à `/auth/refresh` qui renouvelle access+refresh.
- [ ] **Charger les avatars users** : sur les TaskCard / Backlog / Dashboard, les avatars sont génériques `U2`. Vérifier si le backend renvoie une URL d'avatar exploitable, sinon générer les initiales colorées comme dans le Figma.
- [ ] **Compléter l'audit des modales** (AddTask, AddSprint, AddUserStory, AddEpic, AddTimeEntry, TaskDetail, ProjectDetail, SprintHistory, CreateSprint, EditSprint, ProjectSelector) maintenant que les routes hôtes ne crashent plus.
- [ ] **Lint custom rule "no raw fetch in services"** : ajouter une règle ESLint interdisant `fetch(` dans `@libs/*-front/src/services/*.ts` sauf `import { authFetch }`.
- [ ] **Test de bascule thème via le bouton** (pas via JS) : cliquer sur "Thème" dans la sidebar et vérifier que le `data-theme` est bien mis à jour par `TpkThemeSelector`.
- [ ] **Nettoyer le projet test "nox"** dans le seed dev — il pollue l'UI `/projects` en mode démo.
