# Plan P1 — Modèles & migrations backend SprintForge

> Phase de modélisation backend de la migration vers SprintForge (cf. `specs/todo/sprintforge-migration-macro-plan.md`).
>
> But : créer toutes les entités du domaine Scrum (Project, Epic, UserStory, Task, Sprint, TimeEntry + tables internes), exposer leurs entities aggregées pour MikroORM, et fournir un seeder dev reproduisant le scénario du prototype Figma (Sprint 88 actif, 7 utilisateurs, 3 projets).
>
> **Pas d'APIs ici** — les routes JSON:API arrivent en P2. P1 = entités + schémas + seeder uniquement.

---

## 1. Problème & objectifs

### 1.1 État après P0
- Domaine `users` opérationnel (`@libs/users-backend`) avec `UserEntity { id, email, firstName, lastName, password }`.
- 0 entité métier Scrum.
- Seeder dev minimal (un seul user pour E2E).
- `databaseConfig().entities = [UserEntity, RefreshTokenEntity]`.

### 1.2 Objectifs P1
1. **Étendre `UserEntity`** : ajouter `role` (enum), `color` (hex), `avatar` (string nullable).
2. **Créer 4 nouvelles libs** : `projects-backend`, `backlog-backend`, `sprints-backend`, `time-tracking-backend`.
3. **Modéliser toutes les entités** dérivées de `src/app/types.ts` du Make file (cf. plan macro §1.2) avec relations MikroORM 7 correctes.
4. **Tables auxiliaires** dans `backlog-backend` : `Comment`, `Attachment`, `HistoryEntry` attachées à `Task` (ou polymorphes simplifiées).
5. **Enregistrer toutes les entités** dans `databaseConfig` + `tests/global-setup.ts`.
6. **Seeder dev réaliste** : 7 users, 3 projets, 2 épiques, 5 user stories, ~17 tasks, 6 sprints (4 historiques + Sprint 88 actif + 1 planifié), entries de temps Claire Dubois sur Sprint 88.
7. **Tests unitaires** : au moins 1 test par entité (factory + persist round-trip).

### 1.3 Non-objectifs (P1 ne fait PAS)
- Pas de route HTTP / endpoint JSON:API (réservé P2).
- Pas de modal frontend (réservé P3+).
- Pas de logique métier complexe (calcul vélocité, agrégations dashboard) — réservé P2.
- Pas d'upload de pièce jointe (table seulement, stockage S3 hors scope).

---

## 2. Approche technique

### 2.1 Conventions héritées de `users-backend` (à respecter strictement)
- **Entités** : `defineEntity` de `@mikro-orm/core` (pas de classes), nom PascalCase, `tableName` snake_case explicite, `id: p.string().primary()` (UUID v4 généré côté code via `randomUUID()`).
- **Imports internes** : `#src/*` (résolu via `package.json#imports`).
- **Build** : `tsdown` (config copiée depuis `users-backend/tsdown.config.mts`).
- **Lint** : `oxlint --type-aware --type-check` + `oxfmt`.
- **Tests** : `vitest`, dossier `tests/{unit,integration}/`.
- **Catalog** : toutes les dépendances via `"catalog:"`.

### 2.2 Architecture d'une nouvelle lib `*-backend` (template)
```
@libs/<domain>-backend/
├── src/
│   ├── entities/
│   │   └── <name>.entity.ts        defineEntity + InferEntity export
│   ├── serializers/                (préparé pour P2, vide en P1)
│   ├── types.ts                    Enums + type exports
│   ├── context.ts                  <Domain>LibraryContext interface
│   ├── init.ts                     <Domain>Module class (vide en P1 — placeholder)
│   └── index.ts                    re-exports + entities array
├── tests/
│   ├── global-setup.ts             testcontainer postgres + schema refresh
│   ├── unit/                       tests entités + serializers (P2)
│   └── integration/                tests routes (P2)
├── package.json
├── tsconfig.json
├── tsdown.config.mts
├── vitest.config.mts
├── .oxlintrc.json
├── .oxfmtrc.json
└── CLAUDE.md
```

> Astuce : copier la structure de `@libs/users-backend` puis adapter — c'est ce que fait probablement le skill `new-library` du projet (`.claude/skills/new-library/`). À vérifier en exécution.

### 2.3 Décisions de modélisation clés
| Décision                                                        | Choix                                                                                                     |
|-----------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| Type des PK                                                     | `p.string().primary()` (UUID v4) cohérent avec UserEntity                                                 |
| Relations many-to-many `Project.assignedUsers` / `Task.assignedTo` | Table de jointure explicite (entité dédiée) — `ProjectMember`, `TaskAssignee` — permet d'ajouter du metadata plus tard (rôle, date assignation) |
| `Task.number` (compteur scoped projet)                          | Séquence calculée à la création via `max(number) where projectId = X` + verrou sérialisable. À implémenter en P2 (helper repo). En P1, juste la colonne `number: integer().unique('project_id,number')` |
| Enums (`TaskStatus`, `TaskType`, etc.)                          | Colonne `string` + Zod enum côté API. Pas d'enum natif PostgreSQL (plus simple à migrer)                  |
| `Comment.type` polymorphe                                       | Colonne `string` + enum Zod (`comment` / `status-change` / `assignment` / `github-push` / `other`)        |
| `Attachment` / `HistoryEntry`                                   | Liés via `taskId` (nullable) + futur `projectId` (P2 si besoin). MVP : task-scoped uniquement              |
| Dates                                                           | `p.datetime()` partout (UTC). `createdAt` / `updatedAt` auto-géré par MikroORM via `onCreate`/`onUpdate` (sinon explicite) |
| `Sprint.points` vélocité                                        | Colonne calculée serveur — en P1 c'est une colonne `integer` stockée, recalculée à la planification (P2). MVP : stocker la cible |

### 2.4 Granularité des sous-phases (ordre d'implémentation)

```
P1.0 — Pré-requis : factoriser le helper UUID dans backend-shared (1 commit, ~5 min)
P1.1 — Étendre users-backend (role, color, avatar) + adapter seeder
P1.2 — Créer projects-backend (Project + ProjectMember)
P1.3 — Créer backlog-backend (Epic, UserStory, Task + Comment/Attachment/HistoryEntry)
P1.4 — Créer sprints-backend (Sprint)
P1.5 — Créer time-tracking-backend (TimeEntry)
P1.6 — Enregistrer toutes les entités dans @apps/backend
P1.7 — Seeder dev réaliste (scénario Figma)
P1.8 — schema:fresh + smoke test (psql vérifie les tables)
```

Chaque sous-phase = 1+ commits cohérents. Validation incrémentale possible.

### 2.5 Risques & parades
| Risque                                                                                | Parade                                                                                                |
|---------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| Migration cassée par ordre de création des tables (FK vers table non encore créée)    | Laisser MikroORM auto-générer le schéma via `schema:fresh` — il résout les dépendances automatiquement |
| Cycle d'import entre `projects-backend` ↔ `backlog-backend` ↔ `sprints-backend`       | Pas d'import croisé des entities entre libs ; on stocke des `*Id` strings (FK) et P2 fera les `populate` via repo. Les `entities` exports restent indépendants. |
| `Task.number` séquentiel sans race condition                                          | À implémenter en P2 avec `em.transactional` + `MAX(number) + 1`. En P1, on accepte un défaut numérique unique par insertion (seeder contrôle l'ordre). |
| Tests intégration nécessitent Docker (testcontainers)                                 | Documenter dans CLAUDE.md : tests intégration = besoin Docker démarré. Garder unit tests purs runnables sans Docker. |
| `defineEntity` n'a pas de support natif pour `@OneToMany`/`@ManyToOne` virtuelles     | Utiliser `p.string().index()` pour les FK simples + helper repo qui fait le populate en P2 (pas d'auto-load) |
| `@libs/repo-utils/configs/addon/*` n'a pas de template backend                        | Utiliser le skill `new-library` (déjà documenté) OU copier `users-backend` structure                  |

### 2.6 Stratégie de commits par sous-phase
Chaque sous-phase produit 1 commit principal (+ éventuellement 1 commit `chore` pour le tsdown/test setup). Format :
- `feat(users-backend): ajouter role/color/avatar à UserEntity`
- `feat(projects-backend): scaffolder la lib avec Project + ProjectMember`
- `feat(backlog-backend): scaffolder la lib avec Epic, UserStory, Task`
- `feat(backlog-backend): ajouter Comment, Attachment, HistoryEntry`
- `feat(sprints-backend): scaffolder la lib avec Sprint`
- `feat(time-tracking-backend): scaffolder la lib avec TimeEntry`
- `chore(backend): enregistrer toutes les entités SprintForge dans databaseConfig`
- `feat(seeder): scénario Figma — 7 users, 3 projets, Sprint 88 actif`

---

## 3. Implémentation pas à pas

### 3.0 Pré-requis (P1.0)

#### 3.0.1 Helper `randomUUID` partagé (optionnel — peut être ignoré)
Le code actuel importe `randomUUID` de `crypto` partout. Pas de factorisation nécessaire au MVP. **Skipper P1.0 et passer directement à P1.1.**

---

### 3.1 P1.1 — Étendre `users-backend`

#### 3.1.1 Modifier `@libs/users-backend/src/types.ts`
Créer (si absent) ou compléter le fichier :
```ts
import { z } from "zod";

export const USER_ROLES = [
  "Product Owner",
  "Scrum Master",
  "Developer",
  "Designer UX",
  "QA Tester",
  "DevOps",
] as const;

export const UserRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof UserRoleSchema>;

// Couleur HSL ou hex pour les initiales colorées (cf. UserCard du Figma).
export const UserColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
```

#### 3.1.2 Étendre `@libs/users-backend/src/entities/user.entity.ts`
```ts
import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const UserEntity = defineEntity({
  name: "User",
  properties: {
    id: p.string().primary(),
    email: p.string().unique(),
    firstName: p.string(),
    lastName: p.string(),
    password: p.string(),
    role: p.string(),                   // contraint par Zod côté API (cf. types.ts)
    color: p.string(),                  // hex #RRGGBB
    avatar: p.string().nullable(),      // URL externe (V2 : upload)
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p.datetime().onUpdate(() => new Date()).onCreate(() => new Date()),
  },
});

export type UserEntityType = InferEntity<typeof UserEntity>;
```

#### 3.1.3 Adapter le serializer
`@libs/users-backend/src/serializers/user.serializer.ts` — ajouter `role`, `color`, `avatar` dans `SerializedUserSchema` et `jsonApiSerializeUser`.

#### 3.1.4 Adapter `CreateRoute`
Le body Zod doit accepter `role`, `color`, `avatar` (optionnel pour avatar). Mettre à jour la création.

#### 3.1.5 Tests
- `tests/unit/user.serializer.test.ts` : sérialise un user avec les nouveaux champs.
- Tests intégration `create.route.test.ts` à adapter (payload + assertions).

#### 3.1.6 Critères de succès P1.1
- `pnpm -F @libs/users-backend test` vert (Docker requis pour intégration).
- `pnpm -F @libs/users-backend lint` vert.
- `pnpm -F @libs/users-backend build` produit `dist/index.mjs` avec les nouveaux types exportés.

---

### 3.2 P1.2 — Créer `@libs/projects-backend`

#### 3.2.1 Scaffolder la lib
Option A (recommandée) : invoquer le skill `new-library` :
```
/new-library type=backend name=projects-backend
```

Option B (manuelle) : copier `@libs/users-backend` puis :
- Renommer le `name` du `package.json` → `@libs/projects-backend`.
- Vider `src/entities/`, `src/routes/`, `src/serializers/`, `src/middlewares/`, `src/utils/`.
- Vider `tests/{unit,integration}/`.
- Garder `tsconfig.json`, `tsdown.config.mts`, `vitest.config.mts`, `.oxlintrc.json`, `.oxfmtrc.json`.

#### 3.2.2 Entités à créer

`src/types.ts` :
```ts
import { z } from "zod";

export const PROJECT_STATUSES = ["planned", "active", "paused", "completed", "cancelled", "archived"] as const;
export const ProjectStatusSchema = z.enum(PROJECT_STATUSES);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const PROJECT_MEMBER_ROLES = ["owner", "member"] as const;
export const ProjectMemberRoleSchema = z.enum(PROJECT_MEMBER_ROLES);
export type ProjectMemberRole = z.infer<typeof ProjectMemberRoleSchema>;
```

`src/entities/project.entity.ts` :
```ts
import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const ProjectEntity = defineEntity({
  name: "Project",
  tableName: "projects",
  properties: {
    id: p.string().primary(),
    name: p.string(),
    description: p.string(),
    status: p.string(),                   // ProjectStatus
    avatar: p.string().nullable(),
    githubUrl: p.string().nullable(),
    responsibleId: p.string().index(),    // FK -> users.id (responsable principal)
    createdById: p.string().index(),      // FK -> users.id (créateur)
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p.datetime().onUpdate(() => new Date()).onCreate(() => new Date()),
  },
});

export type ProjectEntityType = InferEntity<typeof ProjectEntity>;
```

`src/entities/project-member.entity.ts` :
```ts
import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const ProjectMemberEntity = defineEntity({
  name: "ProjectMember",
  tableName: "project_members",
  properties: {
    id: p.string().primary(),
    projectId: p.string().index(),
    userId: p.string().index(),
    role: p.string(),                     // ProjectMemberRole
    joinedAt: p.datetime().onCreate(() => new Date()),
  },
});

export type ProjectMemberEntityType = InferEntity<typeof ProjectMemberEntity>;
```

> Note : MikroORM ne gère pas d'unique composite via `defineEntity` simple. Pour éviter le doublon `(projectId, userId)`, on s'appuie sur la logique applicative en P2 (vérification avant insert). En P1 on accepte la limite.

#### 3.2.3 `src/index.ts`
```ts
import { ProjectEntity } from "#src/entities/project.entity.js";
import { ProjectMemberEntity } from "#src/entities/project-member.entity.js";

export * from "#src/entities/project.entity.js";
export * from "#src/entities/project-member.entity.js";
export * from "#src/types.js";

export const entities = [ProjectEntity, ProjectMemberEntity];
```

#### 3.2.4 CLAUDE.md
Créer `@libs/projects-backend/CLAUDE.md` — mêmes conventions que `users-backend`, adapté.

#### 3.2.5 Tests unit (P1)
`tests/unit/project.entity.test.ts` : crée une instance via ORM mock, vérifie les propriétés. (Cf. patterns dans `users-backend/tests/unit/`.)

---

### 3.3 P1.3 — Créer `@libs/backlog-backend`

Cette lib est la plus grosse — elle contient 6 entités. La diviser en 2 commits (cf. §2.6).

#### 3.3.1 Scaffolder (cf. §3.2.1)

#### 3.3.2 `src/types.ts`
```ts
import { z } from "zod";

export const TASK_STATUSES = ["todo", "in-progress", "testing", "uat", "done"] as const;
export const TASK_TYPES = ["Frontend", "Backend", "Database", "UX", "Analyse", "DevOps", "API", "Security", "Testing"] as const;
export const TASK_NATURES = ["Bug", "Feature", "Maintenance", "Hotfix", "Refacto", "Techdebt", "Spike", "Review", "Deployment", "Infra"] as const;
export const TASK_PRIORITIES = ["Basse", "Moyenne", "Haute", "Critique"] as const;
export const STORY_POINTS = [1, 2, 3, 5, 8, 13, 21] as const;
export const STORY_STATUSES = ["todo", "in-progress", "done"] as const;
export const EPIC_STATUSES = ["todo", "in-progress", "done"] as const;
export const COMMENT_TYPES = ["comment", "status-change", "assignment", "github-push", "other"] as const;

export const TaskStatusSchema = z.enum(TASK_STATUSES);
export const TaskTypeSchema = z.enum(TASK_TYPES);
export const TaskNatureSchema = z.enum(TASK_NATURES);
export const TaskPrioritySchema = z.enum(TASK_PRIORITIES);
export const StoryPointsSchema = z.number().int().refine((v) => STORY_POINTS.includes(v as any));
export const StoryStatusSchema = z.enum(STORY_STATUSES);
export const EpicStatusSchema = z.enum(EPIC_STATUSES);
export const CommentTypeSchema = z.enum(COMMENT_TYPES);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskType = z.infer<typeof TaskTypeSchema>;
export type TaskNature = z.infer<typeof TaskNatureSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export type EpicStatus = z.infer<typeof EpicStatusSchema>;
export type StoryStatus = z.infer<typeof StoryStatusSchema>;
export type CommentType = z.infer<typeof CommentTypeSchema>;
```

#### 3.3.3 Entités principales

`src/entities/epic.entity.ts` :
```ts
import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const EpicEntity = defineEntity({
  name: "Epic",
  tableName: "epics",
  properties: {
    id: p.string().primary(),
    title: p.string(),
    description: p.string(),
    projectId: p.string().index(),
    status: p.string(),               // EpicStatus
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p.datetime().onUpdate(() => new Date()).onCreate(() => new Date()),
  },
});

export type EpicEntityType = InferEntity<typeof EpicEntity>;
```

`src/entities/user-story.entity.ts` :
```ts
import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const UserStoryEntity = defineEntity({
  name: "UserStory",
  tableName: "user_stories",
  properties: {
    id: p.string().primary(),
    title: p.string(),
    description: p.string(),
    projectId: p.string().index(),
    epicId: p.string().nullable().index(),
    status: p.string(),               // StoryStatus
    points: p.integer(),              // 0 ou somme des tasks
    priority: p.integer(),            // ordre dans le backlog
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p.datetime().onUpdate(() => new Date()).onCreate(() => new Date()),
  },
});

export type UserStoryEntityType = InferEntity<typeof UserStoryEntity>;
```

`src/entities/task.entity.ts` :
```ts
import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const TaskEntity = defineEntity({
  name: "Task",
  tableName: "tasks",
  properties: {
    id: p.string().primary(),
    number: p.integer().index(),      // unique par projet (P2 : contrainte applicative)
    title: p.string(),
    description: p.string(),
    status: p.string(),               // TaskStatus
    type: p.string(),                 // TaskType
    nature: p.string(),               // TaskNature
    priority: p.string(),             // TaskPriority
    points: p.integer(),              // story points
    estimatedHours: p.float().nullable(),
    projectId: p.string().index(),
    userStoryId: p.string().nullable().index(),
    epicId: p.string().nullable().index(),
    sprintId: p.string().nullable().index(),
    createdById: p.string().index(),
    dueDate: p.datetime().nullable(),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p.datetime().onUpdate(() => new Date()).onCreate(() => new Date()),
  },
});

export type TaskEntityType = InferEntity<typeof TaskEntity>;
```

`src/entities/task-assignee.entity.ts` (jointure many-to-many tasks↔users) :
```ts
import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const TaskAssigneeEntity = defineEntity({
  name: "TaskAssignee",
  tableName: "task_assignees",
  properties: {
    id: p.string().primary(),
    taskId: p.string().index(),
    userId: p.string().index(),
    assignedAt: p.datetime().onCreate(() => new Date()),
  },
});

export type TaskAssigneeEntityType = InferEntity<typeof TaskAssigneeEntity>;
```

#### 3.3.4 Tables auxiliaires (commit 2)

`src/entities/comment.entity.ts` :
```ts
import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const CommentEntity = defineEntity({
  name: "Comment",
  tableName: "comments",
  properties: {
    id: p.string().primary(),
    taskId: p.string().index(),
    userId: p.string().index(),
    content: p.string(),
    type: p.string(),                 // CommentType
    metadata: p.json().nullable(),    // payload structuré pour status-change, etc.
    createdAt: p.datetime().onCreate(() => new Date()),
  },
});

export type CommentEntityType = InferEntity<typeof CommentEntity>;
```

`src/entities/attachment.entity.ts` :
```ts
import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const AttachmentEntity = defineEntity({
  name: "Attachment",
  tableName: "attachments",
  properties: {
    id: p.string().primary(),
    taskId: p.string().nullable().index(),
    projectId: p.string().nullable().index(),    // pour attachements de projet (V2)
    name: p.string(),
    url: p.string(),                              // URL externe ou path local
    mimeType: p.string(),
    sizeBytes: p.integer(),
    uploadedById: p.string().index(),
    createdAt: p.datetime().onCreate(() => new Date()),
  },
});

export type AttachmentEntityType = InferEntity<typeof AttachmentEntity>;
```

`src/entities/history-entry.entity.ts` :
```ts
import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const HistoryEntryEntity = defineEntity({
  name: "HistoryEntry",
  tableName: "history_entries",
  properties: {
    id: p.string().primary(),
    ownerType: p.string(),                        // "task" | "project" | "user-story" | "sprint"
    ownerId: p.string().index(),
    type: p.string(),                              // "status-change" | "assignment" | "created" | ...
    description: p.string(),
    userId: p.string().index(),                    // qui a fait l'action
    metadata: p.json().nullable(),
    createdAt: p.datetime().onCreate(() => new Date()),
  },
});

export type HistoryEntryEntityType = InferEntity<typeof HistoryEntryEntity>;
```

#### 3.3.5 `src/index.ts`
```ts
import { EpicEntity } from "#src/entities/epic.entity.js";
import { UserStoryEntity } from "#src/entities/user-story.entity.js";
import { TaskEntity } from "#src/entities/task.entity.js";
import { TaskAssigneeEntity } from "#src/entities/task-assignee.entity.js";
import { CommentEntity } from "#src/entities/comment.entity.js";
import { AttachmentEntity } from "#src/entities/attachment.entity.js";
import { HistoryEntryEntity } from "#src/entities/history-entry.entity.js";

export * from "#src/entities/epic.entity.js";
export * from "#src/entities/user-story.entity.js";
export * from "#src/entities/task.entity.js";
export * from "#src/entities/task-assignee.entity.js";
export * from "#src/entities/comment.entity.js";
export * from "#src/entities/attachment.entity.js";
export * from "#src/entities/history-entry.entity.js";
export * from "#src/types.js";

export const entities = [
  EpicEntity,
  UserStoryEntity,
  TaskEntity,
  TaskAssigneeEntity,
  CommentEntity,
  AttachmentEntity,
  HistoryEntryEntity,
];
```

#### 3.3.6 CLAUDE.md
Documenter la lib + spécifier l'invariant `Task.number` (scoped projet, géré applicativement en P2).

---

### 3.4 P1.4 — Créer `@libs/sprints-backend`

#### 3.4.1 Scaffolder + `src/types.ts`
```ts
import { z } from "zod";

export const SPRINT_STATUSES = ["planned", "active", "completed"] as const;
export const SprintStatusSchema = z.enum(SPRINT_STATUSES);
export type SprintStatus = z.infer<typeof SprintStatusSchema>;
```

#### 3.4.2 `src/entities/sprint.entity.ts`
```ts
import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const SprintEntity = defineEntity({
  name: "Sprint",
  tableName: "sprints",
  properties: {
    id: p.string().primary(),
    name: p.string(),                   // "Sprint 88"
    goal: p.string().nullable(),        // objectif sprint
    projectId: p.string().index(),
    startDate: p.datetime(),
    endDate: p.datetime(),
    status: p.string(),                 // SprintStatus
    velocityPoints: p.integer().default(0),   // points cible (au démarrage)
    completedPoints: p.integer().default(0),  // points réalisés à la clôture
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p.datetime().onUpdate(() => new Date()).onCreate(() => new Date()),
  },
});

export type SprintEntityType = InferEntity<typeof SprintEntity>;
```

#### 3.4.3 `src/index.ts` + CLAUDE.md (idem patterns)

---

### 3.5 P1.5 — Créer `@libs/time-tracking-backend`

#### 3.5.1 Scaffolder + `src/entities/time-entry.entity.ts`
```ts
import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const TimeEntryEntity = defineEntity({
  name: "TimeEntry",
  tableName: "time_entries",
  properties: {
    id: p.string().primary(),
    taskId: p.string().index(),
    userId: p.string().index(),
    projectId: p.string().index(),
    hours: p.float(),                          // > 0
    date: p.datetime(),                        // date du travail (différente de createdAt)
    description: p.string().nullable(),
    createdAt: p.datetime().onCreate(() => new Date()),
  },
});

export type TimeEntryEntityType = InferEntity<typeof TimeEntryEntity>;
```

#### 3.5.2 `src/index.ts` + CLAUDE.md

---

### 3.6 P1.6 — Enregistrer toutes les entités dans `@apps/backend`

#### 3.6.1 Modifier `@apps/backend/src/app/database.connection.ts`
```ts
import { defineConfig, MikroORM } from "@mikro-orm/postgresql";
import type { AppConfiguration } from "../configuration.js";
import { entities as usersEntities } from "@libs/users-backend";
import { entities as projectsEntities } from "@libs/projects-backend";
import { entities as backlogEntities } from "@libs/backlog-backend";
import { entities as sprintsEntities } from "@libs/sprints-backend";
import { entities as timeTrackingEntities } from "@libs/time-tracking-backend";

export function databaseConfig(config: Pick<AppConfiguration, "DATABASE_URI">) {
  return defineConfig({
    seeder: { pathTs: "./src/seeders" },
    clientUrl: config.DATABASE_URI,
    entities: [
      ...usersEntities,
      ...projectsEntities,
      ...backlogEntities,
      ...sprintsEntities,
      ...timeTrackingEntities,
    ],
  });
}
```

#### 3.6.2 Modifier `@apps/backend/tests/global-setup.ts` (mêmes imports)

#### 3.6.3 Modifier `@apps/backend/package.json` — ajouter les 4 nouvelles libs en `dependencies` :
```json
"@libs/projects-backend": "workspace:*",
"@libs/backlog-backend": "workspace:*",
"@libs/sprints-backend": "workspace:*",
"@libs/time-tracking-backend": "workspace:*",
```

#### 3.6.4 `pnpm install` + smoke test
```bash
pnpm install
pnpm -F @apps/backend build:deps
cd @apps/backend && pnpm schema:fresh   # nécessite Docker postgres up
```

Vérifier dans psql que les 13 tables existent : `users`, `refresh_tokens`, `projects`, `project_members`, `epics`, `user_stories`, `tasks`, `task_assignees`, `comments`, `attachments`, `history_entries`, `sprints`, `time_entries`.

---

### 3.7 P1.7 — Seeder dev réaliste

#### 3.7.1 Architecture
Modifier `@apps/backend/src/seeders/development.seeder.ts` pour orchestrer la création dans l'ordre :
1. 7 Users (avec password commun `123456789` hashé).
2. 3 Projects (E-Commerce Platform, Mobile Banking App, CRM System) + ProjectMembers.
3. 2 Epics + 5 UserStories (cf. screenshots `05-user-story-map.png` : "User Authentication", "Product Catalog").
4. 17 Tasks (numéros 1001-1017 répartis sur les 3 projets, statuts variés).
5. TaskAssignees (Claire Dubois sur 6 tasks, autres répartis).
6. 6 Sprints (cf. `06-sprints.png` : Sprint 84-87 completed, Sprint 88 active, Sprint 89-90 planned).
7. ~30 TimeEntries de Claire Dubois sur Sprint 88 (totalisant 17h, cf. KPI dashboard).
8. ~5 Comments + 2 HistoryEntries pour donner du contexte.

#### 3.7.2 Squelette
```ts
import { hashPassword, UserEntity } from "@libs/users-backend";
import { ProjectEntity, ProjectMemberEntity } from "@libs/projects-backend";
import { EpicEntity, UserStoryEntity, TaskEntity, TaskAssigneeEntity, CommentEntity } from "@libs/backlog-backend";
import { SprintEntity } from "@libs/sprints-backend";
import { TimeEntryEntity } from "@libs/time-tracking-backend";
import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { randomUUID } from "node:crypto";

const PASSWORD_PLAIN = "123456789";

export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager) {
    const hashedPassword = await hashPassword(PASSWORD_PLAIN);

    // 1. Users
    const users = await this.seedUsers(em, hashedPassword);
    // 2. Projects
    const projects = await this.seedProjects(em, users);
    // 3. Epics + UserStories
    const { epics, stories } = await this.seedBacklog(em, projects);
    // 4. Sprints
    const sprints = await this.seedSprints(em, projects);
    // 5. Tasks (assigne sprint actif)
    const tasks = await this.seedTasks(em, projects, stories, sprints, users);
    // 6. TimeEntries
    await this.seedTimeEntries(em, tasks, users);

    await em.flush();
  }

  // ... (chaque méthode crée et persist via em.create)
}
```

#### 3.7.3 Données précises à reproduire (depuis les screenshots)

**Users (avec `color` hex distincts pour les pastilles)** :
| firstName | lastName | role          | email                          | color    |
|-----------|----------|---------------|--------------------------------|----------|
| Alice     | Martin   | Product Owner | alice.martin@sprintforge.com   | #F48FB1  |
| Bob       | Durant   | Scrum Master  | bob.durant@sprintforge.com     | #7FDBCA  |
| Claire    | Dubois   | Developer     | claire.dubois@sprintforge.com  | #66C7B8  |
| David     | Leroy    | Developer     | david.leroy@sprintforge.com    | #FFB74D  |
| Emma      | Bernard  | Designer UX   | emma.bernard@sprintforge.com   | #BA68C8  |
| François  | Petit    | QA Tester     | francois.petit@sprintforge.com | #4DB6AC  |
| Gaëlle    | Moreau   | DevOps        | gaelle.moreau@sprintforge.com  | #FFA726  |

**Projects** :
| name                  | status   | createdAt   | responsible   |
|-----------------------|----------|-------------|---------------|
| E-Commerce Platform   | active   | 2025-01-01  | Bob Durant    |
| Mobile Banking App    | active   | 2025-01-05  | Bob Durant    |
| CRM System            | planned  | 2025-01-10  | Bob Durant    |

**Project members** (cf. screenshot users) :
- Alice : 0 projet
- Bob : 3 (PO/SM sur tous)
- Claire : 3 (E-Commerce, Mobile, CRM)
- David : 2 (E-Commerce, CRM)
- Emma : 2 (E-Commerce, Mobile)
- François : 1 (E-Commerce)
- Gaëlle : (?) 1 ou 2 — à confirmer dans le screenshot

**Epics (E-Commerce Platform)** :
- "User Authentication" : 2 US, 5 tasks (4 done)
- "Product Catalog" : 3 US, 7 tasks (1 done)

**User Stories** (5 sur E-Commerce, IDs `us1`-`us5`) :
| key  | titre                          | epic         | tasks count |
|------|--------------------------------|--------------|-------------|
| us1  | Login utilisateur              | User Auth    | 2           |
| us2  | Inscription utilisateur        | User Auth    | 3           |
| us3  | Affichage des produits         | Catalog      | 3           |
| us4  | Recherche de produits          | Catalog      | 2           |
| us5  | Filtres de produits            | Catalog      | 2           |

**Sprints (E-Commerce Platform)** — 6 au total :
| name      | status     | start       | end         | goal                                                       |
|-----------|------------|-------------|-------------|------------------------------------------------------------|
| Sprint 84 | completed  | 2024-11-04  | 2024-11-17  | (historique)                                               |
| Sprint 85 | completed  | 2024-11-18  | 2024-12-01  | (historique)                                               |
| Sprint 86 | completed  | 2024-12-02  | 2024-12-15  | (historique)                                               |
| Sprint 87 | completed  | 2024-12-16  | 2024-12-29  | (historique)                                               |
| Sprint 88 | active     | 2025-01-20  | 2025-02-02  | Finaliser le tunnel d'achat et intégrer le paiement Stripe |
| Sprint 89 | planned    | 2025-02-03  | 2025-02-16  | Amélioration de la gestion des expéditions et suivi colis  |
| Sprint 90 | planned    | 2025-02-17  | 2025-03-02  | Optimisation des performances et refonte du tableau admin  |

**Tasks** — 8 dans Sprint 88 (cf. dashboard 1/8 tasks done, 26 points target) :
| # | title                                | type     | nature   | points | status       | sprint | US  | assignées      |
|---|--------------------------------------|----------|----------|--------|--------------|--------|-----|----------------|
| 1005 | Implémenter formulaire d'inscription | Frontend | Feature  | 2 | in-progress | 88 | us2 | Claire         |
| 1006 | Créer liste de produits              | Frontend | Feature  | 3 | in-progress | 88 | us3 | Claire, David  |
| 1008 | Pagination produits                  | Frontend | Feature  | 2 | todo        | 88 | us3 | Claire         |
| 1009 | Barre de recherche                   | Frontend | Feature  | 3 | uat         | 88 | us4 | Claire         |
| 1011 | Filtres catégories                   | Frontend | Feature  | 2 | done        | 88 | us5 | Claire         |
| 1012 | Filtres prix                         | Frontend | Feature  | 1 | todo        | 88 | us5 | Claire         |

Plus dans le backlog (cf. `03-backlog.png`) :
| # | title                       | type     | nature    | points | status | US  |
|---|-----------------------------|----------|-----------|--------|--------|-----|
| 1013 | Optimiser performance liste | Frontend | Techdebt  | 3 | backlog | us3 |
| 1014 | Corriger bug images         | Frontend | Bug       | 2 | backlog |     |
| 1015 | Documentation API           | Backend  | Review    | 5 | backlog |     |
| 1016 | Setup CI/CD                 | DevOps   | Infra     | 8 | backlog |     |
| 1017 | Refactoring composants      | Frontend | Refacto   | 5 | backlog |     |

**TimeEntries Sprint 88 (Claire)** :
- ~17h total réparties sur 8-10 entries du 20/01 au 25/01 sur tasks 1005, 1006, 1008, 1011, 1012.
- Format type : `{ taskId: 'task-1005', userId: 'claire-id', hours: 2.5, date: new Date('2025-01-20T09:00:00Z'), description: 'Démarrage du formulaire' }`.

#### 3.7.4 IDs déterministes
Pour faciliter le debug + les E2E, utiliser des IDs lisibles (pas randomUUID) :
- Users : `user-alice`, `user-bob`, `user-claire`, etc.
- Projects : `project-ecommerce`, `project-banking`, `project-crm`.
- Sprints : `sprint-88`, `sprint-89`, `sprint-90` (et historiques `sprint-84` à `sprint-87`).
- Tasks : `task-1001` à `task-1017`.

#### 3.7.5 E2E seeder (`@apps/backend/src/seeders/e2e.seeder.ts`)
Garder minimal : juste l'utilisateur de login `claire.dubois@sprintforge.com` (sera l'identité par défaut pour les E2E SprintForge). Étendre au besoin dans les tests E2E.

---

### 3.8 P1.8 — schema:fresh + smoke test

```bash
# Pré-requis : docker compose up -d (postgres)
cd @apps/backend
pnpm install
pnpm schema:fresh   # drop + recreate + seed automatique

# Connexion psql pour vérification
psql -h localhost -U backend_user -d database_dev
\dt              # liste les 13 tables
SELECT COUNT(*) FROM users;           -- attendu : 7
SELECT COUNT(*) FROM projects;        -- attendu : 3
SELECT COUNT(*) FROM sprints WHERE status='active';  -- attendu : 1
SELECT COUNT(*) FROM tasks WHERE sprint_id IS NOT NULL;  -- attendu : 8 (Sprint 88)
SELECT SUM(hours) FROM time_entries WHERE user_id='user-claire';  -- attendu : ~17
```

---

## 4. Stratégie de tests

| Niveau                            | Outil                  | Couverture P1                                                              |
|-----------------------------------|------------------------|----------------------------------------------------------------------------|
| Unit entités                      | vitest                 | 1 test par entité (round-trip création + propriétés)                       |
| Unit serializers                  | vitest                 | (futur P2 — pas de serializer en P1)                                       |
| Integration                       | vitest + testcontainer | (futur P2 — pas de route en P1)                                            |
| Smoke schema                      | psql manuel            | §3.8 — 13 tables existent et seeder peuple                                 |
| Type-check                        | oxlint --type-check    | `pnpm lint` global doit rester vert après chaque sous-phase                |

---

## 5. Critères de succès

| # | Critère                                                                              | Mesure                                                       |
|---|--------------------------------------------------------------------------------------|--------------------------------------------------------------|
| 1 | `UserEntity` a `role`, `color`, `avatar`, `createdAt`, `updatedAt`                   | inspection `@libs/users-backend/src/entities/user.entity.ts` |
| 2 | 4 nouvelles libs créées avec structure standard (src/, tests/, package.json, CLAUDE.md) | `ls @libs/`                                                  |
| 3 | 13 entités modélisées et exportées (users + refresh_tokens + 11 nouvelles)           | `grep "defineEntity" @libs/*-backend/src/entities/`          |
| 4 | `databaseConfig.entities` agrège les 5 lots                                          | inspection `database.connection.ts`                          |
| 5 | `pnpm schema:fresh` produit 13 tables sans erreur                                    | `\dt` dans psql                                              |
| 6 | Seeder peuple 7 users / 3 projets / 1 sprint actif / 8 tasks dans Sprint 88          | requêtes COUNT psql                                          |
| 7 | `pnpm lint` global vert                                                              | exécution                                                    |
| 8 | `pnpm turbo build` vert pour les 4 nouvelles libs                                    | inspection `dist/` de chaque lib                             |
| 9 | Le bouton "Se connecter" du login fonctionne avec `claire.dubois@sprintforge.com` / `123456789` (mais auth API toujours en P0 — à valider après P3) | smoke manuel après P3                                        |

---

## 6. Suite après P1

Lancer le plan détaillé suivant :
```
/TPK-plan P2 — APIs JSON:API par domaine
```

P2 ajoutera, pour chaque lib backend créée en P1 :
- Routes CRUD JSON:API (list, get, create, update, delete).
- Routes relationnelles (`/projects/:id/tasks`, `/sprints/:id/tasks`, etc.).
- Endpoints transversaux : `/search`, `/dashboard`, `/sprints/:id/start`, `/sprints/:id/stop`.
- Modules `*Module` avec `setupRoutes` + auth middleware.
- Serializers JSON:API.
- Tests intégration.

---

## 7. Annexes

### 7.1 Récapitulatif fichiers touchés / créés

**Modifications**
- `@libs/users-backend/src/types.ts` (créé ou complété)
- `@libs/users-backend/src/entities/user.entity.ts`
- `@libs/users-backend/src/serializers/user.serializer.ts`
- `@libs/users-backend/src/routes/create.route.ts`
- `@libs/users-backend/CLAUDE.md`
- `@libs/users-backend/tests/integration/create.route.test.ts`
- `@apps/backend/src/app/database.connection.ts`
- `@apps/backend/tests/global-setup.ts`
- `@apps/backend/src/seeders/development.seeder.ts`
- `@apps/backend/package.json`
- `CLAUDE.md` (racine) et `@libs/CLAUDE.md` (mise à jour de la table des libs)

**Créations (4 libs × ~15 fichiers)**
- `@libs/projects-backend/` : package.json, tsconfig.json, tsdown.config.mts, vitest.config.mts, .oxlintrc.json, .oxfmtrc.json, CLAUDE.md, src/{index.ts, types.ts, context.ts, init.ts}, src/entities/{project.entity.ts, project-member.entity.ts}, tests/{global-setup.ts, unit/}
- `@libs/backlog-backend/` : (idem squelette) + 7 entités (epic, user-story, task, task-assignee, comment, attachment, history-entry)
- `@libs/sprints-backend/` : (idem squelette) + sprint.entity.ts
- `@libs/time-tracking-backend/` : (idem squelette) + time-entry.entity.ts

### 7.2 Inventaire entités (13 total)

| Table              | Lib                       | PK     | Index notables                       |
|--------------------|---------------------------|--------|--------------------------------------|
| users              | users-backend             | uuid   | email (unique)                       |
| refresh_tokens     | users-backend             | uuid   | tokenHash, userId, familyId          |
| projects           | projects-backend          | uuid   | responsibleId, createdById           |
| project_members    | projects-backend          | uuid   | projectId, userId                    |
| epics              | backlog-backend           | uuid   | projectId                            |
| user_stories       | backlog-backend           | uuid   | projectId, epicId                    |
| tasks              | backlog-backend           | uuid   | number, projectId, userStoryId, epicId, sprintId, createdById |
| task_assignees     | backlog-backend           | uuid   | taskId, userId                       |
| comments           | backlog-backend           | uuid   | taskId, userId                       |
| attachments        | backlog-backend           | uuid   | taskId, projectId, uploadedById      |
| history_entries    | backlog-backend           | uuid   | ownerId, userId                      |
| sprints            | sprints-backend           | uuid   | projectId                            |
| time_entries       | time-tracking-backend     | uuid   | taskId, userId, projectId            |

### 7.3 Question à valider avant `/TPK-build`
- **Granularité commits** : un commit par sous-phase (recommandé), ou un seul commit "feat(backend): modèles SprintForge complets" pour simplifier la revue ?
- **IDs déterministes** : confirmer `user-claire` style vs UUID. Recommandation : déterministes en dev/E2E pour fiabiliser les tests et le debug, UUID en prod (créés via routes API).
- **`Task.number`** : implémenter le compteur scoped en P1 ou laisser des numéros explicites (1001, 1002…) jusqu'en P2 ? Recommandation : numéros explicites en P1, helper repo en P2.
- **Test minimum** : 1 unit test par entité (round-trip) ou se contenter du smoke `schema:fresh` ? Recommandation : 1 test par entité (~20 min de coût, gros gain en confiance).
