---
description: Build from a plan file, then move plan to done/
allowed-tools: Read, Write, Bash, Edit, Glob, Grep, Agent, mcp__delegate__delegate_to
model: sonnet
argument-hint: [path-to-plan]
---

> **Démarrage** : affiche immédiatement `[TPK-build] 🤖 Modèle : sonnet` comme première ligne de sortie.

# Build

## Purpose

Implement a plan from `specs/todo/` into working code. After successful completion, the plan is moved to `specs/done/` to track progress. Pairs with `/TPK-plan`.

## Variables

PATH_TO_PLAN: $ARGUMENTS

## Routing Rules

| Priorité détectée | Exécution | Modèle |
|---|---|---|
| `frontend` | `mcp__delegate__delegate_to` (provider: glm) | GLM glm-5.1 |
| `backend` | Direct sonnet | claude-sonnet-4-6 |
| `fullstack` | Backend direct (sonnet) puis frontend délégué (GLM) | Sonnet + GLM |

**Détection** — scanner le plan pour les mots-clés :
- Frontend : `users-front`, `shared-front`, `ember`, `.gts`, `.hbs`, `component`, `template`, `CSS`, `UI`, `Vite`, `Ember`, `addon`
- Backend : `fastify`, `users-backend`, `backend`, `api`, `endpoint`, `entity`, `MikroORM`, `seeder`, `route`, `migration`
- Si les deux familles sont présentes → `fullstack`

## Instructions

- If no path provided, check `specs/todo/` and ask which plan to build
- Create a git branch with the appropriate name and type prefix before building
- Read the entire plan before starting implementation
- Follow the plan's phases in order
- If build fails, leave the plan in `specs/todo/` for retry

## Workflow

1. **Locate the plan**
   - If PATH_TO_PLAN is provided, use it
   - Otherwise, list files in `specs/todo/` and ask user which to build

2. **Read and understand**
   - Read the plan file completely
   - Think through the implementation approach
   - Identify any potential issues before starting

3. **Detect priority & announce agents**
   - Scan the plan for frontend/backend keywords (see Routing Rules)
   - Avant toute implémentation, afficher le bloc d'annonce — n'afficher que les lignes correspondant à la priorité détectée :
     ```
     Agents lancés :
     - [frontend] 🤖 GLM (glm-5.1) via mcp__delegate    ← si frontend ou fullstack
     - [backend]  🤖 Sonnet (claude-sonnet-4-6) direct   ← si backend ou fullstack
     ```

4. **Create a git branch**
   - Infer the branch type from the plan's content and title:
     - `feat/` — new feature or capability
     - `fix/` — bug fix
     - `chore/` — maintenance, deps, config, tooling
     - `docs/` — documentation only
     - `refactor/` — code restructuring without behavior change
     - `test/` — adding or updating tests
     - `hotfix/` — urgent production fix
   - Derive a short, hyphenated name from the plan title or filename
   - Run `git checkout -b [type]/[name]` (e.g. `feat/user-auth`, `fix/login-redirect`)
   - Confirm the branch was created before proceeding

5. **Implement**

   ### Priorité `backend` (ou phase backend d'un fullstack)
   - Implémenter directement avec sonnet
   - Suivre les phases du plan pas à pas
   - Créer/modifier les fichiers spécifiés
   - **Commit-as-you-go** : si le plan définit une stratégie de commits, commiter à la fin de chaque sous-phase

   ### Priorité `frontend` (ou phase frontend d'un fullstack)
   - Collecter le contexte nécessaire : lire les fichiers concernés
   - Pour chaque phase ou composant, déléguer à GLM via `mcp__delegate__delegate_to` :
     - `provider_hint: "glm"`
     - `task` : description précise et autonome de ce qui est à implémenter
     - `context` : contenu des fichiers concernés + extrait du plan + conventions Ember du projet (GTS, Octane, Embroider)
   - Appliquer les changements retournés par GLM avec les outils Edit/Write
   - Vérifier que le code retourné compile (TypeScript / Ember build)
   - **Commit-as-you-go** après chaque composant ou phase appliqué

   ### Priorité `fullstack`
   - Phase(s) backend d'abord : exécution directe sonnet → commit
   - Phase(s) frontend ensuite : délégation GLM → appliquer → commit

6. **Validate**
   - `pnpm turbo lint` from repo root — use turbo, not `pnpm lint` in a single package, to match CI exactly
   - Si le projet a des tests, les lancer : `pnpm turbo test` (ou la commande appropriée)
   - Si frontend : `pnpm turbo build --filter='@libs/<lib>'` pour détecter les erreurs TypeScript
   - Corriger tous les problèmes avant de continuer

6c. **Lockfile reminder** ← si `package.json` a été modifié
   - Vérifier si `pnpm-lock.yaml` figure dans `git status`
   - Si oui : **Claude ne peut pas stager ce fichier** (hook damage-control bloque `git add pnpm-lock.yaml`)
   - Afficher ce message à l'utilisateur :
     ```
     ⚠️  pnpm-lock.yaml a changé. Claude ne peut pas le committer (hook).
     Lance cette commande toi-même avant le prochain push :
       ! git add pnpm-lock.yaml
     Sans ça, la CI échouera avec ERR_PNPM_OUTDATED_LOCKFILE.
     ```

6b. **Verify success criteria** ← étape obligatoire avant de déplacer vers done/
   - Lire la section "Critères de succès" du plan
   - Pour chaque critère, confirmer son statut (✅ ou ❌) explicitement
   - Si le plan exige des tests d'intégration, les lancer — un smoke test manuel n'est PAS un substitut
   - Si un critère est ❌, corriger avant de continuer
   - Ne jamais sauter cette étape silencieusement

7. **Move plan to done**
   - Seulement quand tous les critères sont ✅
   - On success: `mkdir -p specs/done && mv [PATH_TO_PLAN] specs/done/`
   - On failure: leave in `specs/todo/` for retry

8. **Show changes**
   - Run `git status` to show what changed
   - Ask user if they want to commit

## Report

```
Build Complete

Plan: [original path]
Branch: [type]/[name]
Priorité: frontend | backend | fullstack
Agents: GLM (delegate) | Sonnet (direct) | Sonnet + GLM
Status: SUCCESS / FAILED
Location: specs/done/[filename] (moved) OR specs/todo/[filename] (retry needed)

Changes Made:
- [change 1]
- [change 2]
- [change 3]

Files Modified: [count]

Next: Review changes with `git diff` or commit with `/TPK-commit`
```
