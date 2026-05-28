# Gap analysis — project-forge vs. iceScrum

**Mission** : phase 2 du travail de refacto. Comparaison structurée entité-par-entité, champ-par-champ, workflow-par-workflow, avec criticité **calibrée selon les décisions utilisateur** (cf. fichier 01, §8).

**Décisions actées** :
- Epic devient l'équivalent enrichi de Feature iceScrum
- Audit trail automatique souhaité (via hooks MikroORM)
- ❌ Release : hors scope
- AcceptanceTest : nouvelle entité à créer
- Time model : option C — `estimatedHours` (statique) + heures loggées (existant) + nouveau `remainingHours`
- Workflow Task 5 états conservé
- Story dependencies à ajouter
- Backlogs : vues filtrées frontend, pas d'entités

---

## 1. Mapping des entités

| iceScrum | project-forge | Statut | Action |
|---|---|---|---|
| Project | `ProjectEntity` | ✅ Existe | Champs OK |
| Release | — | ❌ Hors scope | Skip (Q3) |
| Sprint | `SprintEntity` | ✅ Existe | Champs OK |
| Feature | `EpicEntity` | 🟡 Sémantique OK, champs pauvres | **Enrichir** (Q1) |
| Story (user / defect / technical) | `UserStoryEntity` | 🟡 Pas de `type` discriminant | OK — `Task.nature` couvre déjà Bug/Tech/Feature côté task |
| Epic Story (temporaire à splitter) | — | ❌ Absent | Skip — concept rarement utilisé |
| Task | `TaskEntity` | ✅ Plus riche qu'iceScrum | Enrichir (remaining time) |
| Task recurrent / urgent | — | ❌ Absent | Absorbable via `Task.nature` (Hotfix / Maintenance) |
| AcceptanceTest | — | ❌ Absent | **Créer** (Q4) |
| Actor / Persona | — | ❌ Absent | Skip — pas demandé |
| Dependencies (Story ↔ Story) | — | ❌ Absent | **Créer** (Q7) |
| Tags (Feature / Story / Task) | — | ❌ Absent partout | Manquant transverse |
| Backlog (entité) | — | ❌ Absent | Skip — vues filtrées frontend (Q8) |

---

## 2. Tableau des champs par entité

### 2.1 Feature (iceScrum) → Epic (project-forge)

| Champ iceScrum | EpicEntity | Statut |
|---|---|---|
| `id` | `id` (UUID) | ✅ |
| `uid` | — | ❌ — pas critique (UUID lisible) ; pourrait être ajouté en `number` style Task |
| `name` | `title` | 🔁 Renommé |
| `description` | `description` | ✅ |
| `notes` | — | ❌ Manquant |
| `color` | — | ❌ **Manquant** — important : iceScrum hérite la couleur aux stories liées |
| `type` (0/1 functional/architectural) | — | ❌ Manquant |
| `value` (business value) | — | ❌ Manquant |
| `rank` | — | ❌ **Manquant** — priorisation Features backlog |
| `state` (Todo / InProgress / Done) | `status` (3 valeurs OK) | ✅ |
| `stories[]` | dérivé via FK | ✅ |
| `tags[]` | — | ❌ Manquant |
| `creationDate`, `lastUpdated` | `createdAt`, `updatedAt` | ✅ |

### 2.2 Story (iceScrum) → UserStory (project-forge)

| Champ iceScrum | UserStoryEntity | Statut |
|---|---|---|
| `id` | `id` | ✅ |
| `uid` | — | ❌ Manquant (pas critique) |
| `name` | `title` | 🔁 Renommé |
| `description` | `description` | ✅ |
| `notes` | — | ❌ Manquant |
| `type` (user / defect / technical) | — | ❌ Skip — `Task.nature` couvre la classification |
| `state` (7 valeurs : Suggested → Accepted → Estimated → Planned → InProgress → InReview → Done) | `status` (3 valeurs : todo / in-progress / done) | 🟡 **Divergent majeur** — voir §3 |
| `effort` | `points` | 🔁 Renommé |
| `value` (business value) | — | ❌ **Manquant** — décision prioritisation |
| `rank` | — | ❌ **Manquant** — ordre dans backlog |
| `priority` (1-N) | `priority` (integer) | 🟡 Existe mais sémantique différente (priority absolue vs. rank relatif) |
| `feature` | `epicId` | 🔁 Renommé |
| `actor` | — | ❌ Skip |
| `parentSprint` | `sprintId` | 🔁 Renommé |
| `dependsOn` / `dependences[]` | — | ❌ **Manquant** (Q7) |
| `acceptanceTests[]` | — | ❌ **Manquant** (Q4) |
| `tasks[]` | dérivé via FK | ✅ |
| `tags[]` | — | ❌ Manquant |
| `suggestedDate`, `acceptedDate`, `estimatedDate`, `plannedDate`, `inProgressDate`, `doneDate` | — | ❌ **Manquant** — dérivable d'`HistoryEntry` (Q2) |
| `affectVersion` (defects) | — | ❌ Skip — pas demandé |
| `origin` (copy from other project) | — | ❌ Skip |
| `testState` (agrégat AT) | — | ❌ Manquant — dépend de la création d'`AcceptanceTest` |
| `creator` | — | 🟡 Pas de `createdById` sur UserStory (présent sur Task) — incohérence |

### 2.3 Task (iceScrum) → Task (project-forge)

| Champ iceScrum | TaskEntity | Statut |
|---|---|---|
| `id` | `id` | ✅ |
| `uid` | `number` | ✅ équivalent (per-project) |
| `name` | `title` | 🔁 |
| `description` | `description` | ✅ |
| `notes` | — | ❌ Manquant |
| `color` | — | ❌ Manquant |
| `state` (3 valeurs) | `status` (5 valeurs) | ✨ **project-forge plus riche** — conservé (Q6) |
| `type` (recurrent / urgent / null) | `nature` (10 valeurs) | ✨ **project-forge plus riche** |
| Classification compétence | `type` (9 valeurs : Frontend / Backend / ...) | ✨ **Présent uniquement chez nous** |
| `parentStory` | `userStoryId` | 🔁 |
| `backlog` (sprint) | `sprintId` | 🔁 |
| `initial` (estimation initiale figée) | `estimatedHours` | 🔁 Renommé — équivalent sémantique |
| `estimation` (remaining) | — | ❌ **Manquant** — à ajouter en `remainingHours` (Q5/C) |
| `responsible` (1 user) | — | 🟡 Modèle différent — `TaskAssignee` met N users au même niveau |
| `participants[]` | `TaskAssignee[]` | ✅ |
| `rank` | — | ❌ Manquant — important pour Task Board |
| `blocked` | — | ❌ Manquant — pourrait être utile (drag & drop board) |
| `tags[]` | — | ❌ Manquant |
| `creator` | `createdById` | ✅ |
| `inProgressDate`, `doneDate` | — | ❌ Manquant — dérivable d'`HistoryEntry` (Q2) |

### 2.4 AcceptanceTest (iceScrum) → ❌ inexistant

À créer (Q4). Schéma cible minimal :

```typescript
interface AcceptanceTestEntity {
  id: string;
  userStoryId: string;        // FK indexed
  name: string;
  description: string;
  state: 'to-check' | 'failed' | 'success';
  rank: number;               // ordre d'affichage
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}
```

L'agrégat sur Story (`testState` iceScrum) deviendrait dérivé : `success | failed | mixed | to-check` calculé à la demande.

### 2.5 StoryDependency (iceScrum `dependsOn` / `dependences`) → ❌ inexistant

À créer (Q7). Option simple = table de jointure :

```typescript
interface StoryDependencyEntity {
  id: string;
  fromStoryId: string;        // indexed
  toStoryId: string;          // indexed
  type: 'blocks' | 'relates-to'; // optionnel — iceScrum n'en a qu'un
  createdAt: Date;
}
```

Garde-fous applicatifs : pas de cycle, pas de self-dependency, cross-project interdit.

### 2.6 HistoryEntry (cible audit trail)

Déjà présent, **pas câblé**. Décision Q2 : ajouter des **hooks MikroORM** (`@BeforeUpdate` / `@AfterCreate`) sur Epic, UserStory, Task, Sprint qui détectent les changements de `status` et écrivent automatiquement un `HistoryEntry` avec `{ from, to, userId }`.

Question ouverte (à trancher en phase 3) : où récupérer le `userId` côté hook ? Plusieurs options (AsyncLocalStorage, RequestContext MikroORM, passage explicite via service).

### 2.7 Comment — couverture polymorphique manquante

**Actuel** : `CommentEntity` est lié **uniquement à Task** (`taskId` non-nullable, `comment.entity.ts`).
**Demande utilisateur** : pouvoir commenter aussi sur Epic et UserStory (et potentiellement Project).

**Proposition** : aligner sur le pattern déjà utilisé par `HistoryEntry` →

```typescript
interface CommentEntity {
  id: string;
  ownerType: 'task' | 'story' | 'epic' | 'project';
  ownerId: string;          // indexed
  userId: string;           // indexed
  content: string;
  type: 'comment' | 'status-change' | 'assignment' | 'github-push' | 'other';
  metadata: Json | null;
  createdAt: Date;
}
```

**Migration data** : pour le `Comment` existant, `ownerType = 'task'` et `ownerId = taskId` → migration triviale.

**Impact route** :
- Routes actuelles `/tasks/:id/comments` (list/add/delete) → restent
- Nouvelles routes `/epics/:id/comments`, `/user-stories/:id/comments`, éventuellement `/projects/:id/comments`
- OU route unifiée `/comments?ownerType=...&ownerId=...` (moins REST-orthodoxe mais plus simple)

**À trancher** : routes par ressource (REST-orthodoxe, plus de code) vs. route unifiée (moins de code, sémantique discutable).

### 2.8 Attachment — couverture polymorphique incomplète

**Actuel** : `AttachmentEntity` polymorphe sur **Task OU Project** uniquement (`taskId?` + `projectId?` — deux colonnes nullables).
**Demande utilisateur** : étendre à Epic et UserStory aussi.

**Proposition** : remplacer le double FK nullable par le pattern unifié `ownerType` + `ownerId` (idem `HistoryEntry` et `Comment` ci-dessus) →

```typescript
interface AttachmentEntity {
  id: string;
  ownerType: 'task' | 'story' | 'epic' | 'project';
  ownerId: string;          // indexed
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;     // indexed
  createdAt: Date;
}
```

**Migration data** : `WHERE taskId IS NOT NULL → ownerType='task', ownerId=taskId` ; idem `projectId`. Drop des deux colonnes. Trivial.

**Bénéfice transverse** : un seul pattern (`ownerType` + `ownerId`) pour les 3 entités "satellites" (`Comment`, `Attachment`, `HistoryEntry`). Code shared possible (helper `findByOwner(type, id)`, validation Zod commune, etc.).

### 2.9 Synthèse "satellite entities" polymorphiques

| Entité | Avant | Après |
|---|---|---|
| `HistoryEntry` | ✅ déjà polymorphe (`ownerType` + `ownerId`) | inchangé |
| `Comment` | ❌ `taskId` non-null | 🔁 `ownerType` + `ownerId` (4 types) |
| `Attachment` | 🟡 `taskId?` + `projectId?` (double nullable) | 🔁 `ownerType` + `ownerId` (4 types) |

Cohérence forte, un seul pattern à comprendre, helper réutilisable.

---

## 3. Comparaison des workflows (états)

### 3.1 UserStory.status

| iceScrum | project-forge | Gap |
|---|---|---|
| `Suggested` (1) | — | ❌ |
| `Accepted` (2) | — | ❌ |
| `Estimated` (3) | — | ❌ |
| `Planned` (4) | — | ❌ |
| `InProgress` (5) | `in-progress` | ✅ |
| `InReview` (6) | — | ❌ |
| `Done` (7) | `done` | ✅ |
| `todo` (notre val) | — | 🟡 Englobe Suggested+Accepted+Estimated+Planned |

**Conséquence majeure** : sans enrichissement du status, **les vues filtrées frontend "Sandbox" / "Product Backlog" / "Sprint Backlog" (Q8) ne peuvent pas être différenciées** sur la simple base du status. Il faut soit :
- (a) enrichir `UserStory.status` avec au moins `suggested | accepted | estimated | planned | in-progress | done` (6 valeurs)
- (b) garder 3 états et croiser avec `sprintId` (présence/absence)

**Hypothèse phase 3** : on enrichit le status pour matcher iceScrum (option a), c'est l'approche qui rend la sémantique claire et qui simplifie les filtres.

### 3.2 Sprint.status

| iceScrum | project-forge | Statut |
|---|---|---|
| `planned` | `planned` | ✅ |
| `inProgress` | `active` | 🔁 Renommé |
| `done` | `completed` | 🔁 Renommé |

✅ **Match parfait** sémantiquement. Les noms divergent mais on peut les garder.

### 3.3 Task.status

| iceScrum | project-forge | Décision |
|---|---|---|
| `todo` | `todo` | ✅ |
| `inProgress` | `in-progress` | ✅ |
| — | `testing` | ✨ Conservé (Q6) |
| — | `uat` | ✨ Conservé (Q6) |
| `done` | `done` | ✅ |

✨ **project-forge plus riche** — décision actée de conserver.

### 3.4 Epic.status

| iceScrum (Feature) | project-forge | Statut |
|---|---|---|
| `todo` | `todo` | ✅ |
| `inProgress` | `in-progress` | ✅ |
| `done` | `done` | ✅ |

✅ Match parfait.

---

## 4. Comparaison des backlogs

Décision Q8 : **les backlogs sont des vues filtrées frontend**, pas des entités. Voici comment chaque backlog iceScrum se traduit en requête sur le modèle cible :

| Backlog iceScrum | Filtre équivalent (post-refacto) |
|---|---|
| **Features backlog** | `GET /projects/:id/epics?sort=rank` |
| **Sandbox** | `GET /projects/:id/user-stories?status=suggested` |
| **Product Backlog** | `GET /projects/:id/user-stories?status=accepted,estimated&sprintId=null` |
| **Sprint Backlog** (sprint actif) | `GET /sprints/:id/user-stories` + `GET /sprints/:id/tasks` |
| **Custom Backlogs** | combinaisons libres sur statuts / features / tags |

**Prérequis** :
1. Story.status enrichi (cf. §3.1) — sinon Sandbox / Product Backlog indissociables
2. Epic/Story `rank` (cf. §2.1, §2.2)
3. Optionnel : `tags[]` transverses

**Lacune actuelle** : pas de combinateur de filtres sophistiqué côté API. Les routes existent (`/projects/:id/user-stories`) mais le query string actuel ne supporte pas `status IN (...)` ni `tags CONTAINS X`. À évaluer en phase 3.

---

## 5. Forces du modèle actuel à conserver

À ne **pas** régresser pendant le refacto :

1. ✨ Workflow Task 5 états (`todo / in-progress / testing / uat / done`)
2. ✨ `Task.nature` (10 valeurs) + `Task.type` (9 valeurs)
3. ✨ `Task.number` applicatif unique par projet
4. ✨ Polymorphic Attachments (task OU project)
5. ✨ GitHub integration native (`Comment.type = 'github-push'`)
6. ✨ Sprint Stop FSM stricte avec preview + 3 actions de dispatch
7. ✨ JSON:API + Zod end-to-end
8. ✨ TimeTracking en add-on séparé (lib boundary respectée)
9. ✨ `ProjectMember.role` + `Project.responsibleId` / `createdById`
10. ✨ Sprint factory auto (number, dates, name, velocity)
11. ✨ Status Project à 6 états (planned, active, paused, completed, cancelled, archived) — plus complet qu'iceScrum

---

## 6. Lacunes par criticité (selon décisions utilisateur)

### 🔴 Bloquantes — sans elles, le modèle cible n'est pas cohérent

| Item | Effort | Pourquoi bloquant |
|---|---|---|
| **AcceptanceTest** (nouvelle entité) | M | Décision Q4 |
| **Story dependencies** (nouvelle entité ou jointure) | S-M | Décision Q7 |
| **Audit trail automatique** (hooks MikroORM → HistoryEntry) | M | Décision Q2 ; nécessite résolution du `userId` côté hook |
| **`Task.remainingHours`** | S | Décision Q5/C ; impact burndown |
| **Enrichissement Epic→Feature** (`color`, `rank`, `value`, `type`, `notes`, `tags`) | M | Décision Q1 ; sans `rank` le Features backlog n'est pas ordonnable |
| **UserStory.status enrichi** (≥ 6 valeurs : suggested / accepted / estimated / planned / in-progress / done) | M | Sans ça, Sandbox vs Product Backlog indistinguables (Q8) |
| **UserStory.rank + UserStory.value** | S | Priorisation + business value ; Story.priority actuel ≠ rank ordering |
| **Comment polymorphique** (Epic / Story / Task / Project) | S-M | Aujourd'hui limité à Task — voir §2.7 |
| **Attachment polymorphique unifié** (Epic / Story / Task / Project) | S | Migration `taskId?` + `projectId?` → `ownerType` + `ownerId` — voir §2.8 |
| **Migrations MikroORM mises en place** | S | Aucune migration n'existe ; nécessaire dès le 1er changement de schéma |

### 🟡 Importantes — fortement recommandées mais reportables

| Item | Effort | Justification |
|---|---|---|
| **Tags transverses** (Epic / Story / Task) | M | Filtres custom backlog (Q8), classifications libres |
| **Dates par transition d'état Story** (`acceptedDate`, `estimatedDate`, etc.) | S si hooks audit en place | Dérivables d'`HistoryEntry` → pas besoin de colonnes dédiées sauf perf |
| **`Task.blocked`** | S | UX Task Board (drag & drop) |
| **`Task.rank`** | S | Ordre dans Task Board |
| **`UserStory.notes`** / **`Task.notes`** / **`Epic.notes`** | S | Champ libre supplémentaire (mais on a déjà `description`) |
| **Story.creator** (`createdById`) | S | Cohérence : Task a `createdById`, Story non |
| **Task.color** / **Story.color** | S | iceScrum hérite couleur de Feature → UI |

### 🟢 Nice-to-have ou skip

| Item | Statut |
|---|---|
| **Release** | ❌ Skip (Q3) |
| **Actor / Persona** | ❌ Skip — pas demandé |
| **Story.type** (user / defect / technical) | ❌ Skip — `Task.nature` couvre |
| **Task recurrent / urgent** | ❌ Skip — `Task.nature` absorbe |
| **Epic Story temporaire** | ❌ Skip — workflow rare |
| **Story.affectVersion** (defects) | ❌ Skip |
| **Story.origin** (copy cross-project) | ❌ Skip |

---

## 7. Risques transverses identifiés

1. **Pas de migrations DB** : tout changement de schéma actuel nécessite `schema:fresh` → pour la prod il faut absolument introduire le système de migration MikroORM avant tout changement structurel.
2. **Schémas Zod côté front** : `@libs/backlog-front/src/schemas/*.ts` redéclare les types côté frontend manuellement. Tout enrichissement de status / nouveaux champs nécessitera de synchroniser **deux fois**.
3. **Tests intégration** lourds (533 lignes sur `sprint.route.test.ts`) → à étendre, pas à réécrire.
4. **`HistoryEntry.ownerType`** est un string libre → un enum strict serait souhaitable lors de la mise en place de l'audit auto.
5. **Concurrence sur `Task.number`** : pattern `MAX + 1` non sérialisé → si trafic concurrent, risque de doublon (à transformer en PG sequence ou advisory lock).
6. **`UserStory.priority` vs `rank`** : `priority` existe mais sémantiquement c'est plus un niveau (Basse/Moyenne/Haute) qu'un ordre. Si on ajoute `rank`, faut-il garder `priority` ?
7. **Sprint Stop transfert** : aujourd'hui basé sur `status !== 'done'`. Si on enrichit `Story.status` (suggested / accepted / estimated / planned / in-progress / done), il faut reformuler "unfinished" (ex: tout sauf `done`).

---

## 8. Décisions finales actées (Q1–Q6 fin phase 2)

| # | Question | Décision |
|---|---|---|
| 1 | `UserStory.status` à 6 valeurs (`suggested / accepted / estimated / planned / in-progress / done`) | ✅ Oui |
| 2 | `Story.priority` vs nouveau `rank` | **Garder les deux** : `priority` = niveau (Basse/Moyenne/Haute), `rank` = ordre dans backlog |
| 3 | Audit trail — résolution `userId` côté hook | **`RequestContext` MikroORM** |
| 4 | `Task.number` PG sequence (vs. MAX+1 actuel) | **Dans le scope** du refacto |
| 5 | Migrations MikroORM | **Chantier préparatoire indépendant** (avant les autres propositions) |
| 6 | Routes Comment/Attachment polymorphiques | **(c) Hybride** : nested pour write/list (`/epics/:id/comments`, etc.), flat pour `GET/DELETE /comments/:id`, handler unique factorisé via `defineCommentsRoutes(parent)` |

## 9. Synthèse — chantiers à venir (sans propositions détaillées)

Phase 3 portera sur :

- **Prop 0 (prérequis)** — Mise en place des migrations MikroORM
- **Prop 1** — Unification polymorphique `Comment` + `Attachment` (`ownerType` + `ownerId` — aligné avec `HistoryEntry`) — couvre Epic / Story / Task / Project — avec routes hybrides + handler factorisé
- **Prop 2** — Enrichissement Epic→Feature + UserStory (status enrichi 6 valeurs, rank, value, createdById)
- **Prop 3** — Nouvelles entités : AcceptanceTest + StoryDependency
- **Prop 4** — Audit trail automatique (hooks MikroORM + `RequestContext`)
- **Prop 5** — Time model (remainingHours) + Task.number → PG sequence + (optionnel) Tags transverses
