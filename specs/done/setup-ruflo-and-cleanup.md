# Wipe Claude + graphify pour repartir à zéro (Ruflo installé séparément)

> **Status :** todo · **Owner :** gilles · **Branche cible :** `dev`
> **Date plan :** 2026-05-18
> **Install Ruflo :** **PAS dans ce plan** — l'utilisateur fait l'installation lui-même après que ce nettoyage soit mergé.

## 1. Objectif

Supprimer **tout** l'outillage Claude Code du repo (commands, hooks, settings, CLAUDE.md, MCP config, graphify) pour partir d'une base propre. Une fois ce plan exécuté et mergé, l'utilisateur lance lui-même `npx ruflo init` (ou Path A plugin) sur la branche dev clean.

## 2. Périmètre

### À supprimer (tout)

| Élément | Type | Notes |
|---------|------|-------|
| `.claude/` (racine) | dossier | commands, hooks, skills, settings.json, CLAUDE.md interne, agents — TOUT |
| `@libs/users-front/.claude/` | dossier | second `.claude` imbriqué dans users-front |
| `.mcp.json` | fichier | MCP servers (ember, chrome-devtools, gitscrum, context7) — Ruflo gérera ses propres |
| `graphify-out/` | dossier | 4.6 MB d'artefacts /graphify |
| `audit-screenshots/` | dossier | screenshots de la session d'audit (untracked, perso) |
| `CLAUDE.md` (racine) | fichier | doc projet adressée à Claude |
| `@libs/CLAUDE.md` | fichier | doc libs |
| `@apps/backend/CLAUDE.md` | fichier | doc backend |
| `@apps/front/CLAUDE.md` | fichier | doc front |
| `@apps/e2e/CLAUDE.md` | fichier | doc e2e |
| `@libs/users-backend/CLAUDE.md` | fichier | doc users-backend |
| `@libs/users-front/CLAUDE.md` | fichier | doc users-front |
| `@libs/scrum-backend/CLAUDE.md` | fichier | doc scrum-backend |
| `@libs/backend-shared/CLAUDE.md` | fichier | doc backend-shared |
| `@libs/shared-front/CLAUDE.md` | fichier | doc shared-front |
| `@libs/time-tracking-backend/CLAUDE.md` | fichier | doc time-tracking-backend |
| `@libs/todos-backend/CLAUDE.md` | fichier | doc todos-backend (legacy) |
| `@libs/todos-front/CLAUDE.md` | fichier | doc todos-front (legacy) |

**Total :** ~432 fichiers tracked à retirer.

### À conserver

| Élément | Pourquoi |
|---------|---------|
| `specs/done/` | Plans d'implémentation des phases P0-P13 — historique projet réel, pas juste TPK |
| `specs/todo/` | Plans encore à exécuter (sauf celui-ci une fois done) |
| `specs/handoffs/` | Historique de session — peut être réutile, à arbitrer plus tard |
| `specs/review-screenshots/` | Captures de validation E2E |
| `docs/figma-screenshots/` | Design de référence — indépendant de Claude |
| `docs/retrospectives/` | Apprentissages des sessions — utile même hors Claude |
| `.github/`, `.devcontainer/`, `.vscode/` | Config IDE/CI — pas Claude |
| `lefthook.yml`, `git-conventional-commits.yaml` | Tooling git — pas Claude |
| Plugins globaux (`~/.claude/plugins/`) | Hors repo — pas notre périmètre |
| Skills globaux (`~/.claude/skills/graphify`, etc.) | Hors repo — pas notre périmètre |

### Décisions à acter avant exécution

1. **`docs/retrospectives/`** — Les retrospectives sont nées de TPK-retrospective mais contiennent des leçons réutilisables. **Garder** par défaut (peut être effacé manuellement plus tard).
2. **`specs/handoffs/`** — Mêmes considérations. **Garder** par défaut.
3. **`README.md`** — Si le README a été écrit par Claude, ne le supprimer **pas** : il sert la documentation publique du projet. À auditer manuellement après le wipe.

## 3. Workflow

### Étape 1 — Audit final du périmètre

```bash
# Confirmer la liste exacte avant suppression
git ls-files | grep -E "^CLAUDE\.md$|/CLAUDE\.md$|^\.claude/|^\.mcp\.json$|^graphify-out/" | wc -l
# Attendu : ~432
```

Vérifier qu'aucun fichier important n'est dans la liste (faux positifs improbables — CLAUDE.md est un nom dédié).

### Étape 2 — Supprimer via `git rm`

L'utilisateur exécute (hooks bloquent `rm -rf` côté agent) :

```bash
! git rm -rf .claude @libs/users-front/.claude .mcp.json
! git rm CLAUDE.md @libs/CLAUDE.md
! git rm @apps/backend/CLAUDE.md @apps/front/CLAUDE.md @apps/e2e/CLAUDE.md
! git rm @libs/users-backend/CLAUDE.md @libs/users-front/CLAUDE.md
! git rm @libs/scrum-backend/CLAUDE.md @libs/backend-shared/CLAUDE.md
! git rm @libs/shared-front/CLAUDE.md @libs/time-tracking-backend/CLAUDE.md
! git rm @libs/todos-backend/CLAUDE.md @libs/todos-front/CLAUDE.md
```

Pour les dossiers non-trackés (`graphify-out/`, `audit-screenshots/`) :

```bash
! rm -rf graphify-out audit-screenshots
```

### Étape 3 — Mettre à jour `.gitignore`

Ajouter à la fin du `.gitignore` :

```
# Claude artefacts (Ruflo prendra le relais)
.claude/
.claude-flow/
.mcp.json
CLAUDE.md
graphify-out/
audit-screenshots/
.playwright-mcp/
```

Note : `.playwright-mcp/` est déjà ignoré, on le laisse pour clarté.

### Étape 4 — Commit

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: wipe Claude Code + graphify artefacts for fresh Ruflo install

Remove the full project-level Claude Code setup so Ruflo can take over:

* .claude/ (root) and @libs/users-front/.claude — commands, hooks, skills, settings
* .mcp.json — existing MCP server registrations
* All 14 CLAUDE.md files (root, @libs/, each @apps/* and @libs/*)
* graphify-out/ — generated artefacts from the /graphify skill (4.6 MB)
* audit-screenshots/ — session-local screenshots

Add the above paths to .gitignore so future regen never re-enters git.

Kept (still useful regardless of Claude tooling):
* specs/done, specs/todo, specs/handoffs, specs/review-screenshots
* docs/figma-screenshots, docs/retrospectives
* README.md (project public docs)

Ruflo install will be done on the resulting clean branch.
EOF
)"
```

### Étape 5 — Push

```bash
git push
```

Si la branche actuelle est `dev`, vérifier que les branches protégées (`main`, `dev`) autorisent encore le push (ruleset GitHub). Sinon, créer une PR via `gh pr create`.

## 4. Critères de succès

1. `git ls-files | grep -E "^CLAUDE\.md$|/CLAUDE\.md$|^\.claude/|^\.mcp\.json$|^graphify-out/"` retourne **0 lignes**.
2. `cat .gitignore | grep -E "\.claude/|CLAUDE\.md|graphify-out|\.mcp\.json"` retourne les **5 lignes** ajoutées.
3. `pnpm turbo lint` reste vert depuis la racine.
4. `pnpm turbo test --filter='!@apps/e2e'` reste vert.
5. `pnpm dev` démarre sans erreur (front + back).
6. `git status` est propre après commit.
7. Le `README.md` racine est toujours présent et inchangé.

## 5. Risques & mitigations

| Risque | Mitigation |
|--------|-----------|
| Suppression accidentelle de `README.md` | Le `README.md` n'est PAS dans la liste à supprimer. Confirmer avant commit avec `git status`. |
| Hook `lefthook` (pre-commit) refuse le commit parce qu'il référence un CLAUDE.md | Inspecter `lefthook.yml` avant commit, désactiver temporairement si nécessaire (`git commit --no-verify` est interdit par les règles — adapter `lefthook.yml` proprement si besoin). |
| Branche `dev` protégée par ruleset GitHub (pas de push direct) | Faire un commit sur une branche `chore/wipe-claude-toolkit` puis PR vers `dev`. |
| Perte de conventions projet (lint, ports, règles de commit) parce que `CLAUDE.md` les documentait | Avant suppression, copier les conventions utiles dans le `README.md` (section "Conventions" ou "Contributing"). Sinon Ruflo regénèrera un nouveau CLAUDE.md. |
| Régression dans `@apps/e2e` parce qu'un test lisait `.mcp.json` | Aucun test ne lit `.mcp.json` (vérifier par `grep -rn "\.mcp\.json" @apps @libs 2>/dev/null \| grep -v node_modules` avant suppression). |

## 6. Post-cleanup (l'utilisateur s'en occupe)

Une fois ce plan exécuté et commité :

- L'utilisateur lance `npx ruflo@latest init wizard` (ou `/plugin marketplace add ruvnet/ruflo` pour Path A).
- Ruflo va recréer un `.claude/`, un `CLAUDE.md` racine, ses propres hooks, MCP servers.
- À ce moment-là, hors scope de ce plan.

## 7. Annexe — Fichiers à toucher (récap)

### À supprimer
```
.claude/                                          (dossier complet)
@libs/users-front/.claude/                        (dossier complet)
.mcp.json
graphify-out/                                     (dossier complet, ~500 fichiers)
audit-screenshots/                                (dossier complet, ~16 fichiers)
CLAUDE.md
@libs/CLAUDE.md
@apps/backend/CLAUDE.md
@apps/front/CLAUDE.md
@apps/e2e/CLAUDE.md
@libs/users-backend/CLAUDE.md
@libs/users-front/CLAUDE.md
@libs/scrum-backend/CLAUDE.md
@libs/backend-shared/CLAUDE.md
@libs/shared-front/CLAUDE.md
@libs/time-tracking-backend/CLAUDE.md
@libs/todos-backend/CLAUDE.md
@libs/todos-front/CLAUDE.md
```

### À modifier
```
.gitignore                                         (ajouter 6 lignes)
```

### À auditer avant suppression
```
README.md                                          (vérifier qu'il ne dépend pas de CLAUDE.md)
lefthook.yml                                       (vérifier qu'aucun hook ne réfère .claude/)
```
