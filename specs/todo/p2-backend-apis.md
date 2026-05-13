# Plan P2 — APIs JSON:API par domaine

> Phase d'exposition HTTP de la migration vers SprintForge (cf. `specs/done/sprintforge-migration-macro-plan.md`).
>
> But : exposer en JSON:API toutes les entités créées en P1, plus deux endpoints transversaux (search, dashboard) et deux actions Sprint (start, stop). Tout est protégé par `jwtAuthMiddleware`.
>
> **P1 a livré les modèles + le seeder. P2 livre les routes.**

---

## 1. Problème & objectifs

### 1.1 État après P1
- 13 tables peuplées par le seeder (7 users, 3 projets, 7 sprints…).
- `@libs/users-backend` expose déjà `/api/v1/auth/*` et `/api/v1/users/*`.
- `@libs/scrum-backend` et `@libs/time-tracking-backend` exposent **0 route HTTP** (juste les entités).
- `ScrumModule.init` et `TimeTrackingModule` (à créer) sont des placeholders.

### 1.2 Objectifs P2
1. **CRUD JSON:API pour chaque agrégat racine** : Project, Epic, UserStory, Task, Sprint, TimeEntry → 6 × 5 = 30 routes CRUD.
2. **Routes relationnelles** : `GET /projects/:id/{tasks,sprints,epics,user-stories,members}`, `GET /epics/:id/user-stories`, `GET /user-stories/:id/tasks`, `GET /sprints/:id/tasks` → ~10 routes.
3. **Actions Sprint** : `POST /sprints/:id/start`, `POST /sprints/:id/stop` → 2 routes.
4. **Endpoints transversaux** : `GET /search?q=…`, `GET /dashboard?projectId=…` → 2 routes.
5. **Convention `Task.number`** : compteur scoped projet en transaction (MAX+1) — helper repo dans scrum-backend.
6. **Auth** : toutes les routes (sauf `/auth/*`) protégées par `jwtAuthMiddleware`.
7. **Tests intégration** : 1 happy-path par route, plus quelques cas d'erreur (404, 401).
8. **`pnpm api:types` régénère `api-types.ts`** pour usage P3 (front).

### 1.3 Non-objectifs (P2 ne fait PAS)
- Pas de routes front (P3+).
- Pas de modale ni composant Ember.
- Pas de filtre full-text (juste ILIKE).
- Pas de sparse fieldsets ni includes JSON:API (déférés).
- Pas d'upload binaire d'attachment (la route CRUD attachment stocke juste URL + metadata).
- Pas de WebSocket / temps-réel.

---

## 2. Approche technique

### 2.0 Référence canonique : `@libs/users-backend`

**Toutes les conventions techniques de P2 reproduisent exactement le pattern de `users-backend`.** En cas de doute lors de l'implémentation, ouvrir le fichier équivalent dans `users-backend` et le mimer.

| Fichier de référence à mimer                                              | Pour implémenter                                              |
|---------------------------------------------------------------------------|---------------------------------------------------------------|
| `@libs/users-backend/src/init.ts` — classe `UserModule`                   | `ScrumModule`, `TimeTrackingModule`                           |
| `@libs/users-backend/src/routes/list.route.ts`                            | `ListProjectsRoute`, `ListTasksRoute`, etc.                   |
| `@libs/users-backend/src/routes/get.route.ts`                             | `GetProjectRoute`, etc.                                       |
| `@libs/users-backend/src/routes/create.route.ts`                          | `CreateProjectRoute`, etc.                                    |
| `@libs/users-backend/src/routes/update.route.ts`                          | `UpdateProjectRoute`, etc.                                    |
| `@libs/users-backend/src/routes/delete.route.ts`                          | `DeleteProjectRoute`, etc.                                    |
| `@libs/users-backend/src/serializers/user.serializer.ts`                  | `project.serializer.ts`, etc.                                 |
| `@libs/users-backend/src/context.ts`                                      | `ScrumLibraryContext` (mêmes champs : `em` + `configuration.jwtSecret`) |
| `@libs/users-backend/src/index.ts`                                        | re-exports de toutes les routes + serializers + entities      |
| `@libs/users-backend/tests/utils/setup-module.ts` — classe `TestModule`   | `ScrumTestModule`, `TimeTrackingTestModule`                   |
| `@libs/users-backend/tests/integration/*.route.test.ts`                   | Tests intégration par route                                   |

**Invariants stricts à respecter** (extraits du pattern users-backend) :
1. **Route = classe** implémentant `Route<FastifyInstanceTypeForModule>` de `@libs/backend-shared`, avec un constructor qui reçoit ses dépendances (repository et/ou em).
2. **`setupRoutes`** d'un Module : un seul `fastify.register(async (f) => { … }, { prefix: "/xxx" })` par groupe. À l'intérieur, dans cet ordre :
   1. Construire le tableau `const routes: Route<...>[] = [new ListRoute(...), new GetRoute(...), ...]`
   2. `f.setErrorHandler((error, request, reply) => handleJsonApiErrors(error, request, reply))`
   3. `const jwtAuth = createJwtAuthMiddleware(em, jwtSecret); f.addHook("preValidation", jwtAuth)`
   4. `for (const route of routes) { route.routeDefinition(f) }`
3. **`createJwtAuthMiddleware`** vient de `@libs/users-backend` (export public). Le scrum-backend et time-tracking-backend l'importent — c'est la seule dépendance cross-lib autorisée vers users-backend.
4. **Repository** : passé au constructor pour les routes qui opèrent sur une seule entité (`Get`, `Create`, `Update`, `Delete`). `em` pour les routes qui font des requêtes complexes (`List` avec `findAndCount`, search, dashboard).
5. **Schemas Zod** déclarés inline dans `routeDefinition` (body, params, querystring, response). Toujours déclarer le code HTTP de réponse (200, 401, 404…).
6. **Erreurs** : `makeJsonApiError(status, title, { code, detail })` de `@libs/backend-shared`. Schéma response correspondant : `jsonApiErrorDocumentSchema`.

### 2.1 Conventions JSON:API à adopter (et durcir)
| Concern              | Convention                                                                              |
|----------------------|-----------------------------------------------------------------------------------------|
| Content-Type accepté | `application/vnd.api+json` et `application/json` (déjà câblé dans `app.ts`)             |
| Pagination           | `page[number]` (default 1) + `page[size]` (default 25, max 100) — `meta.total`, `meta.pages` |
| Filtrage             | `filter[<field>]=<value>` — par ex. `filter[status]=active`, `filter[projectId]=...`    |
| Filtre recherche     | `filter[search]=...` (ILIKE sur title/name/description selon agrégat)                   |
| Tri                  | `sort=field` ou `sort=-field` (DESC). Multi : `sort=priority,-createdAt`                |
| Includes             | **Non supporté en P2** — utiliser routes relationnelles à la place                      |
| Erreurs              | `makeJsonApiError(status, title, {code, detail})` — code HTTP + body conformes          |
| ID                   | UUID v4 généré côté serveur si non fourni dans le body                                  |

### 2.2 Architecture d'une route (template hérité de `users-backend`)
```ts
export class ListProjectsRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get("/", {
      schema: {
        querystring: ListQuerySchema,        // page, filter, sort
        response: {
          200: object({
            data: array(SerializedProjectSchema),
            meta: object({ total: number(), pages: number() }),
          }),
        },
      },
    }, async (request, reply) => {
      const { where, orderBy, page, limit } = parseListQuery(request.query);
      const [items, total] = await this.em.getRepository(ProjectEntity)
        .findAndCount(where, { orderBy, offset: (page - 1) * limit, limit });
      return reply.send({
        data: items.map(jsonApiSerializeProject),
        meta: { total, pages: Math.ceil(total / limit) },
      });
    });
  }
}
```

### 2.3 Organisation des fichiers dans `scrum-backend`
```
src/
├── project/
│   ├── project.entity.ts            (P1)
│   ├── project-member.entity.ts     (P1)
│   ├── project.serializer.ts        ← P2
│   ├── routes/
│   │   ├── list.route.ts            ← P2
│   │   ├── get.route.ts             ← P2
│   │   ├── create.route.ts          ← P2
│   │   ├── update.route.ts          ← P2
│   │   ├── delete.route.ts          ← P2
│   │   └── relationships.routes.ts  ← P2 (members, epics, user-stories, tasks, sprints)
│   └── project.repo.ts              ← P2 (helper repo pour requêtes complexes)
├── epic/                            ← idem
├── user-story/                      ← idem
├── task/                            ← idem + comment.routes.ts, attachment.routes.ts (P2)
├── sprint/                          ← idem + actions.routes.ts (start, stop)
├── dashboard/                       ← P2 nouveau
│   └── dashboard.route.ts
├── search/                          ← P2 nouveau
│   └── search.route.ts
├── helpers/                         ← P2 nouveau
│   ├── list-query.ts                parseListQuery, ListQuerySchema (Zod)
│   ├── task-numbering.ts            getNextTaskNumber(em, projectId)
│   └── auth-mounter.ts              (optionnel) wrapping pour appliquer JWT à tous
├── types.ts                         (P1)
├── context.ts                       ← étendu en P2 (configuration: { jwtSecret })
├── init.ts                          ← ScrumModule.setupRoutes complet
└── index.ts
```

### 2.4 Décisions structurantes (actées)
| Décision                                                                                                     | Choix retenu                                                                  |
|--------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------|
| Préfixe global                                                                                               | `/api/v1` + agrégats à la racine : `/projects`, `/epics`, `/tasks`, etc. (pas de namespace `/scrum`) |
| Granularité commits                                                                                          | 1 commit par sous-phase (11 commits)                                           |
| Routes relationnelles cross-agrégats                                                                         | Copier-coller au début (pas d'abstraction générique)                           |
| TimeTracking — agrégat heures totales                                                                        | `meta.totalHours` dans la list `/time-entries` (pas d'endpoint summary dédié)  |
| Comment / Attachment / HistoryEntry : routes ?                                                               | Sous-routes de Task : `/tasks/:id/comments`, `/tasks/:id/attachments`, `/tasks/:id/history` |
| ProjectMember CRUD                                                                                            | Sous-routes de Project : `POST /projects/:id/members`, `DELETE /projects/:id/members/:userId` |
| TaskAssignee CRUD                                                                                             | Sous-routes de Task : `POST /tasks/:id/assignees`, `DELETE /tasks/:id/assignees/:userId` |
| Search                                                                                                       | `/search?q=…&types=projects,tasks` — résultats groupés par type                |
| Dashboard                                                                                                    | `/dashboard?projectId=…&sprintId=…` — agrégations pour l'utilisateur courant   |
| Sprint actions                                                                                                | `POST /sprints/:id/start` (planned → active, vérifie qu'il n'y a pas déjà un actif pour ce projet), `POST /sprints/:id/stop` (active → completed, recalcule completedPoints) |
| `Task.number` génération                                                                                      | Helper `getNextTaskNumber(em, projectId)` en `em.transactional` (SELECT FOR UPDATE) |

### 2.5 Granularité des sous-phases

```
P2.1 — Infrastructure : helpers (list-query, task-numbering), context étendu, ScrumModule squelette
P2.2 — Project : routes CRUD + serializer + tests (5 routes + members sous-routes)
P2.3 — Epic : routes CRUD + serializer + tests
P2.4 — UserStory : routes CRUD + serializer + tests
P2.5 — Task : routes CRUD + serializer + helper number + sous-routes Comment/Attachment/History/Assignees + tests
P2.6 — Sprint : routes CRUD + serializer + actions start/stop + tests
P2.7 — Routes relationnelles cross-agrégats (projects/:id/tasks, sprints/:id/tasks, etc.)
P2.8 — TimeTracking : Module + routes CRUD + serializer + filtres rapport + tests
P2.9 — Search + Dashboard endpoints
P2.10 — Mount dans @apps/backend (ScrumModule.init + TimeTrackingModule.init dans app.ts/app.router.ts)
P2.11 — pnpm api:types : régénération api-types.ts + validation Swagger UI
```

Chaque sous-phase = 1 commit cohérent. **Validation incrémentale** : tests intégration verts après chaque sous-phase.

### 2.6 Risques & parades
| Risque                                                                                              | Parade                                                                                   |
|-----------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------|
| `FST_ERR_RESPONSE_SERIALIZATION` (Zod response schema ne matche pas le payload)                     | Tester chaque route happy-path en intégration ; vérifier que serializer produit des Date sérialisables (toISOString) |
| `Task.number` race condition                                                                        | Utiliser `em.transactional` + verrouillage explicite via `repository.qb().forUpdate()`   |
| Volumétrie : `findAndCount` lent sur grosses tables                                                 | Pagination par défaut + index déjà en place sur les FK depuis P1                          |
| Cross-lib EntityManager (TimeEntry filtre par projectId — projet stocké dans scrum-backend)         | TimeTrackingModule prend son propre em.fork() — accès aux entités scrum via mêmes tables (pas d'import d'entité) |
| Sprint start : assurer qu'il n'y a qu'un seul `active` par projet                                    | `transactional` : check `count(status='active' AND projectId=…)` avant update             |
| Comment.metadata JSON                                                                                | Stocker comme JSON natif via `p.json()` — déclarer le schéma Zod comme `z.record(z.unknown())` |
| `delete` sur Project doit-il cascader ?                                                              | MVP : 409 si le projet a encore des tasks/sprints/epics — pas de soft delete              |

### 2.7 Stratégie de commits
- `feat(scrum-backend): helpers list-query + task-numbering`
- `feat(scrum-backend): Project CRUD JSON:API`
- `feat(scrum-backend): Epic CRUD JSON:API`
- `feat(scrum-backend): UserStory CRUD JSON:API`
- `feat(scrum-backend): Task CRUD + Comment/Attachment/History/Assignee sous-routes`
- `feat(scrum-backend): Sprint CRUD + actions start/stop`
- `feat(scrum-backend): routes relationnelles cross-agrégats`
- `feat(time-tracking-backend): TimeEntry CRUD JSON:API`
- `feat(scrum-backend): /search et /dashboard transversaux`
- `chore(backend): monter ScrumModule et TimeTrackingModule dans app.router`
- `chore(backend): régénérer api-types.ts après ajout des routes SprintForge`

---

## 3. Implémentation pas à pas

### 3.1 P2.1 — Infrastructure

#### 3.1.1 Ajouter les deps Fastify à `scrum-backend` + `time-tracking-backend`
```json
"dependencies": {
  "@fastify/cookie": "catalog:",
  "fastify": "catalog:",
  "fastify-type-provider-zod": "catalog:",
  ...
}
```

#### 3.1.2 `src/helpers/list-query.ts`
```ts
import { z } from "zod";

export const ListQuerySchema = z.object({
  "page[number]": z.coerce.number().int().min(1).default(1).optional(),
  "page[size]": z.coerce.number().int().min(1).max(100).default(25).optional(),
  sort: z.string().optional(),
  // filter[<field>]=<value> est libre, parsé dans parseListQuery
}).passthrough();

export function parseListQuery(query: Record<string, unknown>, allowedSortFields: string[]) {
  const page = Number(query["page[number]"] ?? 1);
  const limit = Math.min(Number(query["page[size]"] ?? 25), 100);
  const sortParam = (query["sort"] as string) ?? "";
  const orderBy: Record<string, "ASC" | "DESC"> = {};
  for (const field of sortParam.split(",").filter(Boolean)) {
    const desc = field.startsWith("-");
    const name = desc ? field.slice(1) : field;
    if (allowedSortFields.includes(name)) orderBy[name] = desc ? "DESC" : "ASC";
  }
  const where: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(query)) {
    const m = k.match(/^filter\[(\w+)\]$/);
    if (m && m[1] !== "search") where[m[1]] = v;
  }
  const search = query["filter[search]"] as string | undefined;
  return { where, orderBy, page, limit, search };
}
```

#### 3.1.3 `src/helpers/task-numbering.ts`
```ts
import type { EntityManager } from "@mikro-orm/core";
import { TaskEntity } from "#src/task/task.entity.js";

export async function getNextTaskNumber(em: EntityManager, projectId: string): Promise<number> {
  return em.transactional(async (txEm) => {
    const result = await txEm
      .createQueryBuilder(TaskEntity)
      .select("max(number) as max")
      .where({ projectId })
      .execute("get");
    const max = (result?.max as number | null) ?? 1000; // démarrage à 1001 si projet vide
    return max + 1;
  });
}
```

#### 3.1.4 `src/context.ts` étendu
```ts
import type { EntityManager } from "@mikro-orm/core";

export interface ScrumLibraryContext {
  em: EntityManager;
  configuration: { jwtSecret: string };
}
```

#### 3.1.5 `src/init.ts` — squelette `ScrumModule`

Note structurelle : `ScrumModule` doit monter **5 préfixes** (`/projects`, `/epics`, `/user-stories`, `/tasks`, `/sprints`) tous protégés par le même JWT. On utilise un `register` externe (auth + errorHandler) puis un `register` interne par préfixe — les hooks Fastify s'héritent par encapsulation.

```ts
import { handleJsonApiErrors, type ModuleInterface, type Route } from "@libs/backend-shared";
import { createJwtAuthMiddleware } from "@libs/users-backend";
import type { ScrumLibraryContext } from "./context.js";
import type { FastifyInstanceTypeForModule } from "./types-fastify.js";

export class ScrumModule implements ModuleInterface<FastifyInstanceTypeForModule> {
  private constructor(private context: ScrumLibraryContext) {}
  public static init(context: ScrumLibraryContext) { return new ScrumModule(context); }

  public async setupRoutes(fastify: FastifyInstanceTypeForModule): Promise<void> {
    await fastify.register(async (f) => {
      // ErrorHandler + JWT appliqués à tout ce qui est registered en dessous (héritage Fastify)
      f.setErrorHandler((error, request, reply) => {
        handleJsonApiErrors(error, request, reply);
      });
      const jwtAuth = createJwtAuthMiddleware(
        this.context.em,
        this.context.configuration.jwtSecret,
      );
      f.addHook("preValidation", jwtAuth);

      // Préfixes — chacun reproduit le pattern UserModule.setupRoutes
      await this.mountProjects(f);
      await this.mountEpics(f);
      await this.mountUserStories(f);
      await this.mountTasks(f);
      await this.mountSprints(f);
      await this.mountSearch(f);
      await this.mountDashboard(f);
    });
  }

  // mountX méthodes ajoutées progressivement (cf. §3.2.3)
}
```

#### 3.1.6 Critères de succès P2.1
- Lint vert.
- `ScrumModule.init({ em, configuration: { jwtSecret } })` compile.
- Pas encore de routes exposées (Swagger vide pour scrum).

---

### 3.2 P2.2 → P2.6 — CRUD par agrégat (template)

Pour chaque agrégat (Project, Epic, UserStory, Task, Sprint) :

#### 3.2.1 Serializer (`<aggregate>/<name>.serializer.ts`)
```ts
import { object, string, number, nullable } from "zod";
import { makeJsonApiDocumentSchema } from "@libs/backend-shared";

export const SerializedProjectSchema = makeJsonApiDocumentSchema(
  "projects",
  object({
    name: string(),
    description: string(),
    status: string(),
    avatar: string().nullable(),
    githubUrl: string().nullable(),
    responsibleId: string(),
    createdById: string(),
    createdAt: string(),  // ISO 8601
    updatedAt: string(),
  }),
);

export function jsonApiSerializeProject(p: ProjectEntityType) {
  return {
    id: p.id,
    type: "projects" as const,
    attributes: {
      name: p.name,
      description: p.description,
      status: p.status,
      avatar: p.avatar,
      githubUrl: p.githubUrl,
      responsibleId: p.responsibleId,
      createdById: p.createdById,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    },
  };
}
```

#### 3.2.2 Les 5 routes CRUD
- `list.route.ts` — `GET /` avec pagination/filter/sort
- `get.route.ts` — `GET /:id` (404 si absent)
- `create.route.ts` — `POST /` avec validation Zod du body
- `update.route.ts` — `PATCH /:id` avec body partiel
- `delete.route.ts` — `DELETE /:id` (204 ou 409 si dépendances)

#### 3.2.3 mount<Aggregate> dans `init.ts` — pattern strictement aligné sur `UserModule.setupRoutes`

```ts
private async mountProjects(f: FastifyInstanceTypeForModule) {
  const repository = this.context.em.getRepository(ProjectEntity);

  await f.register(
    async (sub) => {
      // Tableau de routes — même pattern que UserModule
      const projectRoutes: Route<FastifyInstanceTypeForModule>[] = [
        new ListProjectsRoute(this.context.em),
        new GetProjectRoute(repository),
        new CreateProjectRoute(repository),
        new UpdateProjectRoute(repository),
        new DeleteProjectRoute(repository, this.context.em),
        new ListProjectMembersRoute(this.context.em),
        new AddProjectMemberRoute(this.context.em),
        new RemoveProjectMemberRoute(this.context.em),
      ];

      // Pas besoin de re-déclarer errorHandler/jwtAuth : hérités du register externe (cf. §3.1.5)

      for (const route of projectRoutes) {
        route.routeDefinition(sub);
      }
    },
    { prefix: "/projects" },
  );
}
```

Les autres `mountX` suivent exactement le même squelette (changer entity, repository, tableau de routes, prefix).

#### 3.2.4 Cas particuliers par agrégat
| Agrégat     | Particularités                                                                                              |
|-------------|-------------------------------------------------------------------------------------------------------------|
| Project     | `DELETE /:id` → 409 si epics/sprints existent. Routes membres : `GET/POST/DELETE /projects/:id/members[/:userId]` |
| Epic        | Standard CRUD, pas de sous-route                                                                            |
| UserStory   | Standard CRUD                                                                                               |
| Task        | `POST /` : appeler `getNextTaskNumber` si `number` non fourni. Sous-routes : `/tasks/:id/comments`, `/tasks/:id/attachments`, `/tasks/:id/history`, `/tasks/:id/assignees` |
| Sprint      | Sous-routes actions : `POST /sprints/:id/start`, `POST /sprints/:id/stop`. `start` : check qu'aucun sprint n'est actif pour ce projet |

#### 3.2.5 Critères de succès par sous-phase
- 5 routes (+ sous-routes éventuelles) testées en intégration : 1 happy path + 1 cas 404 + 1 cas 401 (sans token).
- Swagger UI liste les routes sous le bon namespace.
- Lint vert.

---

### 3.3 P2.7 — Routes relationnelles cross-agrégats

Pour chaque relation parent → enfant, exposer une route en lecture :

| Route                                  | Implémentation                                                  |
|----------------------------------------|-----------------------------------------------------------------|
| `GET /projects/:id/tasks`              | `TaskEntity` where `projectId = :id`                             |
| `GET /projects/:id/sprints`            | `SprintEntity` where `projectId = :id`                           |
| `GET /projects/:id/epics`              | `EpicEntity` where `projectId = :id`                             |
| `GET /projects/:id/user-stories`       | `UserStoryEntity` where `projectId = :id`                        |
| `GET /epics/:id/user-stories`          | `UserStoryEntity` where `epicId = :id`                           |
| `GET /epics/:id/tasks`                 | `TaskEntity` where `epicId = :id`                                |
| `GET /user-stories/:id/tasks`          | `TaskEntity` where `userStoryId = :id`                           |
| `GET /sprints/:id/tasks`               | `TaskEntity` where `sprintId = :id`                              |

Toutes supportent pagination + filtres + sort (réutilisent `parseListQuery`).

**Implémentation économique** : factoriser dans une classe générique `RelationshipListRoute<TParent, TChild>` ou simplement copier-coller au début et refactor si besoin.

---

### 3.4 P2.8 — `time-tracking-backend`

#### 3.4.1 `src/init.ts` — `TimeTrackingModule`
```ts
export class TimeTrackingModule {
  private constructor(private context: TimeTrackingLibraryContext) {}
  public static init(context: TimeTrackingLibraryContext) { return new TimeTrackingModule(context); }
  public async setupRoutes(fastify: FastifyInstanceTypeForModule) {
    const em = this.context.em;
    const jwtAuth = createJwtAuthMiddleware(em, this.context.configuration.jwtSecret);
    await fastify.register(async (f) => {
      f.addHook("preValidation", jwtAuth);
      f.setErrorHandler(handleJsonApiErrors);
      new ListTimeEntriesRoute(em).routeDefinition(f);
      new GetTimeEntryRoute(em).routeDefinition(f);
      new CreateTimeEntryRoute(em).routeDefinition(f);
      new UpdateTimeEntryRoute(em).routeDefinition(f);
      new DeleteTimeEntryRoute(em).routeDefinition(f);
    }, { prefix: "/time-entries" });
  }
}
```

#### 3.4.2 Filtres spéciaux de `/time-entries`
- `filter[projectId]`
- `filter[userId]`
- `filter[taskId]`
- `filter[date.gte]` et `filter[date.lte]` (range)
- `sort=-date` par défaut

#### 3.4.3 `meta.totalHours` dans la list response
La route `GET /time-entries` calcule `SUM(hours)` sur **tous les enregistrements qui matchent les filtres** (pas seulement la page courante) et l'expose dans `meta.totalHours` :

```ts
// list.route.ts
const [items, total] = await em.getRepository(TimeEntryEntity)
  .findAndCount(where, { orderBy, offset, limit });

// Agrégat indépendant de la pagination
const result = await em
  .createQueryBuilder(TimeEntryEntity)
  .select("COALESCE(SUM(hours), 0) as total")
  .where(where)
  .execute("get");
const totalHours = Number(result?.total ?? 0);

return reply.send({
  data: items.map(jsonApiSerializeTimeEntry),
  meta: { total, pages: Math.ceil(total / limit), totalHours },
});
```

Schéma Zod de la response :
```ts
response: {
  200: object({
    data: array(SerializedTimeEntrySchema),
    meta: object({ total: number(), pages: number(), totalHours: number() }),
  }),
}
```

C'est ce `meta.totalHours` qui alimente le « 89.5 heures au total » de la page Suivi du temps (Figma `07-time-tracking.png`).

---

### 3.5 P2.9 — Search + Dashboard

#### 3.5.1 `GET /search?q=…&types=…`
```ts
// search.route.ts
const types = (request.query.types ?? "projects,tasks,user-stories,epics,sprints").split(",");
const q = String(request.query.q ?? "").trim();
if (q.length < 2) return reply.send({ data: [] });
const results = [];
if (types.includes("projects")) {
  const projects = await em.find(ProjectEntity, { name: { $ilike: `%${q}%` } }, { limit: 10 });
  results.push(...projects.map(jsonApiSerializeProject));
}
if (types.includes("tasks")) { /* idem */ }
// ... etc.
return reply.send({ data: results, meta: { total: results.length } });
```

Réponse : `{ data: [{ id, type, attributes }, ...] }` — JSON:API standard, hétérogène.

#### 3.5.2 `GET /dashboard?projectId=…&sprintId=…`
Réponse :
```ts
{
  data: {
    type: "dashboard",
    attributes: {
      projectId: string,
      sprintId: string,
      tasksCompleted: number,
      tasksTotal: number,
      hoursTotal: number,
      pointsTotal: number,
      myTasks: SerializedTask[],
    },
  },
}
```
- Compte les tâches du sprint avec `assignedTo = currentUserId` ou `createdById = currentUserId`.
- Somme les heures du user courant pour le sprint courant.
- `currentUserId` extrait de `request.user` (déjà injecté par `jwtAuthMiddleware`).

---

### 3.6 P2.10 — Mount dans `@apps/backend`

#### 3.6.1 `@apps/backend/src/app/app.ts`
```ts
import { UserModule, AuthModule } from "@libs/users-backend";
import { ScrumModule } from "@libs/scrum-backend";
import { TimeTrackingModule } from "@libs/time-tracking-backend";

// dans setupRoutes :
await appRouter(this.fastify, {
  authModule: AuthModule.init({ ... }),
  userModule: UserModule.init({ ... }),
  scrumModule: ScrumModule.init({
    em: this.context.orm.em.fork(),
    configuration: { jwtSecret: this.context.configuration.JWT_SECRET },
  }),
  timeTrackingModule: TimeTrackingModule.init({
    em: this.context.orm.em.fork(),
    configuration: { jwtSecret: this.context.configuration.JWT_SECRET },
  }),
});
```

#### 3.6.2 `@apps/backend/src/app/app.router.ts`
```ts
interface AppRouterOptions {
  authModule: AuthModule;
  userModule: UserModule;
  scrumModule: ScrumModule;
  timeTrackingModule: TimeTrackingModule;
}

export async function appRouter(fastify, { authModule, userModule, scrumModule, timeTrackingModule }) {
  await fastify.register(async function (fastify) {
    await fastify.register(statusRoute);
    await authModule.setupRoutes(fastify);
    await userModule.setupRoutes(fastify);
    await scrumModule.setupRoutes(fastify);
    await timeTrackingModule.setupRoutes(fastify);
  }, { prefix: "api/v1" });
}
```

#### 3.6.3 Smoke test
```bash
pnpm dev
# Swagger UI : http://localhost:3000/documentation
# Doit lister tous les endpoints :
# /api/v1/projects, /api/v1/epics, /api/v1/user-stories, /api/v1/tasks,
# /api/v1/sprints, /api/v1/sprints/:id/start, /api/v1/time-entries,
# /api/v1/search, /api/v1/dashboard
```

Test rapide avec un token Bearer Claire (via login `claire.dubois@sprintforge.com` / `123456789`) :
```bash
TOKEN=$(curl -s -X POST localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"data":{"attributes":{"email":"claire.dubois@sprintforge.com","password":"123456789"}}}' \
  | jq -r .data.attributes.accessToken)

curl -H "Authorization: Bearer $TOKEN" localhost:3000/api/v1/projects
# → doit retourner 3 projets

curl -H "Authorization: Bearer $TOKEN" localhost:3000/api/v1/sprints?filter[status]=active
# → doit retourner Sprint 88

curl -H "Authorization: Bearer $TOKEN" "localhost:3000/api/v1/dashboard?projectId=project-ecommerce"
# → doit retourner ~17h, points, tasks Claire
```

---

### 3.7 P2.11 — `pnpm api:types` régénération

```bash
cd @apps/backend
pnpm api:types
# régénère openapi.json + src/api-types.ts depuis les schémas Zod des routes
```

Vérifier que `api-types.ts` contient :
- `paths["/api/v1/projects"]` (GET, POST)
- `paths["/api/v1/projects/{id}"]` (GET, PATCH, DELETE)
- `paths["/api/v1/projects/{id}/tasks"]` (GET)
- ... etc. pour tous les endpoints
- `paths["/api/v1/search"]`, `paths["/api/v1/dashboard"]`
- `paths["/api/v1/sprints/{id}/start"]` et `/stop`

Ce fichier sera consommé par le front en P3+ (via `@apps/backend/src/api-types` pour typage des fetch).

---

## 4. Stratégie de tests

| Niveau                     | Outil                  | Couverture P2                                                                       |
|----------------------------|------------------------|-------------------------------------------------------------------------------------|
| Unit serializers           | vitest                 | 1 test par serializer (round-trip + champs sensibles)                              |
| Integration routes         | vitest + testcontainer | 1 happy path par route + 1 erreur (401 sans token, 404 sur id inconnu, 409 sur DELETE bloqué) |
| Smoke Swagger              | manuel                 | inspection `/documentation` après `pnpm dev`                                        |
| Smoke curl                 | manuel (cf. §3.6.3)    | login + 3 requêtes pour valider l'auth + data                                       |
| `pnpm lint` global         | turbo                  | doit rester vert après chaque sous-phase                                            |

### 4.1 Pattern de tests intégration : reproduire `TestModule` de users-backend

Chaque lib (`scrum-backend`, `time-tracking-backend`) crée son propre `TestModule` aligné sur `@libs/users-backend/tests/utils/setup-module.ts`. Squelette :

```ts
// @libs/scrum-backend/tests/utils/setup-module.ts
import { entities, ScrumModule, type FastifyInstanceTypeForModule } from "#src/index.js";
import { entities as usersEntities, UserEntity } from "@libs/users-backend";
import { MikroORM } from "@mikro-orm/postgresql";
import { fastify } from "fastify";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import { sign } from "jsonwebtoken";

export class ScrumTestModule {
  public static JWT_SECRET = "testSecret";
  public static TEST_USER_ID = "test-user-id";

  declare public fastifyInstance: FastifyInstanceTypeForModule;
  private constructor(public module: ScrumModule, private orm: MikroORM) {}

  public static async init() {
    const connectionUrl = process.env.TEST_DATABASE_URL;
    if (!connectionUrl) throw new Error("TEST_DATABASE_URL not set (cf. global-setup.ts)");

    const orm = await MikroORM.init({
      entities: [...usersEntities, ...entities],   // users + scrum (cross-lib pour JWT middleware)
      clientUrl: connectionUrl,
    });

    const f = fastify().withTypeProvider<ZodTypeProvider>();
    f.setValidatorCompiler(validatorCompiler);
    f.setSerializerCompiler(serializerCompiler);

    const sharedEm = orm.em.fork();
    const module = ScrumModule.init({
      em: sharedEm,
      configuration: { jwtSecret: ScrumTestModule.JWT_SECRET },
    });

    const tm = new ScrumTestModule(module, orm);
    tm.fastifyInstance = f;
    await module.setupRoutes(f);
    return tm;
  }

  get em() { return this.module["context"].em; }

  public generateBearerToken(userId = ScrumTestModule.TEST_USER_ID) {
    return "Bearer " + sign({ userId }, ScrumTestModule.JWT_SECRET);
  }

  public async close() { await this.orm.close(true); }
}
```

Le `global-setup.ts` (P1, existant) crée le testcontainer + schema:refresh + seed un user de test. Chaque `*.route.test.ts` consomme `ScrumTestModule.init()`, fait des `fastifyInstance.inject(...)` avec `authorization: testModule.generateBearerToken(...)`, et assert le payload retourné.

---

## 5. Critères de succès

| # | Critère                                                                                                | Mesure                                                          |
|---|--------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------|
| 1 | Tous les agrégats (Project, Epic, UserStory, Task, Sprint, TimeEntry) exposent les 5 routes CRUD       | Swagger UI                                                       |
| 2 | Sous-routes relationnelles fonctionnelles (8+ routes)                                                  | curl smoke §3.6.3                                                |
| 3 | Routes actions Sprint (`/start`, `/stop`) opérationnelles                                              | curl smoke                                                       |
| 4 | `/search` et `/dashboard` retournent les bonnes données                                                | curl smoke                                                       |
| 5 | Toutes les routes sauf `/auth/*` requièrent un Bearer token (401 sans)                                  | test intégration                                                 |
| 6 | `Task.number` unique par projet, généré automatiquement à la création                                  | test intégration : créer 2 tasks dans le même projet → numéros différents |
| 7 | `pnpm api:types` régénère sans erreur                                                                  | exécution                                                        |
| 8 | `pnpm lint` global vert                                                                                | exécution                                                        |
| 9 | `pnpm turbo build` vert                                                                                | inspection `dist/`                                               |
| 10 | Tous les tests intégration verts (Docker requis)                                                       | `pnpm -F @libs/scrum-backend test` + `pnpm -F @libs/time-tracking-backend test` |

---

## 6. Suite après P2

```
/TPK-plan P3 — Shell frontend (Layout, thème, auth)
```

P3 consommera `@apps/backend/src/api-types.ts` (régénéré en P2.11) côté front pour le typage des appels fetch.

---

## 7. Annexes

### 7.1 Inventaire routes (~50 au total)

**Users (existant)** : 7 routes (login, logout, refresh, profile, list, get, create, update, delete).

**Scrum — Project** : 5 CRUD + 3 membres = 8 routes.
**Scrum — Epic** : 5 CRUD = 5 routes.
**Scrum — UserStory** : 5 CRUD = 5 routes.
**Scrum — Task** : 5 CRUD + 4 sous-routes (comments, attachments, history, assignees CRUD) = ~13 routes.
**Scrum — Sprint** : 5 CRUD + 2 actions = 7 routes.
**Relations cross-agrégats** : 8 routes.
**Transversal** : 2 routes (search, dashboard).
**TimeTracking** : 5 CRUD = 5 routes.

**Total nouveau** : ~53 routes ajoutées.

### 7.2 Inventaire fichiers touchés / créés

**Modifications** :
- `@libs/scrum-backend/package.json` (deps Fastify)
- `@libs/scrum-backend/src/context.ts` (configuration JWT)
- `@libs/scrum-backend/src/init.ts` (ScrumModule complet)
- `@libs/scrum-backend/src/index.ts` (exports)
- `@libs/time-tracking-backend/package.json` + `context.ts` + `init.ts` + `index.ts` (mêmes ajouts)
- `@apps/backend/src/app/app.ts` (init des modules)
- `@apps/backend/src/app/app.router.ts` (mount)
- `@apps/backend/src/api-types.ts` (régénéré)

**Créations** (~60 fichiers de routes + serializers + helpers + tests) :
- `@libs/scrum-backend/src/helpers/{list-query.ts, task-numbering.ts}`
- `@libs/scrum-backend/src/{project,epic,user-story,task,sprint}/{*.serializer.ts, routes/*.route.ts}`
- `@libs/scrum-backend/src/{search,dashboard}/*.route.ts`
- `@libs/scrum-backend/tests/integration/*.route.test.ts`
- `@libs/scrum-backend/tests/utils/setup-module.ts`
- `@libs/time-tracking-backend/src/routes/*.route.ts`
- `@libs/time-tracking-backend/tests/integration/*.test.ts`
