# Fix : Statistiques des cartes projet + avatars membres

> **Origine** : observation utilisateur sur `http://localhost:4200/projects` — les compteurs (epics, user stories, tasks, sprints) restent figés à `0/0` sur chaque `ProjectCard`, et le coin bas-droit affiche un placeholder vide (« 👤 — ») au lieu des avatars des membres du projet.

---

## 1. Problem statement

### Bug A — statistiques figées à 0

Dans `@libs/projects-front/src/components/project-card.gts`, les compteurs sont des constantes hard-codées avec un commentaire explicite « placeholder » :

```typescript
// Placeholder counters — will be populated from API in a future phase
userStoriesDone = 0;
userStoriesTotal = 0;
sprintDone = 0;
sprintTotal = 0;
epicsDone = 0;
epicsTotal = 0;
tasksDone = 0;
tasksTotal = 0;
sprintsActive = 0;
sprintsTotal = 0;
```

Aucune API n'agrège ces compteurs côté backend. Les routes existantes (`/projects/:id/epics`, `/projects/:id/user-stories`, `/projects/:id/tasks`, `/projects/:id/sprints`) renvoient les listes complètes mais pas d'agrégat — multiplier ces appels par carte serait coûteux (N+1 sur la grille).

### Bug B — pas d'avatars de membres affichés

Le `MemberAvatarStack` est bien instancié dans la carte mais reste vide. Cause racine : `ProjectsService.loadMembers()` appelle `GET /api/v1/projects/:id/members`, qui renvoie des ressources `project-members` au format `{ projectId, userId, role, joinedAt }` — **sans** `firstName`, `lastName` ni `email`. Le mapping côté frontend :

```typescript
return content.data.map((u) => ({
  id: u.id,
  firstName: u.attributes.firstName,  // undefined ✘
  lastName: u.attributes.lastName,    // undefined ✘
}));
```

Tous les champs nom sont `undefined`, donc les initiales sont vides et le composant affiche des bulles sans contenu (ou est masqué par CSS `flex` quand la collection est interprétée comme vide).

De plus, la zone bas-droite de la carte contient un placeholder `responsibleShortName` (« 👤 — » quand non renseigné) qui n'apporte rien et brouille la lecture.

### Objectif

1. **Brancher de vrais compteurs** par projet (epics done/total, user-stories done/total, tasks done/total, sprints active/total).
2. **Afficher les avatars de membres** (chevauchement DaisyUI `-space-x-2`) dans la zone bas-droite, en remplacement du placeholder « responsable ».

---

## 2. Architectural Context

*(extrait de `graphify-out/GRAPH_REPORT.md` — graphe à jour au 2026-05-26)*

- **Communautés touchées** :
  - `@libs/scrum-backend/src/project/` (nouvelle route stats, enrichissement members)
  - `@libs/projects-front/src/components/project-card.gts` (composant feuille)
  - `@libs/projects-front/src/services/projects.ts` (orchestration HTTP)
- **God nodes à surveiller** :
  - `makeSingleJsonApiTopDocument()` (32 edges) — toute réponse JSON:API nouvelle doit utiliser le helper standard pour rester cohérente avec les autres routes scrum.
- **Contrats à risque** :
  - `SerializedProjectMemberSchema` (zod) — schéma de réponse strict ; tout ajout d'attribut user (`firstName`, `lastName`, `email`, `color`) doit être propagé au schéma sous peine de `FST_ERR_RESPONSE_SERIALIZATION`.
  - `@apps/backend/openapi.json` + `api-types.ts` — régénérés via le pipeline OpenAPI ; à recommitter après modif schéma.
  - `JSONAPICache` côté front — toute nouvelle ressource (`project-stats` si endpoint dédié) doit être enregistrée dans `@apps/front/app/services/store.ts` (cf. règle [[feedback-warpd-schemas-global]]).

---

## 3. Technical approach

### 3.1 Backend — endpoint `GET /api/v1/projects/:id/stats`

Endpoint dédié plutôt que d'enrichir la liste (`/projects`) pour deux raisons :
- isoler le coût d'agrégation (chaque carte se recharge indépendamment),
- éviter de casser le contrat `SerializedProjectSchema` déjà consommé par le store WarpDrive.

Réponse non-JSON:API (objet simple), pour deux raisons :
- ce n'est pas une ressource persistable côté front,
- éviter de polluer le cache `JSONAPICache` avec un type fictif.

```typescript
// @libs/scrum-backend/src/project/routes/stats.route.ts
export class GetProjectStatsRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      '/:id/stats',
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: object({
              data: object({
                projectId: string(),
                epics: object({ total: number(), done: number() }),
                userStories: object({ total: number(), done: number() }),
                tasks: object({ total: number(), done: number() }),
                sprints: object({ total: number(), active: number() }),
                currentSprint: object({
                  id: string().nullable(),
                  storiesDone: number(),
                  storiesTotal: number(),
                }),
              }),
            }),
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const project = await this.em.findOne(ProjectEntity, { id });
        if (!project) {
          return reply.code(404).send(
            makeJsonApiError(404, 'Not Found', {
              code: 'PROJECT_NOT_FOUND',
              detail: `Project ${id} not found`,
            }),
          );
        }

        const [epicsTotal, epicsDone] = await Promise.all([
          this.em.count(EpicEntity, { projectId: id }),
          this.em.count(EpicEntity, { projectId: id, status: 'done' }),
        ]);
        const [storiesTotal, storiesDone] = await Promise.all([
          this.em.count(UserStoryEntity, { projectId: id }),
          this.em.count(UserStoryEntity, { projectId: id, status: 'done' }),
        ]);
        const [tasksTotal, tasksDone] = await Promise.all([
          this.em.count(TaskEntity, { projectId: id }),
          this.em.count(TaskEntity, { projectId: id, status: 'done' }),
        ]);
        const [sprintsTotal, sprintsActive] = await Promise.all([
          this.em.count(SprintEntity, { projectId: id }),
          this.em.count(SprintEntity, { projectId: id, status: 'active' }),
        ]);

        // Current sprint (first active)
        const activeSprint = await this.em.findOne(SprintEntity, {
          projectId: id,
          status: 'active',
        });
        let currentSprint = { id: null as string | null, storiesDone: 0, storiesTotal: 0 };
        if (activeSprint) {
          const [csTotal, csDone] = await Promise.all([
            this.em.count(UserStoryEntity, { projectId: id, sprintId: activeSprint.id }),
            this.em.count(UserStoryEntity, {
              projectId: id,
              sprintId: activeSprint.id,
              status: 'done',
            }),
          ]);
          currentSprint = { id: activeSprint.id, storiesDone: csDone, storiesTotal: csTotal };
        }

        return reply.send({
          data: {
            projectId: id,
            epics: { total: epicsTotal, done: epicsDone },
            userStories: { total: storiesTotal, done: storiesDone },
            tasks: { total: tasksTotal, done: tasksDone },
            sprints: { total: sprintsTotal, active: sprintsActive },
            currentSprint,
          },
        });
      },
    );
  }
}
```

**Câblage** : ajouter `new GetProjectStatsRoute(em)` dans `@libs/scrum-backend/src/mounters.ts` (au même niveau que les autres routes `project/*`).

### 3.2 Backend — enrichir `/projects/:id/members` avec données user

Plutôt que d'ajouter un appel séparé `/users/:id` par membre (N+1), on enrichit le serializer pour inclure les attributs user via une jointure MikroORM.

Modifier `ListProjectMembersRoute` :

```typescript
// récupération avec jointure sur UserEntity
const members = await this.em
  .getRepository(ProjectMemberEntity)
  .findAll({ where: { projectId: id } });

const userIds = members.map((m) => m.userId);
const users = await this.em.find(UserEntity, { id: { $in: userIds } });
const userById = new Map(users.map((u) => [u.id, u]));

return reply.send({
  data: members.map((m) => {
    const u = userById.get(m.userId);
    return jsonApiSerializeProjectMember(m, u);
  }),
  meta: { total: members.length },
});
```

Étendre le schéma serializer pour inclure les attributs user :

```typescript
// project-member.serializer.ts
export const SerializedProjectMemberSchema = makeJsonApiDocumentSchema(
  'project-members',
  object({
    projectId: string(),
    userId: string(),
    role: ProjectMemberRoleSchema,
    joinedAt: string(),
    // user attrs denormalized (avoid N+1 on front)
    firstName: string().nullable(),
    lastName: string().nullable(),
    email: string().nullable(),
    color: string().nullable(),
  }),
);

export function jsonApiSerializeProjectMember(
  m: ProjectMemberEntityType,
  u?: UserEntityType,
): z.infer<typeof SerializedProjectMemberSchema> {
  return {
    id: m.id,
    type: 'project-members' as const,
    attributes: {
      projectId: m.projectId,
      userId: m.userId,
      role: m.role as z.infer<typeof ProjectMemberRoleSchema>,
      joinedAt: m.joinedAt.toISOString(),
      firstName: u?.firstName ?? null,
      lastName: u?.lastName ?? null,
      email: u?.email ?? null,
      color: u?.color ?? null,
    },
  };
}
```

**Compatibilité** : les attrs sont `nullable` → si un user a été supprimé sans purger ses `project_members` (cas seeder/test), la carte affiche le membre avec initiales `??` plutôt que de casser la réponse.

### 3.3 Frontend — `ProjectsService.loadStats()` + adaptation `loadMembers()`

Ajouter dans `@libs/projects-front/src/services/projects.ts` :

```typescript
export type ProjectStats = {
  projectId: string;
  epics: { total: number; done: number };
  userStories: { total: number; done: number };
  tasks: { total: number; done: number };
  sprints: { total: number; active: number };
  currentSprint: { id: string | null; storiesDone: number; storiesTotal: number };
};

public async loadStats(projectId: string): Promise<ProjectStats> {
  const { content } = await this.store.request<{ data: ProjectStats }>({
    url: `/api/v1/projects/${projectId}/stats`,
    method: 'GET',
  });
  return content.data;
}
```

Adapter `loadMembers()` (lecture des nouveaux attrs) :

```typescript
type MemberResponse = {
  data: Array<{
    id: string;
    type: 'project-members';
    attributes: {
      userId: string;
      firstName: string | null;
      lastName: string | null;
      color: string | null;
    };
  }>;
};

public async loadMembers(projectId: string): Promise<MemberLite[]> {
  const { content } = await this.store.request<MemberResponse>({
    url: `/api/v1/projects/${projectId}/members`,
    method: 'GET',
  });
  return content.data
    .filter((m) => m.attributes.firstName && m.attributes.lastName)
    .map((m) => ({
      id: m.attributes.userId, // user id, not membership id
      firstName: m.attributes.firstName!,
      lastName: m.attributes.lastName!,
      color: m.attributes.color,
    }));
}
```

### 3.4 Frontend — câblage des stats dans `ProjectCard`

Remplacer les champs hard-codés par un fetch dans le constructor (parallèle au `loadMembers` existant) :

```typescript
@tracked private _stats: ProjectStats | null = null;

constructor(owner: unknown, args: ProjectCardSignature['Args']) {
  super(owner as never, args);
  if (!this.args.members) void this.loadMembers();
  void this.loadStats();
}

private async loadStats(): Promise<void> {
  const id = this.args.project.id;
  if (!id) return;
  try {
    this._stats = await this.projects.loadStats(id);
  } catch (e) {
    console.error('[ProjectCard] loadStats failed:', e);
  }
}

get epicsDone(): number { return this._stats?.epics.done ?? 0; }
get epicsTotal(): number { return this._stats?.epics.total ?? 0; }
get userStoriesDone(): number { return this._stats?.userStories.done ?? 0; }
get userStoriesTotal(): number { return this._stats?.userStories.total ?? 0; }
get tasksDone(): number { return this._stats?.tasks.done ?? 0; }
get tasksTotal(): number { return this._stats?.tasks.total ?? 0; }
get sprintsActive(): number { return this._stats?.sprints.active ?? 0; }
get sprintsTotal(): number { return this._stats?.sprints.total ?? 0; }
get sprintDone(): number { return this._stats?.currentSprint.storiesDone ?? 0; }
get sprintTotal(): number { return this._stats?.currentSprint.storiesTotal ?? 0; }
```

> ⚠️ **Important** : `@tracked private _stats` doit être réactif. Les getters dépendent uniquement de `this._stats` (tracked) → re-render automatique au retour async.

### 3.5 Frontend — layout bas de carte (avatars à droite)

Avant (zone bas) :
```handlebars
<div class="flex items-center justify-between">
  <MemberAvatarStack @members={{this.members}} @moreLabel={{this.moreMembersLabel}} />
  <span class="text-xs text-base-content/60 flex items-center gap-1">
    <UserIcon /> {{this.responsibleShortName}}
  </span>
</div>
```

Après (suppression du placeholder responsable, avatars empilés alignés à droite) :
```handlebars
<div class="flex items-center justify-between">
  <span class="flex items-center gap-1 text-xs text-base-content/60">
    <CalendarIcon />
    {{t "projects.card.createdOn"}} {{this.formattedDate}}
  </span>
  {{#if this.members.length}}
    <MemberAvatarStack
      @members={{this.members}}
      @max={{4}}
      @moreLabel={{this.moreMembersLabel}}
    />
  {{else}}
    <span class="text-xs text-base-content/40" data-test-project-card-no-members>
      {{t "projects.card.noMembers"}}
    </span>
  {{/if}}
</div>
```

**Changements** :
- Date déplacée à gauche (occupe le slot vide).
- `MemberAvatarStack` déplacé à droite, c'est le focus de la zone.
- `max=4` (au lieu du défaut 3) pour exploiter la place gagnée.
- Empty state explicite (« Aucun membre ») au lieu du « 👤 — ».
- La ligne dédoublée « date » au-dessus du grid mini-counters peut être supprimée pour éviter la duplication (voir Phase 4 ci-dessous).

**Traduction à ajouter** dans `@apps/front/translations/projects/{en-us,fr-fr}.yaml` :

```yaml
# fr-fr
card:
  noMembers: 'Aucun membre'

# en-us
card:
  noMembers: 'No members'
```

### 3.6 Tests — couverture

- **Backend intégration** (`@libs/scrum-backend/tests/integration/project.route.test.ts`) :
  - `GET /projects/:id/stats` renvoie 200 avec les bons compteurs (seed : 2 epics dont 1 done, 5 stories dont 2 done, 8 tasks dont 3 done, 2 sprints dont 1 active).
  - 404 si projet inexistant.
- **Backend intégration** members enrichis :
  - `GET /projects/:id/members` inclut désormais `firstName`, `lastName`, `email`, `color` dans `attributes`.
  - Membres avec user supprimé → attrs `null` (pas de crash).
- **Frontend intégration** (`@libs/projects-front/tests/integration/project-card-test.gts`) :
  - Avec stats mockées MSW → la carte affiche `2/5` pour user stories, `1/2` pour epics, etc.
  - Avec membres mockés (2 users) → 2 avatars rendus, initiales correctes (`JD`, `AS`).
  - Sans membres → empty state « Aucun membre ».
- **MSW handlers** (`@libs/projects-front/src/http-mocks/projects.ts`) :
  - Ajouter handler pour `GET /api/v1/projects/:id/stats`.
  - Mettre à jour le handler `/members` pour renvoyer les nouveaux attrs.

### 3.7 OpenAPI regen + types

Après les modifs backend :

```bash
cd @apps/backend && pnpm run openapi:generate  # ou la commande existante
```

Vérifier que `@apps/backend/openapi.json` et `@apps/backend/src/api-types.ts` reflètent :
- nouvelle route `GET /projects/{id}/stats`
- nouveaux attrs sur `SerializedProjectMember`

---

## 4. Implementation phases

### Phase 1 — Backend stats endpoint
- [ ] Créer `@libs/scrum-backend/src/project/routes/stats.route.ts`
- [ ] Câbler dans `@libs/scrum-backend/src/mounters.ts` (juste après `GetProjectRoute`)
- [ ] Test intégration : seed contrôlé + assertions sur les 4 compteurs + sprint actif
- [ ] Régénérer `@apps/backend/openapi.json` + `api-types.ts`

### Phase 2 — Backend enrichir members
- [ ] Étendre `SerializedProjectMemberSchema` avec `firstName/lastName/email/color` nullable
- [ ] Modifier `jsonApiSerializeProjectMember` pour accepter un `UserEntity` optionnel
- [ ] Adapter `ListProjectMembersRoute` pour joindre `UserEntity` par `userId`
- [ ] Adapter aussi `AddProjectMemberRoute` (réponse 201) pour cohérence
- [ ] Tests intégration : enrichissement, cas user manquant
- [ ] Régénérer OpenAPI + types

### Phase 3 — Frontend service + stats wiring
- [ ] Ajouter `ProjectStats` type + `loadStats()` dans `ProjectsService`
- [ ] Adapter `loadMembers()` au nouveau schéma
- [ ] Remplacer les compteurs hard-codés de `ProjectCard` par des getters sur `@tracked _stats`
- [ ] Ajouter handler MSW `/projects/:id/stats`
- [ ] Mettre à jour handler MSW `/projects/:id/members` (firstName/lastName/color)

### Phase 4 — Frontend UI bas de carte
- [ ] Supprimer le bloc dupliqué `date + responsibleShortName` (déjà rendu en ligne séparée plus haut)
- [ ] Repositionner `MemberAvatarStack` à droite, `@max={{4}}`
- [ ] Empty state « Aucun membre » + clé i18n
- [ ] Mettre à jour `@apps/front/translations/projects/{en-us,fr-fr}.yaml`
- [ ] Mettre à jour tests intégration `project-card-test.gts` (avatars + stats + empty state)
- [ ] Verif visuelle Playwright MCP (capture dark + light)

### Phase 5 — Validation
- [ ] `pnpm turbo lint` à la racine (règle [[feedback-lint-before-push]])
- [ ] `cd @apps/backend && pnpm test` (suite scrum-backend)
- [ ] `cd @libs/projects-front && pnpm test` (intégration cards)
- [ ] Vérif manuelle : seed `pnpm seed`, ouvrir `/projects`, vérifier compteurs réels et avatars

---

## 5. Edge cases & risks

| Cas | Mitigation |
|---|---|
| Projet sans aucun epic/story/task | Compteurs `0/0`, progress bar `max={{1}}` (déjà en place) — pas de division par zéro |
| Membre `project_members` avec `user_id` orphelin (user supprimé) | `firstName/lastName` `null` côté serializer ; filtre frontend ignore ces entrées dans l'avatar stack |
| Plus de 4 membres | `MemberAvatarStack` rend `+N` avec `moreLabel` (déjà géré) |
| Sprint actif multiple (incohérent) | On prend le premier (`em.findOne` ordonné par défaut) — log un warning si plusieurs sprints `status:'active'` détectés |
| Réponse stats lente sur grille avec 20+ cartes | Chaque carte fait son fetch indépendant et asynchrone ; le squelette `0/0` reste affiché et se met à jour à l'arrivée — pas bloquant |
| Régression `project-lifecycle` E2E | Le test vérifie déjà la création/suppression ; à étendre pour vérifier que `data-test-project-card-stats` se met à jour après création d'un epic |

---

## 6. Success criteria

1. **`GET /api/v1/projects/:id/stats` répond 200** avec la structure documentée (epics/userStories/tasks/sprints/currentSprint).
2. **Test intégration backend stats** : seed 2 epics (1 done), assert `{epics: {total: 2, done: 1}}` — vert.
3. **`GET /api/v1/projects/:id/members` retourne `firstName`, `lastName`, `email`, `color`** dans `attributes` (validé par zod schema strict — un test échoue si un champ manque).
4. **`ProjectCard` affiche les vrais compteurs** sur `/projects` (vérifié visuellement + via `data-test-project-card-stats-epics` etc.) — `0/0` est acceptable uniquement si le projet n'a aucune ressource du type.
5. **Avatars membres rendus** : 1 à 4 avatars empilés avec `-space-x-2`, initiales correctes (2 lettres), tooltip nom complet au hover, badge `+N` au-delà.
6. **Layout bas de carte** : date à gauche, `MemberAvatarStack` (ou empty state « Aucun membre ») à droite — plus de placeholder « 👤 — ».
7. **Empty state « Aucun membre »** rendu si `members.length === 0` (vérifié via `data-test-project-card-no-members`).
8. **i18n** : nouvelles clés `projects.card.noMembers` présentes dans `en-us.yaml` ET `fr-fr.yaml`.
9. **Tests intégration `project-card-test.gts`** (au moins 3 nouveaux cas : stats branchés, avatars visibles, empty state) — verts (test name pattern `*-test.gts`, cf. [[feedback-test-file-naming]]).
10. **Aucun warning « Missing Resource Type »** dans la console front (pas de nouvelle ressource ajoutée au store — l'endpoint stats est consommé en mode raw).
11. **`pnpm turbo lint` vert** depuis la racine ([[feedback-lint-before-push]]).
12. **OpenAPI à jour** : `@apps/backend/openapi.json` reflète la nouvelle route + nouveaux attrs members ; `api-types.ts` regen committed.
13. **Verif visuelle dark ET light** : screenshot via Playwright MCP sur `/projects` avec ≥ 2 projets différents (un sans membre, un avec ≥ 2 membres) — captures jointes dans `specs/done/` lors du build.

---

## 7. Hors scope (à tracker à part)

- Pagination/virtualisation de la grille projets (utile si > 50 projets).
- Cache des stats (ETag / stale-while-revalidate) — pour l'instant chaque visite refetch.
- Badge couleur sur l'avatar dérivé du `user.color` plutôt que d'un hash de l'id (option simple : utiliser `m.color` quand non-null, sinon fallback hash).
- Indicateur de chargement (skeleton shimmer) pour les stats — actuellement `0/0` puis fade.
- Suppression définitive de `responsibleShortName` côté `Project` schema/service (pour l'instant on cache juste l'affichage, le champ reste disponible).

---

## 8. Références

- Plan parent : [[projects-view-fixes-and-actions]] (specs/done)
- Plan parent : [[project-card-richer-no-detail-modal]] (specs/done)
- Plan voisin (badges sombre) : [[fix-dark-mode-visibility-badges-project-card]] (specs/todo)
- Règle réactivité : [[feedback-warpd-create]] (loadAll après mutation — pas applicable au GET pur ici)
- Règle test naming : [[feedback-test-file-naming]]
- Règle schemas globaux : [[feedback-warpd-schemas-global]]
