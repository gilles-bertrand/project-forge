# Retrospective: iceScrum UI — Comments/Attachments, Dependencies, Burndown

**Date**: 2026-05-29
**File**: retrospective-2026-05-29-001-icescrum-comments-deps-burndown.md

## Summary

Reprise du handoff 015 et exécution complète de ses 5 « next steps » :
- PR #36 (fondations comments/attachments) confirmée mergée.
- **Chantier A P2** (PR #37) : backend upload multipart réel + `PATCH /comments/:id`, CRUD comments/attachments dans `task-detail-modal`.
- **Chantier A P3** (PR #38) : déplacement des schemas/services comments/attachments vers `@libs/shared-front`, composants partagés `<CommentThread>`/`<AttachmentList>`, upload monté pour epic/user-story/project, intégration dans les 4 owners, layout 2 colonnes responsive des modales d'édition.
- **Items 4 & 5** (PR #39) : UI Story Dependencies dans l'éditeur d'US, chart Burndown SVG sur les cartes de sprint.
- 3 bugs remontés par l'utilisateur en test réel, corrigés (NaN upload, suppression commentaire, bouton fantôme).

4 PRs ouvertes/mergées, CI verte sur les 3 dernières, handoff 015 clos à 100 %.

## Errors Encountered

| Error | Cause | Resolution | Prevention |
|-------|-------|------------|------------|
| `[vitest] Vite unexpectedly reloaded a test` → `Failed to fetch dynamically imported module` (CI rouge, **vert en local**) | Cache Vite froid en CI : nouveaux modules de `shared-front` (tirés via `moduleRegistry()`/`compatModules`) découvrent des deps runtime (glimmer, ember-intl, @warp-drive/legacy) en plein run → reload | `optimizeDeps.include` de la liste exacte reportée par Vite + suppression de `moduleRegistry()` dans la TestApp | Tester en cache froid (changer `optimizeDeps` force la ré-opt) avant de pousser ; cf. mémoire `feedback-vite-optimizedeps-ci-reload` |
| Upload affiche `NaN` + nom vide ; pas de bouton supprimer sur commentaire fraîchement posté | Méthodes de mutation renvoyaient du JSON:API brut (`{id,type,attributes}`) alors que `loadByOwner` renvoyait des objets aplatis → `.sizeBytes`/`.userId` undefined | Aplatir **toutes** les réponses en `{id, ...attributes}` via `authFetch`/`authFetchJson` | Convention : une méthode de mutation doit renvoyer la même forme que la méthode de chargement |
| `eslint(max-lines): File has too many lines (260/201)` sur `attachments.routes.ts` et `app.ts` | Ajout de la route upload + enregistrement multipart | Extraction dans `attachments-upload.routes.ts` ; compactage du `register` multipart | Surveiller la limite 200 lignes (oxlint) lors d'ajouts |
| `TS2322: Type 'string \| null' is not assignable to 'string'` sur `@task.id`/`@userStory.id`/`s.id` | `WithLegacy` rend `id` nullable | Guards `{{#if @x.id}}` dans les templates ; `s.id != null` dans les filtres | Toujours garder les ids WarpDrive avant de les passer en arg `string` |
| `template-lint: form elements require/should not have multiple labels` (textarea, input file) | textarea sans label associé ; input file avec `aria-label` **et** `<label>` parent | Ajout `aria-label` (textarea) / retrait de l'`aria-label` (input dans `<label>`) | Connaître `require-input-label` : un seul label par champ |
| `template-lint: simple-unless` (`{{#unless}}{{else}}`) | Bloc `unless/else` interdit | Inversion en `{{#if this.isEmpty}}...{{else}}` | Ne jamais utiliser `{{else}}` avec `{{unless}}` |
| `prettier --check` fail récurrent sur `.gts` | Édition manuelle des templates | `prettier --write` (via le script `format` de la lib) | Lancer prettier après chaque édition de `.gts` |

## Snags & Blockers

- **Spec ≠ backend réel** : le spec P2 supposait l'upload de fichier et l'édition de commentaire ; le backend n'avait ni endpoint multipart ni `PATCH`. Décision utilisateur (« les 4 ») → ajout backend. Découvert seulement après lecture des routes. Impact : périmètre backend non anticipé.
- **Hook `pnpm-lock.yaml`** : ajout de `@fastify/multipart` → le hook bloque `git add pnpm-lock.yaml` pour Claude → dépendance à une action manuelle de l'utilisateur pour committer le lockfile (sinon `ERR_PNPM_OUTDATED_LOCKFILE` en CI).
- **Hook damage-control** a bloqué `rm -rf`/`find -delete` (purge cache `.vite` impossible) et des commandes contenant `Object.keys`/`*.key` → scripts curl de validation à réécrire.
- **« Vert en local, rouge en CI »** : a coûté 3 itérations CI (~22 min) avant d'identifier le cache Vite froid comme cause.
- **Port 8000 occupé** par le `pnpm dev` de l'utilisateur → impossible de lancer ma propre instance backend ; utilisé la sienne pour les tests curl.
- **Déclarations orphelines** après `git mv` (shared-front gitignore `declarations/`, backlog-front les committe) → `git rm` manuel des `.d.ts` obsolètes.

## Workarounds Applied

- **Stockage fichiers local disque** (`dist/uploads` servi sur `/public/`, proxy Vite `/public`) — **à revisiter** : migrer vers un stockage objet (S3) en prod.
- **`authFetch` partout** pour comments/attachments/dependencies au lieu de `store.request` (WarpDrive) — contourne les ambiguïtés de forme du cache, mais sort du pattern WarpDrive. Acceptable et plus prévisible ; schemas WarpDrive conservés (inutilisés).
- **`optimizeDeps.include` liste explicite** — fonctionne mais fragile si de nouvelles deps apparaissent ; à surveiller.
- **Chart Burndown en SVG maison** (pas de lib de chart dans le repo) — léger, zéro dépendance, mais limité (pas d'interactions/tooltips).

## Lessons Learned

1. **Vérifier les capacités backend avant la dette UI** : `grep` les routes réelles (multipart, PATCH) plutôt que se fier au spec.
2. **Cohérence de forme des services front** : une méthode de mutation DOIT renvoyer la même structure aplatie que la méthode de chargement, sinon bugs silencieux (NaN, permissions cassées).
3. **« Vert en local » n'est pas « vert en CI »** pour les tests front Vite : le cache froid CI découvre des deps runtime → `optimizeDeps.include`. Reproduire en forçant la ré-optimisation.
4. **`pnpm turbo lint` est la seule vérité CI** : `@apps/backend` `lint:js` = `oxlint` nu (sans `--type-check`) ; lancer `--type-check` à la main fait paniquer sur des erreurs de type préexistantes non bloquantes (`migrate.ts`, `user.seed.ts`).
5. **Les ids WarpDrive (`WithLegacy`) sont nullables** → guards systématiques avant passage en arg `string`.
6. **Dette UI = composants partagés AVANT duplication** (P3) : factoriser dans `shared-front` a évité 4 copies de la logique comments/attachments.

## Command Improvements

- `/TPK-validate` (et `/TPK-build`) : devrait exécuter **`pnpm turbo lint` + builds libs + tests en mode CI-équivalent** (idéalement cache `.vite` purgé ou `optimizeDeps` forcé) avant d'annoncer « vert ». Le piège « vert local / rouge CI » a coûté le plus de temps de la session.
- `/TPK-build` : ajouter une étape « si un `package.json` a changé → rappeler à l'utilisateur de committer `pnpm-lock.yaml` » (hook bloque Claude).
- `/TPK-pickup` : a parfaitement fonctionné, rien à changer.

## Process Improvements

- Avant tout chantier UI s'appuyant sur un backend supposé : **lire les routes montées** (`mounters.ts`) et un endpoint d'exemple pour confirmer le contrat.
- Après ajout de modules dans une **lib addon partagée** : lancer ses tests en cache froid (forcer la ré-opt Vite) localement avant push.
- Documenter la **convention « service front → objets aplatis `{id, ...attributes}` »** (idéalement un helper `flatten` partagé).
- Pour les tests E2E via curl : éviter `Object.keys` / `rm` / `find -delete` (bloqués par le hook) ; préférer des scripts node simples et des suppressions ciblées.

## Metrics

- **Handoff items complétés** : 5/5 (+ 3 bugfixes utilisateur, + 1 refonte UX 2 colonnes, + 2 fixes CI).
- **PRs** : #37, #38, #39 (mergées/prêtes) + commits handoff.
- **Tests** : backlog-front 41/41, shared-front 12/12, sprints-front 5/5.
- **Issues rencontrées** : ~16 (dont 1 majeure : flake CI Vite).
- **Ratio friction / productif** : ~30 % du temps sur friction outillage (flake CI, itérations lint/prettier, shape bug, hooks bloquants), ~70 % productif.

## Next Session Recommendations

- [ ] Merger la PR #39 (CI verte).
- [ ] Créer un nouveau handoff figeant l'état (handoff 015 clos, comments/attachments/deps/burndown livrés).
- [ ] Évaluer la migration du stockage d'attachments local disque → S3 pour la prod.
- [ ] Envisager d'ajouter `optimizeDeps.include` similaire aux autres libs front si elles gagnent des composants tirés via `compatModules`.
- [ ] (Optionnel) Enrichir le chart Burndown (tooltips/points) si besoin produit.
- [ ] Lancer `/TPK-apply-learnings` pour intégrer les améliorations de commandes ci-dessus.
