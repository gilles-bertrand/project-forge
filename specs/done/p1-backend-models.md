# Plan P1 — Modèles & migrations backend SprintForge

> Phase de modélisation backend de la migration vers SprintForge (cf. `specs/todo/sprintforge-migration-macro-plan.md`).
>
> But : créer les entités du **bounded context Scrum** (Project, Epic, UserStory, Task, Sprint + child entities Comment/Attachment/History/Members/Assignees) et l'add-on Time Tracking, et fournir un seeder dev reproduisant le scénario du prototype Figma.
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
1. **Étendre `UserEntity`** : ajouter `role` (enum), `color` (hex), `avatar` (string nullable), `createdAt`, `updatedAt`.
2. **Créer 2 nouvelles libs** :
   - `@libs/scrum-backend` — bounded context principal (Project, Epic, UserStory, Task, Sprint + child entities)
   - `@libs/time-tracking-backend` — add-on séparé (TimeEntry uniquement)
3. **Modéliser 12 nouvelles entités** dérivées de `src/app/types.ts` du Make file.
4. **Enregistrer toutes les entités** dans `databaseConfig` + `tests/global-setup.ts`.
5. **Seeder dev réaliste** : 7 users, 3 projets, 2 épiques, 5 user stories, ~17 tasks, 7 sprints (4 historiques + Sprint 88 actif + 2 planifiés), entries de temps Claire Dubois sur Sprint 88.
6. **Tests unitaires** : au moins 1 test par entité (factory + persist round-trip).

### 1.3 Décisions architecturales (ADR DDD)
| Décision                                                                                        | Choix                                                                                         |
|-------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| **Bounded contexts**                                                                            | 3 : `users` (identité), `scrum` (cœur métier), `time-tracking` (add-on feature)               |
| Pourquoi pas 1 lib par agrégat root (Project, Epic, UserStory, Task, Sprint) ?                  | Trop granulaire pour MVP. Préférer un bounded context = lib, avec sous-modules par agrégat à l'intérieur |
| Pourquoi `time-tracking` séparé ?                                                                | TimeEntry n'est PAS du Scrum (Scrum gère les story points). Time tracking est un add-on bolt-on, remplaçable (Toggl/Harvest). UX dédié (page Time Tracking) |
| Comment/Attachment/HistoryEntry — où ?                                                          | Dans `scrum-backend` comme **child entities** des agrégats qui les possèdent (Task surtout)   |
| Organisation interne de `scrum-backend`                                                          | Sous-dossiers par agrégat : `src/project/`, `src/epic/`, `src/user-story/`, `src/task/`, `src/sprint/`. Chaque sous-dossier contient entity + futurs serializer/routes (P2) |

### 1.4 Non-objectifs (P1 ne fait PAS)
- Pas de route HTTP / endpoint JSON:API (P2).
- Pas de modal frontend (P3+).
- Pas de logique métier complexe (calcul vélocité, agrégations dashboard) — P2.
- Pas d'upload binaire de pièce jointe (table seulement, stockage S3 hors scope).

---

## 2. Approche technique

### 2.1 Conventions héritées de `users-backend` (à respecter strictement)
- **Entités** : `defineEntity` de `@mikro-orm/core`, nom PascalCase, `tableName` snake_case explicite, `id: p.string().primary()` (UUID v4 généré côté code via `randomUUID()` du seeder, et plus tard via routes).
- **Imports internes** : `#src/*` (résolu via `package.json#imports`).
- **Build** : `tsdown` (config copiée depuis `users-backend/tsdown.config.mts`).
- **Lint** : `oxlint --type-aware --type-check` + `oxfmt`.
- **Tests** : `vitest`, dossier `tests/{unit,integration}/`.
- **Catalog** : toutes les dépendances via `"catalog:"`.

### 2.2 Architecture d'une lib `*-backend` (template)
```
@libs/<domain>-backend/
├── src/
│   ├── <aggregate-1>/              sous-module par agrégat root
│   │   ├── <name>.entity.ts        defineEntity + InferEntity export
│   │   └── (futurs P2 : serializer, routes, repo)
│   ├── <aggregate-2>/
│   ├── types.ts                    Enums Zod + types partagés au bounded context
│   ├── context.ts                  <Domain>LibraryContext interface (P2)
│   ├── init.ts                     <Domain>Module class (squelette en P1)
│   └── index.ts                    re-exports + entities array
├── tests/
│   ├── global-setup.ts             testcontainer postgres + schema refresh
│   ├── unit/                       tests entités
│   └── integration/                (P2)
├── package.json
├── tsconfig.json
├── tsdown.config.mts
├── vitest.config.mts
├── .oxlintrc.json
├── .oxfmtrc.json
└── CLAUDE.md
```

### 2.3 Décisions de modélisation clés
| Décision                                                        | Choix                                                                                                     |
|-----------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| PK                                                              | `p.string().primary()` (UUID v4) cohérent avec UserEntity                                                 |
| Relations many-to-many `Project.assignedUsers` / `Task.assignedTo` | Tables de jointure explicites — `ProjectMember`, `TaskAssignee` — permet d'ajouter du metadata (rôle, date) |
| `Task.number` (compteur scoped projet)                          | Colonne `integer`, contrainte unique par projet déférée en P2 (helper repo). En P1 : numéros explicites dans le seeder (1001-1017) |
| Enums (`TaskStatus`, `TaskType`, etc.)                          | Colonne `string` + Zod enum côté API. Pas d'enum natif PostgreSQL (plus simple à migrer)                  |
| `Comment.type` polymorphe                                       | Colonne `string` + enum Zod (`comment` / `status-change` / `assignment` / `github-push` / `other`)        |
| `Attachment` / `HistoryEntry`                                   | Liés via `taskId` (nullable) + futur `projectId` (P2 si besoin). MVP : task-scoped uniquement              |
| Dates                                                           | `p.datetime()` UTC. `createdAt`/`updatedAt` via `onCreate`/`onUpdate`                                     |
| `Sprint.completedPoints`                                        | Colonne `integer` mise à jour à la clôture (P2). Stockée pour historique sans recalcul                    |
| FK cross-lib (Task → User, etc.)                                | String FK uniquement (pas de relation MikroORM cross-lib). Populate via repo en P2                        |

### 2.4 Granularité des sous-phases (ordre d'implémentation)

```
P1.1 — Étendre users-backend (role, color, avatar, createdAt/updatedAt)
P1.2 — Créer scrum-backend — squelette + Project aggregate (Project + ProjectMember)
P1.3 — Compléter scrum-backend — Backlog aggregates (Epic, UserStory, Task + TaskAssignee)
P1.4 — Compléter scrum-backend — Task child entities (Comment, Attachment, HistoryEntry)
P1.5 — Compléter scrum-backend — Sprint aggregate
P1.6 — Créer time-tracking-backend (TimeEntry)
P1.7 — Enregistrer toutes les entités dans @apps/backend
P1.8 — Seeder dev réaliste (scénario Figma)
P1.9 — schema:fresh + smoke test
```

Chaque sous-phase = 1 commit cohérent. Validation incrémentale.

### 2.5 Risques & parades
| Risque                                                                                | Parade                                                                                                |
|---------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| Lib `scrum-backend` devient massive (~10 fichiers entities)                           | Organisation par sous-dossier (1 dossier = 1 agrégat). Chaque dossier reste petit et focalisé.        |
| Cycle d'import entre `scrum-backend` ↔ `users-backend`                                | Pas d'import croisé d'entités. FK = string (`userId`, `projectId`). Populate via repo en P2.          |
| `Task.number` séquentiel sans race condition                                          | À implémenter en P2 avec `em.transactional` + `MAX(number) + 1`. En P1 : numéros explicites dans seeder. |
| Tests intégration nécessitent Docker (testcontainers)                                 | Documenter dans CLAUDE.md. Garder unit tests purs (round-trip entity) runnables sans Docker.         |
| Migration cassée par ordre de création des tables (FK vers table non encore créée)    | MikroORM auto-résout l'ordre via `schema:fresh`.                                                       |

### 2.6 Stratégie de commits par sous-phase
- `feat(users-backend): ajouter role/color/avatar/timestamps à UserEntity`
- `feat(scrum-backend): scaffolder la lib avec Project + ProjectMember`
- `feat(scrum-backend): ajouter Epic, UserStory, Task, TaskAssignee`
- `feat(scrum-backend): ajouter Comment, Attachment, HistoryEntry`
- `feat(scrum-backend): ajouter Sprint`
- `feat(time-tracking-backend): scaffolder la lib avec TimeEntry`
- `chore(backend): enregistrer toutes les entités SprintForge dans databaseConfig`
- `feat(seeder): scénario Figma — 7 users, 3 projets, Sprint 88 actif`

---

## 3. Implémentation pas à pas

### 3.1 P1.1 — Étendre `users-backend`

#### 3.1.1 `@libs/users-backend/src/types.ts` (créer ou compléter)
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

export const UserColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
```

#### 3.1.2 `@libs/users-backend/src/entities/user.entity.ts`
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
    role: p.string(),
    color: p.string(),
    avatar: p.string().nullable(),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p.datetime().onUpdate(() => new Date()).onCreate(() => new Date()),
  },
});

export type UserEntityType = InferEntity<typeof UserEntity>;
```

#### 3.1.3 Adapter `user.serializer.ts` + `CreateRoute`
Ajouter `role`, `color`, `avatar` dans `SerializedUserSchema` et `jsonApiSerializeUser`. Étendre le body Zod du `CreateRoute`.

#### 3.1.4 Tests
Adapter `tests/unit/user.serializer.test.ts` et `tests/integration/create.route.test.ts`.

#### 3.1.5 Critères de succès P1.1
- `pnpm -F @libs/users-backend lint` vert.
- `pnpm -F @libs/users-backend build` produit `dist/index.mjs`.
- Tests intégration verts (si Docker démarré).

---

### 3.2 P1.2 — `scrum-backend` : scaffolder + Project aggregate

#### 3.2.1 Scaffolder la lib
Option A : invoquer le skill `new-library` :
```
/new-library type=backend name=scrum-backend
```
Option B : copier `@libs/users-backend` puis vider `src/entities`, `src/routes`, `src/serializers`, `src/middlewares`, `src/utils`. Adapter `package.json#name` → `@libs/scrum-backend`.

#### 3.2.2 `src/types.ts` (enums partagés du bounded context)
```ts
import { z } from "zod";

// Project
export const PROJECT_STATUSES = ["planned", "active", "paused", "completed", "cancelled", "archived"] as const;
export const ProjectStatusSchema = z.enum(PROJECT_STATUSES);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const PROJECT_MEMBER_ROLES = ["owner", "member"] as const;
export const ProjectMemberRoleSchema = z.enum(PROJECT_MEMBER_ROLES);
export type ProjectMemberRole = z.infer<typeof ProjectMemberRoleSchema>;
```

#### 3.2.3 `src/project/project.entity.ts`
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
    responsibleId: p.string().index(),    // FK -> users.id
    createdById: p.string().index(),      // FK -> users.id
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p.datetime().onUpdate(() => new Date()).onCreate(() => new Date()),
  },
});

export type ProjectEntityType = InferEntity<typeof ProjectEntity>;
```

#### 3.2.4 `src/project/project-member.entity.ts`
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

#### 3.2.5 `src/index.ts` (à compléter au fil des sous-phases)
```ts
import { ProjectEntity } from "#src/project/project.entity.js";
import { ProjectMemberEntity } from "#src/project/project-member.entity.js";

export * from "#src/project/project.entity.js";
export * from "#src/project/project-member.entity.js";
export * from "#src/types.js";

export const entities = [ProjectEntity, ProjectMemberEntity];
```

#### 3.2.6 CLAUDE.md
Documenter : bounded context Scrum, organisation par sous-dossier d'agrégat, FK string vers User externe.

---

### 3.3 P1.3 — `scrum-backend` : Backlog aggregates (Epic, UserStory, Task)

#### 3.3.1 Compléter `src/types.ts`
```ts
// Backlog
export const TASK_STATUSES = ["todo", "in-progress", "testing", "uat", "done"] as const;
export const TASK_TYPES = ["Frontend", "Backend", "Database", "UX", "Analyse", "DevOps", "API", "Security", "Testing"] as const;
export const TASK_NATURES = ["Bug", "Feature", "Maintenance", "Hotfix", "Refacto", "Techdebt", "Spike", "Review", "Deployment", "Infra"] as const;
export const TASK_PRIORITIES = ["Basse", "Moyenne", "Haute", "Critique"] as const;
export const STORY_POINTS = [1, 2, 3, 5, 8, 13, 21] as const;
export const STORY_STATUSES = ["todo", "in-progress", "done"] as const;
export const EPIC_STATUSES = ["todo", "in-progress", "done"] as const;

export const TaskStatusSchema = z.enum(TASK_STATUSES);
export const TaskTypeSchema = z.enum(TASK_TYPES);
export const TaskNatureSchema = z.enum(TASK_NATURES);
export const TaskPrioritySchema = z.enum(TASK_PRIORITIES);
export const StoryPointsSchema = z.number().int().refine((v) => (STORY_POINTS as readonly number[]).includes(v));
export const StoryStatusSchema = z.enum(STORY_STATUSES);
export const EpicStatusSchema = z.enum(EPIC_STATUSES);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskType = z.infer<typeof TaskTypeSchema>;
export type TaskNature = z.infer<typeof TaskNatureSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export type EpicStatus = z.infer<typeof EpicStatusSchema>;
export type StoryStatus = z.infer<typeof StoryStatusSchema>;
```

#### 3.3.2 `src/epic/epic.entity.ts`
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

#### 3.3.3 `src/user-story/user-story.entity.ts`
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
    points: p.integer(),
    priority: p.integer(),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p.datetime().onUpdate(() => new Date()).onCreate(() => new Date()),
  },
});

export type UserStoryEntityType = InferEntity<typeof UserStoryEntity>;
```

#### 3.3.4 `src/task/task.entity.ts`
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
    points: p.integer(),
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

#### 3.3.5 `src/task/task-assignee.entity.ts`
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

#### 3.3.6 Compléter `src/index.ts`
Ajouter les exports + entries dans le tableau `entities`.

---

### 3.4 P1.4 — `scrum-backend` : child entities de Task (Comment, Attachment, History)

#### 3.4.1 Compléter `src/types.ts`
```ts
export const COMMENT_TYPES = ["comment", "status-change", "assignment", "github-push", "other"] as const;
export const CommentTypeSchema = z.enum(COMMENT_TYPES);
export type CommentType = z.infer<typeof CommentTypeSchema>;
```

#### 3.4.2 `src/task/comment.entity.ts`
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
    metadata: p.json().nullable(),
    createdAt: p.datetime().onCreate(() => new Date()),
  },
});

export type CommentEntityType = InferEntity<typeof CommentEntity>;
```

#### 3.4.3 `src/task/attachment.entity.ts`
```ts
import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const AttachmentEntity = defineEntity({
  name: "Attachment",
  tableName: "attachments",
  properties: {
    id: p.string().primary(),
    taskId: p.string().nullable().index(),
    projectId: p.string().nullable().index(),   // V2 — attachments de projet
    name: p.string(),
    url: p.string(),
    mimeType: p.string(),
    sizeBytes: p.integer(),
    uploadedById: p.string().index(),
    createdAt: p.datetime().onCreate(() => new Date()),
  },
});

export type AttachmentEntityType = InferEntity<typeof AttachmentEntity>;
```

#### 3.4.4 `src/task/history-entry.entity.ts`
```ts
import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const HistoryEntryEntity = defineEntity({
  name: "HistoryEntry",
  tableName: "history_entries",
  properties: {
    id: p.string().primary(),
    ownerType: p.string(),                        // "task" | "project" | "user-story" | "sprint"
    ownerId: p.string().index(),
    type: p.string(),
    description: p.string(),
    userId: p.string().index(),
    metadata: p.json().nullable(),
    createdAt: p.datetime().onCreate(() => new Date()),
  },
});

export type HistoryEntryEntityType = InferEntity<typeof HistoryEntryEntity>;
```

#### 3.4.5 Compléter `src/index.ts`

---

### 3.5 P1.5 — `scrum-backend` : Sprint aggregate

#### 3.5.1 Compléter `src/types.ts`
```ts
export const SPRINT_STATUSES = ["planned", "active", "completed"] as const;
export const SprintStatusSchema = z.enum(SPRINT_STATUSES);
export type SprintStatus = z.infer<typeof SprintStatusSchema>;
```

#### 3.5.2 `src/sprint/sprint.entity.ts`
```ts
import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const SprintEntity = defineEntity({
  name: "Sprint",
  tableName: "sprints",
  properties: {
    id: p.string().primary(),
    name: p.string(),                   // "Sprint 88"
    goal: p.string().nullable(),
    projectId: p.string().index(),
    startDate: p.datetime(),
    endDate: p.datetime(),
    status: p.string(),                 // SprintStatus
    velocityPoints: p.integer().default(0),    // points cible
    completedPoints: p.integer().default(0),   // réalisés à la clôture
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p.datetime().onUpdate(() => new Date()).onCreate(() => new Date()),
  },
});

export type SprintEntityType = InferEntity<typeof SprintEntity>;
```

#### 3.5.3 Compléter `src/index.ts` (final pour scrum-backend)
```ts
import { ProjectEntity } from "#src/project/project.entity.js";
import { ProjectMemberEntity } from "#src/project/project-member.entity.js";
import { EpicEntity } from "#src/epic/epic.entity.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import { TaskEntity } from "#src/task/task.entity.js";
import { TaskAssigneeEntity } from "#src/task/task-assignee.entity.js";
import { CommentEntity } from "#src/task/comment.entity.js";
import { AttachmentEntity } from "#src/task/attachment.entity.js";
import { HistoryEntryEntity } from "#src/task/history-entry.entity.js";
import { SprintEntity } from "#src/sprint/sprint.entity.js";

export * from "#src/project/project.entity.js";
export * from "#src/project/project-member.entity.js";
export * from "#src/epic/epic.entity.js";
export * from "#src/user-story/user-story.entity.js";
export * from "#src/task/task.entity.js";
export * from "#src/task/task-assignee.entity.js";
export * from "#src/task/comment.entity.js";
export * from "#src/task/attachment.entity.js";
export * from "#src/task/history-entry.entity.js";
export * from "#src/sprint/sprint.entity.js";
export * from "#src/types.js";

export const entities = [
  ProjectEntity,
  ProjectMemberEntity,
  EpicEntity,
  UserStoryEntity,
  TaskEntity,
  TaskAssigneeEntity,
  CommentEntity,
  AttachmentEntity,
  HistoryEntryEntity,
  SprintEntity,
];
```

---

### 3.6 P1.6 — Créer `@libs/time-tracking-backend`

#### 3.6.1 Scaffolder + `src/entities/time-entry.entity.ts`
```ts
import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const TimeEntryEntity = defineEntity({
  name: "TimeEntry",
  tableName: "time_entries",
  properties: {
    id: p.string().primary(),
    taskId: p.string().index(),       // FK vers scrum-backend (string, pas relation)
    userId: p.string().index(),       // FK vers users-backend
    projectId: p.string().index(),    // dénormalisé pour les rapports
    hours: p.float(),
    date: p.datetime(),               // jour du travail (≠ createdAt)
    description: p.string().nullable(),
    createdAt: p.datetime().onCreate(() => new Date()),
  },
});

export type TimeEntryEntityType = InferEntity<typeof TimeEntryEntity>;
```

#### 3.6.2 `src/index.ts`
```ts
import { TimeEntryEntity } from "#src/entities/time-entry.entity.js";

export * from "#src/entities/time-entry.entity.js";

export const entities = [TimeEntryEntity];
```

#### 3.6.3 CLAUDE.md
Documenter : add-on séparé du bounded context Scrum, FK string vers Task/User/Project, conçu pour être remplacé ou retiré sans impact.

---

### 3.7 P1.7 — Enregistrer toutes les entités dans `@apps/backend`

#### 3.7.1 `@apps/backend/src/app/database.connection.ts`
```ts
import { defineConfig, MikroORM } from "@mikro-orm/postgresql";
import type { AppConfiguration } from "../configuration.js";
import { entities as usersEntities } from "@libs/users-backend";
import { entities as scrumEntities } from "@libs/scrum-backend";
import { entities as timeTrackingEntities } from "@libs/time-tracking-backend";

export function databaseConfig(config: Pick<AppConfiguration, "DATABASE_URI">) {
  return defineConfig({
    seeder: { pathTs: "./src/seeders" },
    clientUrl: config.DATABASE_URI,
    entities: [
      ...usersEntities,
      ...scrumEntities,
      ...timeTrackingEntities,
    ],
  });
}
```

#### 3.7.2 `@apps/backend/tests/global-setup.ts` (mêmes imports)

#### 3.7.3 `@apps/backend/package.json` — ajouter :
```json
"@libs/scrum-backend": "workspace:*",
"@libs/time-tracking-backend": "workspace:*",
```

#### 3.7.4 `pnpm install` + smoke
```bash
pnpm install
pnpm -F @apps/backend build:deps
cd @apps/backend && pnpm schema:fresh   # Docker postgres requis
```

Vérifier les 13 tables dans psql : `users`, `refresh_tokens`, `projects`, `project_members`, `epics`, `user_stories`, `tasks`, `task_assignees`, `comments`, `attachments`, `history_entries`, `sprints`, `time_entries`.

---

### 3.8 P1.8 — Seeder dev réaliste

#### 3.8.1 Architecture
Modifier `@apps/backend/src/seeders/development.seeder.ts` :
1. 7 Users (password commun `123456789` hashé argon2).
2. 3 Projects + ProjectMembers.
3. 2 Epics (E-Commerce) + 5 UserStories (`us1`-`us5`).
4. 7 Sprints (Sprint 84-87 completed, Sprint 88 active, Sprint 89-90 planned).
5. 17 Tasks (numéros 1001-1017, 8 dans Sprint 88).
6. TaskAssignees (Claire sur 6 tasks).
7. ~10 TimeEntries de Claire sur Sprint 88 (totalisant ~17h).
8. Quelques Comments/HistoryEntries pour donner du contexte.

#### 3.8.2 Données précises (depuis les screenshots)

**Users** (avec `color` distinct pour les pastilles) :
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
| id                    | name                  | status   | responsible | createdAt   |
|-----------------------|-----------------------|----------|-------------|-------------|
| `project-ecommerce`   | E-Commerce Platform   | active   | Bob Durant  | 2025-01-01  |
| `project-banking`     | Mobile Banking App    | active   | Bob Durant  | 2025-01-05  |
| `project-crm`         | CRM System            | planned  | Bob Durant  | 2025-01-10  |

**ProjectMembers** (cf. screenshot Utilisateurs `08-users.png`) :
- Bob, Claire : 3 projets (tous)
- David : E-Commerce, CRM
- Emma : E-Commerce, Mobile
- François : E-Commerce
- Gaëlle : (au moins 1, à confirmer dans le screenshot)
- Alice : 0 projet

**Epics (E-Commerce)** :
- `epic-auth` "User Authentication" — 2 US (us1, us2) — 5 tasks (4 done)
- `epic-catalog` "Product Catalog" — 3 US (us3, us4, us5) — 7 tasks (1 done)

**User Stories (E-Commerce)** :
| id     | titre                          | epic         |
|--------|--------------------------------|--------------|
| `us1`  | Login utilisateur              | epic-auth    |
| `us2`  | Inscription utilisateur        | epic-auth    |
| `us3`  | Affichage des produits         | epic-catalog |
| `us4`  | Recherche de produits          | epic-catalog |
| `us5`  | Filtres de produits            | epic-catalog |

**Sprints (E-Commerce)** :
| id          | status     | start       | end         | goal                                                       |
|-------------|------------|-------------|-------------|------------------------------------------------------------|
| `sprint-84` | completed  | 2024-11-04  | 2024-11-17  | (historique)                                               |
| `sprint-85` | completed  | 2024-11-18  | 2024-12-01  | (historique)                                               |
| `sprint-86` | completed  | 2024-12-02  | 2024-12-15  | (historique)                                               |
| `sprint-87` | completed  | 2024-12-16  | 2024-12-29  | (historique)                                               |
| `sprint-88` | active     | 2025-01-20  | 2025-02-02  | Finaliser le tunnel d'achat et intégrer le paiement Stripe |
| `sprint-89` | planned    | 2025-02-03  | 2025-02-16  | Amélioration de la gestion des expéditions et suivi colis  |
| `sprint-90` | planned    | 2025-02-17  | 2025-03-02  | Optimisation des performances et refonte du tableau admin  |

**Tasks** — 8 dans Sprint 88 (E-Commerce) :
| # | title                                | type     | nature  | points | status      | sprint | US  | assignées      |
|---|--------------------------------------|----------|---------|--------|-------------|--------|-----|----------------|
| 1005 | Implémenter formulaire d'inscription | Frontend | Feature | 2 | in-progress | 88 | us2 | Claire         |
| 1006 | Créer liste de produits              | Frontend | Feature | 3 | in-progress | 88 | us3 | Claire, David  |
| 1008 | Pagination produits                  | Frontend | Feature | 2 | todo        | 88 | us3 | Claire         |
| 1009 | Barre de recherche                   | Frontend | Feature | 3 | uat         | 88 | us4 | Claire         |
| 1011 | Filtres catégories                   | Frontend | Feature | 2 | done        | 88 | us5 | Claire         |
| 1012 | Filtres prix                         | Frontend | Feature | 1 | todo        | 88 | us5 | Claire         |

Plus 5 dans le backlog (cf. `03-backlog.png`, `sprintId` null) :
| # | title                       | type     | nature   | points | US  |
|---|-----------------------------|----------|----------|--------|-----|
| 1013 | Optimiser performance liste | Frontend | Techdebt | 3 | us3 |
| 1014 | Corriger bug images         | Frontend | Bug      | 2 | -   |
| 1015 | Documentation API           | Backend  | Review   | 5 | -   |
| 1016 | Setup CI/CD                 | DevOps   | Infra    | 8 | -   |
| 1017 | Refactoring composants      | Frontend | Refacto  | 5 | -   |

**TimeEntries Sprint 88 (Claire)** :
~17h total réparties sur ~10 entries du 20/01 au 25/01 sur tasks 1005, 1006, 1008, 1011, 1012. Exemple :
```ts
em.create(TimeEntryEntity, {
  id: 'time-001',
  taskId: 'task-1005',
  userId: 'user-claire',
  projectId: 'project-ecommerce',
  hours: 2.5,
  date: new Date('2025-01-20T09:00:00Z'),
  description: 'Démarrage du formulaire inscription',
});
```

#### 3.8.3 IDs déterministes
Pour faciliter debug + E2E :
- Users : `user-alice`, `user-bob`, `user-claire`, `user-david`, `user-emma`, `user-francois`, `user-gaelle`
- Projects : `project-ecommerce`, `project-banking`, `project-crm`
- Epics : `epic-auth`, `epic-catalog`
- User Stories : `us1` à `us5`
- Sprints : `sprint-84` à `sprint-90`
- Tasks : `task-1001` à `task-1017`
- TimeEntries : `time-001`, `time-002`, …

#### 3.8.4 E2E seeder (`@apps/backend/src/seeders/e2e.seeder.ts`)
Garder minimal : juste l'utilisateur de login `claire.dubois@sprintforge.com` (identité par défaut pour les E2E SprintForge). Étendre au besoin dans les tests E2E.

---

### 3.9 P1.9 — schema:fresh + smoke

```bash
docker compose up -d           # postgres
cd @apps/backend
pnpm install
pnpm schema:fresh              # drop + recreate + seed automatique

# Vérification psql
psql -h localhost -U backend_user -d database_dev
\dt                                                           # liste les 13 tables
SELECT COUNT(*) FROM users;                                   # attendu : 7
SELECT COUNT(*) FROM projects;                                # attendu : 3
SELECT COUNT(*) FROM sprints WHERE status='active';           # attendu : 1
SELECT COUNT(*) FROM tasks WHERE sprint_id IS NOT NULL;       # attendu : 8 (Sprint 88)
SELECT SUM(hours) FROM time_entries WHERE user_id='user-claire';   # attendu : ~17
```

---

## 4. Stratégie de tests

| Niveau                            | Outil                  | Couverture P1                                                              |
|-----------------------------------|------------------------|----------------------------------------------------------------------------|
| Unit entités                      | vitest                 | 1 test par entité (round-trip création + propriétés) — pas de DB requise   |
| Unit serializers                  | vitest                 | (P2 — pas de serializer en P1)                                             |
| Integration                       | vitest + testcontainer | (P2 — pas de route en P1)                                                  |
| Smoke schema                      | psql manuel            | §3.9 — 13 tables existent et seeder peuple                                 |
| Type-check                        | oxlint --type-check    | `pnpm lint` global doit rester vert après chaque sous-phase                |

---

## 5. Critères de succès

| # | Critère                                                                              | Mesure                                                       |
|---|--------------------------------------------------------------------------------------|--------------------------------------------------------------|
| 1 | `UserEntity` a `role`, `color`, `avatar`, `createdAt`, `updatedAt`                   | inspection `user.entity.ts`                                  |
| 2 | 2 nouvelles libs créées (`scrum-backend`, `time-tracking-backend`)                   | `ls @libs/`                                                  |
| 3 | `scrum-backend/src/` organisé en sous-dossiers par agrégat                            | `tree @libs/scrum-backend/src/`                              |
| 4 | 13 entités modélisées et exportées (users + refresh_tokens + 10 scrum + 1 time-tracking) | `grep "defineEntity" @libs/*-backend/src/`                   |
| 5 | `databaseConfig.entities` agrège les 3 lots                                          | inspection `database.connection.ts`                          |
| 6 | `pnpm schema:fresh` produit 13 tables sans erreur                                    | `\dt` dans psql                                              |
| 7 | Seeder peuple 7 users / 3 projets / 1 sprint actif / 8 tasks dans Sprint 88          | requêtes COUNT psql                                          |
| 8 | `pnpm lint` global vert                                                              | exécution                                                    |
| 9 | `pnpm turbo build` vert pour les 2 nouvelles libs                                    | inspection `dist/`                                           |

---

## 6. Suite après P1

```
/TPK-plan P2 — APIs JSON:API par domaine
```

P2 ajoutera, pour chaque lib backend créée en P1 :
- Routes CRUD JSON:API par agrégat racine (list, get, create, update, delete).
- Routes relationnelles (`/projects/:id/tasks`, `/sprints/:id/tasks`, `/user-stories/:id/tasks`, etc.).
- Endpoints transversaux : `/search`, `/dashboard`, `/sprints/:id/start`, `/sprints/:id/stop`.
- `ScrumModule.setupRoutes` qui monte `/projects`, `/epics`, `/user-stories`, `/tasks`, `/sprints` sous un seul auth middleware.
- `TimeTrackingModule.setupRoutes` séparé pour `/time-entries`.
- Serializers JSON:API par agrégat.
- Tests intégration par route.

---

## 7. Annexes

### 7.1 Inventaire fichiers touchés / créés

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
- `CLAUDE.md` (racine) et `@libs/CLAUDE.md`

**Créations**
- `@libs/scrum-backend/` : package.json, tsconfig.json, tsdown.config.mts, vitest.config.mts, .oxlintrc.json, .oxfmtrc.json, CLAUDE.md, src/{index.ts, types.ts, context.ts, init.ts}
  - `src/project/{project.entity.ts, project-member.entity.ts}`
  - `src/epic/{epic.entity.ts}`
  - `src/user-story/{user-story.entity.ts}`
  - `src/task/{task.entity.ts, task-assignee.entity.ts, comment.entity.ts, attachment.entity.ts, history-entry.entity.ts}`
  - `src/sprint/{sprint.entity.ts}`
  - `tests/{global-setup.ts, unit/}`
- `@libs/time-tracking-backend/` : (squelette standard) + `src/entities/time-entry.entity.ts`

### 7.2 Inventaire entités (13 total)

| Table              | Lib                       | Bounded context | Notes                                |
|--------------------|---------------------------|-----------------|--------------------------------------|
| users              | users-backend             | Identity        | étendue avec role/color/avatar       |
| refresh_tokens     | users-backend             | Identity        | inchangée                            |
| projects           | scrum-backend             | Scrum           | aggregate root                       |
| project_members    | scrum-backend             | Scrum           | child de Project                     |
| epics              | scrum-backend             | Scrum           | aggregate root                       |
| user_stories      | scrum-backend             | Scrum           | aggregate root                       |
| tasks              | scrum-backend             | Scrum           | aggregate root                       |
| task_assignees     | scrum-backend             | Scrum           | child de Task                        |
| comments           | scrum-backend             | Scrum           | child de Task                        |
| attachments        | scrum-backend             | Scrum           | child de Task (V2 : projet aussi)    |
| history_entries    | scrum-backend             | Scrum           | child polymorphe (ownerType)         |
| sprints            | scrum-backend             | Scrum           | aggregate root                       |
| time_entries       | time-tracking-backend     | Time Tracking   | add-on séparé                        |

### 7.3 Questions à valider avant `/TPK-build`
- **Granularité commits** : un commit par sous-phase (8 commits) ou un seul commit "feat(backend): modèles SprintForge complets" ? Recommandation : 1 par sous-phase pour une revue progressive.
- **IDs déterministes** : confirmer `user-claire` style vs UUID. Recommandation : déterministes en dev/E2E pour fiabiliser tests et debug, UUID en prod (créés via routes API en P2).
- **`Task.number`** : numéros explicites en P1 (1001-1017), helper repo en P2. Confirmé.
- **Test minimum** : 1 unit test par entité (round-trip) ou se contenter du smoke `schema:fresh` ? Recommandation : 1 test par entité (~20 min de coût, gros gain en confiance).
- **Sous-dossiers d'agrégat dans scrum-backend/src/** : confirmer la structure `src/project/`, `src/epic/`, etc. plutôt que `src/entities/`.
