# Plan macro — Migration du boilerplate vers SprintForge

> Document de référence pour orchestrer le passage du boilerplate actuel (`users-backend` + `todos-backend` + `users-front` + `todos-front`) vers l'application complète **SprintForge** (gestion de projets Scrum), telle que prototypée dans le Figma Make `VISlgCFh1GHyahMpAfDoOT`.
>
> Chaque phase ci-dessous fera l'objet d'un plan d'exécution détaillé séparé (via `/TPK-plan`) avant d'être implémentée (via `/TPK-build`).

---

## 1. Contexte & objectifs

### 1.1 Périmètre observé (25 captures dans `figma-screenshots/`)
- 10 routes : `/login`, `/`, `/projects`, `/backlog`, `/kanban`, `/user-story-map`, `/sprints`, `/time-tracking`, `/users`, `/settings`
- 13 modales : AddItem (sélecteur), AddTask, AddSprint, AddUserStory, AddEpic, AddProject, AddTimeEntry, ProjectSelector, ProjectDetail, TaskDetail, SprintHistory, CreateSprint, EditSprint
- Thème dark/light commutable (variables CSS Tailwind), interface 100 % FR

### 1.2 Données métier inférées (cf. `src/app/types.ts` du Make)
| Entité      | Attributs clés                                                                                       |
|-------------|------------------------------------------------------------------------------------------------------|
| User        | id, firstName, lastName, email, role, avatar, color                                                  |
| Project     | id, name, description, status, avatar, responsibleId, assignedUsers[], createdBy, githubUrl          |
| Epic        | id, title, description, projectId, status                                                            |
| UserStory   | id, title, description, epicId, projectId, status, points, priority                                  |
| Task        | id, number, title, description, status, type, nature, points, estimatedHours, assignedTo[], userStoryId, epicId, projectId, sprintId, dueDate |
| Sprint      | id, name, goal, projectId, startDate, endDate, status, points                                        |
| TimeEntry   | id, taskId, userId, projectId, hours, date, description                                              |
| Comment     | id, taskId, userId, content, type (comment/status-change/assignment/github-push/other)               |
| Attachment  | id, name, url, type, uploadedBy                                                                      |
| HistoryEntry| id, ownerType (project/task/...), type, description, userId, metadata                                |

### 1.3 Enums
- **TaskStatus** : `todo`, `in-progress`, `testing`, `uat`, `done`
- **TaskType** : `Frontend`, `Backend`, `Database`, `UX`, `Analyse`, `DevOps`, `API`, `Security`, `Testing`
- **TaskNature** : `Bug`, `Feature`, `Maintenance`, `Hotfix`, `Refacto`, `Techdebt`, `Spike`, `Review`, `Deployment`, `Infra`
- **TaskPriority** : `Basse`, `Moyenne`, `Haute`, `Critique`
- **StoryPoints** (suite Fibo) : `1, 2, 3, 5, 8, 13, 21`
- **ProjectStatus** : `planned`, `active`, `paused`, `completed`, `cancelled`, `archived`
- **SprintStatus** : `planned`, `active`, `completed`

### 1.4 Objectifs du projet
1. Conserver l'architecture monorepo (`pnpm` + Turborepo + Fastify 5 + Ember 6 + MikroORM 7 + Zod 4 + JSON:API).
2. Remplacer le domaine `todos` par les domaines Scrum (projects, backlog, sprints, time-tracking).
3. Étendre `users` (ajout `role`, `color`, `avatar`).
4. Reproduire fidèlement l'UX du prototype Figma (dark/light, layout, modales, drag-drop Kanban).
5. Garder le boilerplate « propre » : libs cohésives, types partagés, seeds réalistes.

### 1.5 Décisions structurelles à acter avant Phase 1
| Question                                                                 | Option recommandée                                |
|--------------------------------------------------------------------------|---------------------------------------------------|
| Que faire du domaine `todos` (back & front) ?                            | Supprimer (sera supplanté par `tasks`)            |
| Granularité des libs Scrum                                               | Une lib par agrégat racine (cf. §3.1)             |
| `Epic` / `UserStory` / `Task` : 1 lib ou 3 ?                             | 1 lib `backlog-backend` (cohésion forte, refs croisées) |
| `Comment` / `Attachment` / `HistoryEntry`                                | Tables internes à la lib propriétaire (pas de lib dédiée) |
| Drag-drop Kanban                                                         | `ember-sortable` ou natif HTML5 — à arbitrer en Phase 7 |
| Stockage avatars                                                         | Initiales colorées générées (cf. ProjectCard, UserCard) — pas de upload binaire au MVP |

---

## 2. Vue d'ensemble des phases

```
P0 ── Fondations & décisions
 │
 ├──► P1 ── Modèles & migrations backend
 │       │
 │       └──► P2 ── APIs JSON:API par domaine
 │                │
 ├──► P3 ── Shell frontend (Layout, thème, auth)
 │       │
 │       ├──► P4 ── Projects
 │       ├──► P5 ── Backlog + User Story Map
 │       ├──► P6 ── Tasks (TaskCard, TaskDetail, AddTask)
 │       ├──► P7 ── Kanban (drag-drop)
 │       ├──► P8 ── Sprints
 │       ├──► P9 ── Time Tracking
 │       ├──► P10 ─ Dashboard (KPIs + charts)
 │       ├──► P11 ─ Users (gestion équipe)
 │       └──► P12 ─ Settings (profil, notifications, sécurité)
 │
 └──► P13 ── Polish, search globale, E2E Playwright
```

Phases backend P1–P2 et frontend shell P3 sont **bloquantes** pour les domaines P4–P12 (qui sont parallélisables entre eux une fois P3 terminée).

---

## 3. Détail des phases

### Phase 0 — Fondations & décisions structurantes

**Livrables**
- ADR (Architecture Decision Record) bref dans `specs/done/00-adr-sprintforge.md` consignant les décisions du §1.5.
- Suppression de `@libs/todos-backend`, `@libs/todos-front`, et de leur enregistrement dans `@apps/backend/src/app.bootstrap.ts` + `@apps/front`.
- Mise à jour racine `CLAUDE.md` et `@libs/CLAUDE.md` : nouveau périmètre, nouvelle table des libs.
- Import des design tokens CSS issus du Make (`src/styles/theme.css`) dans `@libs/shared-front/styles/` (variables HSL, palette teal, dark+light).
- Ajout des variables d'environnement nécessaires (rien de nouveau attendu).

**Critères de succès**
- `pnpm dev` démarre back+front sans erreur après suppression de `todos-*`.
- Les variables CSS du Figma sont chargées globalement côté Ember.

**Notes / pièges**
- Avant de supprimer `todos-*`, vérifier qu'aucun seed/test ne le référence.
- L'ADR est court (1 page) : il fige les choix pour éviter les revirements en P3+.

---

### Phase 1 — Modèles de données & migrations backend

**Périmètre**
- Étendre `@libs/users-backend` : ajout colonnes `role` (enum), `color` (string), `avatar` (string nullable). Adapter seeder.
- Créer `@libs/projects-backend` : entité `Project` + table de jointure `project_members` (rôle facultatif `owner`/`member`).
- Créer `@libs/backlog-backend` : entités `Epic`, `UserStory`, `Task` + enums + comments/attachments/history liés à `Task`.
- Créer `@libs/sprints-backend` : entité `Sprint` + jointure avec `Task` (sprintId nullable côté Task).
- Créer `@libs/time-tracking-backend` : entité `TimeEntry`.

**Tâches techniques**
- Une migration MikroORM par lib, idempotentes, exécutables via `pnpm schema:fresh`.
- Seeder dev complet : 3 projets (`E-Commerce Platform`, `Mobile Banking App`, `CRM System`), 7 utilisateurs (Alice Martin/PO, Bob Durant/SM, Claire Dubois/Dev, David Leroy/Dev, Emma Bernard/Designer UX, François Petit/QA, Gaëlle Moreau/DevOps), 5 user stories, ~17 tasks, 6 sprints (4 historiques + 1 en cours + 1 planifié), entries de temps.
- Index sur `(projectId, status)`, `(sprintId, status)`, `(taskId, date)` pour Time Tracking.

**Critères de succès**
- `pnpm schema:fresh && pnpm seed` produit la donnée du Figma (vérification visuelle : 3 projets, Sprint 88 actif, 6 tâches Claire).
- Tests vitest unitaires des entités (validations, relations) verts.

**Risques**
- Risque de dette si on sépare trop tôt en libs : valider l'option « 1 lib backlog » avant d'écrire les routes.
- `Task.number` : auto-incrément scoped par projet — implémenter via séquence dédiée par projet ou via colonne calculée.

---

### Phase 2 — APIs JSON:API par domaine

**Périmètre**
- Pour chaque lib créée en P1 : routes Fastify `/api/v1/<domain>` avec Zod schemas (request + response), conventions JSON:API héritées de `@libs/backend-shared`.
- CRUD complet + endpoints relationnels (`/projects/:id/tasks`, `/sprints/:id/tasks`, `/user-stories/:id/tasks`, etc.).
- Endpoints transversaux :
  - `GET /api/v1/search?q=...` (multi-domain, simple ILIKE pour MVP)
  - `GET /api/v1/dashboard?projectId=...` (agrégations : tasks done/total, heures, points, mes tâches)
  - `POST /api/v1/sprints/:id/start` et `/stop`
- Auth : middleware `users-backend` déjà en place, à appliquer.

**Critères de succès**
- Swagger UI liste tous les endpoints groupés par domaine.
- Tests vitest happy-path par endpoint (≥ 1 test par route).
- Réponses validées par `fastify-type-provider-zod` (pas de `FST_ERR_RESPONSE_SERIALIZATION`).

**Risques**
- Pagination : choisir une convention (`page[number]`/`page[size]` style JSON:API) et l'appliquer partout dès P2.
- Filtres : adopter `filter[status]=active`, `filter[projectId]=...` cohérents avec JSON:API.

---

### Phase 3 — Shell frontend (Layout, thème, auth)

**Périmètre**
- Layout dans `@libs/shared-front` : sidebar SprintForge (logo, 2 groupes nav, user-card sticky bottom) + header (project selector, search, "Enregistrer du temps", "Ajouter", toggle thème).
- Service `theme` (dark/light, persistance localStorage, attribut `data-theme` sur `<html>`).
- Service `current-project` (sélection en cours, persistée).
- Service `current-user` (déjà partiellement présent dans `users-front`).
- Route `/login` portée fidèlement (centrée, fond `--background`, carte sombre).
- Garde d'authentification globale (redirection vers `/login` si non auth).
- Squelette des 9 routes protégées (placeholders « En construction »).

**Critères de succès**
- Login email/password fonctionnel contre `users-backend`.
- Bascule dark/light instantanée sur l'ensemble du layout.
- Sélecteur de projet filtrant les requêtes suivantes via service partagé.

---

### Phase 4 — Projects (front)

**Périmètre**
- `@libs/projects-front` (nouvel addon).
- Route `/projects` : grille de cartes (avatar initiales + couleur, status badge, barres de progression « User Stories x/y » et « Sprint en cours x/y », membres assignés, responsable).
- Modale `ProjectDetail` (clic carte) : tabs Aperçu / Tâches / Membres / Historique.
- Modale `AddProject` (depuis sélecteur "Ajouter" du header).

**Critères de succès**
- Données réelles depuis `projects-backend`.
- Sélecteur de projet du header reflète la liste live.

---

### Phase 5 — Backlog + User Story Map

**Périmètre**
- `@libs/backlog-front` (nouvel addon).
- Route `/backlog` : liste des tâches sans `sprintId`, avec badges Type/Nature, lien US, avatar assigné, points.
- Route `/user-story-map` : vue hiérarchique repliable Épique → User Story → Task ; boutons « Nouvelle épique / user story / tâche ».
- Modales `AddEpic`, `AddUserStory`.

**Critères de succès**
- Drag-drop tâche du backlog vers un sprint (en P8 ou ici, à arbitrer dans le plan détaillé).

---

### Phase 6 — Tasks (composants partagés)

**Périmètre**
- Composants `TaskCard` (variantes : dashboard, backlog, kanban) dans `@libs/backlog-front`.
- Modale `AddTask` : tous les champs du Figma (projet, titre, description, type, nature, priorité, points, heures, US, assignés multi-checkbox).
- Modale `TaskDetail` : onglets Détails / Commentaires / Pièces jointes / Historique / Temps. Édition inline du status.
- Système de couleurs/badges pour Type + Nature (cf. screenshots backlog : `Bug` rouge, `Feature` teal, `Frontend` bleu, `Backend` cyan, etc. — extraire la palette via lecture du Make).

**Critères de succès**
- `AddTask` réutilisable depuis Backlog, Kanban, USM, et `Ajouter` global.
- `TaskDetail` ouvre depuis Dashboard, Backlog, Kanban et le Sprint en cours.

---

### Phase 7 — Kanban

**Périmètre**
- `@libs/kanban-front` (nouvel addon, peut être fusionné dans `backlog-front` si scope reste petit).
- Route `/kanban` : 5 colonnes (`À faire`, `En cours`, `À tester`, `UAT`, `Terminé`) avec compteur, header sprint actif (objectif, dates, points, progression), navigation sprints `<` `>`.
- Filtres toggle : `Mes tâches` / `Toutes les tâches`.
- Drag-drop entre colonnes → PATCH status.

**Critères de succès**
- Drag-drop sans saute visuelle (optimistic update + rollback en cas d'erreur).
- Navigation sprint conserve l'état des filtres.

---

### Phase 8 — Sprints

**Périmètre**
- `@libs/sprints-front` (nouvel addon).
- Route `/sprints` : carrousel de 3 cartes (Sprint en cours / suivants / planifiés) + bouton `Historique` + `Planifier un sprint`.
- Carte sprint en cours : objectif, dates, vélocité, progression, bouton `Stopper` (rouge), liste des tâches.
- Carte sprint planifié : bouton `Planifier` (= démarrer le sprint).
- Modales `CreateSprintModal`, `EditSprintModal`, `SprintHistoryModal` (timeline des sprints clos avec vélocité atteinte vs prévue).

**Critères de succès**
- Workflow complet : créer → planifier (start) → stopper → consulter dans l'historique.
- Vélocité calculée serveur depuis tasks `done`.

---

### Phase 9 — Time Tracking

**Périmètre**
- `@libs/time-tracking-front` (nouvel addon).
- Modale `AddTimeEntryModal` (déclenchable depuis le bouton header global "Enregistrer du temps" et depuis `TaskDetail`).
- Route `/time-tracking` : filtres (projet, utilisateur, date début/fin) + tableau (date, utilisateur, tâche `#1005`, projet, heures, description) + bouton Exporter (CSV).
- Total agrégé en haut (« 13 entries • 89.5 heures au total »).

**Critères de succès**
- Filtres combinables.
- Export CSV téléchargé côté client.

---

### Phase 10 — Dashboard

**Périmètre**
- `@libs/dashboard-front` (nouvel addon) ou route dans `shared-front` selon arbitrage.
- 3 KPI cards en haut : `Tâches terminées` (1/8), `Heures travaillées` (17), `Points d'efforts` (26) — scope = sprint courant + utilisateur courant.
- Section `Mes tâches (n)` : grille de TaskCard (variante dashboard, cf. P6).
- (Optionnel V2) Charts : burndown sprint, vélocité historique.

**Critères de succès**
- KPI réagit au sélecteur de projet et au sprint actif.

---

### Phase 11 — Users (gestion équipe)

**Périmètre**
- Étendre `@libs/users-front`.
- Route `/users` : grille de UserCard (avatar/initiales, nom, rôle, email, nombre de projets, badges projets assignés).
- Action « Inviter » (V2 — out of MVP).

**Critères de succès**
- Cartes reflètent les `project_members` réels.

---

### Phase 12 — Settings

**Périmètre**
- Route `/settings` dans `@libs/users-front` (ou nouvel addon `settings-front`).
- Section `Profil` : prénom, nom, email, rôle, bouton Sauvegarder.
- Section `Notifications` : 3 toggles (email, tâches assignées, résumé hebdo) — persistance via endpoint `users-backend`.
- Section `Sécurité` : changement mot de passe (ancien / nouveau / confirmation).

**Critères de succès**
- Validation Zod côté back, retours d'erreurs UX-friendly.

---

### Phase 13 — Polish, search & E2E

**Périmètre**
- Search bar du header (`@libs/shared-front`) → endpoint `/api/v1/search` (P2) + dropdown résultats groupés (Projects / Tasks / US / Sprints).
- Modale `AddItem` unifiée (le sélecteur "Que voulez-vous ajouter ?") branchée sur les vraies modales des P4–P9.
- i18n : tout le chrome en FR cohérent.
- Tests Playwright dans `@apps/e2e` :
  - Login → Dashboard
  - Création projet → ajout d'une US → tâche → planification sprint → drag-drop Kanban → time entry
  - Toggle thème persisté entre navigations
- A11y : focus management dans les modales, contrastes WCAG AA (le thème dark le respecte déjà).

**Critères de succès**
- Suite E2E verte en CI.
- Lighthouse a11y ≥ 90.

---

## 4. Stratégie de tests

| Niveau          | Outil                   | Couverture cible                                              |
|-----------------|-------------------------|---------------------------------------------------------------|
| Unitaire back   | vitest (`pnpm test`)    | entités, sérializeurs, agrégations dashboard                  |
| Intégration back| vitest + fastify.inject | routes JSON:API, auth, erreurs                                |
| Unitaire front  | ember-qunit             | composants TaskCard, services theme/current-project           |
| E2E             | Playwright (`@apps/e2e`)| flux critiques (cf. P13)                                      |
| Visuel          | Playwright screenshot   | comparer rendu vs captures `figma-screenshots/` clés          |

---

## 5. Critères de succès globaux

1. Chaque route du Figma est implémentée et atteignable depuis le menu.
2. Les 13 modales sont fonctionnelles avec persistance backend.
3. Le seeder reproduit fidèlement le scénario du prototype (Sprint 88 en cours, 6 tâches Claire).
4. Bascule dark/light couvre toutes les vues sans régression.
5. `pnpm lint && pnpm test && pnpm -F @apps/e2e test` verts en CI.
6. `git-conventional-commits` respecté à chaque phase.

---

## 6. Découpage en plans détaillés (étape suivante)

À l'issue de ce plan macro, créer **un plan `/TPK-plan` par phase** (P0 → P13), nommés par exemple :
- `specs/todo/p0-foundations.md`
- `specs/todo/p1-backend-models.md`
- `specs/todo/p2-backend-apis.md`
- `specs/todo/p3-frontend-shell.md`
- `specs/todo/p4-projects-front.md`
- ... etc.

Chaque plan détaillé contient : checklist d'implémentation, fichiers à créer/modifier (chemins absolus), snippets de code, ordre des commits, tests à ajouter, et étapes de validation manuelle.

---

## 7. Annexes

### 7.1 Inventaire actuel à conserver / supprimer
| Existant                          | Action           |
|-----------------------------------|------------------|
| `@apps/backend`                   | conserver        |
| `@apps/front`                     | conserver        |
| `@apps/e2e`                       | conserver + étendre |
| `@libs/backend-shared`            | conserver        |
| `@libs/repo-utils`                | conserver        |
| `@libs/shared-front`              | conserver + étendre (layout, thème) |
| `@libs/users-backend`             | conserver + étendre (role, color, avatar) |
| `@libs/users-front`               | conserver + étendre (route users, settings) |
| `@libs/todos-backend`             | **supprimer**    |
| `@libs/todos-front`               | **supprimer**    |

### 7.2 Nouvelles libs à créer
| Lib                              | Phase de création |
|----------------------------------|-------------------|
| `@libs/projects-backend`         | P1                |
| `@libs/backlog-backend`          | P1                |
| `@libs/sprints-backend`          | P1                |
| `@libs/time-tracking-backend`    | P1                |
| `@libs/projects-front`           | P4                |
| `@libs/backlog-front`            | P5                |
| `@libs/kanban-front`             | P7 (ou fusion P5) |
| `@libs/sprints-front`            | P8                |
| `@libs/time-tracking-front`      | P9                |
| `@libs/dashboard-front`          | P10               |

### 7.3 Références captures
- Routes principales : `figma-screenshots/01-dashboard.png` … `10-login.png`
- Modales : `figma-screenshots/11-modal-add-item.png` … `23-modal-edit-sprint.png`
- Thème clair : `figma-screenshots/24-dashboard-light-mode.png`, `25-kanban-light-mode.png`

### 7.4 Données de seed à reproduire
- **Utilisateurs** : Alice Martin (PO), Bob Durant (SM), Claire Dubois (Dev — utilisateur courant du prototype), David Leroy (Dev), Emma Bernard (Designer UX), François Petit (QA), Gaëlle Moreau (DevOps)
- **Projets** : E-Commerce Platform (actif, 8 tâches sprint en cours), Mobile Banking App (actif), CRM System (planifié)
- **Sprint actif** : Sprint 88, objectif « Finaliser le tunnel d'achat et intégrer le paiement Stripe », 20/01/2025–02/02/2025, 26 points, 1/8 tâches done
