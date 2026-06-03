# Backlog — Cartes User Story groupées et filtrées par épique

**Mission** : refondre la vue Backlog pour afficher **toutes les User Stories sous forme de cartes**, chacune identifiée par la **couleur de son épique**, indiquant le **nombre de tâches attachées** et les méta-données utiles (points, priorité, statut) — sans surcharge visuelle. Permettre de **regrouper par épique** (layout par défaut) et de **filtrer par épique**.

> Frontend uniquement — aucun changement backend. Toutes les données (epics, user-stories, tasks) sont déjà exposées et leurs schémas WarpDrive enregistrés.

```mermaid
graph LR
    P1["P1 — Données & route<br/>(S)"] --> P2["P2 — UserStoryCard<br/>(M)"]
    P2 --> P3["P3 — Backlog groupé + filtre épique<br/>(M)"]
    P3 --> P4["P4 — i18n & tests<br/>(S)"]
```

**Effort estimé** : ~2-3 j.

---

## Problème résolu

Aujourd'hui `templates/dashboard/backlog.gts` affiche une **liste plate de tâches** (`TaskRow`) filtrée par nature/type/segment. Or :

- Un *product backlog* Scrum est une liste de **PBIs / User Stories**, pas de tâches (les tâches relèvent du sprint/kanban).
- L'utilisateur ne voit pas à quelle épique appartient chaque US, ni combien de tâches y sont attachées.
- Aucun moyen de regrouper ou filtrer par épique.

On pivote donc le Backlog vers une **vue US-centrée en cartes**, groupées par épique, avec un filtre épique. Le code de groupement par épique existe déjà dans la User Story Map (`EpicRow` + `epics.loadByProject`) et sert de référence ; la couleur d'épique est déjà appliquée en `border-left` inline (`epic-row.gts:54`).

### Contexte architectural (advisory, issu de la lecture du code)

- **Communauté touchée** : `@libs/backlog-front` (front uniquement). Aucune god-node ni contrat cross-cutting backend modifié.
- **Services réutilisés** (déjà existants, tracked, source de vérité) : `epics.loadByProject/list`, `userStories.loadByProject/list`, `tasks.loadBacklog/backlog`.
- **Schémas** : `Epic.color: string` (requis), `UserStory.color: string | null`, `UserStory.epicId: string | null`, `Task.userStoryId: string | null`. Tous déjà enregistrés dans `@apps/front/app/services/store.ts` — pas de « Missing Resource Type ».
- **Risque** : régression des tests existants `backlog-template-test.gts` et `backlog-filters-test.gts` (la sémantique passe de tâches → US). À mettre à jour explicitement.

---

## P1 — Données & route (S, 0.5 j)

### Solution

1. **Charger les épiques** dans `routes/dashboard/backlog.ts` (actuellement absentes) :

```ts
async model() {
  const projectId = this.currentProject.currentProjectId;
  if (!projectId) return { epics: [], userStories: [], tasks: [] };
  await Promise.all([
    this.epics.loadByProject(projectId),
    this.userStories.loadByProject(projectId),
    this.tasks.loadBacklog(projectId),
  ]);
  return {
    epics: this.epics.list,
    userStories: this.userStories.list,
    tasks: this.tasks.backlog,
  };
}
```

   - Injecter `@service epics: EpicsService`.
   - Le template lira les services tracked (`this.epics.list`, etc.) comme source de vérité (le `@model` est un snapshot one-shot qui périme après mutation — même pattern que `user-story-map.gts:48-60`).

### Impact

- **Fichiers** : `routes/dashboard/backlog.ts`.
- **Breaking** : non. **Migration DB** : aucune.

### Critères d'acceptation

- [ ] La route charge `epics`, `userStories`, `tasks` en parallèle et les renvoie dans le modèle.

---

## P2 — Composant `UserStoryCard` (M, 1 j)

### Solution

Créer `@libs/backlog-front/src/components/user-story-card.gts` — une **carte** (pas une ligne) réutilisant les patterns existants de `user-story-row.gts` (badges priorité, dot statut) et `epic-row.gts` (couleur inline).

**Signature** :

```ts
interface UserStoryCardSignature {
  Element: HTMLDivElement;
  Args: {
    userStory: UserStory;
    epic?: Epic | null;        // pour la couleur + nom (null = sans épique)
    taskCount: number;         // calculé côté caller (tasks.userStoryId === us.id)
    onOpen?: (us: UserStory) => void;       // clic carte → édition US
    onAddTask?: (us: UserStory) => void;    // action discrète
  };
}
```

**Contenu visuel (simple, dense mais pas surchargé)** :

- **Accent couleur épique** : `border-left: 4px solid ${epic?.color ?? '#6B7280'}` en `style` inline (réutiliser le getter `borderStyle` de `epic-row.gts`). `data-test-us-card-epic-color={{@epic.color}}`.
- **Ligne 1** : dot statut (réutiliser `STATUS_DOT_CLASS`) + titre (truncate) + badge priorité (réutiliser `PRIORITY_BADGE_CLASS`).
- **Ligne 2 (méta)** : 
  - pastille couleur + nom de l'épique (ou « Sans épique »), `data-test-us-card-epic`.
  - badge points (`{{t "backlog.taskRow.points" count=@userStory.points}}`).
  - **badge nombre de tâches** : `{{@taskCount}} {{t "backlog.card.tasksCount"}}` avec `data-test-us-card-task-count`.
  - (optionnel, si présent) tags en `badge badge-ghost badge-xs`, limités à 3 + « +N ».
- Carte = `class="card card-compact bg-base-100 shadow-sm hover:shadow cursor-pointer"`, `data-test-user-story-card={{@userStory.id}}`.
- Clic carte → `@onOpen`. Les helpers de couleur partagés (`PRIORITY_BADGE_CLASS`, `STATUS_DOT_CLASS`, `borderStyle`) peuvent être factorisés dans un petit util ou recopiés (≤ 30 lignes) — préférer la recopie pour éviter un couplage row↔card.

> ⚠️ Mémoire projet : `badge-soft` est illisible en dark sur rôles sombres — ne pas l'utiliser pour les pastilles d'épique ; préférer un dot `style="background:${color}"` + texte neutre.

### Impact

- **Fichiers** : nouveau `components/user-story-card.gts`.
- **Tests** : intégration Ember (rendu couleur, task count, badges).

### Critères d'acceptation

- [ ] La carte affiche titre, statut, priorité, points et **nombre de tâches**.
- [ ] L'accent couleur correspond à `epic.color` (vérifiable via `data-test-us-card-epic-color`) ; fallback neutre si pas d'épique.
- [ ] `data-test-*` présents sur carte, task-count et épique.

---

## P3 — Backlog : groupement + filtre par épique (M, 1 j)

### Solution

Refondre `templates/dashboard/backlog.gts` en vue US-centrée.

1. **Getters de regroupement** :

```ts
// US par épique, dans l'ordre des épiques (epics.list) + groupe "orphelins".
get groupedUserStories(): Array<{ epic: Epic | null; stories: UserStory[] }> {
  const visible = this.filteredUserStories;            // après filtre épique
  const byEpic = new Map<string | null, UserStory[]>();
  for (const us of visible) {
    const key = us.epicId ?? null;
    (byEpic.get(key) ?? byEpic.set(key, []).get(key)!).push(us);
  }
  const groups = this.epicsList
    .filter((e) => byEpic.has(e.id))
    .map((e) => ({ epic: e, stories: this.sortByRank(byEpic.get(e.id)!) }));
  const orphans = byEpic.get(null);
  if (orphans?.length) groups.push({ epic: null, stories: this.sortByRank(orphans) });
  return groups;
}

get taskCountForUS(): (us: UserStory) => number {
  return (us) => this.tasksList.filter((t) => t.userStoryId === us.id).length;
}
```

2. **Filtre par épique** — chips (réutiliser le style de `backlog-filters.gts`) :
   - « Toutes » (réinitialise) + une chip par épique de `epicsList`, chacune avec une pastille `style="background:${epic.color}"`.
   - `@tracked activeEpicId: string | null = null`. Une chip active filtre `filteredUserStories` à cette épique. `data-test-backlog-epic-filter={{epic.id}}`.
   - Implémenter soit en étendant `backlog-filters.gts`, soit dans un nouveau `backlog-epic-filter.gts` (préféré : composant dédié, plus simple à tester).

3. **Toggle « grouper par épique »** (la demande exige le groupement ; on le rend explicite) :
   - `@tracked grouped = true` (groupé par défaut). Bouton bascule `data-test-backlog-group-toggle`.
   - `grouped === true` → rendu par groupes (en-tête épique : pastille couleur + nom + nombre d'US, puis grille de cartes).
   - `grouped === false` → grille plate de toutes les `filteredUserStories` triées par rank.

4. **Layout** : grille responsive `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3`. En-tête d'épique au-dessus de chaque grille de groupe.

5. **Modales** : réutiliser `EditUserStoryModal`, `AddUserStoryModal`, `AddTaskModal`, `DeleteUserStoryConfirmModal` (mêmes branchements que `user-story-map.gts`). Clic carte → `EditUserStoryModal`.

6. **Sous-titre** : adapter `backlog.subtitle` au comptage d'US (ou ajouter `backlog.subtitleStories`). L'ancien filtre tâches (nature/type/segment) est **retiré** de cette vue (la nature/type sont des attributs de tâche, hors-scope d'une vue US — simplification visuelle demandée). Conserver éventuellement le filtre **statut/segment** d'US si trivial, sinon le laisser de côté.

### Impact

- **Fichiers** : `templates/dashboard/backlog.gts` (refonte), nouveau `components/backlog-epic-filter.gts`.
- **Breaking** : la vue Backlog change de sémantique (tâches → US). Les filtres tâche disparaissent de cette page (toujours dispo dans Kanban).
- **Tests** : intégration sur le template + le filtre.

### Critères d'acceptation

- [ ] Toutes les US du projet s'affichent en cartes, **groupées par épique** par défaut (groupe « Sans épique » en fin si nécessaire).
- [ ] Sélectionner une épique dans le filtre n'affiche que ses US.
- [ ] Le toggle bascule entre vue groupée et grille plate.
- [ ] Chaque carte montre le nombre de tâches attachées correct.

---

## P4 — i18n & tests (S, 0.5 j)

### Solution

1. **i18n** FR + EN dans `@apps/front/translations/backlog/{fr-fr,en-us}.yaml` (namespace `backlog.*`, cf. mémoire i18n folder = prefix) :
   - `backlog.card.tasksCount` (« tâches » / « tasks »), `backlog.card.noEpic` (« Sans épique »).
   - `backlog.filters.allEpics`, `backlog.groupToggle.grouped`, `backlog.groupToggle.flat`.
   - `backlog.subtitleStories` (« {count} user stories »).
   - Redémarrer le dev server Vite après ajout de nouveaux YAML.

2. **Tests d'intégration** (bloquants — pas substituables par un smoke test) :
   - **`user-story-card-test.gts`** (nouveau) : rendu titre/points/priorité ; `data-test-us-card-task-count` reflète le `@taskCount` passé ; `data-test-us-card-epic-color` == couleur de l'épique ; fallback « Sans épique » quand `@epic` null.
   - **`backlog-template-test.gts`** (mettre à jour) : rend des cartes US groupées par épique ; nombre de groupes == nombre d'épiques ayant ≥1 US (+ orphelins) ; le filtre épique réduit les cartes visibles ; le toggle bascule groupé/plat.
   - **`backlog-epic-filter-test.gts`** (nouveau) : clic sur une chip épique → callback avec l'`epicId` ; « Toutes » réinitialise.
   - Suivre les conventions test du repo : nommage `*-test.gts` (dash), sélecteurs `data-test-*`, normaliser les espaces avant `toContain` multi-mots, enregistrer les services manuellement dans `TestApp`.

### Critères d'acceptation

- [ ] Toutes les chaînes visibles sont traduites FR + EN (aucune clé `t:backlog.*` brute).
- [ ] Les 3 fichiers de tests d'intégration ci-dessus passent (`pnpm --filter @libs/backlog-front test`).

---

## Risques & points d'attention

- **Sémantique du Backlog** : on passe d'une vue tâches à une vue US. Vérifier qu'aucune autre route/lien ne dépend de l'ancien comportement (le Kanban garde les filtres tâche). Mettre à jour les tests existants plutôt que les supprimer.
- **Couleur inline** : `style="border-left: 4px solid ${color}"` / `background:${color}` — valeurs venant de la DB ; rester sur des couleurs hex maîtrisées (déjà le cas via les modales epic). Pas d'injection (valeur posée en attribut `style`, pas en CSS arbitraire).
- **`badge-soft` en dark** : ne pas l'employer pour les pastilles d'épique (illisible sur rôles sombres) — utiliser un dot coloré inline.
- **Tri** : trier les US par `rank` dans chaque groupe pour un ordre stable.
- **US sans épique** : toujours prévoir le groupe orphelin (epicId null) et le fallback couleur neutre `#6B7280`.
- **Vite** : redémarrer le dev server après création des nouveaux composants/YAML (cache d'imports).
- **Lint avant push** : `pnpm turbo lint` depuis la racine ; valider les tests via la commande CI-exact (`--concurrency=1` côté front), pas `pnpm turbo test` nu.

---

## Critères de succès (vérifiés par /TPK-build avant `done/`)

1. La route Backlog charge epics + userStories + tasks.
2. Le Backlog affiche **toutes les US en cartes**, groupées par épique par défaut.
3. Chaque carte porte l'**accent couleur de son épique** (fallback neutre si aucune) — vérifiable via `data-test-us-card-epic-color`.
4. Chaque carte indique le **nombre de tâches attachées** correct.
5. Le **filtre par épique** restreint l'affichage à l'épique choisie ; « Toutes » réinitialise.
6. Le **toggle de regroupement** bascule entre vue groupée et grille plate.
7. i18n FR + EN complet (aucune clé brute visible).
8. Tests d'intégration `user-story-card-test`, `backlog-template-test` (mis à jour), `backlog-epic-filter-test` **verts**.
9. `pnpm turbo lint` vert + tests front CI-exact (`--filter='@apps/front' --filter='@libs/*-front' --concurrency=1`) verts.

---

## Ordre & dépendances

P1 → P2 → P3 → P4. P2 (carte) est la brique réutilisée par P3 (template). P4 (i18n+tests) clôt. Mode d'exécution recommandé : **LINÉAIRE** (fichiers fortement couplés : `backlog.gts` ↔ `user-story-card.gts` ↔ filtre).
