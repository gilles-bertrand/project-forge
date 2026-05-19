# Session Handoff - 2026-05-14

## Context

Session dédiée à la mise en place du knowledge graph graphify sur le monorepo SprintForge complet, puis à l'intégration du graphe dans les commandes claudy `TPK-plan` et `TPK-pickup`.

## Completed

- **`/graphify .`** lancé sur 323 fichiers (~264K mots) — pipeline complet :
  - Cache hit 256 fichiers (code, déjà extrait), 67 fichiers ré-extraits (41 docs + 26 screenshots Figma)
  - AST : 734 nœuds, 1796 arêtes (256 fichiers TypeScript/JS)
  - 6 subagents sémantiques en parallèle (4 lots d'images Figma + 2 lots de docs)
  - Merge final : **916 nœuds, 960 arêtes, 185 communautés**
  - Top 62 communautés labellisées à la main (reste auto-labellisé)
  - Outputs : `graphify-out/graph.html`, `graphify-out/graph.json`, `graphify-out/GRAPH_REPORT.md`
  - Réduction tokens : ~335× vs lecture brute

- **Bridge architectural identifié** : `makeSingleJsonApiTopDocument()` (`@libs/backend-shared/src/serialization/json-api.ts:21`) est le god node central (32 arêtes) — contrat de sortie JSON:API partagé par ~30 routes sur 3 libs (`users-backend`, `time-tracking-backend`, `scrum-backend`). Tout changement de sa signature casse les 3 libs simultanément.

- **Retrospective créée** : `docs/retrospectives/retrospective-2026-05-14-001-graphify-full-corpus.md`
  - Bugs documentés : hook `rm -f` bloqué → workaround `os.remove`, warning `file_type` ×626, chunks orphelins
  - Recommandations pour patcher la skill graphify upstream

- **Commandes claudy patchées** (copies locales `.claude/commands/`) :
  - `TPK-plan.md` : ajout étape `2.5 Graph grounding` (advisory, skip si absent, warn si stale)
  - `TPK-pickup.md` : ajout étape `4.5 Architectural anchors` + section `## Architectural Anchors` dans le template report

## In Progress

- Le graphe est fonctionnel mais non versionné : `graphify-out/graph.json` et `graphify-out/GRAPH_REPORT.md` ne sont pas commités.
- La skill graphify upstream (`~/.claude/skills/graphify/SKILL.md`) n'a pas encore été patchée (les recommandations sont dans la rétro).
- Le second bridge (`appRouter()` reliant Fastify ↔ Ember) n'a pas encore été tracé.
- Distinction `/TPK-plan` (local patchée) vs `/claudy:TPK-plan` (upstream non patchée) à clarifier.

## Next Steps

1. **Décider si `graphify-out/` est versionné** : committer `graph.json` + `GRAPH_REPORT.md` (ref architecture) mais mettre `graphify-out/cache/` dans `.gitignore`. Vérifier l'état actuel du `.gitignore`.
2. **Reprendre P3 frontend shell** : le plan est dans `specs/todo/p3-frontend-shell.md` — lancer `/TPK-build specs/todo/p3-frontend-shell.md`. Avec le graphe disponible, le grounding via `TPK-plan` (étape 2.5) sera automatiquement utilisé si un re-plan est nécessaire.
3. **Tracer `appRouter()`** : `/graphify path "Fastify App Core" "Ember App Bootstrap"` — pour comprendre le couplage backend/frontend.
4. **(Optionnel) Patcher la skill graphify upstream** : purge orpheline, relax règle images, default `--directed` pour corpus code-heavy.
5. **(Optionnel) Tester `/graphify @libs/ --directed --update`** : coût 0 token (100% cache), graphe orienté pour les arêtes code.

## Key Files

- `graphify-out/graph.json` — graphe persistant du monorepo
- `graphify-out/GRAPH_REPORT.md` — rapport : god nodes, surprising connections, questions suggérées
- `graphify-out/graph.html` — viewer interactif (ouvrir dans un navigateur)
- `.claude/commands/TPK-plan.md` — patchée avec grounding graphify (étape 2.5)
- `.claude/commands/TPK-pickup.md` — patchée avec anchors graphify (étape 4.5)
- `docs/retrospectives/retrospective-2026-05-14-001-graphify-full-corpus.md` — rétro session
- `specs/todo/p3-frontend-shell.md` — plan P3 en attente d'implémentation
- `@libs/backend-shared/src/serialization/json-api.ts:21` — god node `makeSingleJsonApiTopDocument`, contrat cross-libs

## Blockers / Notes

- **Graphe non orienté** : le flag `--directed` n'a pas été utilisé → les arêtes `--calls-->` perdent leur direction. Ne pas se fier à la direction dans le viewer, toujours vérifier via `grep` ou Read. Pour un prochain run code-heavy, préférer `--directed`.
- **185 communautés** : le clustering est granulaire (beaucoup de singletons). Normal pour un monorepo de cette taille. Les 62 labels manuels couvrent ~85% des nœuds significatifs.
- **Commandes locales vs upstream** : `/TPK-plan` et `/TPK-pickup` utilisent les copies locales patchées dans `.claude/commands/` ; `/claudy:TPK-plan` et `/claudy:TPK-pickup` utilisent la version upstream non patchée. Pour utiliser les patches, invoquer sans le préfixe `claudy:`.
- **`makeSingleJsonApiTopDocument` est un invariant cross-libs** : toute modification doit être répercutée dans `users-backend`, `time-tracking-backend`, et `scrum-backend` simultanément. Mérite une note dans `@libs/backend-shared/CLAUDE.md`.
