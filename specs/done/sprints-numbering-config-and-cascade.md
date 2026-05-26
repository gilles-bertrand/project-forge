# Feature Sprints — numérotation, config projet, clôture, cascade epic/US/task

> **Demande utilisateur (résumée)** :
> 1. Numérotation auto `sprint-001`, `sprint-002`…
> 2. Durée du sprint paramétrable par projet (en jours) → dates auto, modifiables manuellement
> 3. Vélocité-cible (points par sprint) paramétrable par projet
> 4. À la clôture, les tâches non terminées sautent automatiquement dans le sprint suivant
> 5. On peut ajouter epic/US/tâche à un sprint ; ajouter une épique embarque toutes ses tâches (ou toutes ses US si elle n'a pas de tâches)
> 6. Challenger la demande / proposer des opportunités

---

## 0. Challenges & opportunités — décisions validées

> **Statut (2026-05-26)** : décisions arbitrées avec l'utilisateur. Le plan détaillé ci-dessous reflète ces choix.
>
> | # | Décision retenue |
> |---|---|
> | C1 | ✅ `number:int` + `name:string` séparés, rendu `sprint-NNN` côté front |
> | C2 | ✅ Dates rolling : `startDate = endDate du précédent + 1j` |
> | C3 | ✅ Jours calendaires |
> | C4 | ✅ « Non terminée » = tout statut **sauf** `done` (testing/uat inclus) |
> | C5 | 🔄 **Variante** : pas d'auto-création du sprint suivant. Le backend renvoie 422 ou un payload « action requise » si des tâches restent ; le front affiche une modale « créer un nouveau sprint » vs « renvoyer au backlog (sprintId = null) ». Le choix est passé en body de la requête de clôture. |
> | C6 | ✅ Cascade epic = toutes les tâches + US sans tâches (interprétation B) |
> | C7 | ✅ Ajout `sprintId` sur `UserStoryEntity` |
> | C8 | ✅ `defaultVelocityPoints` au niveau projet (défaut) + `velocityPoints` par sprint conservé (override). Sert à matérialiser le dépassement ou non de la moyenne, pas à bloquer. |
> | C9 | ✅ Toutes les opportunités acceptées (warning overcommit, historique vélocité, résumé clôture, endpoint dédié `/items`, lock pendant sprint actif) |

### C1 — `sprint-001` : format de stockage
- ✅ **Recommandé** : stocker un `number: integer` (1, 2, 3) en base + dériver l'affichage `sprint-${String(n).padStart(3, '0')}` côté front. Garde aussi `name: string` pour un titre libre (ex. « Sprint 12 – Refonte auth »). Tri facile, format affichage interchangeable.
- ❌ Alternative : stocker la string `sprint-001` directement → casse-tête de tri lexicographique au-delà de 999, format figé.

### C2 — Baseline pour le calcul des dates
- ✅ **Recommandé** : `startDate = finDuSprintPrécédent + 1 jour` (rolling). Si pas de précédent, `startDate = aujourd'hui`. `endDate = startDate + sprintDurationDays - 1`.
- 🔄 Variante : laisser un délai inter-sprint configurable (pour la revue/rétro). Hors scope ici, peut être ajouté dans la config projet plus tard.

### C3 — Jours calendaires ou jours ouvrés ?
- ✅ **Recommandé** : jours calendaires (simple, déterministe). Document : « 14 jours = 2 semaines pile-poil ».
- 🔄 Si l'utilisateur veut jours ouvrés (équipes intermittentes), ajouter plus tard avec un champ `durationKind: 'calendar' | 'business'`. Pas dans ce plan.

### C4 — « Tâche non terminée » à la clôture
- ✅ **Recommandé** : toute tâche dont le statut **n'est pas** `done` est déplacée — donc `todo`, `in-progress`, `testing`, `uat` sont reportées.
- 🔄 Challenge : `testing` et `uat` sont des « presque finies ». L'utilisateur valide-t-il ce comportement ou veut-il exclure ces deux états ?
- Comportement secondaire : on conserve le statut tel quel pour ne pas perdre le travail en cours. Les `completedPoints` du sprint clos sont calculés sur les tâches `done` uniquement (déjà en place).

### C5 — Sprint suivant : créer si manquant ?
- ✅ **Recommandé** : à la clôture, chercher le sprint « suivant » du projet (status `planned` avec la plus petite date de début ≥ aujourd'hui). Si aucun, **en créer un** avec config projet (durée, vélocité, numéro auto). Cela garantit qu'on ne perd jamais une tâche.
- 🔄 Variante moins automatique : laisser la décision à l'utilisateur via une modale (« créer un nouveau sprint vs renvoyer au backlog »). Plus rich UX mais plus de boulot front. À évaluer.

### C6 — Cascade « epic → tasks ou US »
La règle écrite : *« quand je mets une épique j'embarque toutes les tâches et si pas de tâches toutes les US »*. Cas limites à clarifier :
- **Epic avec 3 US, dont 2 ont des tâches, 1 n'en a pas** :
  - Interprétation A : on prend toutes les tâches (donc les 2 US couvertes) → la 3ᵉ US reste hors sprint.
  - Interprétation B : on prend les tâches existantes **+** les US sans tâches.
  - ✅ **Recommandé B** : ne pas laisser de scope « orphelin ». Si l'épique entière est mise en sprint, tout ce qui est sous elle suit.
- **Tâche déjà dans un autre sprint** : on l'écrase ? On warn ? Recommandation : **réassigner sans erreur** (l'utilisateur déplace volontairement la tâche), mais retourner dans la réponse `meta.conflicts: [{id, fromSprintId, toSprintId}]` pour affichage.
- **Mettre une US dans un sprint** : on cascade ses tâches OUI ; si pas de tâches, on met juste la US.
- **Mettre une tâche dans un sprint** : pas de cascade.

### C7 — Ajout d'un `sprintId` sur `UserStoryEntity`
La feature requiert que les US soient assignables à un sprint (pour le cas « épique sans tâches »). Aujourd'hui seul `TaskEntity` a `sprintId`. **Impact** : ajout de colonne + migration de schéma. À valider que c'est OK pour le modèle Scrum (oui, c'est même conforme à Scrum « standard »).

### C8 — Vélocité-cible : projet OU sprint ?
La demande dit « par projet ». Mais `SprintEntity.velocityPoints` existe déjà (par sprint). **Recommandé** : projet = défaut, copié dans chaque sprint à sa création, modifiable ensuite par sprint. Permet la rampe-up (sprint 1 = 10 pts, sprint 5 = 30 pts). Le champ projet s'appelle `defaultVelocityPoints`.

### C9 — Opportunités supplémentaires que je propose (à valider)
1. **Warning « overcommit »** : pendant la planification, si `sum(points US/tâches du sprint) > velocityPoints`, badge orange « +30 % au-dessus de la cible ». Pas bloquant.
2. **Historique de vélocité** : afficher les 3 derniers `completedPoints` à côté de la cible. Aide à régler `defaultVelocityPoints`.
3. **Résumé de clôture** : à la fermeture, modale « Sprint clos : 14 tâches done, 3 reportées, 18 points complétés sur 25 ciblés ». Bon pour l'engagement équipe.
4. **Lock pendant sprint actif** : empêcher la suppression d'un sprint actif et alerter avant retrait massif (déjà en partie via `status` check). À étendre.
5. **Endpoint dédié `POST /sprints/:id/items`** plutôt qu'un PATCH cascade implicite sur l'épique : verbe clair, payload `{ kind: 'epic'|'story'|'task', id }`, réponse `{ added: [...], conflicts: [...] }`. Plus facile à tester et à étendre.

---

## 1. Problem statement & objectifs

Implémenter un workflow Sprint complet conforme à la demande :
- Numérotation auto stricte par projet (sequence integer + rendu `sprint-NNN`).
- Configuration projet : `sprintDurationDays`, `defaultVelocityPoints`.
- Création de sprint à partir de la config projet (dates dérivées, valeurs override possibles).
- Clôture de sprint : transfert automatique des tâches non-done vers le sprint suivant (créé si nécessaire), calcul des `completedPoints`.
- Endpoint dédié pour ajouter epic / US / task à un sprint avec règles de cascade.
- UI minimale pour : config projet, création/clôture sprint, glisser-déposer ou bouton « ajouter au sprint ».

---

## 2. Architectural Context (graphify)

*(graph à jour 2026-05-26)*

- **Communautés touchées** :
  - `@libs/scrum-backend/src/sprint/` (entité, routes, serializer)
  - `@libs/scrum-backend/src/project/` (entity + update.route pour la config)
  - `@libs/scrum-backend/src/user-story/` (ajout `sprintId`)
  - `@libs/scrum-backend/src/task/` (consommé en lecture pour la cascade & clôture)
  - `@libs/sprints-front/` (modal de création, list, sprint planning)
  - `@libs/projects-front/` (project edit modal pour exposer la config)
- **God nodes touchés** :
  - `makeSingleJsonApiTopDocument` (32 edges) → chaque nouvelle route stats/items sortie JSON:API doit l'utiliser. Idem `makeJsonApiDocumentSchema`.
  - `authFetch` (18 edges) → le pattern Content-Type est désormais `application/json` (cf. [[fix-bypass-vnd-api-json-parser]] dans l'historique récent).
- **Contrats à risque** :
  - `SerializedSprintSchema` → ajouter `number` cassera tout consommateur du contrat. Mettre à jour le serializer ET `api-types.ts`.
  - `SerializedProjectSchema` → ajout de `sprintDurationDays` et `defaultVelocityPoints`. Idem.
  - Migration DB : nouvelle colonne sur `user_stories` (`sprint_id`), nouvelles colonnes sur `projects` et `sprints` (`number`). En dev = `pnpm schema:fresh` ; en CI/prod = migration (à scoper séparément ; ce projet est en early-stage donc schema:fresh suffit pour le moment).

---

## 3. Technical approach

### 3.1 Modèle de données

**`ProjectEntity`** — ajouter :
```typescript
sprintDurationDays: p.integer().default(14),
defaultVelocityPoints: p.integer().default(20),
```

**`SprintEntity`** — ajouter :
```typescript
number: p.integer().index(),  // sequence per project
```
(`velocityPoints` et `completedPoints` existent déjà — on garde.)

**`UserStoryEntity`** — ajouter :
```typescript
sprintId: p.string().nullable().index(),
```

**Pas de modif** sur `EpicEntity` ni `TaskEntity` (Task a déjà `sprintId`).

### 3.2 Serializers + types Zod

**`SerializedProjectSchema`** :
```typescript
sprintDurationDays: number().int().min(1).max(60),
defaultVelocityPoints: number().int().min(1).max(200),
```

**`SerializedSprintSchema`** :
```typescript
number: number().int(),
```

**`SerializedUserStorySchema`** :
```typescript
sprintId: string().nullable(),
```

`UpdateProjectRoute` schema body doit accepter `sprintDurationDays` et `defaultVelocityPoints` (partiels).

### 3.3 Numéro de sprint (séquence par projet)

Helper réutilisable dans `@libs/scrum-backend/src/sprint/utils/sprint-numbering.ts` :

```typescript
export async function getNextSprintNumber(em: EntityManager, projectId: string): Promise<number> {
  // Transactional MAX+1 (cf. task-numbering.ts pattern)
  return em.transactional(async (txEm) => {
    const result = (await txEm
      .createQueryBuilder(SprintEntity)
      .select(raw("max(number) as max"))
      .where({ projectId })
      .execute("get")) as { max: number | null } | null;
    return (result?.max ?? 0) + 1;
  });
}
```

### 3.4 Création de sprint (`CreateSprintRoute`)

Modifs :
1. Body : `name?`, `goal?`, `startDate?`, `endDate?`, `velocityPoints?` (tous optionnels désormais). `projectId` reste requis.
2. Logique :
   ```typescript
   const project = await em.findOne(ProjectEntity, { id: body.projectId });
   if (!project) return 404;

   const number = await getNextSprintNumber(em, project.id);
   const name = body.name ?? `Sprint ${String(number).padStart(3, '0')}`;

   // dates auto si non fournies
   let startDate: Date;
   let endDate: Date;
   if (body.startDate && body.endDate) {
     startDate = new Date(body.startDate);
     endDate = new Date(body.endDate);
   } else {
     const prev = await em.findOne(SprintEntity, { projectId: project.id }, { orderBy: { endDate: 'DESC' } });
     startDate = body.startDate
       ? new Date(body.startDate)
       : prev ? addDays(prev.endDate, 1) : startOfToday();
     endDate = body.endDate
       ? new Date(body.endDate)
       : addDays(startDate, project.sprintDurationDays - 1);
   }

   const velocityPoints = body.velocityPoints ?? project.defaultVelocityPoints;

   await em.getRepository(SprintEntity).insert({
     id: randomUUID(),
     name, number, goal: body.goal ?? null,
     projectId: project.id,
     startDate, endDate,
     status: 'planned',
     velocityPoints, completedPoints: 0,
     createdAt: new Date(), updatedAt: new Date(),
   });
   ```

### 3.5 Clôture (`StopSprintRoute`) — 2 étapes avec action utilisateur

> **C5 Variante** : la clôture ne crée jamais automatiquement le sprint suivant. Le backend expose un **flow en 2 étapes** : (1) le front demande un aperçu, (2) le front envoie la décision (créer un nouveau sprint, viser un sprint existant, ou tout renvoyer au backlog).

**Étape 1 — Aperçu** (nouveau endpoint) :

```
GET /sprints/:id/close-preview
→ 200 { data: {
  sprintId, sprintName, number,
  unfinishedTasks: [{ id, title, status }],
  unfinishedStories: [{ id, title, status }],
  availableNextSprints: [{ id, number, name, startDate }],  // sprints 'planned' du projet
} }
```

Permet au front d'afficher la modale « X tâches restent. Que faire ? ».

**Étape 2 — Clôture effective** (route étendue) :

```
POST /sprints/:id/stop
body: {
  data: {
    attributes: {
      action: 'move-to-next' | 'move-to-existing' | 'send-to-backlog',
      targetSprintId?: string,    // requis si action === 'move-to-existing'
      createSprintConfig?: {       // requis si action === 'move-to-next'
        startDate?: string,        // optionnel : override
        endDate?: string,          // optionnel : override
        name?: string,
        velocityPoints?: number,
      },
    }
  }
}
```

**Validation** :
- Si tâches/US non-done > 0 et `action` absent → **422 ACTION_REQUIRED** avec `meta.unfinishedCount`. Le front doit forcément choisir.
- Si tâches/US non-done = 0 → `action` optionnel (la requête sans body suffit).

**Logique** :

```typescript
const sprint = await em.findOne(SprintEntity, { id });
if (!sprint) return 404;
if (sprint.status !== 'active') return 409;

const unfinishedTasks = await em.find(TaskEntity, {
  sprintId: sprint.id, status: { $ne: 'done' },
});
const unfinishedStories = await em.find(UserStoryEntity, {
  sprintId: sprint.id, status: { $ne: 'done' },
});
const hasUnfinished = unfinishedTasks.length + unfinishedStories.length > 0;

const action = body.data?.attributes?.action;

if (hasUnfinished && !action) {
  return reply.code(422).send(makeJsonApiError(422, 'Action Required', {
    code: 'CLOSE_ACTION_REQUIRED',
    detail: `Sprint has ${String(unfinishedTasks.length)} unfinished task(s) and ${String(unfinishedStories.length)} unfinished story(ies). Provide attributes.action.`,
    meta: { unfinishedTasks: unfinishedTasks.length, unfinishedStories: unfinishedStories.length },
  }));
}

let targetSprintId: string | null = null;

if (hasUnfinished) {
  if (action === 'send-to-backlog') {
    for (const t of unfinishedTasks) t.sprintId = null;
    for (const s of unfinishedStories) s.sprintId = null;
  } else if (action === 'move-to-existing') {
    const tid = body.data.attributes.targetSprintId;
    if (!tid) return reply.code(400).send(makeJsonApiError(400, 'Bad Request', {
      code: 'TARGET_SPRINT_ID_MISSING', detail: 'targetSprintId required',
    }));
    const target = await em.findOne(SprintEntity, { id: tid, projectId: sprint.projectId });
    if (!target) return 404;
    if (target.status === 'completed') return 409;  // pas de move vers un completed
    targetSprintId = tid;
    for (const t of unfinishedTasks) t.sprintId = tid;
    for (const s of unfinishedStories) s.sprintId = tid;
  } else if (action === 'move-to-next') {
    // Crée un nouveau sprint avec config projet (réutilise CreateSprintRoute logic)
    const project = await em.findOne(ProjectEntity, { id: sprint.projectId });
    if (!project) return 404;
    const cfg = body.data.attributes.createSprintConfig ?? {};
    const newSprint = await createSprintForProject(em, project, sprint, cfg);
    targetSprintId = newSprint.id;
    for (const t of unfinishedTasks) t.sprintId = targetSprintId;
    for (const s of unfinishedStories) s.sprintId = targetSprintId;
  }
}

sprint.status = 'completed';
sprint.completedPoints = await recomputeCompletedPoints(em, sprint.id);
await em.flush();

return reply.send({
  data: jsonApiSerializeSingleSprintDocument(sprint),
  meta: {
    movedTasks: hasUnfinished ? unfinishedTasks.length : 0,
    movedStories: hasUnfinished ? unfinishedStories.length : 0,
    targetSprintId,
    action: action ?? null,
  },
});
```

Le helper `createSprintForProject(em, project, previousSprint, cfg)` est partagé avec `CreateSprintRoute` (factoriser dans `src/sprint/utils/create-sprint.ts`).

### 3.6 Endpoint cascade — `POST /sprints/:id/items`

Nouvelle route `@libs/scrum-backend/src/sprint/routes/items.routes.ts` :

```typescript
// Body schema
{
  data: {
    attributes: {
      kind: 'epic' | 'story' | 'task',
      id: string,
    }
  }
}

// Logic
async function addItemToSprint(em, sprintId, kind, itemId) {
  const sprint = await em.findOne(SprintEntity, { id: sprintId });
  if (!sprint) return 404;

  const conflicts: Array<{type: string, id: string, fromSprintId: string | null}> = [];
  const added: Array<{type: string, id: string}> = [];

  if (kind === 'task') {
    const task = await em.findOne(TaskEntity, { id: itemId });
    if (!task) return 404;
    if (task.sprintId && task.sprintId !== sprintId) {
      conflicts.push({ type: 'task', id: itemId, fromSprintId: task.sprintId });
    }
    task.sprintId = sprintId;
    added.push({ type: 'task', id: itemId });
  } else if (kind === 'story') {
    const story = await em.findOne(UserStoryEntity, { id: itemId });
    if (!story) return 404;
    story.sprintId = sprintId;
    added.push({ type: 'story', id: itemId });
    // cascade to tasks of this story
    const tasks = await em.find(TaskEntity, { userStoryId: itemId });
    for (const t of tasks) {
      if (t.sprintId && t.sprintId !== sprintId) {
        conflicts.push({ type: 'task', id: t.id, fromSprintId: t.sprintId });
      }
      t.sprintId = sprintId;
      added.push({ type: 'task', id: t.id });
    }
  } else if (kind === 'epic') {
    // Tasks under any story under this epic
    const stories = await em.find(UserStoryEntity, { epicId: itemId });
    const storyIds = stories.map(s => s.id);
    const tasksOfEpic = storyIds.length
      ? await em.find(TaskEntity, { userStoryId: { $in: storyIds } })
      : [];
    // Direct tasks (epic without going through story) — TaskEntity has epicId too
    const directTasks = await em.find(TaskEntity, { epicId: itemId, userStoryId: null });
    const allTasks = [...tasksOfEpic, ...directTasks];

    // Strategy from C6.B: bring tasks + stories that have no tasks
    const storiesWithoutTasks = stories.filter(
      s => !tasksOfEpic.some(t => t.userStoryId === s.id),
    );

    for (const t of allTasks) {
      if (t.sprintId && t.sprintId !== sprintId) {
        conflicts.push({ type: 'task', id: t.id, fromSprintId: t.sprintId });
      }
      t.sprintId = sprintId;
      added.push({ type: 'task', id: t.id });
    }
    for (const s of storiesWithoutTasks) {
      s.sprintId = sprintId;
      added.push({ type: 'story', id: s.id });
    }
  }

  await em.flush();
  return { added, conflicts };
}
```

Response shape :
```json
{
  "data": { "type": "sprint-items", "id": "<sprintId>",
    "attributes": { "added": [...], "conflicts": [...] } },
  "meta": { "addedCount": N, "conflictCount": M }
}
```

Symétrique : `DELETE /sprints/:id/items/:itemId?kind=...` (à scoper en phase 2 si nécessaire).

### 3.7 Frontend

**a. Config projet** dans `ProjectFormModal` :
- 2 nouveaux champs : « Durée du sprint (jours) » + « Vélocité-cible (points/sprint) ».
- Valeurs par défaut : 14 / 20.
- Validation : 1–60 jours, 1–200 pts.
- Envoyer dans le PATCH update.

**b. Création sprint** (`add-sprint-modal.gts`) :
- Le champ `name` devient optionnel (placeholder « auto: sprint-NNN »).
- Les dates sont pré-remplies via un appel `GET /api/v1/projects/:id/sprints/preview-next` (route helper qui renvoie `{ number, startDate, endDate, velocityPoints }`) — pratique pour l'aperçu.
- Bouton « Créer » envoie body partiel ; backend complète.

**c. Clôture sprint** (sprint-card / sprint detail) :
- Bouton « Clore le sprint » → fetch `GET /sprints/:id/close-preview` pour récupérer la liste des tâches/US non-done + sprints existants.
- Si rien à reporter → confirmation simple, POST stop sans body, fermeture.
- Si tâches/US non-done > 0 → modale 3-choix :
  1. **Créer un nouveau sprint** (formulaire optionnel : name, dates override ; sinon auto via config projet).
  2. **Déplacer vers un sprint existant** (dropdown alimenté par `availableNextSprints`).
  3. **Renvoyer au backlog** (texte d'avertissement : « ces items perdront leur lien sprint »).
- POST `/sprints/:id/stop` avec `{ action, targetSprintId? | createSprintConfig? }`.
- Toast résultat : « Sprint clos. 3 tâches → sprint-007 » / « 3 tâches → backlog ».

**d. Ajout au sprint** :
- Dans la vue Backlog ou User Story Map, bouton contextuel « Ajouter au sprint actif ».
- Appelle `POST /sprints/:id/items` avec `kind` et `id`.
- Affiche conflicts dans un toast warning.

**e. Affichage `sprint-NNN`** :
- Helper `formatSprintCode(n: number) => 'sprint-' + String(n).padStart(3, '0')`.
- Utilisé dans sprint-card et là où on rend le code.

### 3.8 OpenAPI + types

Régénérer `@apps/backend/openapi.json` + `@apps/backend/src/api-types.ts` après les modifs schémas (`pnpm run api:types`).

---

## 4. Implementation phases

### Phase 1 — Backend modèle + config projet
- [ ] Étendre `ProjectEntity` (`sprintDurationDays`, `defaultVelocityPoints`)
- [ ] Étendre `SprintEntity` (`number`)
- [ ] Étendre `UserStoryEntity` (`sprintId`)
- [ ] Mettre à jour serializers + schémas Zod (project, sprint, user-story)
- [ ] Adapter `UpdateProjectRoute` pour accepter les nouveaux champs
- [ ] `pnpm schema:fresh` (rappel : early-stage, pas de migration formelle)
- [ ] Tests intégration sur la lecture des nouveaux champs

### Phase 2 — Sprint numbering & dates auto
- [ ] `src/sprint/utils/sprint-numbering.ts` (helper transactionnel MAX+1)
- [ ] Adapter `CreateSprintRoute` (champs body devenus optionnels, dérivation `number`, dates, velocityPoints)
- [ ] Route `GET /projects/:id/sprints/preview-next` (optionnel — utile pour le front)
- [ ] Tests intégration : 1ʳᵉ création sans précédent ; création avec sprint précédent ; override dates

### Phase 3 — Clôture avec choix utilisateur (C5 Variante)
- [ ] Factoriser `createSprintForProject(em, project, prev?, override)` (partagé Create + Close)
- [ ] Nouveau endpoint `GET /sprints/:id/close-preview` (liste tâches/US non-done + sprints `planned` du projet)
- [ ] Étendre `StopSprintRoute` :
  - 422 `CLOSE_ACTION_REQUIRED` si non-done > 0 et pas d'`action` dans le body,
  - `action = 'send-to-backlog'` → set `sprintId = null` sur les non-done,
  - `action = 'move-to-existing'` → set `sprintId = targetSprintId`,
  - `action = 'move-to-next'` → créer un sprint (via helper) + set `sprintId = newSprint.id`.
- [ ] Tests intégration :
  - sprint sans non-done → close OK sans action,
  - sprint avec 2 non-done sans action → 422,
  - action `send-to-backlog` → `sprintId` null,
  - action `move-to-existing` vers sprint planned → `sprintId` = target,
  - action `move-to-existing` vers sprint completed → 409,
  - action `move-to-next` sans config → nouveau sprint avec config projet,
  - action `move-to-next` avec override de dates → respect.

### Phase 4 — Endpoint cascade items
- [ ] Nouvelle route `items.routes.ts`
- [ ] Cascade epic / story / task selon C6
- [ ] Détection des conflits (item déjà dans un autre sprint)
- [ ] Tests intégration couvrant chaque kind + cas conflits

### Phase 5 — Frontend
- [ ] `ProjectFormModal` : 2 nouveaux champs config
- [ ] `add-sprint-modal` : champs optionnels, preview-next call
- [ ] `sprint-card` : bouton « Clore » avec modale de confirmation + résumé
- [ ] `formatSprintCode` helper + utilisation
- [ ] Vue Backlog (ou USM) : bouton « Ajouter au sprint actif »
- [ ] Tests intégration : modale création (sprint code auto), modale clôture (résumé transfert)

### Phase 6 — Régénération + visual
- [ ] `pnpm run api:types`
- [ ] `pnpm turbo lint` racine vert
- [ ] Tests backend + frontend verts
- [ ] Vérification visuelle Playwright : workflow complet (config projet → create sprint → ajouter epic → start → close → suivant créé avec tâches reportées)

---

## 5. Edge cases & risks

| Cas | Mitigation |
|---|---|
| Création concurrent de 2 sprints (race condition sur `number`) | Transaction `em.transactional` dans `getNextSprintNumber` (cf. task-numbering pattern existant) |
| Sprint sans tâche à la clôture | Close OK sans `action`. Pas de création auto. |
| Sprint avec tâches non-done, utilisateur ne fournit pas `action` | 422 `CLOSE_ACTION_REQUIRED` — front DOIT proposer un choix |
| `move-to-existing` vers un sprint completed | 409 — interdit, évite de polluer un sprint clos |
| `move-to-next` avec `endDate < startDate` overridé | 400 validation Zod |
| Cascade epic + tâche déjà dans un sprint actif | `conflicts[]` retourné ; l'utilisateur voit le warning et peut annuler |
| `defaultVelocityPoints = 0` | Validation Zod min(1) — refuse |
| Override `endDate < startDate` | Validation backend : refuse 400 |
| `sprintDurationDays > 60` | Validation Zod max(60) — refuse (sécurité, pas de sprint marathon de 6 mois) |
| US sans `sprintId` mais ses tâches en ont une | Comportement : l'US suit ses tâches (manuelle pour le moment, à l'utilisateur de gérer). À documenter |
| Sprint déjà au statut `completed` qu'on tente de re-clôturer | 409 (déjà géré par le check `status !== 'active'`) |
| Suppression d'un sprint avec des tâches actives | Reset `sprintId = null` sur ses tâches + US (à étendre dans `DeleteSprintRoute`, hors scope strict mais à noter) |

---

## 6. Success criteria

1. **`ProjectEntity` étendu** : `sprintDurationDays` + `defaultVelocityPoints` lisibles via `GET /projects/:id`.
2. **`PATCH /projects/:id`** accepte et persiste les 2 nouveaux champs ; validation Zod min/max respectée.
3. **`POST /sprints/`** accepte un body minimal (`{ projectId }`) et crée un sprint avec :
   - `number` auto-incrémenté (1 si premier, MAX+1 sinon),
   - `name` auto = `Sprint NNN` si omis,
   - `startDate` = fin du précédent + 1 jour, ou aujourd'hui si pas de précédent,
   - `endDate` = startDate + sprintDurationDays - 1,
   - `velocityPoints` = `defaultVelocityPoints` du projet.
4. **Test intégration création** : seed projet avec config (10 jours, 30 pts), créer 3 sprints consécutifs → numbers 1/2/3, dates contiguës, velocityPoints = 30 chacun.
5. **Test intégration override** : créer sprint avec `startDate` + `endDate` explicites → le serveur respecte les dates fournies sans les recalculer.
6. **`GET /sprints/:id/close-preview`** retourne `unfinishedTasks[]`, `unfinishedStories[]`, `availableNextSprints[]` (sprints `planned` du projet).
7. **`POST /sprints/:id/stop`** :
   - Sans tâche non-done → close sans body OK, status `completed`, `completedPoints` recalculé.
   - Avec tâches non-done sans `action` → **422 CLOSE_ACTION_REQUIRED**.
   - `action: 'send-to-backlog'` → `sprintId = null` sur toutes les non-done (tâches + US).
   - `action: 'move-to-existing'` + `targetSprintId` valide (status `planned`) → réassignation sur le target.
   - `action: 'move-to-existing'` + target en `completed` → 409.
   - `action: 'move-to-next'` → nouveau sprint créé (config projet par défaut, override possible via `createSprintConfig`).
   - Renvoie `meta: { movedTasks, movedStories, targetSprintId, action }`.
8. **Test intégration clôture** : couvrir les 5 actions/cas listés en (7) ; pour `move-to-next`, vérifier que le nouveau sprint a `number = max + 1` et hérite de `defaultVelocityPoints`.
9. **`POST /sprints/:id/items`** avec `kind=epic` cascade selon C6.B (tasks + US sans tâches).
10. **Test intégration cascade epic** : épique avec 2 US (US-1 a 2 tâches, US-2 sans tâche) → après POST items kind=epic, les 2 tâches et US-2 ont `sprintId === <sprint>`.
11. **Conflits retournés** : poser un epic dont une tâche est déjà dans un autre sprint → réponse contient `conflicts[]` non-vide, le déplacement a bien eu lieu (réassignation).
12. **Frontend `ProjectFormModal`** : nouveaux champs visibles, valeurs persistées (verif via snapshot post-PATCH).
13. **Frontend modale create sprint** : crée sans dates / sans name → carte affiche `sprint-001` (ou suivant).
14. **Frontend modale close sprint** :
    - Si rien à reporter, confirmation simple.
    - Sinon, 3-choix utilisateur (créer / déplacer / backlog), POST avec l'action choisie, toast résultat.
15. **`pnpm turbo lint` racine vert** ([[feedback-lint-before-push]]).
16. **`pnpm run api:types`** committed (openapi.json + api-types.ts régénérés).
17. **Vérif visuelle Playwright** : workflow E2E complet en dev — config projet → 2 sprints créés → ajout epic au sprint 1 → start → close (avec choix « move-to-existing » vers sprint 2) → tâches non-done dans sprint 2.

---

## 7. Hors scope (à tracker à part)

- Burndown chart (collecte daily de remaining points).
- Sprint retrospective field + UI.
- Délai inter-sprint configurable (pour la review/rétro).
- Working-days mode (calendrier ouvré, jours fériés).
- Sprint planning drag-drop avec multi-select (la phase 5 propose le bouton « Ajouter », pas le DnD complet).
- DELETE /sprints/:id/items/:itemId (retrait individuel) — à ajouter si demandé.
- Migration formelle (Mikro-ORM migrations) au lieu de schema:fresh — sera nécessaire avant prod.
- Notifications quand un sprint approche de la fin / overcommit.

---

## 8. Références

- Entité actuelle : `@libs/scrum-backend/src/sprint/sprint.entity.ts`
- Pattern de numbering : `@libs/scrum-backend/src/utils/task-numbering.ts`
- Pattern auth/Content-Type : commit `fb50c19` (basculement vers `application/json` pour POST/PATCH)
- Règle test naming : [[feedback-test-file-naming]]
- Règle lint avant push : [[feedback-lint-before-push]]
