# Audit & mise à jour backend selon best practices Fastify

> Source des règles : `tuto/1_backend.packed.md`
> Cibles auditées : `@apps/backend`, `@libs/backend-shared`, `@libs/users-backend`, `@libs/scrum-backend`, `@libs/time-tracking-backend`, `@libs/todos-backend`
> Date audit : 2026-05-20

---

## 1. Problème & objectifs

Le repo a migré du boilerplate Ember+Fastify vers SprintForge. Plusieurs librairies backend ont divergé du pattern documenté dans `tuto/1_backend.packed.md`. L'objectif est de **rétablir la conformité structurelle** sans casser les flux fonctionnels.

**Objectifs verifiables** :
1. Tous les modules respectent le pattern `Module.init(context)` + `setupRoutes(fastify)`.
2. Toutes les routes sont des classes implémentant `Route<FastifyInstanceTypeForModule>`.
3. Toutes les réponses passent par JSON:API (`makeSingleJsonApiTopDocument` + `handleJsonApiErrors`).
4. Le préfixe global est `/api/v1` (avec slash initial).
5. Le `setErrorHandler` global d'`@apps/backend` utilise `handleJsonApiErrors`.
6. Plus aucun cast `as any`, `as never`, `request.query as Record<string, any>` quand un schéma Zod existe.
7. Plus de lib morte (`@libs/todos-backend` à supprimer ou recréer selon le tuto).
8. `pnpm turbo lint` + `pnpm test` verts sur tout le monorepo.

---

## 2. Architectural Context

**Communautés touchées** :
- `@apps/backend` (bootstrap, routing, error handling global)
- `@libs/backend-shared` (helpers JSON:API — contrat transverse)
- `@libs/users-backend` (auth, users)
- `@libs/scrum-backend` (project, epic, task, sprint, user-story, dashboard, search)
- `@libs/time-tracking-backend`

**God nodes / contrats cross-cutting** (à traiter avec test de non-régression) :
- `handleJsonApiErrors` (`@libs/backend-shared/src/error-handler.ts`) — utilisé par chaque module
- `makeSingleJsonApiTopDocument`, `makeJsonApiDocumentSchema`, `jsonApiErrorDocumentSchema` — changer la signature impacte toutes les libs
- `Module.setupRoutes(fastify)` — interface implémentée par 4 modules
- `appRouter` (`@apps/backend/src/app/app.router.ts`) — point unique d'enregistrement des préfixes
- Format de réponse `/auth/login` et `/auth/refresh` — consommé par `@libs/users-front` (front à coordonner)

**Risques cassants identifiés** :
- **Phase 3.2 / 3.3** (passage de `login`/`refresh` au format JSON:API) impacte `@libs/users-front`. Test E2E à valider avant merge.
- **Phase 5.5** (rename `src/helpers/` → `src/utils/` dans scrum-backend) modifie des imports internes uniquement.

---

## 3. Synthèse de l'audit

### @libs/todos-backend — **À supprimer**
- Aucun `src/`, aucun `tests/`, aucun `package.json`. Seuls subsistent `dist/` + `node_modules/` + `CLAUDE.md`. Aucun import dans `@apps/backend`.

### @libs/users-backend — Conforme dans les grandes lignes, écarts HIGH/MED
- HIGH : `list.route.ts` ignore le `querystring` côté Zod (`request.query as Record<string, any>`, `where: any`, `orderBy: any`).
- HIGH : `list.route.ts` schéma response ad-hoc — n'utilise pas `jsonApiSerializeManyUsersDocument` qui existe pourtant.
- HIGH : `login.route.ts` body et response **non** JSON:API (body plat, response `{ data: { accessToken, refreshToken } }` sans `type`/`attributes`).
- HIGH : `refresh.route.ts` même symptôme à confirmer.
- MED : imports en `.ts` au lieu de `.js` (`index.ts:21`, `init.ts:22`).
- MED : import circulaire `init → index → init`.
- MED : `src/router.ts` mort (jamais appelé).
- MED : `package.json` plein de devDeps inutiles (`playwright`, `passport-*`, `mailgen`, `nodemailer`, `pdf-parse`, `handlebars`, `@fastify/static`, `@fastify/flash`, `@testcontainers/rabbitmq`).
- MED : `declare module "fastify"` dans la lib (`src/types.ts`) — devrait être dans l'app.
- LOW : `TestModule.em` via `this.module["context"].em` (accès au privé via index).

### @libs/scrum-backend — Choix architectural à valider, peu d'écarts critiques
- MED : `src/mounters.ts` introduit une indirection non prévue par le tuto.
- MED : routes regroupées (`actions.routes.ts`, `members.routes.ts`, `comments.routes.ts`, `attachments.routes.ts`, `assignees.routes.ts`, `relationships.routes.ts`, `history.routes.ts`) au lieu d'un fichier par route.
- MED : `src/helpers/` au lieu de `src/utils/`.
- MED : `dashboard/` et `search/` sans sous-dossier `routes/` — asymétrie.
- LOW : cast `(request as unknown as { user: DashboardUser })` (`dashboard.route.ts:37`).
- LOW : cast `(request as never)` (`actions.routes.ts:74,132`).

### @libs/time-tracking-backend — Quasi conforme
- MED : `delete.route.ts` envoie `{ data: null }` avec code 204 — viole RFC 7231 (204 = no body).
- MED : cast `request.params as { id: string }` malgré schéma Zod déclaré.
- LOW : pas de `src/utils/` / `src/types.ts` (acceptable vu la taille).

### @apps/backend — Écarts HIGH
- HIGH : `setErrorHandler` global ad-hoc (`app.ts:169-187`) — n'utilise pas `handleJsonApiErrors`. Réponses hors-modules ne sont pas JSON:API.
- HIGH : préfixe `"api/v1"` sans slash initial (`app.router.ts:36`) — convention `/api/v1`.
- HIGH : `app.router.ts:22-29` enregistre un sous-`fastify.register` async avec hook `onRoute` qui pose `tags ??= ["resource"]`, mais **aucune route n'est enregistrée dans ce scope** — hook mort-né.
- HIGH : `configuration.ts:16-17` valeurs par défaut `"Registr"` (héritage boilerplate non rebrandé).
- MED : seeders non idempotents (`em.create` sans nettoyage préalable).
- MED : `gen-openapi.ts` accède à `app["fastify"]` (encapsulation cassée).
- MED : `fastify.register(@fastify/static)` non awaité.
- LOW : `logger.ts:7` `target: "pino"` invalide.
- LOW : `package.json` : `fastify-zod` legacy, `playwright` (devrait être dans `@apps/e2e`).
- LOW : `setNotFoundHandler` non JSON:API.

---

## 4. Décisions actées

| # | Décision | Choix |
|---|----------|-------|
| 1 | Supprimer `@libs/todos-backend` | ✅ Oui |
| 2 | Passer login/refresh au format JSON:API | ❌ Non — laisser tel quel |
| 3 | Conserver `mounters.ts` + routes groupées dans scrum-backend | ✅ Oui, avec documentation |
| 4 | Stratégie seeder | ✅ Truncate + insert |

**Impact sur le plan** : Phases 3.3, 3.4 et 7 (coordination front login/refresh) sont **supprimées**.

---

## 5. Plan d'exécution (7 phases)

> Approche : commencer par **cleanup** (Phase 1) et **fixes app** (Phase 2) qui ont le plus de leverage, puis remonter chaque lib (Phases 3-5), enfin validation (Phase 6-7).
> Chaque phase est livrable indépendamment et fait l'objet d'un commit séparé.

### Phase 1 — Cleanup lib morte `@libs/todos-backend`

**Tâches** :
- 1.1 Vérifier l'absence d'imports `@libs/todos-backend` dans tout le repo (`rg "@libs/todos-backend"`).
- 1.2 Supprimer le dossier `@libs/todos-backend/` complet.
- 1.3 Retirer l'entrée correspondante de `pnpm-workspace.yaml` si présente.
- 1.4 Mettre à jour `pnpm-lock.yaml` (demander à l'utilisateur — cf. `feedback-pnpm-lock-commit`).
- 1.5 Vérifier que `@libs/todos-front` n'attend rien du back (sinon la flagger pour suppression / retravail).

**Critères de succès** : `pnpm install` + `pnpm turbo lint` + `pnpm build` OK sans `@libs/todos-backend`.

---

### Phase 2 — `@apps/backend` : conformité HIGH

#### 2.1 Error handler global JSON:API
- Fichier : `@apps/backend/src/app/app.ts:169-187`
- Action : remplacer par
  ```ts
  fastify.setErrorHandler((error, request, reply) => {
    handleJsonApiErrors(error, request, reply);
  });
  ```
- Idem pour `setNotFoundHandler` : retourner `makeJsonApiError(404, "Not Found", { code: "ROUTE_NOT_FOUND", detail: \`Route \${request.method} \${request.url} not found\` })`.

#### 2.2 Préfixe `/api/v1`
- Fichier : `@apps/backend/src/app/app.router.ts:36`
- Action : `prefix: "api/v1"` → `prefix: "/api/v1"`. Vérifier que les fronts/openapi.json reflètent.

#### 2.3 Hook `onRoute` mort
- Fichier : `@apps/backend/src/app/app.router.ts:22-29`
- Décision à prendre :
  - **Option A (recommandée)** : supprimer le sous-register vide et appliquer le hook directement sur le scope parent qui monte les modules.
  - Option B : déplacer les `register(scrumModule, userModule, timeTrackingModule)` à l'intérieur du sous-scope pour que le hook s'applique.
- Appliquer A pour minimiser le code mort.

#### 2.4 Rebranding configuration
- Fichier : `@apps/backend/src/configuration.ts`
- Action : remplacer les défauts `"Registr"` par `"SprintForge"` ; ajouter `NODE_ENV` (Zod enum `"development" | "production" | "test"`).
- Rendre `SMTP_*` optionnels (ou les charger conditionnellement).

#### 2.5 Logger : target pino invalide
- Fichier : `@apps/backend/src/app/logger.ts:7`
- Action : en prod, ne pas définir de `target` (laisser pino stdout JSON par défaut). En dev, garder `pino-pretty`.

#### 2.6 gen-openapi encapsulation
- Fichier : `@apps/backend/src/gen-openapi.ts`
- Action : ajouter `get fastify(): FastifyInstanceType` sur la classe `App` (ou méthode `dumpOpenApi(path: string)`), retirer `app["fastify"]`.

#### 2.7 Awaiter `@fastify/static`
- Fichier : `@apps/backend/src/app/app.ts:122-128`
- Action : préfixer par `await`.

#### 2.8 Dépendances obsolètes
- Fichier : `@apps/backend/package.json`
- Action : retirer `fastify-zod` (vérifier qu'aucun import). Déplacer `playwright` vers `@apps/e2e` (ou retirer si déjà présent là-bas).

#### 2.9 Seeders — truncate + insert
- Fichier : `@apps/backend/src/seeders/development.seeder.ts`
- Action : ajouter en tête du seeder un `await em.execute("TRUNCATE TABLE ... CASCADE")` couvrant toutes les tables du domaine (users, refresh_tokens, projects, project_members, epics, user_stories, tasks, task_assignees, sprints, comments, attachments, history_entries, time_entries).
- Documenter dans `@apps/backend/CLAUDE.md` : workflow normal est `pnpm schema:fresh && pnpm seed` (full reset) OU `pnpm seed` seul (truncate + re-insert, données fraîches sans recreate schema).

**Critères de succès Phase 2** :
- `curl http://localhost:8000/api/v1/auth/login` répond JSON:API.
- `curl http://localhost:8000/route/inexistante` retourne `{ errors: [...] }` en JSON:API.
- `pnpm seed && pnpm seed` (deux fois de suite) ne lève pas d'unique violation.
- `pnpm run api:types` régénère `openapi.json` et `api-types.ts` sans erreur.

---

### Phase 3 — `@libs/users-backend` : conformité HIGH/MED

#### 3.1 Typage Zod du query de `list.route.ts`
- Fichier : `@libs/users-backend/src/routes/list.route.ts`
- Action : ajouter `querystring` au schéma Zod
  ```ts
  querystring: object({
    "filter[search]": string().optional(),
    sort: string().optional(),
  }),
  ```
- Retirer les casts `any`, utiliser `request.query` typé.

#### 3.2 Schéma response cohérent
- Fichier : `@libs/users-backend/src/routes/list.route.ts`
- Action : utiliser `jsonApiSerializeManyUsersDocument` (déjà exporté) et le schéma associé.

#### 3.3 Imports `.ts` → `.js`
- Fichiers : `@libs/users-backend/src/index.ts:21`, `@libs/users-backend/src/init.ts:22`
- Action : remplacer les extensions.

#### 3.4 Casser le cycle init ↔ index
- Fichier : `@libs/users-backend/src/init.ts:22`
- Action : importer `createJwtAuthMiddleware` depuis `./middlewares/jwt-auth.middleware.js` directement.

#### 3.5 Router mort
- Fichier : `@libs/users-backend/src/router.ts`
- Action : supprimer.

#### 3.6 Dépendances obsolètes
- Fichier : `@libs/users-backend/package.json`
- Action : retirer `playwright`, `passport-*`, `mailgen`, `nodemailer`, `pdf-parse`, `handlebars`, `@fastify/static`, `@fastify/flash`, `@testcontainers/rabbitmq`. Garder uniquement ce qui est importé.
- Vérifier avec `rg "from \"<pkg>\"" src/` avant suppression.

#### 3.7 Schémas erreurs complets
- Fichier : `@libs/users-backend/src/routes/create.route.ts`
- Action : déclarer `400`, `401`, `409` (email unique) dans `response` du schéma.

#### 3.8 Public getter `em`
- Fichier : `@libs/users-backend/src/init.ts`
- Action : ajouter `public get em() { return this.context.em; }` sur les classes `AuthModule` et `UserModule`.
- Fichier : `@libs/users-backend/tests/utils/setup-module.ts:77` — remplacer `this.module["context"].em` par `this.module.em`.

#### 3.9 Module augmentation
- Fichier : `@libs/users-backend/src/types.ts`
- Action : déplacer le `declare module "fastify"` vers `@apps/backend/src/app/types.ts` (ou `@libs/backend-shared` si on veut un point unique). Justification : une lib partageable ne doit pas modifier le type global.

**Critères de succès Phase 3** :
- Tests d'intégration users (login, refresh, list, create, update, delete, get, logout, profile) **tous verts**.
- Plus aucun `as any` / `as Record<string, any>` dans `src/routes/`.

---

### Phase 4 — `@libs/time-tracking-backend` : conformité MED

#### 4.1 DELETE 204 sans body
- Fichier : `@libs/time-tracking-backend/src/routes/delete.route.ts`
- Action : retirer `makeSingleJsonApiTopDocument(literal(null))` du schéma response 204. Retourner `reply.code(204).send()` sans payload.

#### 4.2 Retirer casts inutiles
- Fichier : `@libs/time-tracking-backend/src/routes/*.route.ts`
- Action : laisser Zod inférer via `withTypeProvider<ZodTypeProvider>`. Si l'inférence ne marche pas, vérifier que `setValidatorCompiler` est bien appliqué dans `TestModule`.

#### 4.3 Public getter `em`
- Fichier : `@libs/time-tracking-backend/src/init.ts` + `tests/utils/setup-module.ts:58`
- Action : idem Phase 3.10.

**Critères de succès Phase 4** :
- Tests integration time-tracking **tous verts**.
- `curl DELETE /api/v1/time-entries/:id` → status 204 et `Content-Length: 0`.

---

### Phase 5 — `@libs/scrum-backend` : alignement architectural (à valider avec l'utilisateur)

> Cette phase contient des **choix architecturaux**. Demander validation avant d'appliquer.

#### 5.1 Inliner ou conserver `mounters.ts`
- **Recommandation** : garder `src/mounters.ts` (justifié par la taille du module) MAIS le documenter dans le `CLAUDE.md` de la lib comme déviation explicite vs le tuto.

#### 5.2 Routes multi-classes par fichier
- **Recommandation** : garder le regroupement par fonctionnalité (`comments.routes.ts`, `attachments.routes.ts`…) car la cohésion fonctionnelle prime. Documenter dans CLAUDE.md.

#### 5.3 Cast `(request as unknown as ...)` dashboard
- Fichier : `@libs/scrum-backend/src/dashboard/dashboard.route.ts:37`
- Action : retirer le cast — `request.user` est déjà typé via le `declare module "fastify"` de users-backend (qui sera consolidé en Phase 3.11).

#### 5.4 Cast `(request as never)` actions sprint
- Fichier : `@libs/scrum-backend/src/sprint/routes/actions.routes.ts:74,132`
- Action : corriger le typage du body Zod (probablement un mismatch `params` vs `body`).

#### 5.5 Renommer `helpers/` → `utils/`
- Fichier : `@libs/scrum-backend/src/helpers/{list-query,task-numbering}.ts` → `src/utils/`
- Mettre à jour tous les imports internes.

#### 5.6 Sous-dossier `routes/` pour dashboard et search
- Fichiers : `src/dashboard/dashboard.route.ts` → `src/dashboard/routes/dashboard.route.ts`. Idem pour `search`.

#### 5.7 Public getter `em`
- Fichier : `src/init.ts` + `tests/utils/setup-module.ts:78`
- Action : idem Phase 3.10.

**Critères de succès Phase 5** :
- Tests integration scrum (project, epic, task, sprint, user-story, dashboard, search, relationships) **tous verts**.
- Plus aucun cast `as unknown` / `as never` dans `src/`.

---

### Phase 6 — Création des tests UAT Playwright

> Approche UAT : chaque test décrit un **scénario utilisateur réel**, avec des assertions sur ce que l'utilisateur **voit et ressent**, pas sur des détails d'implémentation. Les sélecteurs sont sémantiques (`getByRole`, `getByLabel`, `getByText`). Chaque scénario a des **critères d'acceptation** explicites.

#### Pré-requis

- Corriger l'incohérence de credentials dans `login.spec.ts` : remplacer `deflorenne.amaury@triptyk.eu` par `claire.dubois@sprintforge.com` (compte du `E2ESeeder`).
- Vérifier que `E2ESeeder` crée un utilisateur avec le rôle `Developer` et les droits de créer projets/epics/US/tâches/temps.
- S'assurer que `playwright.config.ts` pointe vers `http://localhost:4200` et `baseURL` correct.

#### 6.1 Corriger `login.spec.ts`

- Remplacer les credentials hardcodés par ceux de `E2ESeeder`.
- Ajouter un test de **login échoué** (mauvais mot de passe → message d'erreur visible).
- Ajouter un test de **logout** (cliquer sur logout → redirection vers `/login`).

#### 6.2 Créer `tests/uat/project-lifecycle.spec.ts`

> Scénario : *En tant que chef de projet, je crée un projet de A à Z pour organiser mon équipe.*

**Critères d'acceptation** :
- [ ] Je peux créer un projet et le voir apparaître immédiatement dans la liste sans recharger la page.
- [ ] Le nom du projet est affiché tel que je l'ai saisi.
- [ ] Je peux naviguer vers le projet depuis la liste.

**Étapes du test** :
```
Étant donné que je suis connecté en tant que claire.dubois
Quand je clique sur le bouton "Add" et sélectionne "Projet"
Et je remplis le nom "SprintForge UAT Project" et valide
Alors le projet apparaît dans la liste des projets
Quand je clique sur le projet
Alors je suis sur la page du projet avec le titre "SprintForge UAT Project"
```

#### 6.3 Créer `tests/uat/backlog-setup.spec.ts`

> Scénario : *En tant que Product Owner, je structure mon backlog avec des epics et des user stories.*

**Critères d'acceptation** :
- [ ] Je peux créer une epic dans un projet et la voir dans la vue backlog.
- [ ] Je peux créer 3 user stories liées à cette epic et les voir regroupées sous l'epic.
- [ ] Le compteur d'US de l'epic reflète les 3 US créées.

**Étapes du test** :
```
Étant donné que je suis sur la page backlog du projet "SprintForge UAT Project"
Quand je crée une epic "Epic UAT - Authentification"
Alors l'epic apparaît dans la vue backlog
Quand je crée les user stories suivantes liées à cette epic :
  - "US-1 : En tant qu'utilisateur, je peux me connecter"
  - "US-2 : En tant qu'utilisateur, je peux me déconnecter"
  - "US-3 : En tant qu'utilisateur, je reçois un message d'erreur si mes credentials sont invalides"
Alors les 3 US apparaissent dans la vue backlog sous l'epic
Et le compteur de l'epic affiche "3 user stories"
```

#### 6.4 Créer `tests/uat/task-management.spec.ts`

> Scénario : *En tant que développeur, j'ajoute des tâches à mes user stories et les fais avancer dans le sprint.*

**Critères d'acceptation** :
- [ ] Je peux créer une tâche dans une US et la voir associée.
- [ ] Je peux ajouter des tâches à plusieurs US dans la même session.
- [ ] Les tâches affichent leur statut initial correct.

**Étapes du test** :
```
Étant donné que les 3 US de l'epic "Epic UAT - Authentification" existent
Quand j'ajoute les tâches suivantes :
  - Dans US-1 : "Tâche : Implémenter le formulaire de login", "Tâche : Écrire le test d'intégration login"
  - Dans US-2 : "Tâche : Implémenter le bouton logout"
  - Dans US-3 : "Tâche : Afficher le message d'erreur côté UI"
Alors chaque US affiche le bon nombre de tâches
Et chaque tâche est au statut "To Do"
```

#### 6.5 Créer `tests/uat/time-tracking.spec.ts`

> Scénario : *En tant que développeur, je log mon temps passé sur des tâches pour que le chef de projet voie l'avancement réel.*

**Critères d'acceptation** :
- [ ] Je peux ajouter une time entry sur une tâche avec une durée en heures.
- [ ] Je peux ajouter une time entry sur une US.
- [ ] Le total de temps affiché dans le dashboard ou la vue time-tracking correspond à la somme de mes entries.
- [ ] Je peux supprimer une time entry et elle disparaît de la liste.

**Étapes du test** :
```
Étant donné que les tâches UAT existent
Quand j'ajoute une time entry de 2h sur "Tâche : Implémenter le formulaire de login"
Et j'ajoute une time entry de 1.5h sur "Tâche : Implémenter le bouton logout"
Alors le total affiché pour le projet est 3.5h
Quand je supprime la time entry de 1.5h
Alors le total affiché est 2h
Et la liste des time entries ne contient plus l'entrée supprimée
```

#### 6.6 Mettre à jour `E2ESeeder`

- S'assurer que le seeder crée uniquement l'utilisateur (`claire.dubois`) — les données projet/epic/US/tâches sont créées **par les tests eux-mêmes** (pas pré-seedées, pour rester fidèle au parcours UAT).
- Ajouter un second utilisateur `david.martin@sprintforge.com` si des tests multi-utilisateurs sont nécessaires plus tard.

#### 6.7 Conventions UAT à respecter dans les tests

- **Pas de sélecteurs CSS fragiles** : uniquement `getByRole`, `getByLabel`, `getByText`, `getByTestId` avec `data-testid`.
- **Chaque `test()` est indépendant** : utiliser `test.beforeEach` pour naviguer et se connecter si besoin (ou `storageState` Playwright pour réutiliser la session).
- **Assertions sur l'expérience** : vérifier ce que l'utilisateur voit (`toBeVisible`, `toHaveText`, `toHaveURL`) — pas les appels réseau.
- **Timeout explicite** : `{ timeout: 5000 }` sur les assertions qui attendent une réponse réseau.
- **Screenshots sur échec** : activer `screenshot: "only-on-failure"` dans `playwright.config.ts`.

---

### Phase 7 — Validation finale

- 7.1 `pnpm install` clean.
- 7.2 `pnpm turbo lint` → 0 erreur, 0 warning (cf. `feedback-lint-before-push`).
- 7.3 `pnpm turbo build`.
- 7.4 `pnpm test` sur chaque lib backend + `@apps/backend`.
- 7.5 `pnpm run api:types` dans `@apps/backend` → vérifier que `openapi.json` et `api-types.ts` se régénèrent sans erreur.
- 7.6 Démarrer `pnpm dev`, puis `cd @apps/e2e && pnpm setup && pnpm test` → 0 test en échec.

---

### Phase 8 — Documentation

- 7.1 Mettre à jour `@apps/backend/CLAUDE.md` : error handler global JSON:API, workflow seeder truncate+insert.
- 7.2 Créer `@libs/scrum-backend/CLAUDE.md` : documenter `mounters.ts` et le regroupement routes `*.routes.ts` comme déviations explicitées du tuto.

---

## 5. Testing strategy

**Tests d'intégration obligatoires** (critère bloquant — ne peut pas être substitué par smoke test) :

1. `@libs/users-backend/tests/integration/login.route.test.ts` doit envoyer un body JSON:API et asserter la réponse JSON:API.
2. `@libs/users-backend/tests/integration/refresh.route.test.ts` idem.
3. `@libs/users-backend/tests/integration/list.route.test.ts` — ajouter assertion sur `meta.total` et format `data: [...]`.
4. `@libs/time-tracking-backend/tests/integration/time-entry.route.test.ts` — DELETE doit retourner 204 sans body (asserter `response.body === ""`).
5. `@apps/backend/src/app/status.route.test.ts` ou nouveau `app.test.ts` :
   - Test : route `/api/v1/inexistante` → 404 JSON:API (`errors: [{ status: "404", title: "Not Found" }]`).
   - Test : route avec body invalide → 400 JSON:API.

**Lint** : `pnpm turbo lint` doit passer sans warning (cf. mémoire `feedback-lint-before-push`).

**Sanity check** : avant d'annoncer "tests verts", forcer un échec volontaire (modifier une assertion) pour vérifier que la suite est bien exécutée (cf. mémoire `feedback-tests-sanity`).

---

## 6. Success criteria (vérifiables, bloquants pour passage en `done/`)

1. ✅ `@libs/todos-backend` n'existe plus (ou est entièrement recréé selon le tuto).
2. ✅ `@apps/backend/src/app/app.ts` utilise `handleJsonApiErrors` dans `setErrorHandler` ET `setNotFoundHandler`.
3. ✅ Préfixe `/api/v1` (avec slash) dans `@apps/backend/src/app/app.router.ts`.
4. ✅ Hook `onRoute` orphelin supprimé OU repositionné pour avoir effet.
5. ✅ `configuration.ts` ne contient plus la chaîne `"Registr"` ; `NODE_ENV` ajouté.
6. ✅ `@libs/users-backend/src/routes/list.route.ts` valide le querystring via Zod (plus de `as any`).
9. ✅ Imports `.ts` → `.js` dans tous les fichiers de `@libs/users-backend/src/`.
10. ✅ `@libs/users-backend/src/router.ts` supprimé.
11. ✅ `@libs/time-tracking-backend/src/routes/delete.route.ts` retourne 204 sans body.
12. ✅ Plus aucun cast `as any | as never | as unknown as` dans `@libs/*/src/routes/`.
13. ✅ Chaque `Module` expose `public get em()` ; tous les `TestModule` utilisent ce getter (plus de `this.module["context"].em`).
14. ✅ `pnpm turbo lint` (depuis racine) → 0 erreur, 0 warning.
15. ✅ `pnpm test` dans chaque lib backend + `@apps/backend` → tous tests verts (avec sanity check `feedback-tests-sanity`).
16. ✅ `pnpm run api:types` régénère `openapi.json` sans erreur.
17. ✅ `tests/uat/project-lifecycle.spec.ts` créé et vert (création projet visible sans reload).
18. ✅ `tests/uat/backlog-setup.spec.ts` créé et vert (epic + 3 US liées, compteur correct).
19. ✅ `tests/uat/task-management.spec.ts` créé et vert (tâches dans chaque US, statut initial "To Do").
20. ✅ `tests/uat/time-tracking.spec.ts` créé et vert (add + delete time entry, total mis à jour).
21. ✅ `login.spec.ts` utilise `claire.dubois@sprintforge.com` (cohérent avec `E2ESeeder`).
22. ✅ `cd @apps/e2e && pnpm setup && pnpm test` → 0 test en échec.

---

## 7. Estimation & ordre d'exécution

| Phase | Durée estimée | Risque |
|-------|---------------|--------|
| 1. Cleanup todos-backend | 15 min | Bas |
| 2. @apps/backend | 1-2 h | Moyen |
| 3. users-backend | 1-2 h | Bas |
| 4. time-tracking-backend | 30 min | Bas |
| 5. scrum-backend | 1 h | Moyen |
| 6. Tests UAT Playwright | 2-3 h | Moyen (dépend de l'UI existante) |
| 7. Validation finale | 30 min | - |
| 8. Doc | 15 min | Bas |

**Ordre recommandé** : 1 → 2 → 4 → 3 → 5 → 6 → 7 → 8.

---

## 8. Décisions actées (récapitulatif)

1. ✅ Supprimer `@libs/todos-backend`.
2. ✅ Login/refresh laissés tels quels (pas de migration JSON:API).
3. ✅ Conserver `mounters.ts` + routes groupées dans scrum-backend, documenter.
4. ✅ Seeders : truncate + insert.
